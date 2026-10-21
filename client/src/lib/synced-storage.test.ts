import test from "node:test";
import assert from "node:assert/strict";

// synced-storage reads window/localStorage when it is first imported, so the fakes go in first and the
// module is loaded fresh for each test through a cache-busting import.
interface Call { method: string; url: string; body: unknown }
interface Harness {
  store: Map<string, string>;
  calls: Call[];
  server: Record<string, string>;
  failPuts: boolean;
  failGet: boolean;
  mod: typeof import("./synced-storage");
}

let live: Harness | null = null;

function fakeWindow(store: Map<string, string>) {
  const storage = {
    get length() { return store.size; },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
  const listeners = new Map<string, (() => void)[]>();
  const target = {
    localStorage: storage,
    location: { pathname: "/journal", href: "/journal", assign: () => {} },
    addEventListener: (type: string, cb: () => void) => { listeners.set(type, [...(listeners.get(type) ?? []), cb]); },
    removeEventListener: () => {},
    dispatchEvent: (event: { type: string }) => { (listeners.get(event.type) ?? []).forEach((cb) => cb()); return true; },
    Event: class { constructor(public type: string) {} },
    setInterval: () => 0,
    clearInterval: () => {},
  };
  (globalThis as Record<string, unknown>).window = target;
  (globalThis as Record<string, unknown>).localStorage = storage;
  (globalThis as Record<string, unknown>).document = { visibilityState: "visible", addEventListener: () => {} };
  if (!(globalThis as Record<string, unknown>).Event) (globalThis as Record<string, unknown>).Event = target.Event;
  return storage;
}

// Stands in for the server: a GET returns everything it holds, a PUT merges, and either can be made to fail
// the way an expired session does.
function fakeFetch() {
  (globalThis as Record<string, unknown>).fetch = async (url: string, init: { method?: string; body?: string } = {}) => {
    const h = live!;
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    h.calls.push({ method, url, body });
    if (method === "GET" && h.failGet) return new Response("Unauthorized", { status: 401 });
    if (method === "GET") return new Response(JSON.stringify(h.server), { status: 200, headers: { "Content-Type": "application/json" } });
    if (h.failPuts) return new Response("Unauthorized", { status: 401 });
    for (const [k, v] of Object.entries((body?.updates ?? {}) as Record<string, string>)) h.server[k] = v;
    for (const k of (body?.deletes ?? []) as string[]) delete h.server[k];
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };
}

// A fresh module instance, so the in-memory queue of one test never leaks into the next. `store` is the
// device's localStorage and survives across loads, exactly as a phone's does across app restarts.
async function load(store: Map<string, string>, server: Record<string, string> = {}): Promise<Harness> {
  fakeWindow(store);
  fakeFetch();
  const mod = await import(`./synced-storage?v=${Math.random()}`) as typeof import("./synced-storage");
  live = { store, calls: [], server, failPuts: false, failGet: false, mod };
  mod.installStorageSync();
  return live;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const USER = "user-1";

test("a write that reaches the server leaves nothing waiting behind", async () => {
  const h = await load(new Map());
  h.mod.setSyncUser(USER);
  localStorage.setItem("calories-daily-log-v1", "oct-19");
  assert.ok(h.store.has("pq-sync-outbox-v1"), "it is written down before the request is even made");
  assert.equal(await h.mod.flushNow(), true);
  assert.equal(h.server["calories-daily-log-v1"], "oct-19");
  assert.equal(h.store.has("pq-sync-outbox-v1"), false, "nothing is left waiting");
});

test("a day logged while the session is expired is not lost when the app is bounced to sign-in and back", async () => {
  const device = new Map<string, string>();
  const server: Record<string, string> = { "calories-daily-log-v1": "oct-15", "calories-session-v1": "oct-15-open-day" };

  // Before: the phone has the older copy the server knows about.
  let h = await load(device, server);
  h.mod.setSyncUser(USER);
  await h.mod.hydrateUserData();
  assert.equal(device.get("calories-daily-log-v1"), "oct-15");

  // Two days of logging that never get through, because the session has expired.
  h.failPuts = true;
  localStorage.setItem("calories-daily-log-v1", "oct-15+19+20");
  assert.equal(await h.mod.flushNow(), false);
  assert.equal(device.get("calories-daily-log-v1"), "oct-15+19+20", "it is still on the phone");

  // The 401 sends the app to /login, which throws away everything held in memory.
  h = await load(device, server);
  h.mod.setSyncUser(USER);
  await h.mod.hydrateUserData();
  await settle();

  assert.equal(device.get("calories-daily-log-v1"), "oct-15+19+20", "signing back in does not overwrite it with the older copy");
  assert.equal(h.server["calories-daily-log-v1"], "oct-15+19+20", "and it finally reaches the server");
  assert.equal(device.has("pq-sync-outbox-v1"), false);
});

test("a write is picked up again even if the app is killed before it is ever sent", async () => {
  const device = new Map<string, string>();
  let h = await load(device, { "journal-essays-v1": "old" });
  h.mod.setSyncUser(USER);
  await h.mod.hydrateUserData();
  localStorage.setItem("journal-essays-v1", "written on the train"); // no flush: the app is swiped away here

  h = await load(device, { "journal-essays-v1": "old" });
  h.mod.setSyncUser(USER);
  await h.mod.hydrateUserData();
  await settle();
  assert.equal(h.server["journal-essays-v1"], "written on the train");
  assert.equal(device.get("journal-essays-v1"), "written on the train");
});

test("a key with nothing waiting still takes the server's copy, so other devices' edits come through", async () => {
  const device = new Map([["nw-btc", "1"], ["journal-essays-v1", "mine"]]);
  const h = await load(device, { "nw-btc": "2", "journal-essays-v1": "edited on the laptop" });
  h.mod.setSyncUser(USER);
  h.mod.installStorageSync();
  localStorage.setItem("nw-btc", "3"); // waiting to go up, so this one is kept
  await h.mod.hydrateUserData();
  assert.equal(device.get("nw-btc"), "3");
  assert.equal(device.get("journal-essays-v1"), "edited on the laptop");
});

test("another account signing in on the same phone never sends up the first one's work", async () => {
  const device = new Map<string, string>();
  let h = await load(device);
  h.mod.setSyncUser(USER);
  h.failPuts = true;
  localStorage.setItem("calories-daily-log-v1", "my food");
  await h.mod.flushNow();
  assert.ok(device.has("pq-sync-outbox-v1"));

  h = await load(device, { "calories-daily-log-v1": "their food" });
  h.mod.setSyncUser("user-2");
  await h.mod.hydrateUserData();
  await settle();
  assert.equal(h.server["calories-daily-log-v1"], "their food", "the other account's log is untouched");
  assert.equal(device.get("calories-daily-log-v1"), "their food");
  assert.equal(device.has("pq-sync-outbox-v1"), false, "and the stale queue is dropped");
});

test("the queue is only kept for synced keys, and a signed-out app keeps it for when its owner returns", async () => {
  const device = new Map<string, string>();
  const h = await load(device);
  h.mod.setSyncUser(USER);
  h.failPuts = true;
  localStorage.setItem("theme", "dark");
  assert.equal(device.has("pq-sync-outbox-v1"), false, "a device-only setting is never queued");
  localStorage.setItem("workout-ppl-log-v1", "leg day");
  await h.mod.flushNow();

  h.mod.resetUserDataSync(); // runs while auth is still loading on every start, so it must not drop the queue
  assert.ok(device.has("pq-sync-outbox-v1"));
  const stored = JSON.parse(device.get("pq-sync-outbox-v1")!);
  assert.deepEqual([stored.userId, stored.updates], [USER, { "workout-ppl-log-v1": "leg day" }]);
});

test("removing a key is queued the same way, and still removes it after a failed send", async () => {
  const device = new Map<string, string>();
  let h = await load(device, { "npcs-list": "people" });
  h.mod.setSyncUser(USER);
  await h.mod.hydrateUserData();
  h.failPuts = true;
  localStorage.removeItem("npcs-list");
  await h.mod.flushNow();

  h = await load(device, { "npcs-list": "people" });
  h.mod.setSyncUser(USER);
  await h.mod.hydrateUserData();
  await settle();
  assert.equal("npcs-list" in h.server, false);
  assert.equal(device.has("npcs-list"), false, "the server's copy is not written back over the removal");
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRolloverScheduler, rollEnabledAccounts, rollOverdueIfNewDay, type RolloverStore } from "./due-date-rollover";

type Row = { enabled: boolean; timezone: string | null; lastDay: string | null };
function fakeStore(rows: Record<string, Row>, options: { failRoll?: Set<string>; failList?: { on: boolean } } = {}) {
  const accounts = new Map(Object.entries(rows));
  const log: string[] = [];
  const store: RolloverStore = {
    account: async (id) => accounts.get(id),
    enabledAccounts: async () => {
      if (options.failList?.on) throw new Error("database asleep");
      return [...accounts].filter(([, row]) => row.enabled).map(([id, row]) => ({ id, timezone: row.timezone, lastDay: row.lastDay }));
    },
    rollOverdue: async (id, today) => { if (options.failRoll?.has(id)) throw new Error("boom"); log.push(`roll ${id} ${today.toISOString()}`); return 3; },
    markRolled: async (id, day) => { log.push(`mark ${id} ${day}`); accounts.get(id)!.lastDay = day; },
  };
  return { store, accounts, log };
}
const quiet = async <T>(run: () => Promise<T>) => { const real = console.error; console.error = () => {}; try { return await run(); } finally { console.error = real; } };

test("an account without the setting is never touched", async () => {
  const { store, log } = fakeStore({ off: { enabled: false, timezone: "UTC", lastDay: null } });
  assert.equal(await rollOverdueIfNewDay(store, "off", new Date("2026-10-16T12:00:00Z")), null);
  assert.equal(await rollOverdueIfNewDay(store, "nobody", new Date("2026-10-16T12:00:00Z")), null);
  assert.deepEqual(log, []);
});

test("on a new day overdue quests are moved to today's date once, and again the day after", async () => {
  const { store, log } = fakeStore({ me: { enabled: true, timezone: "UTC", lastDay: "2026-10-15" } });
  assert.deepEqual(await rollOverdueIfNewDay(store, "me", new Date("2026-10-16T00:00:30Z")), { day: "2026-10-16", rolled: 3 });
  assert.deepEqual(log, ["roll me 2026-10-16T00:00:00.000Z", "mark me 2026-10-16"]);
  assert.equal(await rollOverdueIfNewDay(store, "me", new Date("2026-10-16T18:00:00Z")), null, "not again the same day, so a date you set yourself later is left alone");
  assert.equal(log.length, 2);
  assert.deepEqual(await rollOverdueIfNewDay(store, "me", new Date("2026-10-17T00:00:05Z")), { day: "2026-10-17", rolled: 3 });
  assert.equal(log[2], "roll me 2026-10-17T00:00:00.000Z");
});

test("the new day starts at the account's own midnight", async () => {
  const now = new Date("2026-10-16T05:00:00Z"); // 22:00 on the 15th in Los Angeles, 01:00 on the 16th in New York
  const { store, log } = fakeStore({
    la: { enabled: true, timezone: "America/Los_Angeles", lastDay: "2026-10-15" },
    ny: { enabled: true, timezone: "America/New_York", lastDay: "2026-10-15" },
  });
  const results = await rollEnabledAccounts(store, now);
  assert.deepEqual(results, [{ id: "ny", day: "2026-10-16", rolled: 3 }]);
  assert.deepEqual(log, ["roll ny 2026-10-16T00:00:00.000Z", "mark ny 2026-10-16"], "Los Angeles is still on the 15th");
});

test("a failure leaves the day unmarked so it is tried again, and does not stop other accounts", async () => {
  const { store, log, accounts } = fakeStore(
    { a: { enabled: true, timezone: "UTC", lastDay: "2026-10-15" }, b: { enabled: true, timezone: "UTC", lastDay: "2026-10-15" } },
    { failRoll: new Set(["a"]) },
  );
  const results = await quiet(() => rollEnabledAccounts(store, new Date("2026-10-16T01:00:00Z")));
  assert.deepEqual(results.map((r) => r.id), ["b"]);
  assert.equal(accounts.get("a")!.lastDay, "2026-10-15", "not marked, so the next run tries again");
  assert.ok(!log.includes("mark a 2026-10-16"));
  await assert.rejects(() => rollOverdueIfNewDay(store, "a", new Date("2026-10-16T01:00:00Z")), /boom/);
});

function fakeTimers(start: string) {
  let clock = new Date(start);
  const timers: Array<{ run: () => void; ms: number; cleared: boolean }> = [];
  return {
    options: {
      now: () => clock,
      setTimer: (run: () => void, ms: number) => { const timer = { run, ms, cleared: false }; timers.push(timer); return timer; },
      clearTimer: (handle: unknown) => { (handle as { cleared: boolean }).cleared = true; },
    },
    timers, active: () => timers.filter((t) => !t.cleared),
    set: (to: string) => { clock = new Date(to); },
  };
}
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

test("it sleeps until the next midnight among the accounts, rolls them, then sleeps again", async () => {
  const { store } = fakeStore({
    la: { enabled: true, timezone: "America/Los_Angeles", lastDay: "2026-10-15" },
    ny: { enabled: true, timezone: "America/New_York", lastDay: "2026-10-15" },
  });
  const t = fakeTimers("2026-10-16T02:00:00Z"); // 19:00 in Los Angeles, 22:00 in New York
  const scheduler = createRolloverScheduler(store, t.options);
  await scheduler.refresh();
  assert.equal(t.active().length, 1);
  assert.equal(t.active()[0].ms, 2 * 3600_000 + 30_000, "New York's midnight comes first, plus a short wait");

  t.set("2026-10-16T04:00:30Z");
  const fired = t.active()[0];
  fired.cleared = true; // a timer that has gone off is no longer waiting
  fired.run();
  await flush();
  const next = t.active();
  assert.equal(next.length, 1);
  assert.equal(next[0].ms, 2 * 3600_000 + 59 * 60_000 + 30_000 + 30_000, "then Los Angeles's midnight at 07:00");
});

test("with nobody turned on there is no timer; turning it on starts one, and a refresh replaces it", async () => {
  const { store, accounts } = fakeStore({ me: { enabled: false, timezone: "UTC", lastDay: null } });
  const t = fakeTimers("2026-10-16T12:00:00Z");
  const scheduler = createRolloverScheduler(store, t.options);
  await scheduler.refresh();
  assert.equal(t.timers.length, 0, "nothing to wait for");

  accounts.get("me")!.enabled = true;
  await scheduler.refresh();
  assert.equal(t.active().length, 1);
  assert.equal(t.active()[0].ms, 12 * 3600_000 + 30_000);
  await scheduler.refresh();
  assert.equal(t.active().length, 1, "the earlier timer was cancelled");
  accounts.get("me")!.enabled = false;
  await scheduler.refresh();
  assert.equal(t.active().length, 0, "turning it off cancels the wait");
});

test("it never waits less than a minute, and tries again later if the database cannot be read", async () => {
  const failList = { on: false };
  const { store } = fakeStore({ me: { enabled: true, timezone: "UTC", lastDay: "2026-10-16" } }, { failList });
  const t = fakeTimers("2026-10-16T23:59:55Z");
  const scheduler = createRolloverScheduler(store, t.options);
  await scheduler.refresh();
  assert.equal(t.active()[0].ms, 60_000, "5 seconds to midnight is still a one-minute wait");

  failList.on = true;
  await quiet(() => scheduler.refresh());
  assert.equal(t.active().length, 1);
  assert.equal(t.active()[0].ms, 10 * 60_000, "retries in ten minutes");
});

test("starting catches up on a day missed while the server was down, then schedules", async () => {
  const { store, log } = fakeStore({ me: { enabled: true, timezone: "UTC", lastDay: "2026-10-13" } });
  const t = fakeTimers("2026-10-16T08:00:00Z");
  await createRolloverScheduler(store, t.options).start();
  assert.deepEqual(log, ["roll me 2026-10-16T00:00:00.000Z", "mark me 2026-10-16"]);
  assert.equal(t.active().length, 1);
});

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the setting is stored per account and the database gets the columns on startup", () => {
  const schema = read("../shared/schema.ts");
  assert.ok(schema.includes('autoRollDueDates: boolean("auto_roll_due_dates").default(false)'), "off unless turned on");
  assert.ok(schema.includes('lastDueRollDay: text("last_due_roll_day")'));
  const migrations = read("./migrations.ts");
  assert.ok(migrations.includes("ADD COLUMN IF NOT EXISTS auto_roll_due_dates BOOLEAN DEFAULT false"));
  assert.ok(migrations.includes("ADD COLUMN IF NOT EXISTS last_due_roll_day TEXT"));
  const storage = read("./storage.ts");
  for (const field of ["timezone", "autoRollDueDates", "lastDueRollDay"]) {
    assert.ok(storage.includes(`if (settings.${field} !== undefined) updateData.${field} = settings.${field};`), `${field} is saved`);
  }
});

test("the store moves only active quests with an earlier due date, and only that account's", () => {
  const store = read("./due-date-rollover-store.ts");
  const roll = store.slice(store.indexOf("async rollOverdue"), store.indexOf("async markRolled"));
  for (const condition of ["eq(tasks.userId, userId)", "eq(tasks.completed, false)", "eq(tasks.recycled, false)", "isNotNull(tasks.dueDate)", "lt(tasks.dueDate, today)"]) {
    assert.ok(roll.includes(condition), condition);
  }
  assert.ok(roll.includes("set({ dueDate: today })") && !roll.includes("startDate") && !roll.includes("scheduledTime"), "only the due date changes");
});

test("the routes: a per-account switch, catch-up when quests are loaded, and a re-plan when settings change", () => {
  const routes = read("./routes.ts");
  assert.ok(routes.includes("app.post('/api/settings/auto-roll-due-dates', requireAuth"));
  assert.ok(routes.includes("z.object({ enabled: z.boolean() })"), "only true or false is accepted");
  assert.ok(routes.includes("autoRollDueDates: user.autoRollDueDates === true"), "the page can read the setting");
  assert.ok(routes.includes("...(input.data.enabled ? { lastDueRollDay: localDay(new Date(), user.timezone) } : {})"), "turning it on starts with the next new day");
  assert.equal((routes.match(/void rolloverScheduler\.refresh\(\)/g) ?? []).length, 2, "after the switch and after a timezone change");
  const tasksRoute = routes.slice(routes.indexOf('app.get("/api/tasks"'), routes.indexOf("// Export tasks as CSV"));
  assert.ok(tasksRoute.indexOf("rollOverdueIfNewDay(rolloverStore, userId)") > 0 && tasksRoute.indexOf("rollOverdueIfNewDay") < tasksRoute.indexOf("storage.getTasks(userId)"), "rolled before the list is read");
  assert.ok(read("./index.ts").includes("void rolloverScheduler.start();"));
});

test("Settings shows the switch, and the app reloads quests when the day changes", () => {
  assert.ok(read("../client/src/pages/settings.tsx").includes("<AutoRollSetting isMobile={isMobile} />"));
  const card = read("../client/src/components/auto-roll-setting.tsx");
  assert.ok(card.includes('data-testid="auto-roll-switch"') && card.includes('"/api/settings/auto-roll-due-dates", { enabled: next }'));
  assert.ok(card.includes("client.setQueryData(SETTINGS_KEY, context?.previous)"), "put back if saving fails");
  assert.ok(read("../client/src/App.tsx").includes("useDayRolloverRefresh();"));
  const hook = read("../client/src/hooks/use-day-rollover-refresh.ts");
  assert.ok(hook.includes("if (!enabled) return;") && hook.includes('queryKey: ["/api/tasks"]') && hook.includes('"visibilitychange"'));
});

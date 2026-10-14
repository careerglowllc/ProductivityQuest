import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { registerSmartFocus, type FocusStore } from "./smart-focus";
import { APPLE_WEEKDAY_PROFILE, emptyFocusMemory, type FocusMemory } from "../shared/smart-focus-ai";
test("Smart Focus API isolates accounts, persists feedback, protects dates, caches requests and forgets memories", async () => {
  const memories = new Map<string, FocusMemory>();
  const store: FocusStore = {
    async tasks(id) { return id === "owner" ? [
      { id: 1, title: "Deadline", dueDate: "2026-10-12" },
      { id: 2, title: "Project", importance: "High" }, { id: 3, title: "Missing task" },
    ] : []; },
    async timezone() { return "America/Los_Angeles"; },
    async read(id) { return structuredClone(memories.get(id) ?? emptyFocusMemory()); },
    async change(id, change) { const m = await this.read(id); change(m); memories.set(id, m); },
  };
  let calls = 0;
  const app = express(); app.use(express.json());
  registerSmartFocus(app, (req, res, next) => {
    const user = req.get("x-test-user"); if (!user) { res.sendStatus(401); return; }
    req.session = { userId: user } as any; next();
  }, store, async () => { calls++; return [{ taskId: 3, include: true, score: 80, reason: "Explicit preference" }]; },
  () => true, () => new Date("2026-10-13T02:00:00Z")); // Still Oct 12 in user's timezone.
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/smart-focus`;
  const call = (user: string, method: string, path: string, body?: unknown) => fetch(url + path, {
    method, headers: { "x-test-user": user, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  try {
    for (const [method, path] of [["GET", "/state"], ["POST", "/rank"], ["POST", "/feedback"],
      ["POST", "/dismiss"], ["PATCH", "/settings"], ["DELETE", "/memory"], ["DELETE", "/signals/1"], ["DELETE", "/preferences/x"]]) {
      assert.equal((await call("", method, path)).status, 401);
    }
    assert.equal((await call("other", "POST", "/feedback", { taskId: 2, text: "Not mine" })).status, 404);
    assert.equal((await call("owner", "POST", "/feedback", { taskId: 2, text: " " })).status, 400);
    const saved = await (await call("owner", "POST", "/feedback", { taskId: 3, text: "This is important today because it unblocks launch." })).json();
    assert.ok(saved.preference.id);
    assert.equal((await (await call("other", "GET", "/state")).json()).preferences.length, 0);
    let result = await (await call("owner", "POST", "/rank", {})).json();
    assert.equal(result.day, "2026-10-12"); assert.equal(result.mode, "rules"); assert.equal(calls, 0);
    assert.equal((await call("owner", "POST", "/dismiss", { taskId: 1 })).status, 409);
    await call("owner", "PATCH", "/settings", { enabled: true });
    const responses = await Promise.all([call("owner", "POST", "/rank", {}), call("owner", "POST", "/rank", {})]);
    result = await responses[0].json();
    assert.equal(result.mode, "ai"); assert.ok(result.ids.includes(3)); assert.equal(calls, 1);
    await call("owner", "POST", "/rank", {}); assert.equal(calls, 1);
    await call("owner", "POST", "/dismiss", { taskId: 2 });
    await call("owner", "POST", "/dismiss", { taskId: 2 });
    assert.equal((await (await call("owner", "GET", "/state")).json()).signals[0].days, 1);
    result = await (await call("owner", "POST", "/rank", {})).json(); assert.ok(!result.ids.includes(2));
    await call("owner", "POST", "/dismiss", { taskId: 2, undo: true });
    result = await (await call("owner", "POST", "/rank", {})).json(); assert.ok(result.ids.includes(2));
    await call("other", "DELETE", "/preferences/" + saved.preference.id);
    assert.equal((await (await call("owner", "GET", "/state")).json()).preferences.length, 1);
    await call("owner", "DELETE", "/preferences/" + saved.preference.id);
    assert.equal((await (await call("owner", "GET", "/state")).json()).preferences.length, 0);
    await call("owner", "POST", "/dismiss", { taskId: 2 });
    await call("owner", "DELETE", "/signals/2");
    assert.deepEqual((await (await call("owner", "GET", "/state")).json()).signals, []);
    await call("owner", "DELETE", "/memory");
    assert.deepEqual((await store.read("owner")).preferences, []);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("provider failure is explicit and cached, no repeated paid retry", async () => {
  let calls = 0;
  const app = express(); app.use(express.json());
  registerSmartFocus(app, (req, _res, next) => { req.session = { userId: "test" } as any; next(); }, {
    tasks: async () => [{ id: 1, title: "Important", importance: "High" }],
    timezone: async () => "UTC", read: async () => ({ ...emptyFocusMemory(), enabled: true }), change: async () => {},
  }, async () => { calls++; throw new Error("Provider unavailable"); }, () => true);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/smart-focus/rank`;
    for (let i = 0; i < 2; i++) {
      const result = await (await fetch(url, { method: "POST" })).json();
      assert.equal(result.mode, "rules"); assert.match(result.message, /temporarily unavailable/);
      assert.deepEqual(result.ids, [1]);
    }
    assert.equal(calls, 1);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("rank reports the day's workload and holds back low-priority extras on a busy day", async () => {
  const quests = [
    ...Array.from({ length: 7 }, (_, i) => ({ id: i + 1, title: `Due ${i + 1}`, dueDate: "2026-10-12", duration: 60, importance: i < 2 ? "High" : "Medium" })),
    ...[101, 102, 103].map(id => ({ id, title: `Extra ${id}`, startDate: "2026-10-10", importance: "Low", duration: 15 })),
  ];
  const seen: unknown[] = [];
  const app = express(); app.use(express.json());
  registerSmartFocus(app, (req, _res, next) => { req.session = { userId: "test" } as any; next(); }, {
    tasks: async () => quests, timezone: async () => "UTC",
    read: async () => ({ ...emptyFocusMemory(), enabled: true }), change: async () => {},
  }, async (input) => { seen.push(input.workload); return []; }, () => true, () => new Date("2026-10-12T12:00:00Z"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/smart-focus/rank`;
    const result = await (await fetch(url, { method: "POST" })).json();
    assert.equal(result.workload.level, "busy");
    assert.equal(result.workload.questCount, 7);
    assert.equal(result.workload.committedMinutes, 420);
    assert.equal(result.heldBack, 1);
    assert.equal(result.ids.filter((id: number) => id > 100).length, 2);
    assert.match(result.message, /Busy day: 1 lower-priority quest held back\./);
    assert.equal((seen[0] as { level: string }).level, "busy", "the model is told how heavy the day is");
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("feedback carries an action and where the quest was; actions change the ranking; protected work cannot be taken off", async () => {
  const memories = new Map<string, FocusMemory>();
  const quests = [
    { id: 1, title: "Due today", dueDate: "2026-10-12", importance: "Low" },
    { id: 2, title: "Important", importance: "High", startDate: "2026-10-10" },
    { id: 3, title: "Unqualified", importance: "Low" },
  ];
  const app = express(); app.use(express.json());
  registerSmartFocus(app, (req, _res, next) => { req.session = { userId: "u" } as any; next(); }, {
    tasks: async () => quests, timezone: async () => "UTC",
    read: async () => structuredClone(memories.get("u") ?? emptyFocusMemory()),
    change: async (_id, change) => { const m = structuredClone(memories.get("u") ?? emptyFocusMemory()); change(m); memories.set("u", m); },
  }, async () => [], () => false, () => new Date("2026-10-12T12:00:00Z"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/smart-focus`;
    const post = (path: string, body: unknown) => fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal((await post("/feedback", { taskId: 2, text: "x", action: "teleport" })).status, 400);
    assert.equal((await post("/feedback", { taskId: 2, text: "x", inFocus: "yes" })).status, 400);

    const kept = await (await post("/feedback", { taskId: 2, text: "Right call, this client matters.", action: "keep" })).json();
    assert.equal(kept.preference.action, "keep");
    assert.equal(kept.preference.inFocus, true, "placement is worked out server-side when the client doesn't send it");

    const moved = await (await post("/feedback", { taskId: 3, text: "This needs attention.", action: "include", inFocus: false })).json();
    assert.equal(moved.preference.inFocus, false);
    let ranked = await (await post("/rank", {})).json();
    assert.ok(ranked.ids.includes(3), "moved into Smart Focus");

    const off = await (await post("/feedback", { taskId: 2, text: "Not for this week.", action: "exclude", inFocus: true })).json();
    assert.match(off.message, /off Smart Focus/);
    ranked = await (await post("/rank", {})).json();
    assert.ok(!ranked.ids.includes(2), "taken off Smart Focus");

    const protectedOff = await (await post("/feedback", { taskId: 1, text: "Remove it.", action: "exclude", inFocus: true })).json();
    assert.match(protectedOff.message, /off Smart Focus/);
    ranked = await (await post("/rank", {})).json();
    assert.ok(!ranked.ids.includes(1), "an explicit take-off also removes work due today");

    const plain = await (await post("/feedback", { taskId: 3, text: "Just context." })).json();
    assert.equal(plain.preference.action, undefined);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("the account's work-filter profile is returned, survives Forget everything, and shapes the ranking by weekday", async () => {
  const memories = new Map<string, FocusMemory>([["u", { ...emptyFocusMemory(), profile: APPLE_WEEKDAY_PROFILE }]]);
  const quests = [
    { id: 1, title: "General", importance: "Medium", startDate: "2026-10-01", businessWorkFilter: "General" },
    { id: 2, title: "Apple", importance: "Medium", startDate: "2026-10-01", businessWorkFilter: "Apple" },
  ];
  let now = new Date("2026-10-13T17:00:00Z"); // Tuesday
  const app = express(); app.use(express.json());
  registerSmartFocus(app, (req, _res, next) => { req.session = { userId: "u" } as any; next(); }, {
    tasks: async () => quests, timezone: async () => "UTC",
    read: async () => structuredClone(memories.get("u") ?? emptyFocusMemory()),
    change: async (_id, change) => { const m = structuredClone(memories.get("u") ?? emptyFocusMemory()); change(m); memories.set("u", m); },
  }, async () => [], () => false, () => now);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/smart-focus`;
    const rank = async () => (await (await fetch(base + "/rank", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json()).ids;
    assert.deepEqual((await (await fetch(base + "/state")).json()).profile, APPLE_WEEKDAY_PROFILE);
    assert.deepEqual(await rank(), [2, 1], "Apple first on a Tuesday");
    now = new Date("2026-10-17T17:00:00Z"); // Saturday
    assert.deepEqual(await rank(), [1, 2], "Apple after the others on a Saturday");
    await fetch(base + "/memory", { method: "DELETE" });
    assert.deepEqual(memories.get("u")?.profile, APPLE_WEEKDAY_PROFILE, "forgetting preferences keeps the profile");
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("feedback accepts rank higher and rank lower, and the ranking follows the latest one", async () => {
  const memories = new Map<string, FocusMemory>();
  const quests = [
    { id: 1, title: "First", importance: "High", startDate: "2026-10-01" },
    { id: 2, title: "Second", importance: "Medium", startDate: "2026-10-01" },
    { id: 3, title: "Third", importance: "Low", startDate: "2026-10-01" },
  ];
  const app = express(); app.use(express.json());
  registerSmartFocus(app, (req, _res, next) => { req.session = { userId: "u" } as any; next(); }, {
    tasks: async () => quests, timezone: async () => "UTC",
    read: async () => structuredClone(memories.get("u") ?? emptyFocusMemory()),
    change: async (_id, change) => { const m = structuredClone(memories.get("u") ?? emptyFocusMemory()); change(m); memories.set("u", m); },
  }, async () => [], () => false, () => new Date("2026-10-13T17:00:00Z"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/smart-focus`;
    const post = (path: string, body: unknown) => fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const order = async () => (await (await post("/rank", {})).json()).ids;
    assert.deepEqual(await order(), [1, 2, 3]);
    const up = await (await post("/feedback", { taskId: 3, text: "It unblocks the launch.", action: "higher" })).json();
    assert.equal(up.preference.action, "higher");
    assert.equal(up.preference.inFocus, true, "placement is worked out when the client does not send it");
    assert.match(up.message, /now ranks higher in Smart Focus/);
    assert.deepEqual(await order(), [3, 1, 2]);
    const down = await (await post("/feedback", { taskId: 1, text: "This can wait a few days.", action: "lower" })).json();
    assert.match(down.message, /now ranks lower/);
    assert.deepEqual(await order(), [3, 2, 1]);
    assert.equal((await post("/feedback", { taskId: 2, text: "x", action: "sideways" })).status, 400);
    const state = await (await fetch(base + "/state")).json();
    assert.deepEqual(state.preferences.map((p: { action: string }) => p.action), ["higher", "lower"]);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

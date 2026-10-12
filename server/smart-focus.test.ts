import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { registerSmartFocus, type FocusStore } from "./smart-focus";
import { emptyFocusMemory, type FocusMemory } from "../shared/smart-focus-ai";
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

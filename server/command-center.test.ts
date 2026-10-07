import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { registerCommandCenter, type CommandStore } from "./command-center";
import type { CommandEntry } from "../shared/command-center";

test("Command Center: private import, persistent edits, validation, CRUD and deletion tombstone", async () => {
  const OWNER_EMAIL = "owner@example.test";
  const importedEntry: CommandEntry = {
    id: "finance-2026-10-07", title: "Strategy", category: "finance", date: "2026-10-07",
    notes: "Private notes", allocation: [{ name: "Priority", value: 80 }, { name: "Other", value: 20 }],
    updatedAt: "2026-10-07T12:00:00.000Z",
    briefing: {
      northStar: "Focus", objective: "Make a decision", principles: ["Test first"], metrics: [],
      businesses: [{ name: "Example", role: "Experiment", status: "Resolve", thesis: "Test",
        pros: ["Ready"], cons: ["Uncertain"], actions: ["Measure"], decision: "Decide" }],
      creativeSprint: { budget: "To be scoped", deliverables: [], concepts: [], avoid: [] },
      funnel: ["Visit", "Activate"], diagnostics: [],
      delegation: { own: [], delegate: [], learn: [], screening: [] },
      capitalLadder: [], compoundCycle: [], success: [],
    },
  };
  const importBody = { format: "command-center/v1", ownerEmail: OWNER_EMAIL, entry: importedEntry };
  const records = new Map<string, CommandEntry | null>();
  const key = (user: string, id: string) => `${user}:${id}`;
  const store: CommandStore = {
    email: async user => user === "owner" ? OWNER_EMAIL : "other@example.test",
    list: async user => [...records.entries()].filter(([k, v]) => k.startsWith(`${user}:`) && v).map(([, v]) => v!),
    get: async (user, id) => records.get(key(user, id)) || undefined,
    insertOnce: async (user, entry) => {
      if (records.has(key(user, entry.id))) return false;
      records.set(key(user, entry.id), structuredClone(entry)); return true;
    },
    update: async (user, entry) => {
      if (!records.get(key(user, entry.id))) return false;
      records.set(key(user, entry.id), structuredClone(entry)); return true;
    },
    remove: async (user, id) => {
      if (!records.get(key(user, id))) return false;
      records.set(key(user, id), null); return true;
    },
  };
  const app = express();
  app.use(express.json());
  // Test-only identity middleware, never imported by the application.
  registerCommandCenter(app, (req, res, next) => {
    const user = req.get("x-test-user");
    if (!user) { res.status(401).end(); return; }
    req.session = { userId: user } as any; next();
  }, store);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const port = (server.address() as { port: number }).port;
  const call = (user = "", method = "GET", path = "", body?: unknown) => fetch(`http://127.0.0.1:${port}/api/command-center${path}`, {
    method, headers: { "x-test-user": user, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  try {
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      assert.equal((await call("", method, ["PATCH", "DELETE"].includes(method) ? "/id" : "", method === "POST" || method === "PATCH" ? {} : undefined)).status, 401);
    }
    assert.deepEqual(await (await call("other")).json(), []);
    assert.equal((await call("", "POST", "/import", importBody)).status, 401);
    assert.equal((await call("owner", "POST", "/import", {})).status, 400);
    assert.equal((await call("other", "POST", "/import", importBody)).status, 403);
    assert.equal((await call("owner", "POST", "/import", importBody)).status, 201);
    assert.equal((await call("owner", "POST", "/import", importBody)).status, 409);
    const response = await call("owner");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const seed = (await response.json())[0] as CommandEntry;
    assert.equal(seed.id, importedEntry.id);
    assert.equal(seed.date, "2026-10-07");
    const edited = { ...seed, title: "Edited strategy", notes: "<script>not executable</script>" };
    assert.equal((await call("other", "PATCH", `/${seed.id}`, edited)).status, 404);
    assert.equal((await call("other", "DELETE", `/${seed.id}`)).status, 404);
    assert.equal((await call("owner", "PATCH", `/${seed.id}`, { ...edited, allocation: [{ name: "Focus", value: 20 }] })).status, 400);
    assert.equal((await call("owner", "PATCH", `/${seed.id}`, { ...edited, date: "2026-02-31" })).status, 400);
    assert.equal((await call("owner", "PATCH", `/${seed.id}`, edited)).status, 200);
    const reloaded = (await (await call("owner")).json())[0];
    assert.equal(reloaded.title, edited.title);
    assert.deepEqual(reloaded.briefing, importedEntry.briefing);
    assert.equal(reloaded.notes, edited.notes);
    await Promise.all([call("owner"), call("owner")]);
    assert.equal((await (await call("owner")).json()).length, 1);
    for (const category of ["finance", "mental-health", "fitness", "relationships"]) {
      const result = await call("other", "POST", "", { category, title: "A goal", date: "2026-10-07", notes: "Private", allocation: [] });
      assert.equal(result.status, 201);
      const created = await result.json();
      assert.equal((await call("owner", "DELETE", `/${created.id}`)).status, 404);
      assert.equal((await call("other", "DELETE", `/${created.id}`)).status, 204);
    }
    assert.equal((await call("owner", "DELETE", `/${seed.id}`)).status, 204);
    assert.equal((await call("owner", "POST", "/import", importBody)).status, 409);
    assert.deepEqual(await (await call("owner")).json(), []);
    assert.deepEqual(await (await call("other")).json(), []);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

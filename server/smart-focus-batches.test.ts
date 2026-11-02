import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FOCUS_BATCH_SIZE, adviseInBatches, inBatches } from "./smart-focus-batches";

const quests = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
const advice = (batch: { id: number }[]) => batch.map((q) => ({ taskId: q.id, include: true, score: q.id, reason: "r" }));

test("a hundred quests are split into batches small enough to answer within the time limit, in order", () => {
  const batches = inBatches(quests(100));
  assert.equal(batches.length, 4);
  assert.ok(batches.every((b) => b.length <= FOCUS_BATCH_SIZE));
  assert.deepEqual(batches.flat().map((q) => q.id), quests(100).map((q) => q.id), "nothing lost, nothing reordered");
  assert.deepEqual(inBatches([]), []);
  assert.equal(inBatches(quests(25)).length, 1);
  assert.equal(inBatches(quests(26)).length, 2);
});

test("every batch is asked at once, and the answers come back as one list", async () => {
  let running = 0, peak = 0;
  const out = await adviseInBatches(quests(100), {
    ask: async (batch) => {
      running += 1; peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return advice(batch);
    },
  });
  assert.equal(peak, 4, "all four batches ran side by side, so the wait is one batch's");
  assert.equal(out.length, 100);
  assert.deepEqual(out.map((a) => a.taskId).sort((a, b) => a - b), quests(100).map((q) => q.id));
});

test("a batch that fails costs only its own quests; the rest still count", async () => {
  const failures: number[] = [];
  const out = await adviseInBatches(quests(60), {
    ask: async (batch) => { if (batch[0].id === 26) throw new Error("timed out"); return advice(batch); },
    onBatchError: (_error, batch) => failures.push(batch.length),
  }, 25);
  assert.equal(out.length, 35, "the second batch of 25 is missing, 25 + 10 remain");
  assert.ok(!out.some((a) => a.taskId >= 26 && a.taskId <= 50));
  assert.deepEqual(failures, [25], "the failure is reported");
});

test("when every batch fails the whole request fails with the first error, so the page can say the AI was unavailable", async () => {
  await assert.rejects(adviseInBatches(quests(60), { ask: async () => { throw Object.assign(new Error("credits"), { code: "insufficient_quota" }); } }, 25), (error: any) => error.code === "insufficient_quota");
});

test("advice about a quest that was not asked about, or the same quest twice, is refused", async () => {
  await assert.rejects(adviseInBatches(quests(10), { ask: async (batch) => [...advice(batch), { taskId: 999, include: true, score: 0, reason: "r" }] }), /Invalid recommendation identities/);
  await assert.rejects(adviseInBatches(quests(10), { ask: async (batch) => [...advice(batch), ...advice(batch.slice(0, 1))] }), /Invalid recommendation identities/);
  assert.deepEqual(await adviseInBatches([], { ask: async () => { throw new Error("never asked"); } }), []);
});

test("the OpenAI call goes through the batches", () => {
  const source = readFileSync(new URL("./smart-focus-openai.ts", import.meta.url), "utf8");
  assert.ok(source.includes("adviseInBatches(input.quests"));
  assert.ok(source.includes("quests: candidates") === false);
});

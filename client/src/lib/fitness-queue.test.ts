import test from "node:test";
import assert from "node:assert/strict";
import {
  DAY_CHANGED, MAX_WAITING, NOT_CHANGED, canAdd, isBlocked, isProcessing, nextToSend, queueReducer, runMessage,
  type QueueAction, type QueuedMessage, type RunIo,
} from "./fitness-queue";
import { applyUpdate, type FitnessDraft, type ParseResult } from "./fitness-entry";
import { normalizeMeal } from "@shared/fitness-log";
import { newDraft, type MealDraft } from "@shared/fitness-session";

const DATE = "2026-10-13";
const NOW = new Date("2026-10-13T12:00:00Z");

const run = (actions: QueueAction[], from: QueuedMessage[] = []) => actions.reduce(queueReducer, from);
const add = (id: string, text = id): QueueAction => ({ type: "add", id, text });
const statuses = (queue: QueuedMessage[]) => queue.map((m) => `${m.id}:${m.status}`);

test("messages join the end of the queue, in the order they were typed", () => {
  const queue = run([add("a"), add("b"), add("c")]);
  assert.deepEqual(statuses(queue), ["a:queued", "b:queued", "c:queued"]);
  assert.equal(queue[1].text, "b");
});

test("typing more while one is going in just adds to the queue and does not disturb the one being sent", () => {
  const queue = run([add("a"), { type: "start", id: "a" }, add("b"), add("c")]);
  assert.deepEqual(statuses(queue), ["a:sending", "b:queued", "c:queued"]);
  assert.equal(nextToSend(queue), null, "b waits for a");
  assert.equal(isProcessing(queue), true);
});

test("the queue only holds so many waiting messages", () => {
  const full = run(Array.from({ length: MAX_WAITING + 3 }, (_, i) => add(`m${i}`)));
  assert.equal(full.length, MAX_WAITING);
  assert.equal(canAdd(full), false);
  assert.equal(canAdd(run([add("a")])), true);
  assert.equal(canAdd(queueReducer(full, { type: "done", id: "m0" })), true, "room again once one has gone in");
});

test("a message that went in leaves the queue, and the next one is up", () => {
  const queue = run([add("a"), add("b"), { type: "start", id: "a" }, { type: "done", id: "a" }]);
  assert.deepEqual(statuses(queue), ["b:queued"]);
  assert.equal(nextToSend(queue)?.id, "b");
});

test("only a waiting message can be started, so a repeated start changes nothing", () => {
  const started = run([add("a"), { type: "start", id: "a" }]);
  assert.deepEqual(run([{ type: "start", id: "a" }, { type: "start", id: "zzz" }], started), started);
});

test("a failed message keeps its text and says why, and holds up the ones behind it", () => {
  const queue = run([add("a", "two eggs"), add("b"), { type: "start", id: "a" }, { type: "fail", id: "a", error: "The AI is temporarily unavailable." }]);
  assert.deepEqual(queue[0], { id: "a", text: "two eggs", status: "failed", error: "The AI is temporarily unavailable." });
  assert.equal(isBlocked(queue), true);
  assert.equal(nextToSend(queue), null, "b does not jump ahead of a failed message");
  assert.equal(isProcessing(queue), false, "nothing is going in, so the day can be edited by hand");
});

test("retrying puts the failed message back first in line; removing it lets the rest carry on", () => {
  const failed = run([add("a"), add("b"), { type: "start", id: "a" }, { type: "fail", id: "a", error: "x" }]);
  const retried = queueReducer(failed, { type: "retry", id: "a" });
  assert.deepEqual(statuses(retried), ["a:queued", "b:queued"]);
  assert.equal(retried[0].error, undefined);
  assert.equal(nextToSend(retried)?.id, "a");
  const removed = queueReducer(failed, { type: "remove", id: "a" });
  assert.deepEqual(statuses(removed), ["b:queued"]);
  assert.equal(nextToSend(removed)?.id, "b");
});

test("a message being sent cannot be removed or retried, and an unknown id is ignored", () => {
  const sending = run([add("a"), { type: "start", id: "a" }]);
  assert.deepEqual(run([{ type: "remove", id: "a" }, { type: "retry", id: "a" }, { type: "remove", id: "nope" }, { type: "done", id: "nope" }], sending), sending);
});

test("the day is only locked from hand edits while a message is going in or about to", () => {
  assert.equal(isProcessing([]), false);
  assert.equal(isProcessing(run([add("a")])), true, "about to be sent");
  assert.equal(isProcessing(run([add("a"), { type: "start", id: "a" }])), true);
  assert.equal(isProcessing(run([add("a"), { type: "start", id: "a" }, { type: "fail", id: "a", error: "x" }])), false);
});

// ── running a message ───────────────────────────────────────────────────────
const mealOf = (...names: string[]) => normalizeMeal({ date: DATE, items: names.map((name) => ({ name, calories: 100, protein: 5 })) }, DATE);
const mealResult = (draft: FitnessDraft | null, name: string): ParseResult => ({
  kind: "meal",
  meal: normalizeMeal({ date: draft?.date ?? DATE, items: [...((draft as MealDraft | null)?.summary.items ?? []), { name, calories: 100, protein: 5 }] }, DATE),
});

// The box's own wiring, with the AI replaced: it answers with the day so far plus the new food.
function io(text: string, store: { draft: FitnessDraft | null }, calls: { text: string; heldFoods: number }[] = [], over: Partial<RunIo> = {}): RunIo {
  return {
    text,
    readDraft: () => store.draft,
    send: async (message, current) => { calls.push({ text: message, heldFoods: (current as MealDraft | null)?.summary.items.length ?? 0 }); return mealResult(current, message); },
    apply: (current, result, message) => applyUpdate("meal", current, result, message, NOW, () => "meal-1"),
    commit: (draft) => { store.draft = draft; },
    ...over,
  };
}

test("a message is sent with the day so far, and the answer becomes the day", async () => {
  const store: { draft: FitnessDraft | null } = { draft: null };
  const calls: { text: string; heldFoods: number }[] = [];
  const outcome = await runMessage(io("a bagel", store, calls));
  assert.equal(outcome.ok, true);
  assert.deepEqual(calls, [{ text: "a bagel", heldFoods: 0 }]);
  assert.equal((store.draft as MealDraft).summary.items.length, 1);
  if (outcome.ok) assert.ok(outcome.changes.length > 0);
  const second = await runMessage(io("and a latte", store, calls));
  assert.equal(second.ok, true);
  assert.deepEqual(calls[1], { text: "and a latte", heldFoods: 1 });
  assert.equal((store.draft as MealDraft).summary.items.length, 2);
  assert.deepEqual((store.draft as MealDraft).messages, ["a bagel", "and a latte"]);
});

test("an answer that changes nothing is a failure with an explanation, and the day is not touched", async () => {
  const store: { draft: FitnessDraft | null } = { draft: newDraft("meal-1", NOW, "a bagel", mealOf("bagel")) };
  const before = store.draft;
  const outcome = await runMessage(io("hmm", store, [], { send: async (_m, current) => ({ kind: "meal", meal: (current as MealDraft).summary }) }));
  assert.deepEqual(outcome, { ok: false, error: NOT_CHANGED });
  assert.equal(store.draft, before);
});

test("a failed request gives the server's message, or a friendly one, and the day is not touched", async () => {
  const store: { draft: FitnessDraft | null } = { draft: null };
  const limited = await runMessage(io("x", store, [], { send: async () => { throw new Error('429: {"message":"That is a lot of logging in a short time."}'); } }));
  assert.deepEqual(limited, { ok: false, error: "That is a lot of logging in a short time." });
  const offline = await runMessage(io("x", store, [], { send: async () => { throw new Error("Failed to fetch"); } }));
  assert.equal(offline.ok === false && /Could not reach the AI/.test(offline.error), true);
  assert.equal(store.draft, null);
});

test("an answer for a day that changed while the AI was thinking is thrown away, not written over the change", async () => {
  const store: { draft: FitnessDraft | null } = { draft: null };
  const outcome = await runMessage(io("a bagel", store, [], {
    send: async (message, current) => {
      store.draft = newDraft("meal-other", NOW, "from another device", mealOf("pizza"));
      return mealResult(current, message);
    },
  }));
  assert.deepEqual(outcome, { ok: false, error: DAY_CHANGED });
  assert.equal((store.draft as MealDraft).id, "meal-other", "the other day is still there");
});

test("an answer of the wrong kind is a failure too", async () => {
  const store: { draft: FitnessDraft | null } = { draft: null };
  const outcome = await runMessage(io("a bagel", store, [], { send: async () => ({ kind: "workout", workout: { date: DATE, workoutType: "Pull", exercises: [] } } as unknown as ParseResult) }));
  assert.equal(outcome.ok, false);
  assert.equal(store.draft, null);
});

// ── the queue and the runner together, as the box drives them ───────────────
async function drain(from: QueuedMessage[], make: (text: string) => RunIo): Promise<QueuedMessage[]> {
  let queue = from;
  const dispatch = (action: QueueAction) => { queue = queueReducer(queue, action); };
  for (let next = nextToSend(queue); next; next = nextToSend(queue)) {
    dispatch({ type: "start", id: next.id });
    const outcome = await runMessage(make(next.text));
    dispatch(outcome.ok ? { type: "done", id: next.id } : { type: "fail", id: next.id, error: outcome.error });
  }
  return queue;
}

test("three messages typed in a row go in one after the other, each seeing the ones before it", async () => {
  const store: { draft: FitnessDraft | null } = { draft: null };
  const calls: { text: string; heldFoods: number }[] = [];
  const left = await drain(run([add("1", "a bagel"), add("2", "a latte"), add("3", "salmon")]), (text) => io(text, store, calls));
  assert.deepEqual(left, []);
  assert.deepEqual(calls, [{ text: "a bagel", heldFoods: 0 }, { text: "a latte", heldFoods: 1 }, { text: "salmon", heldFoods: 2 }]);
  assert.deepEqual((store.draft as MealDraft).summary.items.map((i) => i.name), ["a bagel", "a latte", "salmon"]);
  assert.equal((store.draft as MealDraft).summary.totals.calories, 300);
});

test("one that fails stops the ones behind it; after a retry everything goes in, in order", async () => {
  const store: { draft: FitnessDraft | null } = { draft: null };
  let failNext = true;
  const make = (text: string) => io(text, store, [], {
    send: async (message, current) => { if (message === "a latte" && failNext) { failNext = false; throw new Error("Failed to fetch"); } return mealResult(current, message); },
  });
  const stuck = await drain(run([add("1", "a bagel"), add("2", "a latte"), add("3", "salmon")]), make);
  assert.deepEqual(statuses(stuck), ["2:failed", "3:queued"]);
  assert.deepEqual((store.draft as MealDraft).summary.items.map((i) => i.name), ["a bagel"], "salmon did not jump the queue");
  const done = await drain(queueReducer(stuck, { type: "retry", id: "2" }), make);
  assert.deepEqual(done, []);
  assert.deepEqual((store.draft as MealDraft).summary.items.map((i) => i.name), ["a bagel", "a latte", "salmon"]);
});

test("messages typed while others are going in are queued behind them and still end up in order", async () => {
  const store: { draft: FitnessDraft | null } = { draft: null };
  let queue = run([add("1", "a bagel"), { type: "start", id: "1" }]);
  const first = runMessage(io("a bagel", store));
  queue = run([add("2", "a latte"), add("3", "salmon")], queue);
  assert.equal(nextToSend(queue), null, "still sending the first");
  const outcome = await first;
  queue = queueReducer(queue, outcome.ok ? { type: "done", id: "1" } : { type: "fail", id: "1", error: "x" });
  const left = await drain(queue, (text) => io(text, store));
  assert.deepEqual(left, []);
  assert.deepEqual((store.draft as MealDraft).summary.items.map((i) => i.name), ["a bagel", "a latte", "salmon"]);
});

test("photos ride along with their message through the queue and into the request", async () => {
  const shots = ["data:image/jpeg;base64,AAAA", "data:image/jpeg;base64,BBBB"];
  let queue = run([add("1", "this plate"), add("2", "and this")]);
  queue = queueReducer([], { type: "add", id: "1", text: "this plate", photos: shots });
  assert.deepEqual(queue[0].photos, shots);
  queue = run([{ type: "start", id: "1" }, { type: "fail", id: "1", error: "x" }], queue);
  assert.deepEqual(queue[0].photos, shots, "a failed message keeps its photos");
  queue = queueReducer(queue, { type: "retry", id: "1" });
  assert.deepEqual([queue[0].status, queue[0].photos, queue[0].error], ["queued", shots, undefined]);
  assert.equal(queueReducer([], { type: "add", id: "3", text: "no photos" })[0].photos, undefined);

  const store: { draft: FitnessDraft | null } = { draft: null };
  const sent: string[][] = [];
  const outcome = await runMessage({ ...io("this plate", store), photos: shots, send: async (message, current, photos) => { sent.push(photos); return mealResult(current, message); } });
  assert.equal(outcome.ok, true);
  assert.deepEqual(sent, [shots]);
  await runMessage({ ...io("no photos", store), send: async (message, current, photos) => { sent.push(photos); return mealResult(current, message); } });
  assert.deepEqual(sent[1], [], "a message without photos sends an empty list");
});

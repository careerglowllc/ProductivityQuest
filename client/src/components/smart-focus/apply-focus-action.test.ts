import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFocusAction } from "./apply-focus-action";
import type { FocusRanking } from "./use-smart-focus";
import type { FocusQuest } from "@shared/smart-focus-ai";

const day = "2026-10-13";
const due = `${day}T00:00:00.000Z`;
// 1 and 2 are due today (top group), 3 starts today, 4 to 6 are ordinary.
const tasks: FocusQuest[] = [
  { id: 1, title: "a", dueDate: due }, { id: 2, title: "b", dueDate: "2026-10-01T00:00:00.000Z" }, { id: 3, title: "c", startDate: due },
  { id: 4, title: "d" }, { id: 5, title: "e" }, { id: 6, title: "f" }, { id: 7, title: "g" },
];
const ranking = (ids: number[]): FocusRanking => ({ ids, reasons: { "4": "Start date reached or important deadline approaching." }, mode: "ai", message: "", day, total: ids.length, protectedCount: 3 });
const base = () => ranking([1, 2, 3, 4, 5, 6]);

test("taking a quest off removes it at once, even from the top group, and lowers the count", () => {
  const next = applyFocusAction(base(), 4, "exclude", tasks);
  assert.deepEqual(next.ids, [1, 2, 3, 5, 6]);
  assert.equal(next.total, 5);
  assert.deepEqual(applyFocusAction(base(), 1, "exclude", tasks).ids, [2, 3, 4, 5, 6]);
});

test("moving a quest in puts it at the front of the main group, below what is due or starting today", () => {
  const next = applyFocusAction(base(), 7, "include", tasks);
  assert.deepEqual(next.ids, [1, 2, 3, 7, 4, 5, 6]);
  assert.equal(next.total, 7);
  assert.equal(next.reasons["7"], "You moved this into Smart Focus.");
  assert.deepEqual(applyFocusAction(base(), 5, "include", tasks).ids, base().ids, "already listed: no change");
});

test("rank higher moves a quest up a whole group: front of the next group above", () => {
  assert.deepEqual(applyFocusAction(base(), 6, "higher", tasks).ids, [1, 2, 6, 3, 4, 5], "main group to starts-today, ahead of its quests");
  assert.deepEqual(applyFocusAction(base(), 3, "higher", tasks).ids, [3, 1, 2, 4, 5, 6], "starts-today to the very front");
  assert.deepEqual(applyFocusAction(base(), 2, "higher", tasks).ids, [2, 1, 3, 4, 5, 6], "due-today quests reorder among themselves");
});

test("each further request moves it another group, so repeated requests keep working", () => {
  assert.deepEqual(applyFocusAction(base(), 6, "higher", tasks, 1).ids, [6, 1, 2, 3, 4, 5], "second request: past everything due today");
  assert.deepEqual(applyFocusAction(base(), 6, "higher", tasks, 3).ids, [6, 1, 2, 3, 4, 5], "three steps is the most");
});

test("rank lower moves a quest down a whole group: back of the next group below", () => {
  assert.deepEqual(applyFocusAction(base(), 1, "lower", tasks).ids, [2, 3, 1, 4, 5, 6], "due-today to the back of starts-today");
  assert.deepEqual(applyFocusAction(base(), 1, "lower", tasks, -1).ids, [2, 3, 4, 5, 6, 1], "second request: into the main group");
  assert.deepEqual(applyFocusAction(base(), 4, "lower", tasks).ids, [1, 2, 3, 5, 6, 4], "the bottom group goes to the back");
});

test("a request that cancels an earlier one leaves the list for the server to put right", () => {
  assert.deepEqual(applyFocusAction(base(), 4, "lower", tasks, 1).ids, base().ids);
  assert.deepEqual(applyFocusAction(base(), 4, "higher", tasks, -1).ids, base().ids);
});

test("ranking notes are added to the reason once, keeping what was there", () => {
  const once = applyFocusAction(base(), 4, "higher", tasks);
  assert.equal(once.reasons["4"], "Start date reached or important deadline approaching. You asked for this to rank higher.");
  assert.equal(applyFocusAction(once, 4, "higher", tasks).reasons["4"], once.reasons["4"]);
});

test("ranking a quest that is not listed, keeping one, or an unknown id changes nothing", () => {
  assert.deepEqual(applyFocusAction(base(), 7, "higher", tasks).ids, base().ids);
  assert.deepEqual(applyFocusAction(base(), 7, "lower", tasks).ids, base().ids);
  assert.deepEqual(applyFocusAction(base(), 4, "keep", tasks).ids, base().ids);
  assert.deepEqual(applyFocusAction(base(), 99, "exclude", tasks).ids, base().ids);
  assert.deepEqual(applyFocusAction(ranking([]), 4, "higher", []).ids, []);
});

test("the original ranking is never modified", () => {
  const original = base();
  applyFocusAction(original, 4, "exclude", tasks);
  applyFocusAction(original, 6, "higher", tasks);
  assert.deepEqual(original.ids, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(original.reasons, { "4": "Start date reached or important deadline approaching." });
});

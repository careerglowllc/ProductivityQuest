import { test } from "node:test";
import assert from "node:assert/strict";
import { selectFocus } from "./select-focus";
import type { FocusRanking } from "./use-smart-focus";

const ranking = (ids: number[]): FocusRanking => ({
  ids, reasons: {}, mode: "rules", message: "", day: "2026-03-12", total: ids.length, protectedCount: ids.length,
});
test("server order is authoritative and not capped at ten", () => {
  const tasks = Array.from({ length: 14 }, (_, index) => ({ id: index + 1, completed: false, questType: "general" }));
  const ids = tasks.map((task) => task.id).reverse();
  const focus = selectFocus(tasks, ranking(ids));
  assert.equal(focus.shown, 14);
  assert.deepEqual(focus.groups.flatMap((group) => group.quests.map((task) => task.id)), ids);
  assert.equal(focus.groups[0].label, "Your focus");
});
test("stale completed, removed and reminder IDs never enter the queue", () => {
  const focus = selectFocus([
    { id: 1, completed: true, questType: "general" },
    { id: 2, completed: false, questType: "reminder" },
    { id: 3, completed: false, questType: "general" },
  ], ranking([1, 2, 99, 3, 3]));
  assert.deepEqual(focus.groups.flatMap((group) => group.quests.map((task) => task.id)), [3]);
  assert.equal(focus.shown, 1);
});
test("an empty server ranking does not silently repopulate from local rules", () => {
  const focus = selectFocus([{ id: 1, dueDate: "2026-03-12" }], ranking([]), new Date("2026-03-12T12:00:00Z"));
  assert.equal(focus.shown, 0);
});
test("without a response the existing rules and bands are preserved", () => {
  const focus = selectFocus([
    { id: 1, dueDate: "2026-03-12" },
    { id: 2, questType: "reminder", dueDate: "2026-03-12" },
    { id: 3, completed: true, dueDate: "2026-03-12" },
  ], undefined, new Date(2026, 2, 12, 12));
  assert.equal(focus.shown, 1);
  assert.equal(focus.groups[0].band, "urgent");
});

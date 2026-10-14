import test from "node:test";
import assert from "node:assert/strict";
import { childrenAtStake, planChildren, type QuestNode } from "./questline-delete";

// A -> B -> C -> D, and E beside B (also under A).
const line = (over: Record<number, Partial<QuestNode>> = {}): QuestNode[] => [
  { id: 1, title: "A", parentTaskId: null, indentLevel: 0 },
  { id: 2, title: "B", parentTaskId: 1, indentLevel: 1 },
  { id: 3, title: "C", parentTaskId: 2, indentLevel: 2 },
  { id: 4, title: "D", parentTaskId: 3, indentLevel: 3 },
  { id: 5, title: "E", parentTaskId: 1, indentLevel: 1 },
].map((task) => ({ ...task, ...over[task.id] }));

test("keep and move up: B goes, C joins A, and D stays under C one level higher", () => {
  const plan = planChildren(line(), [2], "promote");
  assert.deepEqual(plan.deleteIds, [2]);
  assert.deepEqual(plan.reparent, [{ id: 3, parentTaskId: 1, indentLevel: 1 }, { id: 4, parentTaskId: 3, indentLevel: 2 }]);
});

test("delete them too: B, C and D go, and nothing else moves", () => {
  const plan = planChildren(line(), [2], "delete");
  assert.deepEqual(plan.deleteIds.sort(), [2, 3, 4]);
  assert.deepEqual(plan.reparent, []);
});

test("deleting the first quest moves the next ones to the top of the questline", () => {
  const plan = planChildren(line(), [1], "promote");
  assert.deepEqual(plan.deleteIds, [1]);
  assert.deepEqual(plan.reparent, [
    { id: 2, parentTaskId: null, indentLevel: 0 },
    { id: 3, parentTaskId: 2, indentLevel: 1 },
    { id: 4, parentTaskId: 3, indentLevel: 2 },
    { id: 5, parentTaskId: null, indentLevel: 0 },
  ]);
});

test("deleting a quest and one of its children together joins the grandchild to the survivor", () => {
  const plan = planChildren(line(), [2, 3], "promote");
  assert.deepEqual(plan.deleteIds.sort(), [2, 3]);
  assert.deepEqual(plan.reparent, [{ id: 4, parentTaskId: 1, indentLevel: 1 }]);
});

test("a last quest has nothing after it, so nothing moves and nothing is asked", () => {
  assert.deepEqual(planChildren(line(), [4], "promote"), { deleteIds: [4], reparent: [] });
  assert.equal(childrenAtStake(line(), [4]), null);
  assert.equal(childrenAtStake(line(), [5]), null);
});

test("finished quests are never deleted, even with delete them too, but they move up so nothing points at a deleted quest", () => {
  const tasks = line({ 3: { completed: true } });
  const plan = planChildren(tasks, [2], "delete");
  assert.deepEqual(plan.deleteIds, [2], "D hangs under the finished C, so it stays too");
  assert.deepEqual(plan.reparent, [{ id: 3, parentTaskId: 1, indentLevel: 1 }, { id: 4, parentTaskId: 3, indentLevel: 2 }]);
  assert.equal(planChildren(tasks, [3], "promote").deleteIds.length, 0, "a finished quest cannot be deleted");
  assert.equal(childrenAtStake(tasks, [2]), null, "only a finished quest follows B, so there is nothing to ask");
});

test("quests deleted earlier under the deleted one move up as well", () => {
  const tasks = line({ 3: { recycled: true } });
  const plan = planChildren(tasks, [2], "promote");
  assert.deepEqual(plan.reparent.map((move) => move.id), [3, 4]);
  assert.equal(childrenAtStake(tasks, [2]), null);
});

test("a quest with no stored indent level is placed by how deep it really is", () => {
  const tasks = line({ 1: { indentLevel: null }, 2: { indentLevel: null }, 3: { indentLevel: null }, 4: { indentLevel: null } });
  assert.deepEqual(planChildren(tasks, [2], "promote").reparent, [{ id: 3, parentTaskId: 1, indentLevel: 1 }, { id: 4, parentTaskId: 3, indentLevel: 2 }]);
});

test("a loop in the data cannot hang it", () => {
  const loop: QuestNode[] = [{ id: 1, parentTaskId: 2 }, { id: 2, parentTaskId: 1 }, { id: 3, parentTaskId: 2 }];
  assert.ok(planChildren(loop, [2], "delete").deleteIds.includes(2));
  assert.ok(Array.isArray(planChildren(loop, [1], "promote").reparent));
});

test("the dialog is told who is being deleted, what follows, and where it would connect", () => {
  assert.deepEqual(childrenAtStake(line(), [2]), { deleting: ["B"], children: ["C", "D"], connectsTo: ["A"], toTop: false });
  assert.deepEqual(childrenAtStake(line(), [1]), { deleting: ["A"], children: ["B", "C", "D", "E"], connectsTo: [], toTop: true });
  assert.deepEqual(childrenAtStake(line(), [2, 3]), { deleting: ["B", "C"], children: ["D"], connectsTo: ["A"], toTop: false });
  assert.deepEqual(childrenAtStake([{ id: 1, parentTaskId: null }, { id: 2, parentTaskId: 1 }], [1]), { deleting: ["Untitled quest"], children: ["Untitled quest"], connectsTo: [], toTop: true });
});

test("the list of quests passed in is not changed", () => {
  const tasks = line();
  const copy = JSON.parse(JSON.stringify(tasks));
  planChildren(tasks, [2], "promote");
  childrenAtStake(tasks, [2]);
  assert.deepEqual(tasks, copy);
});

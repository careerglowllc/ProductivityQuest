import { test } from "node:test";
import assert from "node:assert/strict";
import { rankFocus, eligibleFocus, protectedFocus, emptyFocusMemory, focusSignals, type FocusQuest } from "./smart-focus-ai";
const day = "2026-10-12";
const task = (id: number, extra: Partial<FocusQuest> = {}): FocusQuest => ({ id, title: `Task ${id}`, ...extra });
test("all urgent and start-today tasks survive the cap and hostile AI advice", () => {
  const quests = Array.from({ length: 15 }, (_, i) => task(i + 1, { dueDate: day }));
  quests.push(task(30, { startDate: day }), task(31, { importance: "Pareto" }));
  const memory = emptyFocusMemory(); memory.dismissals.push({ taskId: 1, taskTitle: "Task", day });
  const result = rankFocus(quests, day, memory, quests.map(q => ({ taskId: q.id, include: false, score: -100, reason: "Exclude all" })));
  assert.equal(result.protectedCount, 16); assert.equal(result.ids.length, 16);
  assert.ok(result.ids.includes(1)); assert.ok(result.ids.includes(30)); assert.ok(!result.ids.includes(31));
});
test("future starts, reminders, completed and recycled tasks cannot be added by AI", () => {
  const quests = [task(1, { startDate: "2026-10-13", importance: "Pareto" }), task(2, { questType: "reminder", dueDate: day }),
    task(3, { completed: true, dueDate: day }), task(4, { recycled: true, dueDate: day }), task(5, { importance: "High" })];
  const advice = quests.map(q => ({ taskId: q.id, include: true, score: 100, reason: "Include" }));
  assert.deepEqual(rankFocus(quests, day, emptyFocusMemory(), advice).ids, [5]);
  assert.equal(eligibleFocus(task(6, { startDate: "2026-10-20", dueDate: day }), day), true);
});
test("written AI recommendations can include missing undated work; dismissal is temporary and undoable", () => {
  const memory = emptyFocusMemory(), quests = [task(1)];
  const advice = [{ taskId: 1, include: true, score: 80, reason: "User explained its importance." }];
  assert.deepEqual(rankFocus(quests, day, memory).ids, []);
  assert.deepEqual(rankFocus(quests, day, memory, advice).ids, [1]);
  memory.dismissals.push({ taskId: 1, taskTitle: "Task", day });
  assert.deepEqual(rankFocus(quests, day, memory, advice).ids, []);
  assert.deepEqual(rankFocus(quests, "2026-10-13", memory, advice).ids, [1]);
});
test("implicit evidence counts distinct days, expires, never hides a task permanently", () => {
  const memory = emptyFocusMemory(); memory.enabled = true;
  memory.dismissals = ["2026-10-08", "2026-10-08", "2026-10-09", "2026-10-10", "2026-08-01"]
    .map(day => ({ taskId: 1, taskTitle: "Task", day }));
  assert.equal(focusSignals(memory, day)[0].days, 3);
  const result = rankFocus([task(1, { importance: "High" }), task(2, { importance: "High" })], day, memory);
  assert.deepEqual(result.ids, [2, 1]);
  assert.match(result.reasons[1], /3 distinct days/);
  assert.equal(protectedFocus(task(1, { startDate: day }), day), true);
});
test("explicit feedback may exclude non-protected work, never due-today work", () => {
  const memory = emptyFocusMemory();
  memory.preferences = [1, 2].map(taskId => ({ id: String(taskId), taskId, taskTitle: "Task", text: "Do not recommend this today.", createdAt: day }));
  const advice = [1, 2].map(taskId => ({ taskId, include: false, score: -100, reason: "User requested deferral." }));
  const result = rankFocus([task(1, { importance: "High" }), task(2, { dueDate: day })], day, memory, advice);
  assert.deepEqual(result.ids, [2]);
});

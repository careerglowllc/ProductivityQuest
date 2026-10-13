import { test } from "node:test";
import assert from "node:assert/strict";
import { rankFocus, eligibleFocus, protectedFocus, emptyFocusMemory, focusSignals, focusWorkload, isRoutine, DEFAULT_FOCUS_TUNING, type FocusQuest } from "./smart-focus-ai";
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

// ── Workload-aware focus: a busy day makes room by holding back optional low-priority quests ──
const committed = (count: number, minutes: number, high: number, firstId = 1) =>
  Array.from({ length: count }, (_, i) => task(firstId + i, { dueDate: day, duration: minutes, importance: i < high ? "High" : "Medium" }));
// Optional work: its start date has passed, so it is eligible but not committed for today.
const optional = (id: number, importance: string, extra: Partial<FocusQuest> = {}) => task(id, { startDate: "2026-10-10", importance, ...extra });
const listedExtras = (ids: number[]) => ids.filter(id => id > 100);

test("workload level is measured from what is due or starting today", () => {
  assert.equal(focusWorkload([], day).level, "light");
  assert.deepEqual(focusWorkload(committed(3, 30, 0), day), { level: "light", pressure: 2.1, committedMinutes: 90, questCount: 3, highPriorityCount: 0 });
  assert.equal(focusWorkload(committed(5, 30, 2), day).level, "normal");
  assert.equal(focusWorkload(committed(7, 60, 2), day).level, "busy");
  assert.equal(focusWorkload(committed(6, 90, 3), day).level, "heavy");
});

test("more priority, more quests and longer quests each raise the load", () => {
  const base = focusWorkload(committed(4, 30, 0), day).pressure;
  assert.ok(focusWorkload(committed(4, 30, 3), day).pressure > base, "more high-priority quests");
  assert.ok(focusWorkload(committed(6, 30, 0), day).pressure > base, "more quests");
  assert.ok(focusWorkload(committed(4, 90, 0), day).pressure > base, "longer quests");
});

test("starting-today quests count toward the load; optional and finished work does not", () => {
  const quests = [...committed(2, 30, 0), task(10, { startDate: day, duration: 60 }), optional(101, "Low", { duration: 600 }),
    task(11, { dueDate: day, duration: 600, completed: true }), task(12, { dueDate: day, duration: 600, questType: "reminder" })];
  const load = focusWorkload(quests, day);
  assert.equal(load.questCount, 3);
  assert.equal(load.committedMinutes, 120);
});

test("a quest with no duration is assumed to take 30 minutes", () => {
  assert.equal(focusWorkload([task(1, { dueDate: day }), task(2, { dueDate: day, duration: 0 })], day).committedMinutes, 60);
});

test("routine quests are the ones that repeat", () => {
  for (const recurType of ["daily", "weekly", "every 2 months", "3x week", "Monthly"]) assert.equal(isRoutine(task(1, { recurType })), true, recurType);
  for (const recurType of ["one-time", "⏳One-time", "none", "", null, undefined]) assert.equal(isRoutine(task(1, { recurType })), false, String(recurType));
});

test("a light day keeps every low-priority extra", () => {
  const quests = [...committed(2, 30, 0), ...[101, 102, 103, 104, 105, 106].map(id => optional(id, "Low"))];
  const result = rankFocus(quests, day, emptyFocusMemory());
  assert.equal(result.workload?.level, "light");
  assert.equal(listedExtras(result.ids).length, 6);
  assert.equal(result.heldBack, 0);
  assert.doesNotMatch(result.message, /held back/);
});

test("a full day lists only a few low-priority extras", () => {
  const quests = [...committed(5, 30, 2), ...[101, 102, 103, 104, 105, 106, 107].map(id => optional(id, "Low"))];
  const result = rankFocus(quests, day, emptyFocusMemory());
  assert.equal(result.workload?.level, "normal");
  assert.equal(listedExtras(result.ids).length, DEFAULT_FOCUS_TUNING.lowPriorityExtras.normal);
  assert.equal(result.heldBack, 3);
  assert.equal(result.total, 5 + 4);
  assert.match(result.message, /Full day: 3 lower-priority quests held back\./);
});

test("a busy day lists fewer low-priority extras and no routines", () => {
  const quests = [...committed(7, 60, 2),
    ...[101, 102, 103].map(id => optional(id, "Low")), ...[104, 105].map(id => optional(id, "Low", { recurType: "daily" }))];
  const result = rankFocus(quests, day, emptyFocusMemory());
  assert.equal(result.workload?.level, "busy");
  assert.deepEqual(listedExtras(result.ids).sort(), [101, 102]);
  assert.equal(result.heldBack, 3);
  assert.match(result.message, /Busy day: 3 lower-priority quests held back\./);
});

test("a heavy day lists no low-priority extras, but still lists high-priority work", () => {
  const quests = [...committed(6, 90, 3), ...[101, 102, 103].map(id => optional(id, "Low")), optional(110, "Pareto", { startDate: undefined })];
  const result = rankFocus(quests, day, emptyFocusMemory());
  assert.equal(result.workload?.level, "heavy");
  assert.deepEqual(listedExtras(result.ids), [110]);
  assert.equal(result.heldBack, 3);
  assert.match(result.message, /Heavy day: 3 lower-priority quests held back\./);
});

test("when slots are limited, routines and non-deadline quests go first to the back", () => {
  const quests = [...committed(5, 30, 2),
    ...[201, 202, 203, 204, 205].map(id => optional(id, "Low", { recurType: "weekly" })),
    optional(101, "Low"), optional(102, "Low")];
  const ids = rankFocus(quests, day, emptyFocusMemory()).ids;
  assert.ok(ids.includes(101) && ids.includes(102), "non-routine quests take slots first");
  assert.equal(ids.filter(id => id > 200).length, 2, "routines fill only what is left");
  const tight = { ...DEFAULT_FOCUS_TUNING, lowPriorityExtras: { light: 1, normal: 1, busy: 1, heavy: 1 } };
  const picked = rankFocus([...committed(2, 30, 0), optional(101, "Low"), optional(102, "Low", { questType: "deadline" })], day, emptyFocusMemory(), undefined, tight).ids;
  assert.deepEqual(listedExtras(picked), [102], "a deadline quest beats a general one");
});

test("quests due or starting today are never held back, however busy the day", () => {
  const lowDueToday = Array.from({ length: 6 }, (_, i) => task(40 + i, { dueDate: day, importance: "Low", duration: 120, recurType: "daily" }));
  const result = rankFocus([...committed(6, 90, 3), ...lowDueToday], day, emptyFocusMemory());
  assert.equal(result.workload?.level, "heavy");
  for (const q of lowDueToday) assert.ok(result.ids.includes(q.id));
  assert.equal(result.heldBack, 0);
});

test("a quest the user explicitly asked for is not held back", () => {
  const memory = emptyFocusMemory();
  memory.preferences = [{ id: "p", taskId: 150, taskTitle: "Task 150", text: "This matters to me today.", createdAt: day }];
  const quests = [...committed(6, 90, 3), optional(150, "Low"), optional(151, "Low")];
  const advice = [150, 151].map(taskId => ({ taskId, include: true, score: 50, reason: "Wanted" }));
  const ids = rankFocus(quests, day, memory, advice).ids;
  assert.ok(ids.includes(150));
  assert.ok(!ids.includes(151));
});

test("AI advice cannot bring held-back quests back on a heavy day", () => {
  const lows = [101, 102, 103].map(id => optional(id, "Low"));
  const advice = lows.map(q => ({ taskId: q.id, include: true, score: 100, reason: "Include" }));
  const result = rankFocus([...committed(6, 90, 3), ...lows], day, emptyFocusMemory(), advice);
  assert.deepEqual(listedExtras(result.ids), []);
  assert.equal(result.mode, "ai");
});

test("limits come from the tuning, so an account can override them later", () => {
  const quests = [...committed(6, 90, 3), ...[101, 102, 103].map(id => optional(id, "Low"))];
  const generous = { ...DEFAULT_FOCUS_TUNING, lowPriorityExtras: { ...DEFAULT_FOCUS_TUNING.lowPriorityExtras, heavy: 2 }, routinesAllowed: { ...DEFAULT_FOCUS_TUNING.routinesAllowed, heavy: true } };
  assert.equal(listedExtras(rankFocus(quests, day, emptyFocusMemory(), undefined, generous).ids).length, 2);
  const eager = { ...DEFAULT_FOCUS_TUNING, levelStarts: { normal: 50, busy: 60, heavy: 70 } };
  assert.equal(rankFocus(quests, day, emptyFocusMemory(), undefined, eager).workload?.level, "light");
  assert.equal(listedExtras(rankFocus(quests, day, emptyFocusMemory(), undefined, eager).ids).length, 3);
});

test("a day with nothing committed has no workload pressure and holds nothing back", () => {
  const result = rankFocus([optional(101, "Low"), optional(102, "Medium")], day, emptyFocusMemory());
  assert.deepEqual(result.workload, { level: "light", pressure: 0, committedMinutes: 0, questCount: 0, highPriorityCount: 0 });
  assert.equal(result.heldBack, 0);
  assert.deepEqual(result.ids.sort(), [101, 102]);
});

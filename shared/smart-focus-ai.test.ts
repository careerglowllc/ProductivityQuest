import { test } from "node:test";
import assert from "node:assert/strict";
import { rankFocus, eligibleFocus, protectedFocus, emptyFocusMemory, focusSignals, focusWorkload, isRoutine, DEFAULT_FOCUS_TUNING, focusStances, focusActionLabel, workFilterStep, workFilterOf, isWeekendDay, APPLE_WEEKDAY_PROFILE, focusOrderShifts, focusGroup, type FocusAction, type FocusQuest, type FocusMemory } from "./smart-focus-ai";
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
test("AI can include undated work; dismissal is temporary and undoable", () => {
  const memory = emptyFocusMemory(), quests = [task(1)];
  const advice = [{ taskId: 1, include: true, score: 80, reason: "User explained its importance." }];
  const result = rankFocus(quests, day, memory, advice);
  assert.deepEqual(result.ids, [1]);
  assert.equal(result.reasons[1], "User explained its importance.");
  memory.dismissals.push({ taskId: 1, taskTitle: "Task", day });
  assert.deepEqual(rankFocus(quests, day, memory, advice).ids, []);
  assert.deepEqual(rankFocus(quests, day, memory).ids, [], "dismissed work is not topped up either");
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

// ── Feedback with an action: move into Smart Focus, take off, or keep where it is ──
const withAction = (taskId: number, action: FocusAction, inFocus?: boolean) => {
  const memory = emptyFocusMemory();
  memory.preferences = [{ id: `p${taskId}${action}`, taskId, taskTitle: `Task ${taskId}`, text: "Because.", createdAt: day, action, ...(inFocus === undefined ? {} : { inFocus }) }];
  return memory;
};

const fullList = () => Array.from({ length: 10 }, (_, index) => task(index + 10, { importance: "High" }));

test("moving a quest into Smart Focus lists it even when the list is full and nothing else qualifies it", () => {
  const quests = [...fullList(), task(1, { importance: "Low" })];
  assert.ok(!rankFocus(quests, day, emptyFocusMemory()).ids.includes(1));
  const result = rankFocus(quests, day, withAction(1, "include", false));
  assert.ok(result.ids.includes(1));
  assert.equal(result.reasons[1], "You moved this into Smart Focus.");
});

test("a move into Smart Focus beats the model saying no, and outranks other optional work", () => {
  const quests = [task(1, { importance: "Low" }), task(2, { importance: "Pareto", startDate: "2026-10-10" })];
  const memory = withAction(1, "include", false);
  const advice = [{ taskId: 1, include: false, score: -100, reason: "Skip" }];
  assert.deepEqual(rankFocus(quests, day, memory, advice).ids, [1, 2]);
});

test("a move into Smart Focus survives a heavy day", () => {
  const heavy = committed(6, 90, 3);
  const result = rankFocus([...heavy, task(150, { importance: "Low" }), task(151, { importance: "Low" })], day, withAction(150, "include", false));
  assert.equal(result.workload?.level, "heavy");
  assert.ok(result.ids.includes(150));
  assert.ok(!result.ids.includes(151));
});

test("a move into Smart Focus brings in a quest that has not started yet", () => {
  const quests = [task(7, { startDate: "2026-10-20", importance: "Low" })];
  assert.deepEqual(rankFocus(quests, day, emptyFocusMemory()).ids, []);
  assert.deepEqual(rankFocus(quests, day, withAction(7, "include", false)).ids, [7]);
});

test("a move into Smart Focus beats today's Not today, but never revives finished work or reminders", () => {
  const memory = withAction(1, "include", false);
  memory.dismissals = [{ taskId: 1, taskTitle: "Task 1", day }];
  assert.deepEqual(rankFocus([task(1, { startDate: "2026-10-01", importance: "Low" })], day, memory).ids, [1]);
  const gone = [task(2, { completed: true }), task(3, { recycled: true }), task(4, { questType: "reminder" })];
  const more = { ...emptyFocusMemory(), preferences: [2, 3, 4].map(id => withAction(id, "include").preferences[0]) };
  assert.deepEqual(rankFocus(gone, day, more).ids, []);
});

test("a moved-in quest is not cut off by the list cap", () => {
  const many = Array.from({ length: 12 }, (_, index) => task(index + 1, { dueDate: day }));
  const mine = task(99, { startDate: "2026-10-01", importance: "Low", dueDate: "2027-01-01T00:00:00.000Z" });
  const result = rankFocus([...many, mine], day, withAction(99, "include", false));
  assert.equal(result.protectedCount, 12);
  assert.equal(result.ids.length, 13);
  assert.equal(result.ids.at(-1), 99);
});

test("taking a quest off Smart Focus removes it, even high-priority work and against the model", () => {
  const quests = [task(1, { importance: "Pareto" }), task(2, { importance: "High" })];
  const advice = quests.map(q => ({ taskId: q.id, include: true, score: 100, reason: "Include" }));
  assert.deepEqual(rankFocus(quests, day, withAction(1, "exclude", true), advice).ids, [2]);
});

test("taking a quest off removes work that is due or starting today, but the model alone cannot", () => {
  const quests = [task(1, { dueDate: day }), task(2, { startDate: day }), task(3, { dueDate: day })];
  const memory = withAction(1, "exclude", true);
  memory.preferences.push({ ...memory.preferences[0], id: "again", taskId: 2 });
  const advice = quests.map(q => ({ taskId: q.id, include: false, score: -100, reason: "Exclude" }));
  assert.deepEqual(rankFocus(quests, day, memory).ids, [3]);
  assert.deepEqual(rankFocus(quests, day, memory, advice).ids, [3]);
  assert.deepEqual(rankFocus(quests, day, emptyFocusMemory(), advice).ids.sort(), [1, 2, 3]);
});

test("moving a taken-off quest back in brings overdue work back", () => {
  const quests = [task(1, { dueDate: "2026-10-01T00:00:00.000Z" })];
  const memory = withAction(1, "exclude", true);
  assert.deepEqual(rankFocus(quests, day, memory).ids, []);
  memory.preferences.push({ ...memory.preferences[0], id: "back", action: "include", inFocus: false });
  assert.deepEqual(rankFocus(quests, day, memory).ids, [1]);
});

test("keeping a quest in Smart Focus protects it from being held back and is explained", () => {
  const heavy = committed(6, 90, 3);
  const result = rankFocus([...heavy, task(150, { importance: "Low", startDate: "2026-10-10" }), task(151, { importance: "Low", startDate: "2026-10-10" })], day, withAction(150, "keep", true));
  assert.ok(result.ids.includes(150));
  assert.ok(!result.ids.includes(151));
  assert.equal(result.reasons[150], "You confirmed this belongs in Smart Focus.");
});

test("keeping a quest out only nudges its order; it is not a hard exclusion", () => {
  const quests = [task(1, { importance: "High", startDate: "2026-10-10" }), task(2, { importance: "High", startDate: "2026-10-10" })];
  assert.deepEqual(rankFocus(quests, day, emptyFocusMemory()).ids, [1, 2]);
  assert.deepEqual(rankFocus(quests, day, withAction(1, "keep", false)).ids, [2, 1]);
});

test("the latest action on a quest wins", () => {
  const memory = withAction(1, "include", false);
  memory.preferences.push({ id: "later", taskId: 1, taskTitle: "Task 1", text: "Changed my mind.", createdAt: day, action: "exclude", inFocus: true });
  assert.equal(focusStances(memory).get(1)?.action, "exclude");
  assert.deepEqual(rankFocus([task(1, { importance: "High" })], day, memory).ids, []);
});

test("older text-only preferences have no action and change nothing by themselves", () => {
  const memory = emptyFocusMemory();
  memory.preferences = [{ id: "old", taskId: 1, taskTitle: "Task 1", text: "Context only.", createdAt: day }];
  assert.equal(focusStances(memory).size, 0);
  assert.deepEqual(rankFocus([task(1, { importance: "High" })], day, memory).ids, [1]);
});

test("each action is described in plain words", () => {
  assert.equal(focusActionLabel({ action: "include" }), "Moved into Smart Focus");
  assert.equal(focusActionLabel({ action: "exclude" }), "Taken off Smart Focus");
  assert.equal(focusActionLabel({ action: "keep", inFocus: true }), "Kept in Smart Focus");
  assert.equal(focusActionLabel({ action: "keep", inFocus: false }), "Kept out of Smart Focus");
  assert.equal(focusActionLabel({ action: "keep" }), "Kept where it was");
  assert.equal(focusActionLabel({}), null);
});

const orderOf = (quests: FocusQuest[], advice?: { taskId: number; include: boolean; score: number; reason: string }[]) =>
  rankFocus(quests, day, emptyFocusMemory(), advice).ids;
const ready = (id: number, extra: Partial<FocusQuest> = {}) => task(id, { startDate: "2026-10-01", importance: "High", ...extra });
const ask = (taskId: number, score: number) => ({ taskId, include: true, score, reason: "r" });

test("the same due date is ordered by importance, whatever the model says", () => {
  const due = "2026-10-12T00:00:00.000Z";
  const quests = [ready(1, { importance: "Low", dueDate: due }), ready(2, { importance: "High", dueDate: due }), ready(3, { importance: "Medium", dueDate: due })];
  assert.deepEqual(orderOf(quests), [2, 3, 1]);
  assert.deepEqual(orderOf(quests, [ask(1, 100), ask(2, -100), ask(3, 0)]), [2, 3, 1]);
});

test("the model breaks ties only between the same due date and importance", () => {
  const due = "2026-10-12T00:00:00.000Z";
  const quests = [ready(1, { dueDate: due }), ready(2, { dueDate: due }), ready(3, { dueDate: due })];
  assert.deepEqual(orderOf(quests, [ask(1, -20), ask(2, 60), ask(3, 10)]), [2, 3, 1]);
  assert.deepEqual(orderOf(quests), [1, 2, 3]);
});

test("an earlier due date comes first, and undated work comes after dated work", () => {
  const quests = [
    ready(1, { importance: "Pareto" }),
    ready(2, { importance: "Low", dueDate: "2026-10-20T00:00:00.000Z" }),
    ready(3, { importance: "Low", dueDate: "2026-10-15T00:00:00.000Z" }),
  ];
  assert.deepEqual(orderOf(quests), [3, 2, 1]);
});

test("overdue and due-today come first, then quests starting today, then the rest", () => {
  const quests = [
    ready(1, { importance: "Pareto" }),
    ready(2, { importance: "Low", startDate: day }),
    ready(3, { importance: "Low", dueDate: "2026-10-12T00:00:00.000Z" }),
    ready(4, { importance: "Low", dueDate: "2026-10-10T00:00:00.000Z" }),
  ];
  assert.deepEqual(orderOf(quests, [ask(1, 100)]), [4, 3, 2, 1]);
});

test("quests a user moved in still lead their group, ahead of higher importance", () => {
  const memory = { ...emptyFocusMemory(), enabled: true, preferences: [{ id: "p", taskId: 2, taskTitle: "Task 2", text: "wanted", createdAt: "2026-10-12T00:00:00.000Z", action: "include" as const }] };
  const quests = [ready(1, { importance: "Pareto" }), task(2, { startDate: "2026-10-01", importance: "Low" })];
  assert.deepEqual(rankFocus(quests, day, memory).ids, [2, 1]);
});

// ── Keeps refreshing: when the essentials are done there is room, so the next most important quests come in ──
const dueToday = (count: number, firstId = 1) => Array.from({ length: count }, (_, index) => task(firstId + index, { dueDate: `${day}T00:00:00.000Z`, importance: "High" }));
const backlog = (count: number, firstId = 100) => Array.from({ length: count }, (_, index) => task(firstId + index, { importance: "Low" }));
const backlogIds = (ids: number[]) => ids.filter(id => id >= 100);

test("a full day of committed work leaves no room, so the backlog stays out", () => {
  const result = rankFocus([...dueToday(12), ...backlog(8)], day, emptyFocusMemory());
  assert.equal(result.ids.length, 12);
  assert.deepEqual(backlogIds(result.ids), []);
});

test("finishing the essentials lets the next most important quests in, up to the list size", () => {
  const all = [...dueToday(12), ...backlog(20)];
  const morning = rankFocus(all, day, emptyFocusMemory());
  const done = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const evening = rankFocus(all.map(q => done.has(q.id) ? { ...q, completed: true } : q), day, emptyFocusMemory());
  assert.equal(morning.workload?.level, "heavy");
  assert.equal(evening.workload?.level, "light");
  assert.deepEqual(evening.ids.slice(0, 3), [10, 11, 12]);
  assert.equal(evening.ids.length, 10);
  assert.equal(backlogIds(evening.ids).length, 7);
  assert.match(evening.message, /7 more added because your list has room/);
  assert.equal(evening.reasons[100], "Added because your list has room: the next most important quest.");
});

test("what comes in next follows the same order: earlier due date, then importance", () => {
  const quests = [
    task(1, { importance: "Low", dueDate: "2026-12-01T00:00:00.000Z" }),
    task(2, { importance: "Medium" }),
    task(3, { importance: "Low", dueDate: "2026-11-01T00:00:00.000Z" }),
    task(4, { importance: "Low" }),
  ];
  assert.deepEqual(rankFocus(quests, day, emptyFocusMemory()).ids, [3, 1, 2, 4]);
});

test("the list never grows past its size or the day's low-priority budget", () => {
  assert.equal(rankFocus(backlog(30), day, emptyFocusMemory()).ids.length, 10);
  const heavy = committed(6, 90, 3);
  const result = rankFocus([...heavy, ...backlog(20)], day, emptyFocusMemory());
  assert.equal(result.workload?.level, "heavy");
  assert.deepEqual(backlogIds(result.ids), []);
});

test("top-up skips what cannot or should not be listed", () => {
  const memory = withAction(103, "exclude", true);
  memory.dismissals = [{ taskId: 102, taskTitle: "Task 102", day }];
  const quests = [
    task(100, { importance: "Low" }), task(101, { importance: "Low", startDate: "2026-10-20" }), task(102, { importance: "Low" }),
    task(103, { importance: "Low" }), task(104, { importance: "Low" }), task(105, { importance: "Low", completed: true }),
    task(106, { importance: "Low", questType: "reminder" }), task(107, { importance: "Low" }),
  ];
  const advice = [{ taskId: 104, include: false, score: -50, reason: "Skip" }];
  assert.deepEqual(rankFocus(quests, day, memory, advice).ids.sort(), [100, 107]);
});

test("routines are only topped up on days that allow them", () => {
  const quests = [task(100, { importance: "Low", recurType: "Weekly" }), task(101, { importance: "Low" })];
  assert.deepEqual(rankFocus(quests, day, emptyFocusMemory()).ids.sort(), [100, 101]);
  const tuning = { ...DEFAULT_FOCUS_TUNING, routinesAllowed: { light: false, normal: false, busy: false, heavy: false } };
  assert.deepEqual(rankFocus(quests, day, emptyFocusMemory(), undefined, tuning).ids, [101]);
});

// ── Work-filter weighting: Apple counts a level higher on weekdays and a level lower on weekends ──
const MONDAY = "2026-10-12", FRIDAY = "2026-10-16", SATURDAY = "2026-10-17", SUNDAY = "2026-10-18";
const appleMemory = (): FocusMemory => ({ ...emptyFocusMemory(), profile: APPLE_WEEKDAY_PROFILE });
const started = (id: number, workFilter: string, importance = "Medium", extra: Partial<FocusQuest> = {}) =>
  task(id, { startDate: "2026-10-01", importance, businessWorkFilter: workFilter, ...extra });
const rankOn = (quests: FocusQuest[], onDay: string, memory = appleMemory()) => rankFocus(quests, onDay, memory);

test("the preloaded profile weights Apple up on every weekday", () => {
  const quests = [started(1, "General"), started(2, "MW"), started(3, "Apple"), started(4, "GPR")];
  for (const weekday of [MONDAY, FRIDAY]) assert.deepEqual(rankOn(quests, weekday).ids, [3, 1, 2, 4], weekday);
});

test("on weekends Apple counts for less than the other work filters", () => {
  const quests = [started(1, "General"), started(2, "MW"), started(3, "Apple"), started(4, "GPR")];
  for (const weekend of [SATURDAY, SUNDAY]) assert.deepEqual(rankOn(quests, weekend).ids, [1, 2, 4, 3], weekend);
});

test("the weight is a level, not an override: due date and bigger importance gaps still win", () => {
  const quests = [started(1, "Apple", "Low"), started(2, "General", "Medium"), started(3, "General", "High"), started(4, "Apple", "Medium", { dueDate: "2026-12-01T00:00:00.000Z" })];
  assert.deepEqual(rankOn(quests, MONDAY).ids, [4, 3, 2, 1]);
  const sameDay = [started(1, "General", "Med-High"), started(2, "Apple", "Medium")];
  assert.deepEqual(rankOn(sameDay, MONDAY).ids, [1, 2], "a tie on weighted importance falls to the usual tie-break");
});

test("with no profile, work filters change nothing", () => {
  const quests = [started(1, "General"), started(2, "MW"), started(3, "Apple")];
  assert.deepEqual(rankOn(quests, MONDAY, emptyFocusMemory()).ids, [1, 2, 3]);
  assert.deepEqual(rankOn(quests, SATURDAY, emptyFocusMemory()).ids, [1, 2, 3]);
});

test("the older Apple flag and loose spelling both count as Apple", () => {
  assert.equal(workFilterOf({ apple: true, businessWorkFilter: "General" }), "Apple");
  const quests = [started(1, "General"), task(2, { startDate: "2026-10-01", importance: "Medium", apple: true }), started(3, " apple ")];
  assert.deepEqual(rankOn(quests, MONDAY).ids, [2, 3, 1]);
});

test("the step is clamped and bad values count as nothing", () => {
  const profile = (weekday: unknown, weekend: unknown) => ({ workFilters: { Apple: { weekday, weekend } as never } });
  const apple = { businessWorkFilter: "Apple" };
  assert.equal(workFilterStep(profile(10, -10), apple, MONDAY), 3);
  assert.equal(workFilterStep(profile(10, -10), apple, SATURDAY), -3);
  assert.equal(workFilterStep(profile("x", undefined), apple, MONDAY), 0);
  assert.equal(workFilterStep(profile(1.6, 0), apple, MONDAY), 2);
  assert.equal(workFilterStep(undefined, apple, MONDAY), 0);
  assert.equal(workFilterStep(profile(1, 1), { businessWorkFilter: null }, MONDAY), 0);
  assert.equal(isWeekendDay(SATURDAY) && isWeekendDay(SUNDAY) && !isWeekendDay(FRIDAY) && !isWeekendDay(MONDAY), true);
});

test("an Apple quest says why it moved: counts for more on weekdays, for less on weekends", () => {
  const quests = [started(1, "Apple"), started(2, "General")];
  assert.match(rankOn(quests, MONDAY).reasons[1], /Apple work counts for more on weekdays\./);
  assert.match(rankOn(quests, SATURDAY).reasons[1], /Apple work counts for less on weekends\./);
  assert.doesNotMatch(rankOn(quests, MONDAY).reasons[2], /counts for/);
  assert.doesNotMatch(rankOn(quests, MONDAY, emptyFocusMemory()).reasons[1], /counts for/);
});

test("a weighted-up Apple quest also counts as high priority, so a busy day does not hold it back", () => {
  const heavy = committed(6, 90, 3);
  const extras = [started(150, "Apple", "Medium"), started(151, "General", "Medium")];
  const weekday = rankOn([...heavy, ...extras], MONDAY);
  assert.equal(weekday.workload?.level, "heavy");
  assert.ok(weekday.ids.includes(150) && !weekday.ids.includes(151));
});

// ── Rank higher / rank lower: the user steers the order, not just what is listed ──
const asked = (...entries: [number, FocusAction][]): FocusMemory => ({
  ...emptyFocusMemory(),
  preferences: entries.map(([taskId, action], index) => ({ id: `o${index}`, taskId, taskTitle: `Task ${taskId}`, text: "Because.", createdAt: day, action, inFocus: true })),
});
const trio = () => [started(1, "General", "High"), started(2, "General", "Medium"), started(3, "General", "Low")];

test("rank higher moves a quest to the front of its group, ahead of importance", () => {
  assert.deepEqual(rankFocus(trio(), day, emptyFocusMemory()).ids, [1, 2, 3]);
  assert.deepEqual(rankFocus(trio(), day, asked([3, "higher"])).ids, [3, 1, 2]);
});

test("rank lower moves a quest to the back of its group", () => {
  assert.deepEqual(rankFocus(trio(), day, asked([1, "lower"])).ids, [2, 3, 1]);
});

test("rank higher beats an earlier due date, but not work that is overdue or due today", () => {
  const quests = [started(1, "General", "High", { dueDate: "2026-11-01T00:00:00.000Z" }), started(2, "General", "Low", { dueDate: "2026-12-01T00:00:00.000Z" }), task(3, { dueDate: `${day}T00:00:00.000Z`, importance: "Low" })];
  assert.deepEqual(rankFocus(quests, day, emptyFocusMemory()).ids, [3, 1, 2]);
  assert.deepEqual(rankFocus(quests, day, asked([2, "higher"])).ids, [3, 2, 1]);
});

test("within today's committed work, rank higher and lower reorder it", () => {
  const quests = dueToday(4);
  assert.deepEqual(rankFocus(quests, day, emptyFocusMemory()).ids, [1, 2, 3, 4]);
  assert.deepEqual(rankFocus(quests, day, asked([4, "higher"], [1, "lower"])).ids, [4, 2, 3, 1]);
});

test("ranking requests add up, and opposite ones cancel", () => {
  assert.deepEqual(rankFocus(trio(), day, asked([3, "higher"], [3, "lower"])).ids, [1, 2, 3], "higher then lower is back to normal");
  assert.deepEqual([...focusOrderShifts(asked([3, "higher"], [3, "lower"], [2, "higher"]))], [[2, 1]], "no net push is left out");
  assert.deepEqual([...focusOrderShifts(asked([3, "higher"], [3, "higher"], [2, "lower"]))].sort(), [[2, -1], [3, 2]]);
  assert.equal(focusOrderShifts(asked(...Array.from({ length: 6 }, () => [3, "higher"] as [number, FocusAction]))).get(3), 3, "three steps at most");
  assert.equal(focusOrderShifts(asked(...Array.from({ length: 6 }, () => [3, "lower"] as [number, FocusAction]))).get(3), -3);
});

test("a ranking request does not disturb placement actions", () => {
  const memory = asked([2, "include"], [2, "higher"]);
  assert.equal(focusStances(memory).get(2)?.action, "include", "a ranking request does not replace a move-in");
  assert.equal(focusOrderShifts(memory).get(2), 1);
  const lowered = asked([2, "include"], [2, "lower"], [1, "higher"]);
  assert.deepEqual(rankFocus([started(1, "General", "Low"), started(2, "General", "Low")], day, lowered).ids, [1, 2], "ranking steps move even a moved-in quest");
});

// The real case: a quest that starts today, behind ten that are due today. One step never got past them.
const behindDueToday = () => [...dueToday(10), task(50, { startDate: `${day}T07:00:00.000Z`, importance: "Medium" })];

test("rank higher on a starts-today quest first lifts it past everything due today, not only within its own group", () => {
  assert.equal(rankFocus(behindDueToday(), day, emptyFocusMemory()).ids.at(-1), 50, "starts at the back of the list");
  assert.equal(rankFocus(behindDueToday(), day, asked([50, "higher"])).ids[0], 50, "one request moves it to the front");
});

test("each further request moves a quest up another group", () => {
  const quests = [...dueToday(3), task(40, { startDate: `${day}T07:00:00.000Z` }), started(60, "General", "Low")];
  const at = (steps: number) => rankFocus(quests, day, asked(...Array.from({ length: steps }, () => [60, "higher"] as [number, FocusAction]))).ids.indexOf(60);
  assert.equal(at(0), 4, "the main group, after everything above it");
  assert.equal(at(1), 3, "ahead of the main group's other quests, after starts-today");
  assert.equal(at(2), 0, "past starts-today and everything due today");
  assert.equal(at(3), 0);
});

test("each request down moves a quest down a group too, so an overdue quest can end up last", () => {
  const quests = [...dueToday(3), task(40, { startDate: `${day}T07:00:00.000Z` }), started(60, "General", "Low")];
  const ids = (steps: number) => rankFocus(quests, day, asked(...Array.from({ length: steps }, () => [1, "lower"] as [number, FocusAction]))).ids;
  assert.deepEqual(ids(0), [1, 2, 3, 40, 60]);
  assert.deepEqual(ids(1), [2, 3, 40, 1, 60], "down into starts-today, at the back of it");
  assert.deepEqual(ids(2), [2, 3, 40, 60, 1], "down into the main group, at the back of it");
  assert.deepEqual(ids(3), [2, 3, 40, 60, 1], "and never past the end");
});

test("a ranked quest explains itself and is never trimmed from the list", () => {
  const result = rankFocus(trio(), day, asked([3, "higher"], [1, "lower"]));
  assert.match(result.reasons[3], /You asked for this to rank higher\./);
  assert.match(result.reasons[1], /You asked for this to rank lower\./);
  assert.doesNotMatch(result.reasons[2], /You asked/);
  const heavy = committed(6, 90, 3);
  const extras = [started(150, "General", "Low"), started(151, "General", "Low")];
  const busy = rankFocus([...heavy, ...extras], day, asked([150, "lower"]));
  assert.equal(busy.workload?.level, "heavy");
  assert.ok(busy.ids.includes(150) && !busy.ids.includes(151), "a quest the user ranked is not held back");
  const crowded = [...dueToday(12), started(99, "General", "Low")];
  const full = rankFocus(crowded, day, asked([99, "lower"]));
  assert.equal(full.ids.at(-1), 99, "past the list size, still listed");
});

test("rank higher and lower are described in plain words", () => {
  assert.equal(focusActionLabel({ action: "higher" }), "Ranked higher in Smart Focus");
  assert.equal(focusActionLabel({ action: "lower" }), "Ranked lower in Smart Focus");
});

test("a quest's group is 3 when overdue or due today, 2 when it starts today, otherwise 1", () => {
  assert.equal(focusGroup(task(1, { dueDate: "2026-10-01T00:00:00.000Z" }), day), 3);
  assert.equal(focusGroup(task(1, { dueDate: `${day}T00:00:00.000Z` }), day), 3);
  assert.equal(focusGroup(task(1, { startDate: `${day}T00:00:00.000Z` }), day), 2);
  assert.equal(focusGroup(task(1, { startDate: `${day}T00:00:00.000Z`, dueDate: "2026-12-01T00:00:00.000Z" }), day), 2);
  assert.equal(focusGroup(task(1, { dueDate: "2026-12-01T00:00:00.000Z", startDate: "2026-10-01T00:00:00.000Z" }), day), 1);
  assert.equal(focusGroup(task(1), day), 1);
});

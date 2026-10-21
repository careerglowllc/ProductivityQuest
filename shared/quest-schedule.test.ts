import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEADLINE_NEEDS_DUE_DATE, FOCUS_BANDS, SMART_FOCUS_CAP, START_AFTER_DUE, focusBand, isHighPriority, isNotStartedYet, isOnTodaysList, isOverdue, isReminder, smartFocus, sortReminders, remindersForToday,
  questTypeAfterClearingDue, resolveQuestDatePatch, smartBand, sortUpcoming, validateQuestDates, type ScheduledQuest,
} from "./quest-schedule";

// Monday 12 Oct 2026, mid-morning. Quest dates are stored as a calendar day at UTC midnight.
const now = new Date(2026, 9, 12, 10, 30);
const day = (offset: number) => new Date(Date.UTC(2026, 9, 12 + offset));
const quest = (name: string, extra: Partial<ScheduledQuest> = {}) => ({ name, ...extra });
const names = (list: { name: string }[]) => list.map((q) => q.name);

test("smart band: overdue, due today and due within 3 days are urgent", () => {
  assert.equal(smartBand({ dueDate: day(-5) }, now), "urgent");
  assert.equal(smartBand({ dueDate: day(0) }, now), "urgent");
  assert.equal(smartBand({ dueDate: day(3) }, now), "urgent");
  assert.equal(smartBand({ dueDate: day(4) }, now), "ready", "4 days out is outside the urgent window");
});

test("smart band: a close deadline overrides a start date that hasn't arrived", () => {
  assert.equal(smartBand({ startDate: day(2), dueDate: day(2) }, now), "urgent");
  assert.equal(smartBand({ startDate: day(5), dueDate: day(20) }, now), "this-week");
});

test("smart band: start date today or earlier, or no start date, is ready now", () => {
  assert.equal(smartBand({ startDate: day(-3), dueDate: day(30) }, now), "ready");
  assert.equal(smartBand({ startDate: day(0), dueDate: day(30) }, now), "ready");
  assert.equal(smartBand({ dueDate: day(30) }, now), "ready", "no start date means available now");
  assert.equal(smartBand({}, now), "ready", "no dates at all is still available");
  assert.equal(smartBand({ startDate: null, dueDate: null }, now), "ready");
});

test("smart band: starts within 7 days is this week, later is upcoming", () => {
  assert.equal(smartBand({ startDate: day(1) }, now), "this-week");
  assert.equal(smartBand({ startDate: day(7) }, now), "this-week");
  assert.equal(smartBand({ startDate: day(8) }, now), "upcoming");
  assert.equal(smartBand({ startDate: day(60), dueDate: day(90) }, now), "upcoming");
});

test("smart band: an unreadable date is ignored rather than breaking the feed", () => {
  assert.equal(smartBand({ startDate: "garbage", dueDate: "garbage" }, now), "ready");
});

test("today's list: overdue, due today, or a start date that has arrived", () => {
  assert.equal(isOnTodaysList({ dueDate: day(-1) }, now), true);
  assert.equal(isOnTodaysList({ dueDate: day(0) }, now), true);
  assert.equal(isOnTodaysList({ startDate: day(0), dueDate: day(30) }, now), true, "start reached, due far away");
  assert.equal(isOnTodaysList({ startDate: day(-3) }, now), true);
});

test("today's list: future starts and quests with no usable date are not on it", () => {
  assert.equal(isOnTodaysList({ startDate: day(1), dueDate: day(30) }, now), false);
  assert.equal(isOnTodaysList({ dueDate: day(1) }, now), false, "quests with no start date behave exactly as before: only due date counts");
  assert.equal(isOnTodaysList({}, now), false);
});

test("overdue: strictly before today", () => {
  assert.equal(isOverdue({ dueDate: day(-1) }, now), true);
  assert.equal(isOverdue({ dueDate: day(0) }, now), false);
  assert.equal(isOverdue({}, now), false);
});

test("not started yet: future starts outside the urgent window", () => {
  assert.equal(isNotStartedYet({ startDate: day(3) }, now), true);
  assert.equal(isNotStartedYet({ startDate: day(30) }, now), true);
  assert.equal(isNotStartedYet({ startDate: day(3), dueDate: day(3) }, now), false, "a close deadline keeps it in play");
  assert.equal(isNotStartedYet({ startDate: day(-1) }, now), false);
  assert.equal(isNotStartedYet({}, now), false);
});

test("upcoming filter: only quests with a start date still ahead, soonest first", () => {
  const sorted = sortUpcoming([
    quest("later", { startDate: day(20) }),
    quest("started", { startDate: day(0) }),
    quest("no start", { dueDate: day(3) }),
    quest("soon high", { startDate: day(2), importance: "High" }),
    quest("soon low", { startDate: day(2), importance: "Low" }),
  ], now);
  assert.deepEqual(names(sorted), ["soon high", "soon low", "later"]);
});

test("validate: a deadline needs a due date; reminders and general to-dos don't", () => {
  assert.equal(validateQuestDates({ questType: "deadline" }), DEADLINE_NEEDS_DUE_DATE);
  assert.equal(validateQuestDates({ questType: "deadline", dueDate: null }), DEADLINE_NEEDS_DUE_DATE);
  assert.equal(validateQuestDates({ questType: "deadline", dueDate: day(5) }), null);
  assert.equal(validateQuestDates({ questType: "reminder" }), null);
  assert.equal(validateQuestDates({ questType: "general", dueDate: null, startDate: null }), null);
  assert.equal(validateQuestDates({}), null);
});

test("validate: the start can be before or on the due date, never after", () => {
  assert.equal(validateQuestDates({ questType: "general", startDate: day(1), dueDate: day(5) }), null);
  assert.equal(validateQuestDates({ questType: "general", startDate: day(5), dueDate: day(5) }), null);
  assert.equal(validateQuestDates({ questType: "general", startDate: new Date(Date.UTC(2026, 9, 17, 7)), dueDate: day(5) }), null, "same day, later time of day");
  assert.equal(validateQuestDates({ questType: "general", startDate: day(6), dueDate: day(5) }), START_AFTER_DUE);
  assert.equal(validateQuestDates({ questType: "general", startDate: day(6) }), null, "a start with no due date is fine");
});

test("edit: changes that don't touch type or dates are never blocked, even on an older quest", () => {
  const existing = { questType: "deadline", dueDate: null, startDate: null };
  assert.deepEqual(resolveQuestDatePatch(existing, {}), { ok: true, adjust: {} });
  assert.deepEqual(resolveQuestDatePatch(existing, { questType: undefined }), { ok: true, adjust: {} });
});

test("edit: switching to deadline needs a due date, already stored or sent along", () => {
  const blocked = resolveQuestDatePatch({ questType: "general", dueDate: null }, { questType: "deadline" });
  assert.deepEqual(blocked, { ok: false, error: DEADLINE_NEEDS_DUE_DATE });
  assert.equal(resolveQuestDatePatch({ questType: "general", dueDate: day(4) }, { questType: "deadline" }).ok, true);
  assert.equal(resolveQuestDatePatch({ questType: "general", dueDate: null }, { questType: "deadline", dueDate: day(4) }).ok, true);
});

test("edit: a deadline's due date can be changed but not cleared; other types can clear it", () => {
  assert.equal(resolveQuestDatePatch({ questType: "deadline", dueDate: day(4) }, { dueDate: day(9) }).ok, true);
  assert.deepEqual(resolveQuestDatePatch({ questType: "deadline", dueDate: day(4) }, { dueDate: null }), { ok: false, error: DEADLINE_NEEDS_DUE_DATE });
  assert.equal(resolveQuestDatePatch({ questType: "general", dueDate: day(4) }, { dueDate: null }).ok, true);
  assert.equal(resolveQuestDatePatch({ questType: "reminder", dueDate: day(4) }, { dueDate: null }).ok, true);
});

test("edit: setting a start after the due date is rejected", () => {
  const existing = { questType: "general", dueDate: day(5), startDate: null };
  assert.deepEqual(resolveQuestDatePatch(existing, { startDate: day(8) }), { ok: false, error: START_AFTER_DUE });
  assert.equal(resolveQuestDatePatch(existing, { startDate: day(5) }).ok, true);
  assert.equal(resolveQuestDatePatch(existing, { startDate: null }).ok, true, "a start date can be cleared");
  assert.deepEqual(resolveQuestDatePatch(existing, { startDate: day(8), dueDate: day(3) }), { ok: false, error: START_AFTER_DUE });
  assert.equal(resolveQuestDatePatch(existing, { startDate: day(8), dueDate: day(12) }).ok, true, "moving both together is fine");
});

test("edit: moving only the due date to before the start pulls the start back to the new due date", () => {
  const existing = { questType: "general", dueDate: day(10), startDate: day(6) };
  const result = resolveQuestDatePatch(existing, { dueDate: day(2) });
  assert.deepEqual(result, { ok: true, adjust: { startDate: day(2) } });
  assert.deepEqual(resolveQuestDatePatch(existing, { dueDate: day(8) }), { ok: true, adjust: {} });
});

test("reminders are recognised by quest type only", () => {
  assert.equal(isReminder({ questType: "reminder" }), true);
  for (const questType of ["deadline", "general", "", null, undefined]) assert.equal(isReminder({ questType }), false, String(questType));
  assert.equal(isReminder({}), false);
});

test("reminders strip: most important first, then nearest due date, undated last", () => {
  const sorted = sortReminders([
    quest("low", { importance: "Low" }),
    quest("high, no date", { importance: "High" }),
    quest("high, due soon", { importance: "High", dueDate: day(2) }),
    quest("high, due later", { importance: "High", dueDate: day(9) }),
    quest("pareto", { importance: "Pareto" }),
  ]);
  assert.deepEqual(names(sorted), ["pareto", "high, due soon", "high, due later", "high, no date", "low"]);
});

test("reminders strip: sorting leaves the original list alone and copes with an empty list", () => {
  const input = [quest("b", { importance: "Low" }), quest("a", { importance: "High" })];
  sortReminders(input);
  assert.deepEqual(names(input), ["b", "a"]);
  assert.deepEqual(sortReminders([]), []);
});

test("reminders have no hard dates: with or without them they never need a due or start date", () => {
  assert.equal(validateQuestDates({ questType: "reminder" }), null);
  assert.equal(validateQuestDates({ questType: "reminder", dueDate: null, startDate: null }), null);
});


const q = (name: string, extra: Record<string, unknown> = {}) => ({ name, ...extra }) as ScheduledQuest & { name: string; questType?: string };
const focusNames = (quests: ReturnType<typeof q>[], cap?: number) =>
  smartFocus(quests, now, cap).groups.flatMap((g) => g.quests).map((x) => x.name);

test("high priority means Med-High and above", () => {
  for (const importance of ["Pareto", "High", "Med-High"]) assert.equal(isHighPriority({ importance }), true, importance);
  for (const importance of ["Medium", "Med-Low", "Low", null, undefined]) assert.equal(isHighPriority({ importance }), false, String(importance));
});

test("focus: overdue and due today are in", () => {
  assert.equal(focusBand({ dueDate: day(-9) }, now), "urgent");
  assert.equal(focusBand({ dueDate: day(0) }, now), "urgent");
});

test("focus: a start date that has arrived is in, today or earlier", () => {
  assert.equal(focusBand({ startDate: day(0), dueDate: day(40) }, now), "today");
  assert.equal(focusBand({ startDate: day(-6) }, now), "today");
});

test("focus: due tomorrow through 7 days out only counts when high priority", () => {
  for (const offset of [1, 4, 7]) {
    assert.equal(focusBand({ dueDate: day(offset), importance: "High" }, now), "coming-up", `day ${offset}`);
    assert.equal(focusBand({ dueDate: day(offset), importance: "Medium" }, now), null, `day ${offset} medium`);
    assert.equal(focusBand({ dueDate: day(offset) }, now), null, `day ${offset} no importance`);
  }
  assert.equal(focusBand({ dueDate: day(8), importance: "Pareto" }, now), null, "8 days out is beyond the week");
});

test("focus: undated quests and future starts are out, even if high priority", () => {
  assert.equal(focusBand({}, now), null);
  assert.equal(focusBand({ importance: "Pareto" }, now), null);
  assert.equal(focusBand({ startDate: day(2), dueDate: day(30), importance: "Pareto" }, now), null);
  assert.equal(focusBand({ startDate: day(1) }, now), null);
});

test("focus: a quest that has started and is also due soon counts as starting today, not coming up", () => {
  assert.equal(focusBand({ startDate: day(-1), dueDate: day(3), importance: "High" }, now), "today");
});

test("focus: unreadable dates are ignored", () => {
  assert.equal(focusBand({ startDate: "garbage", dueDate: "garbage", importance: "High" }, now), null);
});

test("Smart Focus is not a sorted copy of everything: only qualifying quests appear", () => {
  const names = focusNames([
    q("overdue", { dueDate: day(-2) }),
    q("due today", { dueDate: day(0) }),
    q("starts today", { startDate: day(0), dueDate: day(30) }),
    q("due tomorrow, high", { dueDate: day(1), importance: "High" }),
    q("due tomorrow, medium", { dueDate: day(1), importance: "Medium" }),
    q("due in 5 days, low", { dueDate: day(5), importance: "Low" }),
    q("undated", {}),
    q("legacy, due next month", { dueDate: day(30) }),
    q("starts next week", { startDate: day(6) }),
  ]);
  assert.deepEqual(names, ["overdue", "due today", "starts today", "due tomorrow, high"]);
});

test("Smart Focus empties once today's work is done: nothing left means nothing shown", () => {
  const result = smartFocus([q("later", { dueDate: day(20) }), q("someday", {}), q("medium this week", { dueDate: day(3), importance: "Medium" })], now);
  assert.deepEqual(result.groups, []);
  assert.equal(result.shown, 0);
  assert.equal(result.total, 0);
  assert.deepEqual(smartFocus([], now).groups, []);
});

test("Smart Focus order: urgent, then starting today, then coming up", () => {
  const names = focusNames([
    q("coming up", { dueDate: day(2), importance: "High" }),
    q("starts today", { startDate: day(0) }),
    q("urgent", { dueDate: day(0) }),
  ]);
  assert.deepEqual(names, ["urgent", "starts today", "coming up"]);
  assert.deepEqual(smartFocus([q("urgent", { dueDate: day(0) })], now).groups.map((g) => g.band), ["urgent"]);
  assert.deepEqual([...FOCUS_BANDS], ["urgent", "today", "coming-up"]);
});

test("Smart Focus order within a group: urgent by deadline then importance; today by start then importance; coming up by deadline", () => {
  const urgent = focusNames([
    q("due today, low", { dueDate: day(0), importance: "Low" }),
    q("overdue, low", { dueDate: day(-3), importance: "Low" }),
    q("due today, high", { dueDate: day(0), importance: "High" }),
  ]);
  assert.deepEqual(urgent, ["overdue, low", "due today, high", "due today, low"]);

  const today = focusNames([
    q("started today, high", { startDate: day(0), importance: "High" }),
    q("started 5 days ago, low", { startDate: day(-5), importance: "Low" }),
    q("started today, low", { startDate: day(0), importance: "Low" }),
  ]);
  assert.deepEqual(today, ["started 5 days ago, low", "started today, high", "started today, low"]);

  const coming = focusNames([
    q("in 6 days", { dueDate: day(6), importance: "Pareto" }),
    q("in 2 days", { dueDate: day(2), importance: "Med-High" }),
  ]);
  assert.deepEqual(coming, ["in 2 days", "in 6 days"]);
});

test("Smart Focus is capped, and the cap trims the least pressing quests first", () => {
  const many = [
    ...Array.from({ length: 4 }, (_, i) => q(`urgent ${i}`, { dueDate: day(0) })),
    ...Array.from({ length: 4 }, (_, i) => q(`today ${i}`, { startDate: day(0) })),
    ...Array.from({ length: 4 }, (_, i) => q(`coming ${i}`, { dueDate: day(3), importance: "High" })),
  ];
  const result = smartFocus(many, now, 6);
  assert.equal(result.shown, 6);
  assert.equal(result.total, 12);
  assert.deepEqual(result.groups.map((g) => [g.band, g.quests.length]), [["urgent", 4], ["today", 2]]);
});

test("Smart Focus: the default cap is 10", () => {
  assert.equal(SMART_FOCUS_CAP, 10);
  const many = Array.from({ length: 25 }, (_, i) => q(`due ${i}`, { dueDate: day(-i) }));
  const result = smartFocus(many, now);
  assert.equal(result.shown, 10);
  assert.equal(result.total, 25);
});

test("Smart Focus: a cap of zero shows nothing and a large cap shows everything that qualifies", () => {
  const some = [q("a", { dueDate: day(0) }), q("b", { dueDate: day(0) })];
  assert.equal(smartFocus(some, now, 0).shown, 0);
  assert.equal(smartFocus(some, now, 0).total, 2);
  assert.equal(smartFocus(some, now, 500).shown, 2);
});

test("Smart Focus leaves reminders out, whatever their dates, and the rest still qualify normally", () => {
  const names = focusNames([
    q("overdue reminder", { questType: "reminder", dueDate: day(-3) }),
    q("reminder starting today", { questType: "reminder", startDate: day(0) }),
    q("high reminder due tomorrow", { questType: "reminder", dueDate: day(1), importance: "High" }),
    q("urgent deadline", { questType: "deadline", dueDate: day(0) }),
    q("started task", { questType: "general", startDate: day(-1) }),
  ]);
  assert.deepEqual(names, ["urgent deadline", "started task"]);
  assert.equal(smartFocus([q("r", { questType: "reminder", dueDate: day(0) })], now).total, 0);
});

test("Smart Focus does not modify the list it was given", () => {
  const input = [q("b", { startDate: day(0) }), q("a", { dueDate: day(0) })];
  const copy = [...input];
  smartFocus(input, now);
  assert.deepEqual(input, copy);
});

test("today's reminders: open reminders whose start has arrived, most important first", () => {
  const r = (name: string, extra: Record<string, unknown> = {}) => ({ name, questType: "reminder", ...extra });
  const shown = remindersForToday([
    r("low", { importance: "Low" }),
    r("high", { importance: "High" }),
    r("starts later", { importance: "Pareto", startDate: day(3) }),
    r("started", { importance: "Medium", startDate: day(-2) }),
    r("starts today", { importance: "Med-High", startDate: day(0) }),
    r("done", { importance: "High", completed: true }),
    r("recycled", { importance: "High", recycled: true }),
    { name: "deadline", questType: "deadline", importance: "Pareto", dueDate: day(0) },
    { name: "general", questType: "general", importance: "Pareto" },
  ], now);
  assert.deepEqual(names(shown), ["high", "starts today", "started", "low"]);
  assert.deepEqual(remindersForToday([], now), []);
});

test("clearing the due date of a deadline quest turns it into a general one in the same save, which the server accepts", () => {
  const deadline = { questType: "deadline", dueDate: day(0), startDate: null };
  assert.equal(questTypeAfterClearingDue(deadline), "general");
  assert.equal(resolveQuestDatePatch(deadline, { dueDate: null }).ok, false, "clearing it alone is still refused");
  assert.deepEqual(resolveQuestDatePatch(deadline, { dueDate: null, questType: "general" }), { ok: true, adjust: {} });
});

test("clearing the due date of any other quest changes nothing else", () => {
  for (const questType of ["general", "reminder", null, undefined]) {
    assert.equal(questTypeAfterClearingDue({ questType }), null);
    assert.equal(resolveQuestDatePatch({ questType, dueDate: day(0) }, { dueDate: null }).ok, true);
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEADLINE_NEEDS_DUE_DATE, SMART_BANDS, START_AFTER_DUE, groupSmart, isNotStartedYet, isOnTodaysList, isOverdue,
  resolveQuestDatePatch, smartBand, sortSmart, sortUpcoming, validateQuestDates, type ScheduledQuest,
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

test("urgent band: nearest deadline first, then importance", () => {
  const sorted = sortSmart([
    quest("due in 2 days", { dueDate: day(2), importance: "Pareto" }),
    quest("overdue low", { dueDate: day(-4), importance: "Low" }),
    quest("due today high", { dueDate: day(0), importance: "High" }),
    quest("due today low", { dueDate: day(0), importance: "Low" }),
    quest("overdue by 1", { dueDate: day(-1), importance: "Medium" }),
  ], now);
  assert.deepEqual(names(sorted), ["overdue low", "overdue by 1", "due today high", "due today low", "due in 2 days"]);
});

test("ready band: earliest start first, then importance, then due date; quests with no start come after dated ones", () => {
  const sorted = sortSmart([
    quest("no start, high", { importance: "High", dueDate: day(10) }),
    quest("started today, low", { startDate: day(0), importance: "Low", dueDate: day(30) }),
    quest("started 5 days ago, low", { startDate: day(-5), importance: "Low", dueDate: day(30) }),
    quest("started today, high, later due", { startDate: day(0), importance: "High", dueDate: day(40) }),
    quest("started today, high, sooner due", { startDate: day(0), importance: "High", dueDate: day(9) }),
    quest("no start, pareto", { importance: "Pareto", dueDate: day(50) }),
  ], now);
  assert.deepEqual(names(sorted), [
    "started 5 days ago, low",
    "started today, high, sooner due",
    "started today, high, later due",
    "started today, low",
    "no start, pareto",
    "no start, high",
  ]);
});

test("feed order: urgent, then ready now, then starting this week, then upcoming", () => {
  const sorted = sortSmart([
    quest("upcoming", { startDate: day(30) }),
    quest("this week", { startDate: day(3) }),
    quest("ready", { startDate: day(-1) }),
    quest("urgent", { dueDate: day(1) }),
  ], now);
  assert.deepEqual(names(sorted), ["urgent", "ready", "this week", "upcoming"]);
});

test("starting this week and upcoming are ordered by start date, then importance", () => {
  const sorted = sortSmart([
    quest("late-week low", { startDate: day(6), importance: "Low" }),
    quest("tomorrow low", { startDate: day(1), importance: "Low" }),
    quest("tomorrow high", { startDate: day(1), importance: "High" }),
    quest("next month", { startDate: day(40), importance: "Pareto" }),
    quest("in 10 days", { startDate: day(10), importance: "Low" }),
  ], now);
  assert.deepEqual(names(sorted), ["tomorrow high", "tomorrow low", "late-week low", "in 10 days", "next month"]);
});

test("a start date earlier than the due date never outranks a nearer deadline", () => {
  const sorted = sortSmart([
    quest("started long ago, due next month", { startDate: day(-60), dueDate: day(25) }),
    quest("started yesterday, due tomorrow", { startDate: day(-1), dueDate: day(1) }),
  ], now);
  assert.deepEqual(names(sorted), ["started yesterday, due tomorrow", "started long ago, due next month"]);
});

test("groups: labelled in feed order and empty bands are left out", () => {
  const groups = groupSmart([quest("a", { startDate: day(3) }), quest("b", { dueDate: day(0) })], now);
  assert.deepEqual(groups.map((g) => g.band), ["urgent", "this-week"]);
  assert.deepEqual(groups.map((g) => g.label), ["Urgent", "Starting this week"]);
  assert.deepEqual(groupSmart([], now), []);
  assert.deepEqual([...SMART_BANDS], ["urgent", "ready", "this-week", "upcoming"]);
});

test("quests from before start dates existed keep a sensible order: urgent by deadline, rest by importance then due date", () => {
  const sorted = sortSmart([
    quest("legacy low, due in 20", { importance: "Low", dueDate: day(20) }),
    quest("legacy high, due in 30", { importance: "High", dueDate: day(30) }),
    quest("legacy overdue", { importance: "Low", dueDate: day(-2) }),
    quest("legacy undated", { importance: "Medium" }),
    quest("legacy high, due in 10", { importance: "High", dueDate: day(10) }),
  ], now);
  assert.deepEqual(names(sorted), ["legacy overdue", "legacy high, due in 10", "legacy high, due in 30", "legacy undated", "legacy low, due in 20"]);
});

test("sorting does not modify the list it was given", () => {
  const input = [quest("b", { startDate: day(3) }), quest("a", { dueDate: day(0) })];
  const copy = [...input];
  sortSmart(input, now);
  assert.deepEqual(input, copy);
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

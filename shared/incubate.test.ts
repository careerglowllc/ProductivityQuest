import test from "node:test";
import assert from "node:assert/strict";
import {
  INCUBATE_PRESETS, INCUBATE_STAGE, incubatePatch, incubateProblem, incubateStatus, localDayOf, presetDay, stagePatch, staysInList, storedDay,
} from "./incubate";
import { isNotStartedYet, isOnTodaysList, smartFocus, sortUpcoming, resolveQuestDatePatch } from "./quest-schedule";

// Tuesday Oct 20 2026, mid-afternoon on the device.
const now = new Date(2026, 9, 20, 15, 30);
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const stored = (iso: string) => `${iso}T00:00:00.000Z`;

test("the day picked is saved as that calendar day at UTC midnight, whatever the time zone", () => {
  assert.equal(storedDay(local(2026, 11, 3)), "2026-11-03T00:00:00.000Z");
  assert.equal(storedDay(new Date(2026, 10, 3, 23, 59)), "2026-11-03T00:00:00.000Z", "late evening is still that day");
  const back = localDayOf("2026-11-03T00:00:00.000Z")!;
  assert.deepEqual([back.getFullYear(), back.getMonth(), back.getDate()], [2026, 10, 3]);
  assert.equal(localDayOf(null), undefined);
  assert.equal(localDayOf("not a date"), undefined);
});

test("choosing Incubate saves the stage and the day it comes back as its start date", () => {
  assert.deepEqual(incubatePatch(local(2026, 11, 3)), { kanbanStage: "Incubate", startDate: "2026-11-03T00:00:00.000Z" });
  assert.equal(INCUBATE_STAGE, "Incubate");
});

test("the quick choices are a week, two weeks, a month and three months from today", () => {
  assert.deepEqual(INCUBATE_PRESETS.map((p) => p.label), ["1 week", "2 weeks", "1 month", "3 months"]);
  const days = INCUBATE_PRESETS.map((p) => presetDay(now, p.days)).map((d) => `${d.getMonth() + 1}/${d.getDate()}`);
  assert.deepEqual(days, ["10/27", "11/3", "11/19", "1/19"]);
});

// ── Which days can be chosen ────────────────────────────────────────────────
test("the day has to be after today", () => {
  assert.equal(incubateProblem(local(2026, 10, 20), {}, now), "not-future", "today");
  assert.equal(incubateProblem(local(2026, 10, 19), {}, now), "not-future", "yesterday");
  assert.equal(incubateProblem(local(2026, 10, 21), {}, now), null, "tomorrow");
  assert.equal(incubateProblem(local(2027, 3, 1), {}, now), null);
});

test("the day can't be after the due date, but the due day itself is fine", () => {
  const quest = { dueDate: stored("2026-11-10") };
  assert.equal(incubateProblem(local(2026, 11, 10), quest, now), null);
  assert.equal(incubateProblem(local(2026, 11, 11), quest, now), "after-due");
  assert.equal(incubateProblem(local(2026, 11, 3), quest, now), null);
  assert.equal(incubateProblem(local(2026, 11, 11), { dueDate: null }, now), null, "no due date, no limit");
});

test("the server accepts exactly the days this allows", () => {
  const quest = { dueDate: stored("2026-11-10"), startDate: null, questType: "general" };
  for (const [day, ok] of [[local(2026, 11, 10), true], [local(2026, 11, 11), false], [local(2026, 10, 25), true]] as const) {
    const result = resolveQuestDatePatch(quest, { startDate: storedDay(day) });
    assert.equal(result.ok, ok, String(day));
    assert.equal(incubateProblem(day, quest, now) === null, ok);
  }
});

test("a deadline within three days keeps a quest in the list whatever the incubate date, and a far one does not", () => {
  assert.equal(staysInList(local(2026, 10, 22), { dueDate: stored("2026-10-23") }, now), true);
  assert.equal(staysInList(local(2026, 11, 3), { dueDate: stored("2026-12-01") }, now), false);
  assert.equal(staysInList(local(2026, 11, 3), {}, now), false);
});

// ── The quest leaves the feed and comes back ────────────────────────────────
test("an incubating quest is held back from today's list and Smart Focus until its day, then comes back", () => {
  const quest = { id: 1, title: "Learn piano", importance: "High", ...incubatePatch(local(2026, 11, 3)), dueDate: null };
  const on = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h);

  for (const day of [on(2026, 10, 21), on(2026, 11, 2, 23)]) {
    assert.equal(isOnTodaysList(quest, day), false, `hidden on ${day.toDateString()}`);
    assert.equal(isNotStartedYet(quest, day), true);
    assert.equal(smartFocus([quest], day).shown, 0);
  }
  assert.equal(sortUpcoming([quest], on(2026, 10, 21)).length, 1, "still listed under Upcoming, not deleted");

  for (const day of [on(2026, 11, 3, 0), on(2026, 11, 3, 12), on(2026, 11, 4)]) {
    assert.equal(isOnTodaysList(quest, day), true, `back on ${day.toDateString()}`);
    assert.equal(isNotStartedYet(quest, day), false);
    assert.equal(smartFocus([quest], day).shown, 1);
  }
});

// ── Leaving Incubate ────────────────────────────────────────────────────────
test("leaving Incubate while the return day is still ahead lets go of it, so the quest is back at once", () => {
  const quest = { kanbanStage: "Incubate", startDate: stored("2026-11-03") };
  assert.deepEqual(stagePatch(quest, "In Progress", now), { kanbanStage: "In Progress", startDate: null });
  assert.deepEqual(stagePatch(quest, "Not Started", now), { kanbanStage: "Not Started", startDate: null });
  assert.deepEqual(stagePatch(quest, "Done", now), { kanbanStage: "Done", startDate: null });
});

test("any other change of stage leaves the start date alone", () => {
  assert.deepEqual(stagePatch({ kanbanStage: "Incubate", startDate: stored("2026-10-10") }, "In Progress", now), { kanbanStage: "In Progress" }, "the day has passed");
  assert.deepEqual(stagePatch({ kanbanStage: "Incubate", startDate: null }, "In Progress", now), { kanbanStage: "In Progress" });
  assert.deepEqual(stagePatch({ kanbanStage: "Not Started", startDate: stored("2026-11-03") }, "In Progress", now), { kanbanStage: "In Progress" }, "a start date set by hand stays");
  assert.deepEqual(stagePatch({ kanbanStage: "In Progress", startDate: stored("2026-11-03") }, "Review", now), { kanbanStage: "Review" });
});

test("the line under the stage says when an incubating quest returns, and says nothing for other stages", () => {
  assert.deepEqual(incubateStatus({ kanbanStage: "Incubate", startDate: stored("2026-11-03") }, now), { kind: "until", start: "2026-11-03T00:00:00.000Z" });
  assert.deepEqual(incubateStatus({ kanbanStage: "Incubate", startDate: stored("2026-10-21") }, now), { kind: "until", start: "2026-10-21T00:00:00.000Z" }, "tomorrow");
  assert.deepEqual(incubateStatus({ kanbanStage: "Incubate", startDate: stored("2026-10-20") }, now), { kind: "ended" }, "the day has arrived");
  assert.deepEqual(incubateStatus({ kanbanStage: "Incubate", startDate: stored("2026-09-01") }, now), { kind: "ended" });
  assert.deepEqual(incubateStatus({ kanbanStage: "Incubate", startDate: null }, now), { kind: "unset" }, "synced from Notion with no day");
  assert.equal(incubateStatus({ kanbanStage: "In Progress", startDate: stored("2026-11-03") }, now), null);
  assert.equal(incubateStatus({}, now), null);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { nextRecurringDate, nextRecurringStart } from "./recurrence";

const d = (iso: string) => new Date(iso);

test("recurrence: daily, weekly and monthly move the date forward by one period", () => {
  assert.equal(nextRecurringDate(d("2026-10-12T00:00:00Z"), "daily").toISOString(), "2026-10-13T00:00:00.000Z");
  assert.equal(nextRecurringDate(d("2026-10-12T00:00:00Z"), "weekly").toISOString(), "2026-10-19T00:00:00.000Z");
  // Month and year steps are calendar steps in local time, so compare local parts (clock changes can shift the hour).
  const june = d("2026-06-12T12:00:00Z");
  const nextMonth = nextRecurringDate(june, "monthly");
  assert.deepEqual([nextMonth.getMonth(), nextMonth.getDate()], [june.getMonth() + 1, june.getDate()]);
  const nextYear = nextRecurringDate(june, "yearly");
  assert.deepEqual([nextYear.getFullYear(), nextYear.getMonth(), nextYear.getDate()], [june.getFullYear() + 1, june.getMonth(), june.getDate()]);
});

test("recurrence: an unknown recurrence moves forward one day, and no date starts from now", () => {
  assert.equal(nextRecurringDate(d("2026-10-12T00:00:00Z"), "whenever").toISOString(), "2026-10-13T00:00:00.000Z");
  assert.ok(nextRecurringDate(null, "daily").getTime() > Date.now());
});

test("recurring start date: moves by the same period as the due date, keeping its lead time", () => {
  const due = d("2026-10-12T00:00:00Z");
  const start = d("2026-10-05T00:00:00Z");
  const nextDue = nextRecurringDate(due, "weekly");
  const nextStart = nextRecurringStart(start, "weekly", nextDue)!;
  assert.equal(nextStart.toISOString(), "2026-10-12T00:00:00.000Z");
  assert.equal(nextDue.getTime() - nextStart.getTime(), due.getTime() - start.getTime());
});

test("recurring start date: none stays none, so older recurring quests are untouched", () => {
  assert.equal(nextRecurringStart(null, "weekly", d("2026-10-19T00:00:00Z")), null);
});

test("recurring start date: never lands after the next due date", () => {
  const nextStart = nextRecurringStart(d("2026-10-05T00:00:00Z"), "weekly", d("2026-10-10T00:00:00Z"))!;
  assert.equal(nextStart.toISOString(), "2026-10-10T00:00:00.000Z");
});

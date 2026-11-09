import assert from "node:assert/strict";
import { test } from "node:test";
import { isRecurringType, nextRecurringDate, nextRecurringDateOnOrAfter, nextRecurringStart } from "./recurrence";

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

test("a passed yearly date moves on to this year's, or next year's once this year's has gone too", () => {
  const birthday = d("2024-11-10T00:00:00Z");
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  assert.equal(iso(nextRecurringDateOnOrAfter(birthday, "yearly", d("2026-11-09T00:00:00Z"))), "2026-11-10", "the day before this year's");
  assert.equal(iso(nextRecurringDateOnOrAfter(birthday, "yearly", d("2026-11-10T00:00:00Z"))), "2026-11-10", "on the day: kept");
  assert.equal(iso(nextRecurringDateOnOrAfter(birthday, "yearly", d("2026-11-11T00:00:00Z"))), "2027-11-10", "the day after: next year");
});

test("a date still ahead is left as it is, and other recurrences step the same way", () => {
  const ahead = d("2027-01-05T00:00:00Z");
  assert.equal(nextRecurringDateOnOrAfter(ahead, "yearly", d("2026-11-09T00:00:00Z")).getTime(), ahead.getTime());
  assert.equal(nextRecurringDateOnOrAfter(d("2026-11-01T00:00:00Z"), "weekly", d("2026-11-09T00:00:00Z")).toISOString(), "2026-11-15T00:00:00.000Z");
  assert.equal(nextRecurringDateOnOrAfter(d("2026-11-01T00:00:00Z"), "daily", d("2026-11-09T00:00:00Z")).toISOString(), "2026-11-09T00:00:00.000Z");
});

test("which recurrences repeat: one-time, none and blank do not, decorated labels are read", () => {
  for (const recur of ["daily", "yearly", "every 2 years", "monthly"]) assert.equal(isRecurringType(recur), true, recur);
  for (const recur of ["one-time", "⏳One-time", "none", "", null, undefined]) assert.equal(isRecurringType(recur), false, String(recur));
});

test("moving a passed date on keeps its stored day and time across the clock changes, on any machine", () => {
  // Nov 1 and Mar 8 2026 are the US clock changes; a local-time step would shift these by an hour, or a whole day.
  assert.equal(nextRecurringDateOnOrAfter(d("2026-10-25T00:00:00Z"), "weekly", d("2026-11-07T00:00:00Z")).toISOString(), "2026-11-08T00:00:00.000Z");
  assert.equal(nextRecurringDateOnOrAfter(d("2026-03-01T00:00:00Z"), "weekly", d("2026-03-10T00:00:00Z")).toISOString(), "2026-03-15T00:00:00.000Z");
  assert.equal(nextRecurringDateOnOrAfter(d("2025-03-09T07:00:00Z"), "yearly", d("2026-03-01T00:00:00Z")).toISOString(), "2026-03-09T07:00:00.000Z", "a date picked as local midnight keeps its time");
  assert.equal(nextRecurringDateOnOrAfter(d("2024-02-29T00:00:00Z"), "yearly", d("2026-02-01T00:00:00Z")).toISOString().slice(0, 10), "2026-03-01", "Feb 29 lands on Mar 1 in other years, as a yearly step always has");
});


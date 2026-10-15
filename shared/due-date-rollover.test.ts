import test from "node:test";
import assert from "node:assert/strict";
import { dayOfDueDate, dueDateForDay, isOverdueOn, localDay, msUntilNextDay } from "./due-date-rollover";

test("the day is read in the account's own timezone, so midnight differs from place to place", () => {
  // 2026-10-16 is daylight time: Los Angeles is UTC-7, New York UTC-4, Tokyo UTC+9.
  assert.equal(localDay(new Date("2026-10-16T06:59:00Z"), "America/Los_Angeles"), "2026-10-15");
  assert.equal(localDay(new Date("2026-10-16T07:00:00Z"), "America/Los_Angeles"), "2026-10-16");
  assert.equal(localDay(new Date("2026-10-16T03:59:00Z"), "America/New_York"), "2026-10-15");
  assert.equal(localDay(new Date("2026-10-16T04:00:00Z"), "America/New_York"), "2026-10-16");
  assert.equal(localDay(new Date("2026-10-15T14:59:00Z"), "Asia/Tokyo"), "2026-10-15");
  assert.equal(localDay(new Date("2026-10-15T15:00:00Z"), "Asia/Tokyo"), "2026-10-16");
});

test("a missing or unknown timezone counts as UTC instead of failing", () => {
  const now = new Date("2026-10-16T23:30:00Z");
  assert.equal(localDay(now, null), "2026-10-16");
  assert.equal(localDay(now, undefined), "2026-10-16");
  assert.equal(localDay(now, "Mars/Phobos"), "2026-10-16");
});

test("a due date is stored as midnight UTC of its day, and read back as that day", () => {
  assert.equal(dueDateForDay("2026-10-16").toISOString(), "2026-10-16T00:00:00.000Z");
  assert.equal(dayOfDueDate("2026-10-15T00:00:00.000Z"), "2026-10-15");
  assert.equal(dayOfDueDate(new Date("2026-10-15T23:30:00Z")), "2026-10-15", "a time late in the day is still that day");
  for (const none of [null, undefined, "", "not a date"]) assert.equal(dayOfDueDate(none as any), null);
});

test("only an earlier day is overdue; today and later are not, and no due date never is", () => {
  const today = "2026-10-16";
  assert.equal(isOverdueOn("2026-10-15T00:00:00.000Z", today), true);
  assert.equal(isOverdueOn("2026-01-01T00:00:00.000Z", today), true);
  assert.equal(isOverdueOn("2026-10-16T00:00:00.000Z", today), false, "due today");
  assert.equal(isOverdueOn("2026-10-16T17:00:00.000Z", today), false, "due later today");
  assert.equal(isOverdueOn("2026-10-17T00:00:00.000Z", today), false);
  assert.equal(isOverdueOn(null, today), false);
  assert.equal(isOverdueOn("garbage", today), false);
});

test("the time until the day changes follows the account's clock", () => {
  assert.equal(msUntilNextDay(new Date("2026-10-16T06:59:30Z"), "America/Los_Angeles"), 30_000);
  assert.equal(msUntilNextDay(new Date("2026-10-16T06:59:30.250Z"), "America/Los_Angeles"), 29_750);
  assert.equal(msUntilNextDay(new Date("2026-10-16T07:00:00Z"), "America/Los_Angeles"), 24 * 3600_000, "just after midnight a whole day is left");
  assert.equal(msUntilNextDay(new Date("2026-10-16T12:00:00Z"), "America/New_York"), 16 * 3600_000);
  assert.equal(msUntilNextDay(new Date("2026-10-15T18:29:00Z"), "Asia/Kolkata"), 60_000, "a half-hour offset");
  assert.equal(msUntilNextDay(new Date("2026-10-15T23:00:00Z"), "Not/AZone"), 3600_000, "unknown counts as UTC");
});

test("the next midnight is the next day in that timezone", () => {
  for (const zone of ["America/Los_Angeles", "America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney"]) {
    const now = new Date("2026-10-16T12:34:56Z");
    const after = new Date(now.getTime() + msUntilNextDay(now, zone) + 1000);
    assert.notEqual(localDay(after, zone), localDay(now, zone), zone);
    assert.equal(localDay(new Date(after.getTime() - 2000), zone), localDay(now, zone), `${zone}: one second before it is still the same day`);
  }
});

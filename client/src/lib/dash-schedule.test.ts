import test from "node:test";
import assert from "node:assert/strict";
import { scheduleWindow, timeLabel, type ScheduleEvent } from "./dash-schedule";

const NOW = new Date(2026, 10, 2, 18, 31); // Monday 6:31 PM, local time
const at = (hour: number, minute = 0, dayOffset = 0) => new Date(2026, 10, 2 + dayOffset, hour, minute).toISOString();
const ev = (id: string, title: string, start: string, end: string, extra: Partial<ScheduleEvent> = {}): ScheduleEvent => ({ id, title, start, end, ...extra });
const titles = (events: readonly ScheduleEvent[], now = NOW) => scheduleWindow(events, now).rows.map((row) => row.event.title);

test("only events from 30 minutes ago to 3 hours ahead are shown", () => {
  const events = [
    ev("a", "Staff Meeting", at(13), at(14)),
    ev("b", "Just ended", at(17, 30), at(18, 0)),
    ev("c", "Ended 20 min ago", at(17, 45), at(18, 11)),
    ev("d", "Running now", at(18, 0), at(19, 0)),
    ev("e", "In two hours", at(20, 30), at(21, 0)),
    ev("f", "Just inside", at(21, 30), at(22, 0)),
    ev("g", "Too far out", at(21, 32), at(22, 0)),
    ev("h", "Tomorrow", at(9, 0, 1), at(10, 0, 1)),
  ];
  assert.deepEqual(titles(events), ["Ended 20 min ago", "Running now", "In two hours", "Just inside"]);
});

test("an event that started earlier but is still going on is shown", () => {
  assert.deepEqual(titles([ev("a", "Long workshop", at(14), at(19))]), ["Long workshop"]);
  assert.deepEqual(titles([ev("a", "Over at 6:00", at(17), at(18, 0))]), [], "ended 31 minutes ago, outside the window");
  assert.deepEqual(titles([ev("a", "Over at 6:01", at(17), at(18, 1))]), [], "ended exactly 30 minutes ago");
  assert.deepEqual(titles([ev("a", "Over at 6:02", at(17), at(18, 2))]), ["Over at 6:02"]);
});

test("each event is over, happening now or coming up, in start order", () => {
  const { rows } = scheduleWindow([
    ev("n", "Next", at(19, 0), at(19, 30)),
    ev("p", "Past", at(18, 0), at(18, 15)),
    ev("c", "Current", at(18, 15), at(19, 0)),
  ], NOW);
  assert.deepEqual(rows.map((r) => [r.event.title, r.state]), [["Past", "past"], ["Current", "now"], ["Next", "next"]]);
});

test("the now line sits before the first event that has not started", () => {
  const window = scheduleWindow([ev("p", "Past", at(18, 0), at(18, 15)), ev("c", "Current", at(18, 15), at(19, 0)), ev("n", "Next", at(19, 0), at(19, 30))], NOW);
  assert.equal(window.nowIndex, 2, "after the past and the current event, before the next");
  assert.equal(scheduleWindow([ev("p", "Past", at(18, 0), at(18, 15))], NOW).nowIndex, 1, "nothing coming up: the line is last");
  assert.equal(scheduleWindow([], NOW).nowIndex, 0);
  assert.equal(scheduleWindow([ev("n", "Next", at(19, 0), at(19, 30))], NOW).nowIndex, 0, "nothing yet: the line is first");
});

test("all-day events that cover today are listed apart from the timed ones", () => {
  const events = [
    ev("a", "Birthday", "2026-11-02T00:00:00", "2026-11-03T00:00:00", { allDay: true }),
    ev("b", "Yesterday only", "2026-11-01T00:00:00", "2026-11-02T00:00:00", { allDay: true }),
    ev("c", "Trip", "2026-10-31T00:00:00", "2026-11-04T00:00:00", { allDay: true }),
    ev("d", "Untagged whole day", "2026-11-02T00:00:00", "2026-11-03T00:00:00"),
    ev("e", "Dinner", at(19, 0), at(20, 0)),
  ];
  const window = scheduleWindow(events, NOW);
  assert.deepEqual(window.allDay.map((e) => e.title), ["Birthday", "Trip", "Untagged whole day"]);
  assert.deepEqual(window.rows.map((r) => r.event.title), ["Dinner"]);
});

test("events with no end time or an unreadable start are handled", () => {
  assert.deepEqual(titles([ev("a", "No end", at(19, 0), "")]), ["No end"], "an instant inside the window");
  assert.deepEqual(titles([ev("a", "No end, far", at(23, 0), "")]), []);
  assert.deepEqual(titles([ev("a", "Broken", "not a date", "")]), []);
});

test("the window follows the clock, including across midnight", () => {
  const late = new Date(2026, 10, 2, 23, 0);
  const events = [ev("a", "Late call", at(22, 45), at(23, 15)), ev("b", "After midnight", at(1, 0, 1), at(2, 0, 1)), ev("c", "Too late", at(2, 5, 1), at(3, 0, 1))];
  assert.deepEqual(titles(events, late), ["Late call", "After midnight"]);
});

test("times read like 6:31 PM", () => {
  assert.equal(timeLabel(NOW), "6:31 PM");
  assert.equal(timeLabel(new Date(2026, 10, 2, 0, 5)), "12:05 AM");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { CompactSchedule } from "./dash-schedule-compact";

const NOW = new Date(2026, 10, 2, 18, 31);
const at = (hour: number, minute = 0) => new Date(2026, 10, 2, hour, minute).toISOString();
const render = (events: any[]) => renderToStaticMarkup(<Router ssrPath="/"><CompactSchedule events={events} now={NOW} /></Router>);

test("the compact schedule lists the window's events with times, and the now line between past and upcoming", () => {
  const html = render([
    { id: "1", title: "Staff Meeting", start: at(13), end: at(14), calendarColor: "#7ed957" },
    { id: "2", title: "L/S Meet (A)", start: at(18), end: at(19), calendarColor: "#7ed957" },
    { id: "3", title: "L/S Meet (S)", start: at(19), end: at(20), calendarColor: "#7ed957" },
  ]);
  assert.ok(!html.includes("Staff Meeting"), "this afternoon's meeting is outside the window");
  assert.equal((html.match(/data-testid="schedule-row"/g) ?? []).length, 2);
  assert.ok(html.indexOf("L/S Meet (A)") < html.indexOf('data-testid="schedule-now"'), "the running event is above the now line");
  assert.ok(html.indexOf('data-testid="schedule-now"') < html.indexOf("L/S Meet (S)"), "the next event is below it");
  assert.match(html, /6:31 PM/);
  assert.match(html, /7:00 PM/);
  assert.match(html, /background-color:#7ed957/);
});

test("with nothing in the window it says so, and still shows the now line", () => {
  const html = render([{ id: "1", title: "Tomorrow", start: new Date(2026, 10, 3, 9).toISOString(), end: new Date(2026, 10, 3, 10).toISOString() }]);
  assert.match(html, /Nothing from 30 minutes ago to the next 3 hours/);
  assert.match(html, /data-testid="schedule-now"/);
  assert.ok(!html.includes("Tomorrow"));
});

test("all-day events are small chips above the times", () => {
  const html = render([{ id: "1", title: "Last day AKA 11/4", start: "2026-11-02T00:00:00", end: "2026-11-03T00:00:00", allDay: true }]);
  assert.match(html, /data-testid="schedule-all-day"/);
  assert.ok(html.indexOf("Last day AKA 11/4") < html.indexOf('data-testid="schedule-now"'));
});

test("the dashboard uses the compact schedule and the compact priority list on a phone only", () => {
  const dashboard = readFileSync(new URL("../pages/dashboard.tsx", import.meta.url), "utf8");
  assert.ok(dashboard.includes("if (isMobile) return <CompactSchedule events={safeCalendarEvents} />;"));
  assert.ok(dashboard.includes('<DashCardHead title="Top priority tasks" href="/tasks" linkLabel="View all" compact={isMobile} />'));
  assert.ok(dashboard.includes('key === "tasks" || key === "schedule" ? "" : "min-h-[340px]"'), "these two widgets are as tall as their content on a phone");
  assert.ok(dashboard.includes("Array.from({ length: 24 }"), "the full 24-hour schedule is still what a larger screen shows");
});

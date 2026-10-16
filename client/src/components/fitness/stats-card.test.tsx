import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeWorkout, workoutToLogEntries, type CalorieDayLog } from "@shared/fitness-log";
import { allTimeCalories, allTimeLifting, calorieWeek, liftWeek } from "@shared/fitness-stats";
import { STATS_OPEN_KEYS } from "@/lib/stats-open";
import { CalorieStats, LiftStats } from "./stats-card";

const TODAY = "2026-10-15";
const day = (date: string, calories: number, protein: number): CalorieDayLog => ({
  date, calories, protein, carbs: 0, fat: 0, sodium: 0, magnesium: 0, calcium: 0, vitaminC: 0, vitaminA: 0, foodDetails: "", completeness: "unknown/partial", confidence: "medium",
});
const log = [day("2026-10-13", 1600, 140), day("2026-10-14", 2000, 100), day("2026-10-15", 1840, 90), day("2026-10-08", 2400, 80)];
const entries = [
  ...workoutToLogEntries(normalizeWorkout({ date: "2026-10-13", workoutType: "Pull", exercises: [{ name: "Lat Pulldown", sets: [{ weight: 120, reps: 8 }] }] }, "2026-10-13"), "a"),
  ...workoutToLogEntries(normalizeWorkout({ date: "2026-10-15", workoutType: "Push", exercises: [{ name: "Bench Press", sets: [{ weight: 150, reps: 5 }] }] }, "2026-10-15"), "b"),
];

function storage(value?: string) {
  const data = new Map<string, string>(value === undefined ? [] : [[STATS_OPEN_KEYS.meal, value], [STATS_OPEN_KEYS.workout, value]]);
  (globalThis as any).localStorage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) };
}
const calories = () => renderToStaticMarkup(createElement(CalorieStats, { week: calorieWeek(log, TODAY, 2200), today: TODAY, goal: 2200, accent: "#F87171", allTime: allTimeCalories(log) }));
const lifting = () => renderToStaticMarkup(createElement(LiftStats, { week: liftWeek(entries, TODAY), today: TODAY, accent: "#34D399", allTime: allTimeLifting(entries) }));
const body = (html: string) => html.match(/<div id="stats-body-[a-z]+"[^>]*>/)?.[0] ?? "";

test("the Stats widget is a button titled Stats and is fully expanded by default", () => {
  storage();
  for (const html of [calories(), lifting()]) {
    assert.match(html, /<button[^>]*data-testid="stats-toggle"[^>]*aria-expanded="true"/);
    assert.match(html, />Stats</);
    assert.doesNotMatch(body(html), /hidden/);
  }
});

test("a collapsed widget stays collapsed, shows a one-line summary, and keeps its content out of sight", () => {
  storage("0");
  const html = calories();
  assert.match(html, /aria-expanded="false"/);
  assert.match(body(html), /hidden=""/);
  assert.match(html, /data-testid="stats-subtitle"[^>]*>3\/7 days · avg 1,813 kcal</);
  assert.match(lifting(), /data-testid="stats-subtitle"[^>]*>2 workouts · 1,710 lb</);
  storage("1");
  assert.match(calories(), /aria-expanded="true"/);
  assert.match(calories(), /data-testid="stats-subtitle"[^>]*>This week</);
});

test("the calorie widget has this week's tiles, the bar chart with the goal line, highlights, the weekly log and the all-time line", () => {
  storage();
  const html = calories();
  assert.match(html, /1,813<\/p><p[^>]*>Avg kcal/);
  assert.match(html, /3\/7<\/p><p[^>]*>Days logged/);
  assert.equal((html.match(/data-testid="bar(-today)?"/g) ?? []).length, 7, "one bar per day");
  assert.equal((html.match(/data-testid="bar-today"/g) ?? []).length, 1);
  assert.match(html, /data-testid="goal-line"[^>]*>.*goal 2,200/);
  assert.match(html, /3-day logging streak/);
  assert.match(html, /Best protein: Tue 140g/);
  assert.equal((html.match(/<li class="flex items-center justify-between/g) ?? []).length, 7, "the weekly log lists seven days");
  assert.match(html, /Nothing logged/);
  assert.match(html, /All time: 4 days logged · avg 1,960 kcal · 103g protein/);
});

test("the lifting widget has workouts, volume and sets, the bar chart, highlights and the weekly log", () => {
  storage();
  const html = lifting();
  assert.match(html, />2<\/p><p[^>]*>Workouts/);
  assert.match(html, /1,710<\/p><p[^>]*>Volume \(lb\)/);
  assert.doesNotMatch(html, /goal-line/, "volume has no goal line");
  assert.match(html, /Heaviest: Bench Press 150 lb/);
  assert.match(html, /Push 1 · Pull 1 · Legs 0/);
  assert.match(html, /Pull · 1 exercise · 1 set · 960 lb/);
  assert.match(html, /Rest day/);
  assert.match(html, /All time: 2 sessions · 2 exercises tracked/);
});

test("an empty week shows placeholders, not zeros, and still renders every part", () => {
  storage();
  const html = renderToStaticMarkup(createElement(CalorieStats, { week: calorieWeek([], TODAY, 2200), today: TODAY, goal: 2200, accent: "#F87171", allTime: allTimeCalories([]) }));
  assert.match(html, /Log a meal and this week&#x27;s highlights appear here/);
  assert.match(html, />—<\/p><p[^>]*>Avg kcal/);
  assert.match(html, /0\/7<\/p>/);
  assert.match(html, /Nothing logged/);
  assert.match(html, /data-testid="week-bars"/);
  const lift = renderToStaticMarkup(createElement(LiftStats, { week: liftWeek([], TODAY), today: TODAY, accent: "#34D399", allTime: allTimeLifting([]) }));
  assert.match(lift, /Log a workout and this week&#x27;s highlights appear here/);
  assert.match(lift, /Rest day/);
});

test("the toggle is wired to the body for screen readers", () => {
  storage();
  const html = calories();
  assert.match(html, /aria-controls="stats-body-meal"/);
  assert.match(html, /<div id="stats-body-meal"/);
  assert.match(lifting(), /aria-controls="stats-body-workout"/);
});

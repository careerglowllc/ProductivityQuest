import test from "node:test";
import assert from "node:assert/strict";
import type { CalorieWeek, LiftWeek } from "@shared/fitness-stats";
import {
  calorieBars, calorieHighlights, calorieLogRows, calorieStatsSubtitle, dayLabel, dayLetter, liftBars, liftHighlights, liftLogRows, liftStatsSubtitle, shortNumber, weekdayShort,
} from "./fitness-stats-text";

const TODAY = "2026-10-15"; // Thursday
const dates = ["2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"];

const calWeek = (over: Partial<CalorieWeek> = {}): CalorieWeek => ({
  days: dates.map((date, i) => ({ date, calories: i === 4 ? 1600 : i === 6 ? 1840 : 0, protein: i === 4 ? 140 : i === 6 ? 90 : 0, logged: i === 4 || i === 6 })),
  loggedDays: 2, avgCalories: 1720, avgProtein: 115, streak: 1, bestProtein: { date: "2026-10-13", protein: 140 }, vsLastWeek: -120, daysUnderGoal: 2, ...over,
});
const liftW = (over: Partial<LiftWeek> = {}): LiftWeek => ({
  days: dates.map((date, i) => ({ date, trained: i === 4 || i === 6, exercises: i === 4 ? 3 : i === 6 ? 1 : 0, sets: i === 4 ? 9 : i === 6 ? 3 : 0, volume: i === 4 ? 8400 : i === 6 ? 0 : 0, types: i === 4 ? ["Pull"] : i === 6 ? ["Push"] : [] })),
  workouts: 2, sets: 12, volume: 8400, volumeChangePct: 12, heaviest: { exercise: "Bench Press", weight: 150, date: "2026-10-15" }, split: { Push: 1, Pull: 3, Legs: 0 }, ...over,
});

test("days are named from the calendar date without shifting by a time zone", () => {
  assert.equal(weekdayShort(TODAY), "Thu");
  assert.equal(dayLetter(TODAY), "T");
  assert.equal(dayLabel("2026-10-09"), "Fri 9");
  assert.equal(dayLabel("2027-01-01"), "Fri 1");
});

test("big numbers are shortened for the small chart labels", () => {
  assert.deepEqual([0, 840, 999, 1000, 1840, 8400, 12345].map(shortNumber), ["0", "840", "999", "1k", "1.8k", "8.4k", "12.3k"]);
});

test("the calorie bars have one bar per day, a label only for days logged, and today marked", () => {
  const bars = calorieBars(calWeek(), TODAY);
  assert.equal(bars.length, 7);
  assert.deepEqual(bars.map((b) => b.short), ["", "", "", "", "1.6k", "", "1.8k"]);
  assert.deepEqual(bars.map((b) => b.isToday), [false, false, false, false, false, false, true]);
  assert.equal(bars[6].letter, "T");
  assert.equal(bars[4].value, 1600);
});

test("the lifting bars show volume, a dot for a day trained with no weight, and nothing on rest days", () => {
  const bars = liftBars(liftW(), TODAY);
  assert.deepEqual(bars.map((b) => b.short), ["", "", "", "", "8.4k", "", "•"]);
  assert.equal(bars[6].isToday, true);
});

test("the weekly log lists today first, with a plain line for days with nothing", () => {
  const rows = calorieLogRows(calWeek(), TODAY);
  assert.equal(rows.length, 7);
  assert.deepEqual([rows[0].label, rows[0].text, rows[0].isToday, rows[0].empty], ["Thu 15", "1,840 kcal · P 90g", true, false]);
  assert.deepEqual([rows[1].label, rows[1].text, rows[1].empty], ["Wed 14", "Nothing logged", true]);
  const lifts = liftLogRows(liftW(), TODAY);
  assert.equal(lifts[0].text, "Push · 1 exercise · 3 sets");
  assert.equal(lifts[2].text, "Pull · 3 exercises · 9 sets · 8.4k lb");
  assert.deepEqual([lifts[1].text, lifts[1].empty], ["Rest day", true]);
});

test("the calorie highlights are the good news: a streak, days logged, best protein, and the change from last week", () => {
  assert.deepEqual(calorieHighlights(calWeek({ streak: 4 })), ["🔥 4-day logging streak", "📅 2 of 7 days logged", "💪 Best protein: Tue 140g", "📉 −120 kcal/day vs last week"]);
  assert.ok(!calorieHighlights(calWeek({ streak: 1 })).some((h) => h.includes("streak")), "a one-day streak is not a streak");
  assert.ok(calorieHighlights(calWeek({ vsLastWeek: 80 })).includes("📈 +80 kcal/day vs last week"));
  assert.ok(!calorieHighlights(calWeek({ vsLastWeek: null })).some((h) => h.includes("last week")));
});

test("with nothing logged the highlights invite the first entry instead of showing zeros", () => {
  const none = calWeek({ days: calWeek().days.map((d) => ({ ...d, calories: 0, protein: 0, logged: false })), loggedDays: 0, streak: 0, bestProtein: null, vsLastWeek: null });
  assert.deepEqual(calorieHighlights(none), ["Log a meal and this week's highlights appear here"]);
  assert.deepEqual(liftHighlights(liftW({ workouts: 0, volumeChangePct: null, heaviest: null })), ["Log a workout and this week's highlights appear here"]);
});

test("the lifting highlights show workouts, volume against last week, the heaviest lift and the split", () => {
  assert.deepEqual(liftHighlights(liftW()), ["🏋️ 2 workouts this week", "📈 Volume up 12% vs last week", "⚡ Heaviest: Bench Press 150 lb", "Push 1 · Pull 3 · Legs 0"]);
  assert.ok(liftHighlights(liftW({ volumeChangePct: -8 })).includes("📉 Volume down 8% vs last week"));
  assert.ok(liftHighlights(liftW({ workouts: 1 })).includes("🏋️ 1 workout this week"));
  assert.ok(liftHighlights(liftW({ volumeChangePct: 2288 })).includes("📈 Volume way up vs last week"), "a huge jump is not shown as thousands of percent");
  assert.ok(liftHighlights(liftW({ volumeChangePct: 500 })).includes("📈 Volume up 500% vs last week"));
});

test("the one-line summary shown while collapsed", () => {
  assert.equal(calorieStatsSubtitle(calWeek()), "2/7 days · avg 1,720 kcal");
  assert.equal(calorieStatsSubtitle(calWeek({ loggedDays: 0 })), "Nothing logged this week yet");
  assert.equal(liftStatsSubtitle(liftW()), "2 workouts · 8,400 lb");
  assert.equal(liftStatsSubtitle(liftW({ workouts: 0 })), "No workouts this week yet");
});

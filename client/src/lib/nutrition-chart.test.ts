import test from "node:test";
import assert from "node:assert/strict";
import { aggregateNutrition, monthKey, weekKey } from "./nutrition-chart";
import type { CalorieDayLog } from "@shared/fitness-log";

const day = (date: string, extra: Partial<CalorieDayLog> = {}): CalorieDayLog => ({
  date, calories: 2000, protein: 100, carbs: 200, fat: 70, sodium: 2000, magnesium: 300, calcium: 800, vitaminC: 30, vitaminA: 900,
  foodDetails: "", completeness: "unknown/partial", confidence: "medium", ...extra,
});

test("by day there is one point per day, in date order", () => {
  const points = aggregateNutrition([day("2026-10-12"), day("2026-10-10", { calories: 1500 })], "day");
  assert.deepEqual(points.map((p) => [p.key, p.calories, p.count]), [["2026-10-10", 1500, 1], ["2026-10-12", 2000, 1]]);
  assert.equal(points[0].label, "Oct 10");
});

test("by week and month the nutrients are averaged and the days counted", () => {
  const days = [day("2026-10-12", { calories: 2000 }), day("2026-10-13", { calories: 1000 }), day("2026-10-20", { calories: 3000 }), day("2026-11-02", { calories: 1800 })];
  const weeks = aggregateNutrition(days, "week");
  assert.deepEqual(weeks.map((p) => [p.key, p.calories, p.count]), [["2026-10-12", 1500, 2], ["2026-10-19", 3000, 1], ["2026-11-02", 1800, 1]]);
  assert.equal(weeks[0].label, "Wk of Oct 12");
  const months = aggregateNutrition(days, "month");
  assert.deepEqual(months.map((p) => [p.key, p.calories, p.count]), [["2026-10", 2000, 3], ["2026-11", 1800, 1]]);
  assert.equal(months[0].label, "Oct 2026");
});

test("nutrients that older days never recorded leave a gap instead of dragging the average to zero", () => {
  const days = [day("2026-10-12"), day("2026-10-13", { fiber: 30, potassium: 3000 }), day("2026-10-14", { fiber: 20 })];
  const [week] = aggregateNutrition(days, "week");
  assert.equal(week.fiber, 25, "averaged over the two days that have it");
  assert.equal(week.potassium, 3000);
  assert.equal(aggregateNutrition([day("2026-10-12")], "day")[0].fiber, undefined);
  assert.equal(aggregateNutrition([day("2026-10-12")], "day")[0].iron, undefined);
});

test("the macro chart values are calories from protein and carbs at 4 and fat at 9, averaged too", () => {
  const [point] = aggregateNutrition([day("2026-10-12", { protein: 100, carbs: 200, fat: 50 }), day("2026-10-13", { protein: 200, carbs: 100, fat: 150 })], "week");
  assert.equal(point.proteinKcal, 600);
  assert.equal(point.carbsKcal, 600);
  assert.equal(point.fatKcal, 900);
  assert.deepEqual(aggregateNutrition([], "day"), []);
});

test("week and month keys use Monday starts and year-month", () => {
  assert.equal(weekKey("2026-10-18"), "2026-10-12", "Sunday belongs to the week that began Monday");
  assert.equal(weekKey("2026-10-12"), "2026-10-12");
  assert.equal(weekKey("2026-01-01"), "2025-12-29");
  assert.equal(monthKey("2026-10-18"), "2026-10");
});

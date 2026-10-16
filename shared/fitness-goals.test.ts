import test from "node:test";
import assert from "node:assert/strict";
import { CALORIE_GOAL, DAILY_GOALS, amountText, goalDetail, goalRows } from "./fitness-goals";
import { NUTRIENT_INFO } from "./fitness-log";

const row = (totals: Parameters<typeof goalRows>[0], key: string) => goalRows(totals).find((r) => r.key === key)!;

test("the goals are 2,400 calories and, for the rest, the daily values or a share of the calories", () => {
  assert.equal(CALORIE_GOAL, 2400);
  const goals = Object.fromEntries(DAILY_GOALS.map((g) => [g.key, g.goal]));
  assert.deepEqual(goals, { calories: 2400, protein: 150, carbs: 270, fat: 80, fiber: 28, calcium: 1300, vitaminA: 900, vitaminC: 90, vitaminD: 20 });
  assert.equal(150 * 4 + 270 * 4 + 80 * 9, 2400, "protein, carbs and fat add up to the calorie goal");
});

test("the rows come in the order calories, macros, fiber, calcium, then vitamins A, C and D, with the nutrients' names and units", () => {
  const rows = goalRows(undefined);
  assert.deepEqual(rows.map((r) => r.key), ["calories", "protein", "carbs", "fat", "fiber", "calcium", "vitaminA", "vitaminC", "vitaminD"]);
  assert.deepEqual(rows.map((r) => r.label), ["Calories", "Protein", "Carbs", "Fat", "Fiber", "Calcium", "Vitamin A", "Vitamin C", "Vitamin D"]);
  assert.deepEqual(rows.map((r) => r.unit), ["kcal", "g", "g", "g", "g", "mg", "mcg", "mg", "mcg"]);
  for (const r of rows) assert.equal(r.unit, NUTRIENT_INFO[r.key].unit);
});

test("a day with nothing logged, or older days missing a nutrient, counts as zero and never breaks", () => {
  for (const r of goalRows(null)) assert.deepEqual([r.value, r.percent, r.fill, r.status], [0, 0, 0, "under"]);
  const r = row({ calories: 1200, vitaminD: undefined, fiber: Number.NaN }, "vitaminD");
  assert.deepEqual([r.value, r.percent, r.difference], [0, 0, 20]);
  assert.equal(row({ fiber: Number.NaN }, "fiber").value, 0);
  assert.equal(row({ calories: -50 }, "calories").value, 0, "a negative total is zero");
});

test("the percent is of the goal, and the bar is full at 100% and no further", () => {
  const half = row({ calories: 1200 }, "calories");
  assert.deepEqual([half.percent, half.fill, half.status, half.difference], [50, 0.5, "under", 1200]);
  const over = row({ calories: 3000 }, "calories");
  assert.deepEqual([over.percent, over.fill], [125, 1]);
  assert.equal(row({ protein: 82 }, "protein").percent, 55);
});

test("a budget goal (calories, carbs, fat) is over once passed, while a minimum (protein, fiber, vitamins) is simply reached", () => {
  assert.equal(row({ calories: 2400 }, "calories").status, "met");
  assert.deepEqual([row({ calories: 2650 }, "calories").status, row({ calories: 2650 }, "calories").difference], ["over", 250]);
  assert.equal(row({ carbs: 300 }, "carbs").status, "over");
  assert.equal(row({ fat: 95.5 }, "fat").difference, 15.5);
  const protein = row({ protein: 190 }, "protein");
  assert.deepEqual([protein.status, protein.percent, protein.fill, protein.difference], ["met", 127, 1, 40]);
  assert.equal(row({ vitaminC: 400 }, "vitaminC").status, "met");
  assert.equal(row({ vitaminD: 19.6 }, "vitaminD").status, "met", "the rounded amount is what counts");
});

test("grams keep one decimal and everything else is whole", () => {
  assert.equal(row({ fiber: 12.34 }, "fiber").value, 12.3);
  assert.equal(row({ fiber: 12.34 }, "fiber").difference, 15.7);
  assert.equal(row({ calcium: 512.6 }, "calcium").value, 513);
});

test("the wording says how much is done and how far to go, over or reached", () => {
  assert.equal(goalDetail(row({ calories: 1420 }, "calories")), "1,420 of 2,400 kcal · 980 to go");
  assert.equal(goalDetail(row({ protein: 82 }, "protein")), "82 of 150 g · 68 to go");
  assert.equal(goalDetail(row({ calories: 2520 }, "calories")), "2,520 of 2,400 kcal · 120 over");
  assert.equal(goalDetail(row({ fiber: 30 }, "fiber")), "30 of 28 g · goal reached");
  assert.equal(goalDetail(row({}, "calcium")), "0 of 1,300 mg · 1,300 to go");
  assert.equal(amountText(1300, "mg"), "1,300 mg");
});

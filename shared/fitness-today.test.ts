import test from "node:test";
import assert from "node:assert/strict";
import { addMealToDay, addWorkoutEntries, normalizeMeal, normalizeWorkout, rebuildMeal, workoutToLogEntries, type CalorieDayLog, type ParsedMeal, type ParsedWorkout, type WorkoutLogEntry } from "./fitness-log";
import { addEntry, newDraft } from "./fitness-session";
import { liftStripText, mealLogWithDraft, mealStripText, todayLift, todayMeals, workoutLogWithDraft } from "./fitness-today";

const TODAY = "2026-10-15";
const now = new Date("2026-10-15T12:00:00Z");

const meal = (items: { name: string; calories: number; protein?: number; carbs?: number; fat?: number }[], date = TODAY): ParsedMeal =>
  normalizeMeal({ date, items: items.map((i) => ({ protein: 0, carbs: 0, fat: 0, ...i })) }, date);
const workout = (exercises: object[], date = TODAY): ParsedWorkout => normalizeWorkout({ date, workoutType: "Pull", exercises }, date, { keepEmpty: true });

const dayOf = (log: CalorieDayLog[], date: string) => log.find((d) => d.date === date);

test("today's food counts the day's meals, and an empty day has no totals", () => {
  const log = addMealToDay([], meal([{ name: "egg", calories: 140, protein: 12, carbs: 1, fat: 10 }, { name: "toast", calories: 90, protein: 3, carbs: 17, fat: 1 }]), "m1", now.toISOString(), "");
  assert.deepEqual(todayMeals(log, TODAY), { hasAny: true, calories: 230, protein: 15, carbs: 18, fat: 11 });
  assert.equal(todayMeals(log, "2026-10-16").hasAny, false);
  assert.equal(todayMeals([], TODAY).hasAny, false);
  assert.equal(todayMeals([{ ...log[0], calories: 0 }], TODAY).hasAny, false, "a zero-calorie day is nothing logged");
});

test("the open food day is counted as if it were ended, without touching the saved log", () => {
  const saved = addMealToDay([], meal([{ name: "bagel", calories: 280, protein: 10 }]), "m1", now.toISOString(), "");
  const draft = newDraft("m2", now, "a latte", meal([{ name: "latte", calories: 150, protein: 8 }]));
  const preview = mealLogWithDraft(saved, draft);
  assert.equal(todayMeals(preview, TODAY).calories, 430);
  assert.equal(todayMeals(saved, TODAY).calories, 280, "the saved log is unchanged");
  assert.equal(dayOf(preview, TODAY)!.completeness, "unknown/partial", "previewing does not mark the day complete");
  assert.equal(mealLogWithDraft(saved, null)[0].calories, 280);
});

test("each message moves the running total, and a hand edit or undo does too", () => {
  let draft = newDraft("m1", now, "a latte", meal([{ name: "latte", calories: 150, protein: 8 }]));
  assert.equal(todayMeals(mealLogWithDraft([], draft), TODAY).calories, 150);
  draft = addEntry(draft, now, "and a bagel", meal([{ name: "latte", calories: 150, protein: 8 }, { name: "bagel", calories: 280, protein: 10 }]));
  assert.equal(todayMeals(mealLogWithDraft([], draft), TODAY).calories, 430);
  draft = addEntry(draft, now, null, rebuildMeal(draft.summary, [draft.summary.items[1]]));
  assert.equal(todayMeals(mealLogWithDraft([], draft), TODAY).calories, 280);
});

test("a reopened day replaces its saved version in the total instead of adding to it", () => {
  const saved = addMealToDay([], meal([{ name: "bagel", calories: 280 }, { name: "latte", calories: 150 }]), "m1", now.toISOString(), "");
  const reopened = newDraft("m1", now, null, meal([{ name: "bagel", calories: 280 }]), true);
  assert.equal(todayMeals(mealLogWithDraft(saved, reopened), TODAY).calories, 280);
  const moved = newDraft("m1", now, null, meal([{ name: "bagel", calories: 280 }], "2026-10-14"), true);
  const preview = mealLogWithDraft(saved, moved);
  assert.equal(todayMeals(preview, TODAY).hasAny, false, "moved to another day, so today has nothing");
  assert.equal(dayOf(preview, "2026-10-14")!.calories, 280);
});

test("an open day with no food yet adds nothing, and one dated another day does not count for today", () => {
  const empty = newDraft("m1", now, null, rebuildMeal(meal([{ name: "x", calories: 1 }]), []));
  assert.equal(todayMeals(mealLogWithDraft([], empty), TODAY).hasAny, false);
  const yesterday = newDraft("m2", now, "x", meal([{ name: "x", calories: 500 }], "2026-10-14"));
  assert.equal(todayMeals(mealLogWithDraft([], yesterday), TODAY).hasAny, false);
});

const rows = (ex: object[], id: string, date = TODAY): WorkoutLogEntry[] => workoutToLogEntries(workout(ex, date), id);
const pulldown = { name: "Lat Pulldown", sets: [{ weight: 120, reps: 8 }, { weight: 120, reps: 7 }], warmup: "60 lb x12" };
const row = { name: "Seated Row", sets: [{ weight: 100, reps: 10 }] };

test("today's lifting is the day's exercises, sets and volume, with the main type first", () => {
  const entries = addWorkoutEntries(rows([pulldown, row], "a"), rows([{ name: "Bench", workoutType: "Push", sets: [{ weight: 100, reps: 5 }] }], "b", "2026-10-14"));
  assert.deepEqual(todayLift(entries, TODAY), { hasAny: true, exercises: 2, sets: 3, volume: 120 * 8 + 120 * 7 + 100 * 10, types: ["Pull"] });
  assert.equal(todayLift(entries, "2026-10-14").types[0], "Push");
  assert.equal(todayLift(entries, "2026-10-13").hasAny, false);
});

test("the open workout counts as if it were ended: new exercises add, a reopened day replaces, empty shells do not count", () => {
  const saved = rows([pulldown], "a");
  const draft = newDraft("b", now, "x", workout([row, { name: "Face Pull" }]));
  const preview = workoutLogWithDraft(saved, draft);
  assert.equal(todayLift(preview, TODAY).exercises, 2, "the set-less Face Pull is left out");
  assert.equal(todayLift(saved, TODAY).exercises, 1, "saved rows are unchanged");
  const reopened = newDraft("a", now, null, workout([row]), true);
  assert.deepEqual(todayLift(workoutLogWithDraft(saved, reopened), TODAY), { hasAny: true, exercises: 1, sets: 1, volume: 1000, types: ["Pull"] });
  assert.equal(workoutLogWithDraft(saved, null).length, saved.length);
  const emptied = newDraft("a", now, null, { ...workout([row]), exercises: [] }, true);
  assert.equal(todayLift(workoutLogWithDraft(saved, emptied), TODAY).hasAny, false);
});

test("the thin row says what to do when nothing is logged, and shows the numbers when something is", () => {
  assert.deepEqual(mealStripText(todayMeals([], TODAY)), { empty: true, main: "Nothing logged yet", detail: "Tell me what you ate below" });
  assert.deepEqual(mealStripText({ hasAny: true, calories: 1240, protein: 82, carbs: 120, fat: 40 }), { empty: false, main: "1,240 kcal", detail: "P 82g · C 120g · F 40g" });
  assert.deepEqual(liftStripText(todayLift([], TODAY)), { empty: true, main: "No workout yet", detail: "Log your first exercise below" });
  assert.deepEqual(liftStripText({ hasAny: true, exercises: 4, sets: 12, volume: 8400, types: ["Pull", "Legs"] }), { empty: false, main: "Pull + Legs", detail: "4 exercises · 12 sets · 8,400 lb" });
  assert.equal(liftStripText({ hasAny: true, exercises: 1, sets: 1, volume: 0, types: ["Push"] }).detail, "1 exercise · 1 set", "bodyweight only has no volume to show");
});

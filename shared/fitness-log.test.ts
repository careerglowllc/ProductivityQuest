import test from "node:test";
import assert from "node:assert/strict";
import {
  FitnessParseError, addMealToDay, addWorkoutEntries, dayFoodDetails, exerciseMetric, formatSets, formatWarmupSets, inferWorkoutType, isIsoDate,
  macroCalories, normalizeMeal, normalizeWorkout, recentMeals, recentWorkoutLoggings, removeMealFromDay, removeWorkoutLogging,
  resolveLogDate, sessionSummaries, shiftIsoDate, sumNutrients, workoutFromEntries, workoutToLogEntries, type CalorieDayLog, type WorkoutLogEntry,
} from "./fitness-log";

const today = "2026-10-13";

// ── dates ───────────────────────────────────────────────────────────────────
test("only real calendar dates are accepted, and shifting crosses month and year ends", () => {
  assert.equal(isIsoDate("2026-10-13"), true);
  for (const bad of ["2026-02-30", "2026-13-01", "10/13/2026", "2026-1-3", "", null, undefined, 20261013]) assert.equal(isIsoDate(bad), false, String(bad));
  assert.equal(shiftIsoDate("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftIsoDate("2026-01-02", -7), "2025-12-26");
});

test("a date from the model is used only when real, not in the future, and within two years", () => {
  assert.equal(resolveLogDate("2026-10-12", today), "2026-10-12");
  assert.equal(resolveLogDate("2026-10-13", today), "2026-10-13");
  assert.equal(resolveLogDate("2026-10-14", today), today, "future");
  assert.equal(resolveLogDate("2020-01-01", today), today, "too old");
  assert.equal(resolveLogDate("nonsense", today), today);
  assert.equal(resolveLogDate(undefined, today), today);
});

// ── workouts ────────────────────────────────────────────────────────────────
const workoutAnswer = {
  date: "2026-10-12", workoutType: "Push", notes: "Felt strong",
  exercises: [
    { name: "Incline Dumbbell Press", kind: "weight", sets: [{ weight: 70, unit: "lb", reps: 5 }, { weight: 70, unit: "lb", reps: 5 }, { weight: 65, unit: "lb", reps: 6 }], warmup: "15 x8; 30 x8", notes: "left shoulder tight" },
    { name: "Single-Arm Cable Lateral Raise", sets: [{ weight: 12.5, reps: 6, eachSide: true }, { weight: 12.5, reps: 6, eachSide: true }] },
    { name: "Pull-Ups", sets: [{ unit: "bw", reps: 8 }, { unit: "bw", reps: 6 }, { unit: "bw", reps: 3 }] },
    { name: "Treadmill", kind: "time", sets: [{ seconds: 450 }] },
    { name: "Weighted Plank", sets: [{ weight: 25, seconds: 45 }, { weight: 25, seconds: 45 }] },
  ],
};

test("a workout answer becomes clean exercises with a kind, a type and a session type", () => {
  const w = normalizeWorkout(workoutAnswer, today);
  assert.equal(w.date, "2026-10-12");
  assert.equal(w.workoutType, "Push");
  assert.deepEqual(w.exercises.map((e) => [e.name, e.kind, e.workoutType]), [
    ["Incline Dumbbell Press", "weight", "Push"], ["Single-Arm Cable Lateral Raise", "weight", "Push"], ["Pull-Ups", "reps", "Pull"],
    ["Treadmill", "time", "Push"], ["Weighted Plank", "time", "Pull"],
  ]);
  assert.equal(w.exercises[0].warmup, "15 x8; 30 x8");
  assert.equal(w.notes, "Felt strong");
});

test("set text matches the format already in the lifting log", () => {
  const w = normalizeWorkout(workoutAnswer, today);
  const text = w.exercises.map(formatSets);
  assert.equal(text[0], "70 lb: 5 / 5; 65 lb: 6");
  assert.equal(text[1], "12.5 lb: 6 / 6 each side");
  assert.equal(text[2], "BW: 8 / 6 / 3");
  assert.equal(text[3], "BW: 450 sec");
  assert.equal(text[4], "25 lb: 45 sec / 45 sec");
  assert.equal(formatSets({ sets: [{ weight: 225, reps: 6 }, { weight: 225, reps: 6 }, { weight: 225, reps: 6 }] }), "225 lb: 6 / 6 / 6");
  assert.equal(formatSets({ sets: [{ weight: 100, reps: 8, approx: true }, { weight: 100, reps: 8 }] }), "100 lb: ~8 / 8");
  assert.equal(formatSets({ sets: [], notes: "felt tight" }), "Notes only");
});

test("each exercise's chart value is its top weight, reps or time", () => {
  const w = normalizeWorkout(workoutAnswer, today);
  assert.deepEqual(w.exercises.map(exerciseMetric), [
    { kind: "weight", value: 70 }, { kind: "weight", value: 12.5 }, { kind: "reps", value: 8 }, { kind: "time", value: 450 }, { kind: "time", value: 45 },
  ]);
  assert.deepEqual(exerciseMetric({ kind: "weight", sets: [{ weight: 50, reps: 5, approx: true }] }), { kind: "weight", value: 50, approx: true });
  assert.equal(exerciseMetric({ kind: "weight", sets: [] }), null);
});

test("kilos are converted to pounds and the original is kept in the notes", () => {
  const w = normalizeWorkout({ exercises: [{ name: "Back Squat", sets: [{ weight: 100, unit: "kg", reps: 5 }] }] }, today);
  assert.equal(w.exercises[0].sets[0].weight, 220.5);
  assert.match(w.exercises[0].sets[0].note ?? "", /100 kg/);
  assert.equal(w.exercises[0].workoutType, "Legs");
});

test("junk is dropped: numbers out of range, text numbers are read, nameless or empty exercises disappear", () => {
  const w = normalizeWorkout({ date: "2099-01-01", exercises: [
    { name: "  ", sets: [{ weight: 100, reps: 5 }] },
    { name: "Bench Press", sets: [{ weight: "135 lb", reps: "8" }, { weight: 99999, reps: 5 }, { weight: -5 }, {}, { reps: 5000 }] },
    { name: "Stretching", sets: [] },
    { name: "Foam rolling", sets: [], notes: "10 minutes" },
  ] }, today);
  assert.equal(w.date, today, "a future date falls back to today");
  assert.deepEqual(w.exercises.map((e) => e.name), ["Bench Press", "Foam rolling"]);
  assert.equal(w.exercises[0].sets.length, 2, "the 135 lb set and the one with only reps survive");
  assert.deepEqual(w.exercises[0].sets[0], { weight: 135, reps: 8 });
});

test("nothing usable in the answer is an error with a clear message", () => {
  for (const raw of [null, "text", {}, { exercises: "none" }, { exercises: [] }, { exercises: [{ name: "x", sets: [] }] }]) {
    assert.throws(() => normalizeWorkout(raw, today), FitnessParseError, JSON.stringify(raw));
  }
  assert.throws(() => normalizeWorkout({ exercises: [] }, today), /No exercises/);
});

test("exercise names map to Push, Pull or Legs, with leg curls and biceps curls told apart", () => {
  const cases: Record<string, string | null> = {
    "Back Squat": "Legs", "Seated Leg Curl": "Legs", "Romanian Deadlift": "Legs", "Neck Raises": "Legs", "Glute Bridge": "Legs",
    "T-Bar Row": "Pull", "Pull-Ups": "Pull", "Biceps Curl": "Pull", "Face Pull": "Pull", "Deadlift": "Pull", "Dead Hang": "Pull",
    "Incline Dumbbell Press": "Push", "Triceps Rope Pushdown": "Push", "Lateral Raise": "Push", "Dips": "Push", "Treadmill": "Push",
    "Basket weaving": null,
  };
  for (const [name, type] of Object.entries(cases)) assert.equal(inferWorkoutType(name), type, name);
});

test("the session type follows the model, else the most common exercise type", () => {
  const legs = { exercises: [{ name: "Back Squat", sets: [{ weight: 225, reps: 5 }] }, { name: "Seated Leg Curl", sets: [{ weight: 120, reps: 12 }] }, { name: "Treadmill", sets: [{ seconds: 300 }] }] };
  assert.equal(normalizeWorkout(legs, today).workoutType, "Legs");
  assert.equal(normalizeWorkout({ ...legs, workoutType: "pull" }, today).workoutType, "Pull");
});

test("a logged workout becomes one lifting-log row per exercise, tagged so it can be removed", () => {
  const rows = workoutToLogEntries(normalizeWorkout(workoutAnswer, today), "lift-1");
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0], {
    date: "2026-10-12", workoutType: "Push", exercise: "Incline Dumbbell Press", setsRaw: "70 lb: 5 / 5; 65 lb: 6", warmup: "15 x8; 30 x8",
    notes: "left shoulder tight", metric: { kind: "weight", value: 70 }, sets: rows[0].sets, logId: "lift-1",
  });
  assert.ok(rows.every((r) => r.logId === "lift-1" && r.date === "2026-10-12"));
});

const older: WorkoutLogEntry[] = [
  { date: "2026-07-13", workoutType: "Push", exercise: "Incline Dumbbell Press", setsRaw: "65 lb DBs: 8 / 7 / 7", metric: { kind: "weight", value: 65 } },
  { date: "2026-08-10", workoutType: "Legs", exercise: "Back Squat", setsRaw: "225 lb: 6 / 6 / 6", metric: { kind: "weight", value: 225 } },
];

test("new rows are added beside the old ones, two loggings on one day both stay, and one can be removed", () => {
  const first = workoutToLogEntries(normalizeWorkout({ date: "2026-10-12", exercises: [{ name: "Back Squat", sets: [{ weight: 235, reps: 5 }] }] }, today), "a");
  const second = workoutToLogEntries(normalizeWorkout({ date: "2026-10-12", exercises: [{ name: "Back Squat", sets: [{ weight: 245, reps: 3 }] }] }, today), "b");
  const log = addWorkoutEntries(addWorkoutEntries(older, first), second);
  assert.equal(log.length, 4);
  assert.deepEqual(removeWorkoutLogging(log, "a").map((e) => e.logId), [undefined, undefined, "b"]);
  assert.equal(removeWorkoutLogging(log, "nope").length, 4);
  assert.deepEqual(removeWorkoutLogging(log, "a").filter((e) => !e.logId), older, "older entries are never touched");
});

test("recent loggings are newest first, grouped, and skip rows that were not logged with AI", () => {
  const rows = [...older, ...workoutToLogEntries(normalizeWorkout(workoutAnswer, today), "lift-1"), ...workoutToLogEntries(normalizeWorkout({ exercises: [{ name: "Back Squat", sets: [{ weight: 225, reps: 5 }] }] }, today), "lift-2")];
  const recent = recentWorkoutLoggings(rows);
  assert.deepEqual(recent.map((r) => r.logId), ["lift-2", "lift-1"]);
  assert.equal(recent[1].exercises.length, 5);
  assert.equal(recentWorkoutLoggings(rows, 1).length, 1);
  assert.deepEqual(recentWorkoutLoggings(older), []);
});

test("session volume is weight x reps over every set, from exact sets or from the older text", () => {
  const logged = workoutToLogEntries(normalizeWorkout(workoutAnswer, today), "x");
  const sessions = sessionSummaries([...older, ...logged]);
  assert.deepEqual(sessions.map((s) => s.date), ["2026-07-13", "2026-08-10", "2026-10-12"]);
  assert.equal(sessions[0].volume, 65 * (8 + 7 + 7), "older text: 65 lb DBs: 8 / 7 / 7");
  assert.equal(sessions[1].volume, 225 * 18);
  const day = sessions[2];
  assert.equal(day.volume, 70 * 5 * 2 + 65 * 6 + 12.5 * 6 * 2 * 2, "each-side sets count both sides; bodyweight and timed sets add none");
  assert.equal(day.exercises, 5);
  assert.deepEqual(sessionSummaries([]), []);
  assert.equal(sessionSummaries([{ date: "2026-01-01", workoutType: "Push", exercise: "X", setsRaw: "Working sets logged incompletely", metric: null }])[0].volume, 0);
});

// ── meals ───────────────────────────────────────────────────────────────────
const food = (name: string, calories: number, extra: Record<string, unknown> = {}) => ({ name, quantity: "1", confidence: "medium", calories, protein: 0, carbs: 0, fat: 0, ...extra });
const mealAnswer = {
  date: "2026-10-12", dayComplete: false,
  items: [
    food("everything bagel", 280, { protein: 11, carbs: 54, fat: 2, fiber: 3, sodium: 560, calcium: 40 }),
    food("cream cheese", 100, { quantity: "2 tbsp", protein: 2, carbs: 2, fat: 10, satFat: 6, sodium: 90, calcium: 30, confidence: "high" }),
    food("oat-milk latte", 150, { quantity: "12 oz", protein: 3, carbs: 24, fat: 5, calcium: 350, confidence: "low" }),
  ],
};

test("a meal answer gets totals added up here, not taken from the model", () => {
  const meal = normalizeMeal({ ...mealAnswer, totals: { calories: 99999 } }, today);
  assert.equal(meal.totals.calories, 530);
  assert.equal(meal.totals.protein, 16);
  assert.equal(meal.totals.carbs, 80);
  assert.equal(meal.totals.fat, 17);
  assert.equal(meal.totals.calcium, 420);
  assert.equal(meal.totals.satFat, 6);
  assert.equal(meal.totals.fiber, 3);
  assert.equal(meal.date, "2026-10-12");
  assert.equal(meal.description, "1 everything bagel; 2 tbsp cream cheese; 12 oz oat-milk latte");
});

test("the meal's confidence is the lowest of its items, and the end of the day is only set when said", () => {
  assert.equal(normalizeMeal(mealAnswer, today).confidence, "low");
  assert.equal(normalizeMeal({ items: [food("egg", 70, { confidence: "high" })] }, today).confidence, "high");
  assert.equal(normalizeMeal({ items: [food("egg", 70, { confidence: "???" })] }, today).confidence, "medium");
  assert.equal(normalizeMeal(mealAnswer, today).dayComplete, false);
  assert.equal(normalizeMeal({ ...mealAnswer, dayComplete: true }, today).dayComplete, true);
  assert.equal(normalizeMeal({ ...mealAnswer, dayComplete: "yes" }, today).dayComplete, false);
});

test("missing calories are worked out from macros, implausible numbers become zero, and numbers are tidied", () => {
  const meal = normalizeMeal({ items: [
    { name: "Mystery shake", protein: 30, carbs: 20, fat: 10 },
    { name: "Water", calories: 0 },
    { name: "Huge", calories: 90000, protein: "25 g", sodium: 1234.6 },
    { name: "Negative", calories: -50, protein: -3 },
  ] }, today);
  assert.equal(meal.items[0].calories, 30 * 4 + 20 * 4 + 10 * 9);
  assert.equal(meal.items[1].calories, 0);
  assert.equal(meal.items[2].calories, 25 * 4, "an absurd calorie figure is replaced by what the macros add up to");
  assert.equal(meal.items[2].protein, 25);
  assert.equal(meal.items[2].sodium, 1235);
  assert.equal(meal.items[3].calories, 0);
  assert.equal(meal.items[3].protein, 0);
});

test("no food in the answer is an error", () => {
  for (const raw of [null, {}, { items: [] }, { items: [{ name: "  " }] }, { items: "toast" }]) assert.throws(() => normalizeMeal(raw, today), FitnessParseError, JSON.stringify(raw));
});

const seedDay = (date: string, extra: Partial<CalorieDayLog> = {}): CalorieDayLog => ({
  date, calories: 1000, protein: 60, carbs: 100, fat: 40, sodium: 1500, magnesium: 100, calcium: 400, vitaminC: 10, vitaminA: 500,
  foodDetails: "Deli sandwich", completeness: "unknown/partial", confidence: "high", ...extra,
});

test("a logged meal is added to its day's totals and listed under that day", () => {
  const meal = normalizeMeal(mealAnswer, today);
  const days = addMealToDay([seedDay("2026-10-12"), seedDay("2026-10-10")], meal, "meal-1", "2026-10-13T08:00:00Z", "bagel and a latte");
  const day = days.find((d) => d.date === "2026-10-12")!;
  assert.equal(day.calories, 1530);
  assert.equal(day.protein, 76);
  assert.equal(day.calcium, 820);
  assert.equal(day.satFat, 6, "newer nutrients start from zero");
  assert.equal(day.confidence, "low");
  assert.equal(day.meals?.length, 1);
  assert.equal(day.meals?.[0].text, "bagel and a latte");
  assert.equal(days.find((d) => d.date === "2026-10-10")!.calories, 1000, "other days are untouched");
  assert.equal(dayFoodDetails(day), "Deli sandwich; 1 everything bagel; 2 tbsp cream cheese; 12 oz oat-milk latte");
});

test("a new day is created, the log stays in date order, and saying that was everything marks the day complete", () => {
  const meal = normalizeMeal({ ...mealAnswer, date: "2026-10-13", dayComplete: true }, today);
  const days = addMealToDay([seedDay("2026-10-12")], meal, "m", "t", "x");
  assert.deepEqual(days.map((d) => d.date), ["2026-10-12", "2026-10-13"]);
  const added = days[1];
  assert.equal(added.calories, 530);
  assert.equal(added.completeness, "explicitly complete");
  assert.equal(added.foodDetails, "");
  assert.equal(dayFoodDetails(added), meal.description);
});

test("several meals on one day add up, and removing one takes exactly its share back off", () => {
  const breakfast = normalizeMeal(mealAnswer, today);
  const dinner = normalizeMeal({ date: "2026-10-12", items: [food("burrito bowl", 750, { protein: 45, carbs: 80, fat: 25, calcium: 200 })] }, today);
  let days = addMealToDay([], breakfast, "a", "2026-10-12T08:00:00Z", "breakfast");
  days = addMealToDay(days, dinner, "b", "2026-10-12T19:00:00Z", "dinner");
  assert.equal(days[0].calories, 1280);
  assert.equal(days[0].meals?.length, 2);
  const afterRemoving = removeMealFromDay(days, "2026-10-12", "a");
  assert.equal(afterRemoving[0].calories, 750);
  assert.equal(afterRemoving[0].calcium, 200);
  assert.deepEqual(afterRemoving[0].meals?.map((m) => m.id), ["b"]);
  assert.deepEqual(removeMealFromDay(afterRemoving, "2026-10-12", "b"), [], "a day with nothing left is removed");
});

test("vitamin D is added up like the other nutrients, and a meal saved before it was tracked can still be removed cleanly", () => {
  const salmon = normalizeMeal({ date: "2026-10-12", items: [food("salmon", 350, { protein: 38, vitaminD: 15 }), food("milk", 120, { vitaminD: 3.4 })] }, today);
  assert.equal(salmon.totals.vitaminD, 18);
  const first = normalizeMeal({ date: "2026-10-12", items: [food("egg", 140, { protein: 12 })] }, today);
  let days = addMealToDay([], first, "a", "t1", "egg");
  const { vitaminD: _never, ...oldTotals } = first.totals;
  days[0].meals![0].totals = oldTotals as typeof first.totals;
  delete days[0].vitaminD;
  days = addMealToDay(days, salmon, "b", "t2", "salmon");
  assert.equal(days[0].vitaminD, 18);
  const removed = removeMealFromDay(days, "2026-10-12", "a");
  assert.equal(removed[0].vitaminD, 18);
  assert.equal(removed[0].calories, 470);
  assert.ok(Object.values(removed[0]).every((v) => typeof v !== "number" || Number.isFinite(v)), "no NaN anywhere on the day");
});

test("removing a meal never empties an older day and ignores unknown meals", () => {
  const meal = normalizeMeal(mealAnswer, today);
  const days = addMealToDay([seedDay("2026-10-12")], meal, "m", "t", "x");
  const back = removeMealFromDay(days, "2026-10-12", "m");
  assert.equal(back[0].calories, 1000);
  assert.equal(back[0].meals, undefined);
  assert.equal(back[0].foodDetails, "Deli sandwich");
  assert.deepEqual(removeMealFromDay(days, "2026-10-12", "nope"), days);
  assert.deepEqual(removeMealFromDay(days, "2026-01-01", "m"), days);
});

test("recent meals list the newest first across days", () => {
  const a = normalizeMeal(mealAnswer, today);
  let days = addMealToDay([], a, "old", "2026-10-12T08:00:00Z", "x");
  days = addMealToDay(days, normalizeMeal({ date: "2026-10-11", items: [food("toast", 100)] }, today), "newer", "2026-10-13T09:00:00Z", "y");
  assert.deepEqual(recentMeals(days).map((m) => m.id), ["newer", "old"]);
  assert.equal(recentMeals(days, 1).length, 1);
  assert.deepEqual(recentMeals([seedDay("2026-10-12")]), []);
});

test("nutrient sums are rounded sensibly, and macro calories use 4, 4 and 9", () => {
  const total = sumNutrients([{ calories: 100.4, protein: 1.25, carbs: 2, fat: 3, satFat: 0, fiber: 0, sugar: 0, sodium: 10.6, calcium: 0, magnesium: 0, potassium: 0, iron: 0, vitaminC: 0, vitaminA: 0 }, { calories: 100.4, protein: 1.25, carbs: 0, fat: 0, satFat: 0, fiber: 0, sugar: 0, sodium: 0, calcium: 0, magnesium: 0, potassium: 0, iron: 0, vitaminC: 0, vitaminA: 0 }]);
  assert.equal(total.calories, 201);
  assert.equal(total.protein, 2.5);
  assert.equal(total.sodium, 11);
  assert.deepEqual(macroCalories({ protein: 100, carbs: 200, fat: 50 }), { protein: 400, carbs: 800, fat: 450 });
});

// ── warm-up sets ────────────────────────────────────────────────────────────
const warmupAnswer = {
  date: "2026-10-13", workoutType: "Pull",
  exercises: [{
    name: "Lat Pulldown", kind: "weight",
    warmupSets: [{ weight: 60, unit: "lb", reps: 12 }, { weight: 90, unit: "lb", reps: 8 }],
    sets: [{ weight: 120, unit: "lb", reps: 8 }, { weight: 125, unit: "lb", reps: 6 }],
  }],
};

test("warm-up sets are kept apart from the working sets, and the warm-up text is written from them", () => {
  const [ex] = normalizeWorkout(warmupAnswer, today).exercises;
  assert.deepEqual(ex.warmupSets, [{ weight: 60, reps: 12 }, { weight: 90, reps: 8 }]);
  assert.deepEqual(ex.sets, [{ weight: 120, reps: 8 }, { weight: 125, reps: 6 }]);
  assert.equal(ex.warmup, "60 lb x12; 90 lb x8");
  assert.equal(formatSets(ex), "120 lb: 8; 125 lb: 6", "the working-sets text has no warm-up in it");
});

test("warm-up sets never change the top number the charts use, even when one is heavier than the working sets", () => {
  const [ex] = normalizeWorkout({ ...warmupAnswer, exercises: [{ ...warmupAnswer.exercises[0], warmupSets: [{ weight: 135, reps: 3 }] }] }, today).exercises;
  assert.deepEqual(exerciseMetric(ex), { kind: "weight", value: 125 });
});

test("warm-up sets are not part of a day's volume or set count", () => {
  const rows = workoutToLogEntries(normalizeWorkout(warmupAnswer, today), "lift-1");
  const [day] = sessionSummaries(rows);
  assert.deepEqual([day.sets, day.volume], [2, 120 * 8 + 125 * 6]);
});

test("the warm-up sets are saved on the row and come back when the day is opened again", () => {
  const workout = normalizeWorkout(warmupAnswer, today);
  const rows = workoutToLogEntries(workout, "lift-1");
  assert.deepEqual(rows[0].warmupSets, [{ weight: 60, reps: 12 }, { weight: 90, reps: 8 }]);
  assert.equal(rows[0].warmup, "60 lb x12; 90 lb x8");
  assert.equal(rows[0].setsRaw, "120 lb: 8; 125 lb: 6");
  assert.deepEqual(workoutFromEntries(rows, "lift-1")?.exercises[0].warmupSets, rows[0].warmupSets);
});

test("a loose warm-up with no numbers stays as text, and the sets win when both are given", () => {
  const loose = normalizeWorkout({ date: today, exercises: [{ name: "Back Squat", sets: [{ weight: 225, reps: 5 }], warmup: "usual warm-up" }] }, today).exercises[0];
  assert.equal(loose.warmup, "usual warm-up");
  assert.equal(loose.warmupSets, undefined);
  const both = normalizeWorkout({ date: today, exercises: [{ name: "Back Squat", sets: [{ weight: 225, reps: 5 }], warmup: "bar x12", warmupSets: [{ weight: 45, reps: 12 }] }] }, today).exercises[0];
  assert.equal(both.warmup, "45 lb x12");
});

test("warm-up sets are cleaned like working sets: kilos become pounds, empty ones are dropped, and bodyweight is kept", () => {
  const [ex] = normalizeWorkout({
    date: today,
    exercises: [{ name: "Pull-Ups", sets: [{ unit: "bw", reps: 8 }], warmupSets: [{ unit: "bw", reps: 3 }, { weight: 20, unit: "kg", reps: 5 }, {}, { weight: null }] }],
  }, today).exercises;
  assert.deepEqual(ex.warmupSets, [{ reps: 3, bodyweight: true }, { weight: 44, reps: 5, note: "20 kg" }]);
});

test("an exercise with only warm-up sets is kept while the day is being built, and reads as warm-up only", () => {
  const raw = { date: today, exercises: [{ name: "Lat Pulldown", kind: "weight", sets: [], warmupSets: [{ weight: 60, reps: 12 }] }] };
  const [ex] = normalizeWorkout(raw, today, { keepEmpty: true }).exercises;
  assert.equal(formatSets(ex), "Warm-up only");
  assert.deepEqual(ex.sets, []);
});

test("warm-up text lists each set, with bodyweight, holds, rough counts and each side", () => {
  assert.equal(formatWarmupSets([{ weight: 60, reps: 12 }, { reps: 3, bodyweight: true }]), "60 lb x12; BW x3");
  assert.equal(formatWarmupSets([{ seconds: 30, bodyweight: true }, { weight: 7.5, reps: 12, eachSide: true }, { weight: 40, reps: 10, approx: true }]), "BW 30 sec; 7.5 lb x12 each side; 40 lb x~10");
  assert.equal(formatWarmupSets([]), "");
});

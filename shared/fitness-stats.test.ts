import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWorkout, workoutToLogEntries, type CalorieDayLog, type WorkoutLogEntry } from "./fitness-log";
import { allTimeCalories, allTimeLifting, calorieWeek, lastDays, liftWeek } from "./fitness-stats";

const TODAY = "2026-10-15"; // a Thursday

test("the week is the seven days ending today, oldest first, across month and year ends", () => {
  assert.deepEqual(lastDays(TODAY), ["2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]);
  assert.deepEqual(lastDays("2027-01-02", 4), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  assert.equal(lastDays(TODAY, 1)[0], TODAY);
});

const day = (date: string, calories: number, protein = 0): CalorieDayLog => ({
  date, calories, protein, carbs: 0, fat: 0, sodium: 0, magnesium: 0, calcium: 0, vitaminC: 0, vitaminA: 0, foodDetails: "", completeness: "unknown/partial", confidence: "medium",
});

test("the calorie week lists every day, marks days with nothing logged, and averages only the days logged", () => {
  const log = [day("2026-10-12", 2000, 100), day("2026-10-13", 1600, 140), day("2026-10-15", 1800, 90), day("2026-09-01", 9999)];
  const week = calorieWeek(log, TODAY, 2200);
  assert.equal(week.days.length, 7);
  assert.deepEqual(week.days.map((d) => d.logged), [false, false, false, true, true, false, true]);
  assert.equal(week.loggedDays, 3);
  assert.equal(week.avgCalories, 1800);
  assert.equal(week.avgProtein, 110);
  assert.deepEqual(week.bestProtein, { date: "2026-10-13", protein: 140 });
  assert.equal(week.daysUnderGoal, 3);
  assert.equal(week.days.find((d) => d.date === "2026-09-01"), undefined, "older days are not in the week");
});

test("a week with nothing logged has zeros, no best day and no comparison", () => {
  const week = calorieWeek([], TODAY, 2200);
  assert.deepEqual([week.loggedDays, week.avgCalories, week.avgProtein, week.streak, week.bestProtein, week.vsLastWeek, week.daysUnderGoal], [0, 0, 0, 0, null, null, 0]);
});

test("the logging streak runs back from today, or from yesterday while today is still empty", () => {
  const run = (dates: string[]) => calorieWeek(dates.map((d) => day(d, 1500)), TODAY, 2200).streak;
  assert.equal(run(["2026-10-13", "2026-10-14", "2026-10-15"]), 3);
  assert.equal(run(["2026-10-13", "2026-10-14"]), 2, "today not logged yet does not break the streak");
  assert.equal(run(["2026-10-12", "2026-10-14", "2026-10-15"]), 2, "a gap ends it");
  assert.equal(run(["2026-10-12", "2026-10-13"]), 0, "nothing yesterday or today");
  assert.equal(run([]), 0);
  const long = Array.from({ length: 30 }, (_, i) => lastDays(TODAY, 30)[i]);
  assert.equal(run(long), 30, "longer than the week shown");
});

test("this week's average is compared with the week before, per day logged", () => {
  const log = [day("2026-10-14", 1500), day("2026-10-15", 1700), day("2026-10-08", 2000), day("2026-10-07", 2200), day("2026-10-01", 9999)];
  assert.equal(calorieWeek(log, TODAY, 2200).vsLastWeek, 1600 - 2100, "days 10/09 to 10/15 vs 10/02 to 10/08");
  assert.equal(calorieWeek([day("2026-10-15", 1500)], TODAY, 2200).vsLastWeek, null, "no days last week to compare with");
});

test("a day over the goal is not counted as under it", () => {
  const week = calorieWeek([day("2026-10-14", 2200), day("2026-10-15", 2201)], TODAY, 2200);
  assert.equal(week.daysUnderGoal, 1);
});

const rows = (date: string, exercises: object[], id: string, type = "Pull"): WorkoutLogEntry[] =>
  workoutToLogEntries(normalizeWorkout({ date, workoutType: type, exercises }, date, { keepEmpty: true }), id);

test("the lifting week counts days trained, sets, volume and the exercises by type", () => {
  const entries = [
    ...rows("2026-10-13", [{ name: "Lat Pulldown", sets: [{ weight: 120, reps: 8 }, { weight: 120, reps: 7 }] }, { name: "Seated Row", sets: [{ weight: 100, reps: 10 }] }], "a"),
    ...rows("2026-10-15", [{ name: "Bench Press", workoutType: "Push", sets: [{ weight: 150, reps: 5 }] }], "b", "Push"),
    ...rows("2026-09-30", [{ name: "Squat", workoutType: "Legs", sets: [{ weight: 300, reps: 5 }] }], "c", "Legs"),
  ];
  const week = liftWeek(entries, TODAY);
  assert.equal(week.days.length, 7);
  assert.deepEqual(week.days.map((d) => d.trained), [false, false, false, false, true, false, true]);
  assert.equal(week.workouts, 2);
  assert.equal(week.sets, 4);
  assert.equal(week.volume, 120 * 8 + 120 * 7 + 100 * 10 + 150 * 5);
  assert.deepEqual(week.split, { Push: 1, Pull: 2, Legs: 0 });
  assert.deepEqual(week.heaviest, { exercise: "Bench Press", weight: 150, date: "2026-10-15" });
  const thursday = week.days[6];
  assert.deepEqual([thursday.exercises, thursday.sets, thursday.volume, thursday.types], [1, 1, 750, ["Push"]]);
});

test("volume is compared with the seven days before, and not at all when there was none", () => {
  const entries = [...rows("2026-10-14", [{ name: "Row", sets: [{ weight: 100, reps: 10 }] }], "a"), ...rows("2026-10-07", [{ name: "Row", sets: [{ weight: 100, reps: 8 }] }], "b")];
  assert.equal(liftWeek(entries, TODAY).volumeChangePct, 25, "1000 against 800");
  assert.equal(liftWeek(entries.slice(0, 1), TODAY).volumeChangePct, null);
  assert.equal(liftWeek([], TODAY).volumeChangePct, null);
});

test("an empty lifting week is all zeros with no heaviest lift", () => {
  const week = liftWeek([], TODAY);
  assert.deepEqual([week.workouts, week.sets, week.volume, week.heaviest, week.split], [0, 0, 0, null, { Push: 0, Pull: 0, Legs: 0 }]);
});

test("timed and bodyweight work counts as training but not as the heaviest lift", () => {
  const entries = rows("2026-10-15", [{ name: "Pull-Ups", sets: [{ unit: "bw", reps: 8 }] }, { name: "Plank", sets: [{ seconds: 60 }] }], "a");
  const week = liftWeek(entries, TODAY);
  assert.equal(week.workouts, 1);
  assert.equal(week.heaviest, null);
  assert.equal(week.volume, 0);
});

test("all-time numbers for the foot of the widget", () => {
  assert.deepEqual(allTimeCalories([day("2026-06-01", 1000, 50), day("2026-06-02", 2000, 100), day("2026-06-03", 0)]), { days: 2, avgCalories: 1500, avgProtein: 75 });
  assert.deepEqual(allTimeCalories([]), { days: 0, avgCalories: 0, avgProtein: 0 });
  const entries = [...rows("2026-10-13", [{ name: "A", sets: [{ reps: 1 }] }, { name: "B", sets: [{ reps: 1 }] }], "a"), ...rows("2026-10-14", [{ name: "A", sets: [{ reps: 1 }] }], "b")];
  assert.deepEqual(allTimeLifting(entries), { sessions: 2, exercises: 2 });
});

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWorkout, sessionSummaries, workoutToLogEntries, type ParsedWorkout, type WorkoutLogEntry } from "./fitness-log";
import {
  canonicalizeWorkout, describePlanned, emptyPlan, emptyRoutine, exerciseTokens, findRoutineMatch, parseRoutineLine, parseRoutineText, planCheck, planFromRoutine,
  outsideRoutine, planHasContent, planHasExercises, routineEntries, type Routine,
} from "./fitness-routine";

test("a line with sets and reps is read as an exercise with a target", () => {
  assert.deepEqual(parseRoutineLine("Incline Dumbbell Press 3 x 8-10"), { name: "Incline Dumbbell Press", sets: 3, reps: "8-10" });
  assert.deepEqual(parseRoutineLine("Squat 5x5"), { name: "Squat", sets: 5, reps: "5" });
  assert.deepEqual(parseRoutineLine("Lat pulldown — 3×8–10"), { name: "Lat pulldown", sets: 3, reps: "8-10" });
  assert.deepEqual(parseRoutineLine("Seated row (4 x 10)"), { name: "Seated row", sets: 4, reps: "10" });
  assert.deepEqual(parseRoutineLine("Face pull: 3 sets of 12-15 reps"), { name: "Face pull", sets: 3, reps: "12-15" });
  assert.deepEqual(parseRoutineLine("Plank 3x60s"), { name: "Plank", sets: 3, reps: "60s" });
  assert.deepEqual(parseRoutineLine("Dead hang 3 x 45 sec"), { name: "Dead hang", sets: 3, reps: "45s" });
});

test("sets without reps, and no target at all, are fine", () => {
  assert.deepEqual(parseRoutineLine("Triceps pushdown - 3 sets"), { name: "Triceps pushdown", sets: 3 });
  assert.deepEqual(parseRoutineLine("Back squat"), { name: "Back squat" });
  assert.deepEqual(parseRoutineLine("Pull-Ups"), { name: "Pull-Ups" });
  assert.deepEqual(parseRoutineLine("Curl 3x"), { name: "Curl", sets: 3 });
  assert.deepEqual(parseRoutineLine("Curl 3 ×"), { name: "Curl", sets: 3 });
});

test("bullets and numbers in front are dropped, and lines with no exercise are skipped", () => {
  assert.deepEqual(parseRoutineLine("- Bench press 4x6"), { name: "Bench press", sets: 4, reps: "6" });
  assert.deepEqual(parseRoutineLine("• Overhead press"), { name: "Overhead press" });
  assert.deepEqual(parseRoutineLine("1. Row 3x10"), { name: "Row", sets: 3, reps: "10" });
  assert.equal(parseRoutineLine(""), null);
  assert.equal(parseRoutineLine("   "), null);
  assert.equal(parseRoutineLine("3x10"), null, "a target with no name");
  assert.equal(parseRoutineLine("---"), null);
});

test("an impossible number of sets is ignored rather than trusted", () => {
  assert.deepEqual(parseRoutineLine("Curl 99x10"), { name: "Curl" });
  assert.equal(parseRoutineLine("Curl 0x10")?.sets, undefined);
  assert.equal(parseRoutineLine("Curl 31x10")?.sets, undefined);
  assert.equal(parseRoutineLine("Curl 30x10")?.sets, 30);
});

test("the text is read one exercise per line (a semicolon also splits), the same exercise once, and the count is capped", () => {
  const list = parseRoutineText("Bench 3x8\nIncline DB press 3x10; Dips\n\nBench press 4x6\nbench 3x8");
  assert.deepEqual(list.map((e) => e.name), ["Bench", "Incline DB press", "Dips", "Bench press"]);
  assert.equal(parseRoutineText(Array.from({ length: 80 }, (_, i) => `Exercise ${String.fromCharCode(97 + (i % 26))}${"x".repeat(Math.floor(i / 26))}`).join("\n")).length <= 40, true);
  assert.deepEqual(parseRoutineText(""), []);
  assert.equal(parseRoutineText("y".repeat(6000)).length <= 1, true, "very long text is cut");
});

test("a routine becomes a plan with a plan for each day and tidy notes", () => {
  const routine: Routine = { ...emptyRoutine(), Pull: { exercises: "Lat pulldown 3x8-10\nSeated row 3x10", notes: "  Heavy   first.\nLast set to failure  " } };
  const plan = planFromRoutine(routine);
  assert.deepEqual(plan.Pull.exercises.map((e) => e.name), ["Lat pulldown", "Seated row"]);
  assert.equal(plan.Pull.notes, "Heavy first. Last set to failure");
  assert.deepEqual(plan.Push, { exercises: [] });
  assert.equal(planHasExercises(plan), true);
  assert.equal(planHasExercises(emptyPlan()), false);
  assert.equal(planHasExercises(undefined), false);
  const notesOnly = planFromRoutine({ ...emptyRoutine(), Legs: { exercises: "", notes: "Light day" } });
  assert.equal(planHasExercises(notesOnly), false);
  assert.equal(planHasContent(notesOnly), true);
  assert.equal(planFromRoutine({ ...emptyRoutine(), Push: { exercises: "", notes: "n".repeat(900) } }).Push.notes!.length, 600);
});

test("exercises are described with their target", () => {
  assert.equal(describePlanned({ name: "Bench", sets: 3, reps: "8-10" }), "Bench · 3 × 8-10");
  assert.equal(describePlanned({ name: "Face pull", sets: 3 }), "Face pull · 3 sets");
  assert.equal(describePlanned({ name: "Dips" }), "Dips");
});

test("shorthand, plurals, case, punctuation and word order do not change what an exercise is", () => {
  const same = (a: string, b: string) => assert.deepEqual(Array.from(exerciseTokens(a)).sort(), Array.from(exerciseTokens(b)).sort(), `${a} / ${b}`);
  same("Incline DB Press", "incline dumbbell press");
  same("Incline Dumbbells Press", "Incline Dumbbell Press");
  same("Pull-Ups", "pullups");
  same("Pull ups", "Pull-up");
  same("Triceps Pushdowns", "tricep pushdown");
  same("T-Bar Row", "t bar row");
  same("Press, Incline Dumbbell", "Incline Dumbbell Press");
  same("BB Row", "Barbell Row");
  same("Romanian Deadlift", "RDL");
  assert.deepEqual(Array.from(exerciseTokens("Leg Press")), ["leg", "press"], "press is not shortened to pres");
});

const plan = planFromRoutine({
  Push: { exercises: "Incline Dumbbell Press 3x8-10\nSeated Dumbbell Shoulder Press 3x8\nLateral Raise 4x12\nTriceps Pushdown 3x10", notes: "" },
  Pull: { exercises: "Lat Pulldown 3x8-10\nSeated Cable Row 3x10\nFace Pull 3x15\nPull-Ups 3x6\nBiceps Curl 3x12", notes: "Back first" },
  Legs: { exercises: "Back Squat 4x6\nRomanian Deadlift 3x8\nLeg Press 3x10\nCalf Raise 4x12", notes: "" },
});

test("an exercise is matched to the routine when it is the same exercise written another way", () => {
  assert.deepEqual(findRoutineMatch(plan, "incline db press"), { type: "Push", name: "Incline Dumbbell Press" });
  assert.deepEqual(findRoutineMatch(plan, "Pullups"), { type: "Pull", name: "Pull-Ups" });
  assert.deepEqual(findRoutineMatch(plan, "RDL"), { type: "Legs", name: "Romanian Deadlift" });
  assert.deepEqual(findRoutineMatch(plan, "Calf Raises"), { type: "Legs", name: "Calf Raise" });
});

test("a longer or shorter name with two words in common matches only when it points to one routine exercise", () => {
  assert.deepEqual(findRoutineMatch(plan, "Cable Row"), { type: "Pull", name: "Seated Cable Row" });
  assert.deepEqual(findRoutineMatch(plan, "Wide Grip Lat Pulldown"), { type: "Pull", name: "Lat Pulldown" });
  assert.equal(findRoutineMatch(plan, "Row"), null, "one word is not enough");
  assert.equal(findRoutineMatch(plan, "Press"), null);
  assert.equal(findRoutineMatch(plan, "Neck Raise"), null, "one word in common is not a match");
  assert.equal(findRoutineMatch(plan, "Barbell Glute Bridge"), null);
  const twins = planFromRoutine({ ...emptyRoutine(), Pull: { exercises: "Cable Row Wide\nCable Row Close", notes: "" } });
  assert.equal(findRoutineMatch(twins, "Cable Row"), null, "two possible exercises: no guess");
  assert.deepEqual(findRoutineMatch(twins, "cable row close"), { type: "Pull", name: "Cable Row Close" });
});

test("nothing matches an empty routine, a missing one or an empty name", () => {
  assert.equal(findRoutineMatch(emptyPlan(), "Bench Press"), null);
  assert.equal(findRoutineMatch(undefined, "Bench Press"), null);
  assert.equal(findRoutineMatch(null, "Bench Press"), null);
  assert.equal(findRoutineMatch(plan, "   "), null);
});

const workout = (exercises: ParsedWorkout["exercises"], workoutType: ParsedWorkout["workoutType"] = "Push"): ParsedWorkout => ({ date: "2026-10-15", workoutType, exercises });
const ex = (name: string, workoutType: "Push" | "Pull" | "Legs" = "Push", sets = 1): ParsedWorkout["exercises"][number] => ({ name, workoutType, kind: "weight", sets: Array.from({ length: sets }, () => ({ weight: 100, reps: 8 })) });

test("exercises in the routine take its name and day type, and the session follows them", () => {
  const out = canonicalizeWorkout(workout([ex("Lat pulldown wide", "Push"), ex("Seated cable row", "Push"), ex("Treadmill", "Push")], "Push"), plan);
  assert.deepEqual(out.exercises.map((e) => [e.name, e.workoutType]), [["Lat Pulldown", "Pull"], ["Seated Cable Row", "Pull"], ["Treadmill", "Push"]]);
  assert.equal(out.workoutType, "Pull");
});

test("the AI's session type is kept when it is as common as any other, and exercises outside the routine are left alone", () => {
  const tie = canonicalizeWorkout(workout([ex("Bench Press", "Push"), ex("Lat Pulldown", "Push"), ex("Incline DB press")], "Push"), plan);
  assert.equal(tie.workoutType, "Push", "one Push and one Pull exercise were recognised");
  const none = workout([ex("Neck Raise", "Legs"), ex("Barbell Glute Bridge", "Legs")], "Legs");
  assert.equal(canonicalizeWorkout(none, plan), none, "nothing recognised: the same object");
  assert.equal(canonicalizeWorkout(none, emptyPlan()), none);
  assert.equal(canonicalizeWorkout(none, undefined), none);
});

test("sets and notes are untouched when an exercise is renamed", () => {
  const original = ex("incline db press");
  const out = canonicalizeWorkout(workout([{ ...original, warmup: "15 x8", notes: "tight shoulder" }]), plan);
  assert.deepEqual(out.exercises[0], { ...original, name: "Incline Dumbbell Press", warmup: "15 x8", notes: "tight shoulder" });
  assert.equal(original.name, "incline db press", "the input is not changed");
});

test("the plan check lists what is done, what is still to do, and what was added that is not in the plan", () => {
  const check = planCheck(plan, "Pull", [ex("Lat Pulldown", "Pull", 3), ex("Cable Row", "Pull", 2), ex("Face Pull", "Pull", 0), ex("Neck Raise", "Legs", 2)]);
  assert.equal(check.planned, 5);
  assert.deepEqual(check.done, ["Lat Pulldown", "Seated Cable Row"]);
  assert.deepEqual(check.remaining, ["Face Pull", "Pull-Ups", "Biceps Curl"]);
  assert.deepEqual(check.extra, ["Neck Raise"]);
});

test("an exercise from another day's plan counts as extra, and a day with no plan has nothing planned", () => {
  const check = planCheck(plan, "Legs", [ex("Back Squat", "Legs", 4), ex("Lat Pulldown", "Pull", 3)]);
  assert.deepEqual([check.done, check.extra], [["Back Squat"], ["Lat Pulldown"]]);
  assert.equal(planCheck(emptyPlan(), "Pull", [ex("Row", "Pull", 3)]).planned, 0);
  assert.deepEqual(planCheck(undefined, "Pull", []), { planned: 0, done: [], remaining: [], extra: [] });
  assert.deepEqual(planCheck(plan, "Push", []).remaining.length, 4);
});

// ── What the lift charts use ────────────────────────────────────────────────
const rows = (date: string, exercises: object[], id: string): WorkoutLogEntry[] =>
  workoutToLogEntries(normalizeWorkout({ date, workoutType: "Pull", exercises }, date, { keepEmpty: true }), id);
const sets = [{ weight: 100, reps: 10 }];
const logged: WorkoutLogEntry[] = [
  ...rows("2026-10-13", [{ name: "Lat Pulldown", sets }, { name: "Neck Raise", sets: [{ reps: 15 }] }, { name: "Barbell Glute Bridge", sets }], "a"),
  ...rows("2026-10-14", [{ name: "lat pulldown wide", sets: [{ weight: 110, reps: 8 }] }, { name: "Neck Raise", sets: [{ reps: 12 }] }], "b"),
  ...rows("2026-10-15", [{ name: "Incline DB Press", workoutType: "Push", sets: [{ weight: 70, reps: 5 }] }], "c"),
];

test("with a routine only the lifts in it are used, under the routine's names, so two spellings are one lift", () => {
  const used = routineEntries(logged, plan);
  assert.deepEqual(used.map((e) => [e.date, e.exercise, e.workoutType]), [
    ["2026-10-13", "Lat Pulldown", "Pull"], ["2026-10-14", "Lat Pulldown", "Pull"], ["2026-10-15", "Incline Dumbbell Press", "Push"],
  ]);
  assert.equal(new Set(used.map((e) => e.exercise)).size, 2, "the two spellings of the pulldown are one lift");
  assert.equal(used[0].sets, logged[0].sets, "everything else about the row is kept");
  assert.equal(logged[3].exercise, "lat pulldown wide", "the saved rows are not changed");
});

test("the volume and the day counts follow the same rule, so a lift outside the routine adds nothing", () => {
  const all = sessionSummaries(logged);
  const used = sessionSummaries(routineEntries(logged, plan));
  assert.equal(all.find((s) => s.date === "2026-10-13")!.exercises, 3);
  assert.deepEqual(used.find((s) => s.date === "2026-10-13"), { date: "2026-10-13", exercises: 1, sets: 1, volume: 1000 });
  assert.deepEqual(used.map((s) => s.date), ["2026-10-13", "2026-10-14", "2026-10-15"]);
});

test("with no routine every row is used, as before", () => {
  assert.deepEqual(routineEntries(logged, emptyPlan()), logged);
  assert.deepEqual(routineEntries(logged, undefined), logged);
  assert.deepEqual(routineEntries(logged, planFromRoutine({ ...emptyRoutine(), Legs: { exercises: "", notes: "notes only" } })), logged, "notes alone do not switch the filter on");
  assert.notEqual(routineEntries(logged, undefined), logged, "a copy, not the same array");
});

test("a routine that none of the logged lifts match leaves the charts empty rather than falling back to everything", () => {
  const legsOnly = planFromRoutine({ ...emptyRoutine(), Legs: { exercises: "Back Squat 4x6", notes: "" } });
  assert.deepEqual(routineEntries(logged, legsOnly), []);
});

test("the logged lifts that are left out are listed once each", () => {
  assert.deepEqual(outsideRoutine(logged, plan), ["Neck Raise", "Barbell Glute Bridge"]);
  assert.deepEqual(outsideRoutine(logged, emptyPlan()), [], "with no routine nothing is left out");
  assert.deepEqual(outsideRoutine([], plan), []);
});

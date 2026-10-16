import test from "node:test";
import assert from "node:assert/strict";
import {
  planCheckText, requestSessionUpdate, applyUpdate, describeMeal, describeWorkout, draftHasContent, draftLines, draftTitle, fitnessErrorMessage, formatDayLabel, formatDayShort,
  localToday, moveDraft, newLogId, nutrientText, removeDraftItem, undoDraft, type FitnessDraft, type ParseResult,
} from "./fitness-entry";
import { normalizeMeal, normalizeWorkout } from "@shared/fitness-log";
import { type MealDraft, type WorkoutDraft } from "@shared/fitness-session";

const workout = normalizeWorkout({ date: "2026-10-12", exercises: [
  { name: "Incline Dumbbell Press", sets: [{ weight: 70, reps: 5 }, { weight: 70, reps: 5 }], warmup: "15 x8", notes: "tight shoulder" },
  { name: "Pull-Ups", sets: [{ unit: "bw", reps: 8 }] },
] }, "2026-10-13");
const meal = normalizeMeal({ date: "2026-10-12", items: [
  { name: "egg", quantity: "2", calories: 140, protein: 12, carbs: 1, fat: 10, confidence: "high" },
  { name: "mystery sauce", calories: 80, protein: 0, carbs: 8, fat: 5, confidence: "low" },
] }, "2026-10-13");

test("server errors show their message, anything else a friendly fallback", () => {
  assert.equal(fitnessErrorMessage(new Error('422: {"message":"No exercises were found in that."}')), "No exercises were found in that.");
  assert.equal(fitnessErrorMessage(new Error('429: {"message":"Try again in a few minutes."}')), "Try again in a few minutes.");
  for (const bad of [new Error("Failed to fetch"), new Error("500: <html>oops</html>"), new Error('400: {"nope":1}'), "string", null, undefined]) {
    assert.match(fitnessErrorMessage(bad), /Could not reach the AI/);
  }
});

test("the check-before-saving lines show each exercise with its sets, warm-up and notes", () => {
  const lines = describeWorkout(workout);
  assert.deepEqual(lines[0], { title: "Incline Dumbbell Press · Push", detail: "70 lb: 5 / 5 — Warm-up: 15 x8 — tight shoulder" });
  assert.deepEqual(lines[1], { title: "Pull-Ups · Pull", detail: "BW: 8" });
});

test("meal lines show quantity, calories and macros, and flag rough guesses; totals list the main nutrients", () => {
  const lines = describeMeal(meal);
  assert.deepEqual(lines[0], { title: "2 egg", detail: "Calories 140 · Protein 12g · Carbs 1g · Fat 10g" });
  assert.equal(lines[1].title, "mystery sauce (rough guess)");
  assert.match(nutrientText(meal.totals), /^Calories 220 · Protein 12g · Carbs 9g · Fat 15g · Fiber 0g · Sugar 0g · Sodium 0mg · Calcium 0mg$/);
  assert.equal(nutrientText(meal.totals, ["calcium"]), "Calcium 0mg");
});

const NOW = new Date("2026-10-13T12:00:00Z");
const later = new Date("2026-10-13T12:05:00Z");
const ids = () => "lift-new";
const asWorkout = (w: typeof workout): ParseResult => ({ kind: "workout", workout: w });
const asMeal = (m: typeof meal): ParseResult => ({ kind: "meal", meal: m });
const warmupOnly = normalizeWorkout({ date: "2026-10-13", workoutType: "Pull", exercises: [{ name: "Lat Pulldown", sets: [], warmup: "60 lb x12" }] }, "2026-10-13", { keepEmpty: true });
const oneSet = normalizeWorkout({ date: "2026-10-13", workoutType: "Pull", exercises: [{ name: "Lat Pulldown", sets: [{ weight: 120, reps: 8 }], warmup: "60 lb x12" }] }, "2026-10-13", { keepEmpty: true });

test("the first message starts a day with a new id, and says what was added", () => {
  const { draft, changes } = applyUpdate("workout", null, asWorkout(warmupOnly), "lat pulldown, warm-up 60 for 12", NOW, ids);
  assert.equal(draft.id, "lift-new");
  assert.equal(draft.date, "2026-10-13");
  assert.deepEqual(draft.messages, ["lat pulldown, warm-up 60 for 12"]);
  assert.deepEqual(changes, ["Added Lat Pulldown: warm-up 60 lb x12"]);
});

test("a later message replaces the summary, keeps the id and the earlier messages, and can be undone", () => {
  const first = applyUpdate("workout", null, asWorkout(warmupOnly), "lat pulldown, warm-up 60 for 12", NOW, ids).draft;
  const { draft, changes } = applyUpdate("workout", first, asWorkout(oneSet), "120 for 8", later, () => "other");
  assert.equal(draft.id, "lift-new");
  assert.deepEqual(draft.messages, ["lat pulldown, warm-up 60 for 12", "120 for 8"]);
  assert.deepEqual(changes, ["Lat Pulldown: added 120 lb: 8"]);
  assert.equal((draft as WorkoutDraft).summary.exercises[0].sets.length, 1);
  const back = undoDraft(draft, later) as WorkoutDraft;
  assert.equal(back.summary.exercises[0].sets.length, 0);
  assert.deepEqual(back.messages, ["lat pulldown, warm-up 60 for 12"]);
});

test("an answer that changes nothing leaves the day exactly as it was", () => {
  const first = applyUpdate("workout", null, asWorkout(oneSet), "x", NOW, ids).draft;
  const { draft, changes } = applyUpdate("workout", first, asWorkout(oneSet), "hello", later, ids);
  assert.equal(draft, first);
  assert.deepEqual(changes, []);
});

test("food works the same way", () => {
  const first = applyUpdate("meal", null, asMeal(meal), "two eggs and a sauce", NOW, () => "meal-new");
  assert.equal(first.draft.id, "meal-new");
  assert.deepEqual(first.changes, ["Added 2 egg (140 kcal)", "Added mystery sauce (80 kcal)"]);
  const more = normalizeMeal({ date: "2026-10-12", items: [...meal.items, { name: "latte", quantity: "12 oz", calories: 150, protein: 8, carbs: 12, fat: 8, confidence: "high" }] }, "2026-10-13");
  const next = applyUpdate("meal", first.draft, asMeal(more), "and a latte", later, ids);
  assert.deepEqual(next.changes, ["Added 12 oz latte (150 kcal)"]);
  assert.equal((next.draft as MealDraft).summary.totals.calories, 370);
  assert.equal(applyUpdate("meal", next.draft, asMeal(more), "nothing new", later, ids).draft, next.draft);
});

test("an answer of the wrong kind is refused rather than saved into the day", () => {
  assert.throws(() => applyUpdate("workout", null, asMeal(meal), "x", NOW, ids), /wrong kind/);
  assert.throws(() => applyUpdate("meal", null, asWorkout(workout), "x", NOW, ids), /wrong kind/);
});

test("an exercise or food item can be removed by hand, and the day can be moved, each with an undo", () => {
  const w = applyUpdate("workout", null, asWorkout(workout), "x", NOW, ids).draft;
  const less = removeDraftItem("workout", w, 0, later) as WorkoutDraft;
  assert.deepEqual(less.summary.exercises.map((e) => e.name), ["Pull-Ups"]);
  assert.equal(less.messages.length, 1, "no message is added");
  assert.equal((undoDraft(less, later) as WorkoutDraft).summary.exercises.length, 2);

  const m = applyUpdate("meal", null, asMeal(meal), "x", NOW, ids).draft;
  const fewer = removeDraftItem("meal", m, 1, later) as MealDraft;
  assert.equal(fewer.summary.totals.calories, 140);
  assert.equal(draftHasContent("meal", removeDraftItem("meal", fewer, 0, later)), false);

  const moved = moveDraft(w, later, "2026-10-10");
  assert.equal(moved.date, "2026-10-10");
  assert.equal(moveDraft(w, later, "nope"), w);
});

test("the summary lines and the title follow the day, with the date for an earlier one", () => {
  const w = applyUpdate("workout", null, asWorkout(warmupOnly), "x", NOW, ids).draft;
  assert.deepEqual(draftLines("workout", w), [{ title: "Lat Pulldown · Pull", detail: "No sets yet — Warm-up: 60 lb x12" }]);
  assert.equal(draftTitle("workout", w, "2026-10-13"), "Today's pull day");
  assert.equal(draftTitle("workout", w, "2026-10-14"), "Pull day · Tue, Oct 13, 2026");
  const m = applyUpdate("meal", null, asMeal(meal), "x", NOW, ids).draft;
  assert.equal(draftTitle("meal", m, "2026-10-12"), "Today's food");
  assert.equal(draftTitle("meal", m, "2026-10-13"), "Food · Mon, Oct 12, 2026");
  assert.equal(draftLines("meal", m).length, 2);
  assert.equal(draftHasContent("workout", w), true, "a warm-up counts");
});

test("dates are shown the way they are in the logs, without shifting by a time zone", () => {
  assert.equal(formatDayLabel("2026-01-01"), "Thu, Jan 1, 2026");
  assert.equal(formatDayShort("2026-12-31"), "Dec 31");
});

test("today is the local calendar day, and log ids are unique and prefixed", () => {
  assert.equal(localToday(new Date(2026, 9, 3, 23, 59)), "2026-10-03");
  assert.equal(localToday(new Date(2026, 0, 1, 0, 1)), "2026-01-01");
  const ids = new Set(Array.from({ length: 50 }, () => newLogId("meal")));
  assert.equal(ids.size, 50);
  assert.ok([...ids].every((id) => id.startsWith("meal-")));
});

// ── The routine ─────────────────────────────────────────────────────────────
import { planFromRoutine, emptyRoutine } from "@shared/fitness-routine";
import { newDraft } from "@shared/fitness-session";

const plan = planFromRoutine({ ...emptyRoutine(), Pull: { exercises: "Lat Pulldown 3x8-10\nSeated Cable Row 3x10\nFace Pull 3x15\nPull-Ups 3x6\nBiceps Curl 3x12\nShrugs", notes: "" } });
const pullDay = (exercises: { name: string; sets: number }[]) => newDraft("lift-1", new Date("2026-10-15T12:00:00Z"), "x", normalizeWorkout({
  date: "2026-10-15", workoutType: "Pull",
  exercises: exercises.map((e) => ({ name: e.name, sets: Array.from({ length: e.sets }, () => ({ weight: 100, reps: 8 })) })),
}, "2026-10-15", { keepEmpty: true }));

test("under a workout summary one line says how much of the plan is done and what is still to do", () => {
  const draft = pullDay([{ name: "Lat Pulldown", sets: 3 }, { name: "Cable Row", sets: 2 }, { name: "Neck Raise", sets: 2 }]);
  assert.equal(planCheckText(plan, draft), "Pull plan: 2 of 6 done · still to do: Face Pull, Pull-Ups, Biceps Curl, Shrugs · not in the plan: Neck Raise");
});

test("a finished plan says all done, and a long list of what is left is shortened", () => {
  const all = pullDay(["Lat Pulldown", "Seated Cable Row", "Face Pull", "Pull-Ups", "Biceps Curl", "Shrugs"].map((name) => ({ name, sets: 3 })));
  assert.equal(planCheckText(plan, all), "Pull plan: 6 of 6 done · all done");
  const few = pullDay([{ name: "Lat Pulldown", sets: 3 }]);
  assert.match(planCheckText(plan, few)!, /still to do: Seated Cable Row, Face Pull, Pull-Ups, Biceps Curl \+1 more/);
});

test("there is no plan line without a plan for that kind of day", () => {
  const draft = pullDay([{ name: "Lat Pulldown", sets: 3 }]);
  assert.equal(planCheckText(undefined, draft), null);
  assert.equal(planCheckText(planFromRoutine(emptyRoutine()), draft), null);
  const legs = planFromRoutine({ ...emptyRoutine(), Legs: { exercises: "Back Squat 4x6", notes: "" } });
  assert.equal(planCheckText(legs, draft), null, "the plan has no Pull day");
});

async function sentBody(kind: "workout" | "meal", routinePlan: typeof plan | undefined) {
  const original = globalThis.fetch;
  let body: any = null;
  globalThis.fetch = (async (_url: string, init: { body: string }) => { body = JSON.parse(init.body); return new Response(JSON.stringify({ kind, workout: workout, meal: meal }), { status: 200 }); }) as any;
  try { await requestSessionUpdate(kind, "squats", null, "2026-10-15", routinePlan); } finally { globalThis.fetch = original; }
  return body;
}

test("the routine goes along with a workout message, but not with food or an empty routine", async () => {
  const withRoutine = await sentBody("workout", plan);
  assert.equal(withRoutine.session, true);
  assert.deepEqual(withRoutine.routine.Pull.exercises[0], { name: "Lat Pulldown", sets: 3, reps: "8-10" });
  assert.equal("routine" in (await sentBody("meal", plan)), false, "food ignores it");
  assert.equal("routine" in (await sentBody("workout", undefined)), false);
  assert.equal("routine" in (await sentBody("workout", planFromRoutine(emptyRoutine()))), false, "an empty routine is not sent");
});

import test from "node:test";
import assert from "node:assert/strict";
import { describeMeal, describeWorkout, fitnessErrorMessage, joinTranscript, localToday, newLogId, nutrientText, withEditedDate, type ParseResult } from "./fitness-entry";
import { speechErrorMessage } from "@/hooks/use-speech-to-text";
import { normalizeMeal, normalizeWorkout } from "@shared/fitness-log";

const workout = normalizeWorkout({ date: "2026-10-12", exercises: [
  { name: "Incline Dumbbell Press", sets: [{ weight: 70, reps: 5 }, { weight: 70, reps: 5 }], warmup: "15 x8", notes: "tight shoulder" },
  { name: "Pull-Ups", sets: [{ unit: "bw", reps: 8 }] },
] }, "2026-10-13");
const meal = normalizeMeal({ date: "2026-10-12", items: [
  { name: "egg", quantity: "2", calories: 140, protein: 12, carbs: 1, fat: 10, confidence: "high" },
  { name: "mystery sauce", calories: 80, protein: 0, carbs: 8, fat: 5, confidence: "low" },
] }, "2026-10-13");

test("dictated phrases are added to the text with single spaces", () => {
  assert.equal(joinTranscript("", "incline press"), "incline press");
  assert.equal(joinTranscript("Today I did", "incline press"), "Today I did incline press");
  assert.equal(joinTranscript("Today I did   ", "  incline   press "), "Today I did incline press");
  assert.equal(joinTranscript("Already typed", "   "), "Already typed");
  assert.equal(joinTranscript("line one\n", "line two"), "line one line two");
});

test("server errors show their message, anything else a friendly fallback", () => {
  assert.equal(fitnessErrorMessage(new Error('422: {"message":"No exercises were found in that."}')), "No exercises were found in that.");
  assert.equal(fitnessErrorMessage(new Error('429: {"message":"Try again in a few minutes."}')), "Try again in a few minutes.");
  for (const bad of [new Error("Failed to fetch"), new Error("500: <html>oops</html>"), new Error('400: {"nope":1}'), "string", null, undefined]) {
    assert.match(fitnessErrorMessage(bad), /Could not reach the AI/);
  }
});

test("voice errors are explained in plain words", () => {
  assert.match(speechErrorMessage("not-allowed"), /Microphone access is blocked/);
  assert.match(speechErrorMessage("service-not-allowed"), /blocked/);
  assert.match(speechErrorMessage("no-speech"), /Did not hear/);
  assert.match(speechErrorMessage("audio-capture"), /No microphone/);
  assert.match(speechErrorMessage("network"), /keyboard's dictation/);
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

test("the day can be corrected before saving, but not to something that is not a date", () => {
  const w: ParseResult = { kind: "workout", workout };
  const m: ParseResult = { kind: "meal", meal };
  assert.equal((withEditedDate(w, "2026-10-10") as typeof w).workout.date, "2026-10-10");
  assert.equal((withEditedDate(m, "2026-10-09") as typeof m).meal.date, "2026-10-09");
  assert.equal(withEditedDate(w, ""), w);
  assert.equal(withEditedDate(m, "10/10/2026"), m);
  assert.equal(workout.date, "2026-10-12", "the original answer is not changed");
});

test("today is the local calendar day, and log ids are unique and prefixed", () => {
  assert.equal(localToday(new Date(2026, 9, 3, 23, 59)), "2026-10-03");
  assert.equal(localToday(new Date(2026, 0, 1, 0, 1)), "2026-01-01");
  const ids = new Set(Array.from({ length: 50 }, () => newLogId("meal")));
  assert.equal(ids.size, 50);
  assert.ok([...ids].every((id) => id.startsWith("meal-")));
});

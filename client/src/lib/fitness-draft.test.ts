import test from "node:test";
import assert from "node:assert/strict";
import { MEAL_DRAFT_KEY, WORKOUT_DRAFT_KEY, loadMealDraft, loadWorkoutDraft, saveMealDraft, saveWorkoutDraft } from "./fitness-draft";
import { addEntry, newDraft } from "@shared/fitness-session";
import { normalizeMeal, normalizeWorkout } from "@shared/fitness-log";

function fakeStorage(options: { failWrites?: boolean; failReads?: boolean } = {}) {
  const data = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => { if (options.failReads) throw new Error("blocked"); return data.get(key) ?? null; },
    setItem: (key: string, value: string) => { if (options.failWrites) throw new Error("full"); data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
  return data;
}

const now = new Date("2026-10-13T12:00:00Z");
const workout = normalizeWorkout({ date: "2026-10-13", exercises: [{ name: "Lat Pulldown", sets: [], warmup: "60 lb x12" }] }, "2026-10-13", { keepEmpty: true });
const meal = normalizeMeal({ date: "2026-10-13", items: [{ name: "egg", calories: 70, protein: 6, carbs: 0, fat: 5 }] }, "2026-10-13");

test("the open day is kept under the synced workout- and calories- prefixes", () => {
  assert.ok(WORKOUT_DRAFT_KEY.startsWith("workout-"));
  assert.ok(MEAL_DRAFT_KEY.startsWith("calories-"));
});

test("a workout day is saved after each change and found again when the page opens", () => {
  const data = fakeStorage();
  assert.equal(loadWorkoutDraft(), null);
  const first = newDraft("lift-1", now, "lat pulldown", workout);
  saveWorkoutDraft(first);
  assert.deepEqual(loadWorkoutDraft(), first);
  const second = addEntry(first, now, "120 for 8", { ...workout, exercises: [{ ...workout.exercises[0], sets: [{ weight: 120, reps: 8 }] }] });
  saveWorkoutDraft(second);
  assert.deepEqual(loadWorkoutDraft(), second);
  assert.equal(data.size, 1, "one key holds the whole day");
});

test("ending or discarding the day removes the saved copy", () => {
  const data = fakeStorage();
  saveWorkoutDraft(newDraft("lift-1", now, "x", workout));
  saveWorkoutDraft(null);
  assert.equal(data.size, 0);
  assert.equal(loadWorkoutDraft(), null);
  saveMealDraft(newDraft("meal-1", now, "x", meal));
  assert.equal(data.has(MEAL_DRAFT_KEY), true);
  saveMealDraft(null);
  assert.equal(data.size, 0);
});

test("food and workout days are kept apart, and a damaged value is ignored", () => {
  const data = fakeStorage();
  saveMealDraft(newDraft("meal-1", now, "eggs", meal));
  assert.equal(loadWorkoutDraft(), null);
  assert.equal(loadMealDraft()!.id, "meal-1");
  data.set(WORKOUT_DRAFT_KEY, "{ not json");
  assert.equal(loadWorkoutDraft(), null);
  data.set(WORKOUT_DRAFT_KEY, data.get(MEAL_DRAFT_KEY)!);
  assert.equal(loadWorkoutDraft(), null, "a food day is not a workout day");
});

test("blocked or full storage never throws", () => {
  fakeStorage({ failWrites: true });
  assert.doesNotThrow(() => saveWorkoutDraft(newDraft("lift-1", now, "x", workout)));
  assert.doesNotThrow(() => saveMealDraft(null));
  fakeStorage({ failReads: true });
  assert.equal(loadWorkoutDraft(), null);
  assert.equal(loadMealDraft(), null);
});

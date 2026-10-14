import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CALORIE_STORAGE_KEY } from "@/lib/calorie-log";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const box = read("components/fitness/log-entry-box.tsx");
const lifting = read("pages/fitness-lifting.tsx");
const calories = read("pages/fitness-calories.tsx");
const routes = readFileSync(new URL("../../../../server/routes.ts", import.meta.url), "utf8");

test("the entry box is a chat-style text area with a send button, a microphone and a check-before-saving step", () => {
  assert.ok(box.includes("<textarea"));
  assert.ok(box.includes('aria-label="Send to AI"'));
  assert.ok(box.includes('"Stop voice typing" : "Start voice typing"'));
  assert.ok(box.includes("aria-pressed={speech.listening}"));
  assert.ok(box.includes("{speech.supported && ("), "the microphone only appears where voice typing works");
  assert.ok(box.includes("keyboard to dictate"), "and the keyboard's own dictation is suggested where it does not");
  assert.ok(box.includes('data-testid="log-preview"'));
  assert.ok(box.includes('aria-label="Day this belongs to"'), "the day can be corrected");
  assert.ok(box.includes("Save to log") && box.includes("Edit my text"));
  assert.ok(box.includes("requestParse(kind, text)"));
  assert.ok(box.includes("withEditedDate(result, date)"), "saves the corrected day");
});

test("Enter sends on a computer (Shift+Enter is a new line), while on a phone it is a new line unless Ctrl or Cmd is held", () => {
  assert.ok(box.includes('e.key === "Enter" && !e.shiftKey && (!isMobile || e.metaKey || e.ctrlKey)'));
});

test("meal estimates are labelled as estimates, and nothing is saved until confirmed", () => {
  assert.ok(box.includes("best estimates, not measurements"));
  const submit = box.slice(box.indexOf("async function submit"), box.indexOf("function save"));
  assert.ok(!submit.includes("onSave("), "parsing alone never saves");
  assert.ok(box.slice(box.indexOf("function save")).includes("onSave(withEditedDate(result, date), text)"));
});

test("the lifting page logs checked workouts as that day's rows, with undo, removal, and charts that include them", () => {
  assert.ok(lifting.includes('<LogEntryBox kind="workout"'));
  assert.ok(lifting.includes("workoutToLogEntries(result.workout"));
  assert.ok(lifting.includes("addWorkoutEntries(entries, added)"));
  assert.ok(lifting.includes("persistEntries(previous)"), "undo restores the earlier log");
  assert.ok(lifting.includes("removeWorkoutLogging(entries, l.logId)"));
  assert.ok(lifting.includes('data-testid="recent-loggings"'));
  assert.ok(lifting.includes('data-testid="session-volume"') && lifting.includes("sessionSummaries(entries)"));
  assert.ok(lifting.includes("bestPerDay"), "two loggings of an exercise on a day are one point on the progression chart");
  assert.ok(lifting.includes('const STORAGE_KEY = "workout-ppl-log-v1"'), "stays under the synced workout- prefix");
  assert.ok(lifting.includes("localStorage.setItem(STORAGE_KEY, JSON.stringify(next))"));
});

test("the calorie page logs checked meals into the day's totals, with undo, removal, and the new charts", () => {
  assert.ok(calories.includes('<LogEntryBox kind="meal"'));
  assert.ok(calories.includes("addMealToDay(log, result.meal"));
  assert.ok(calories.includes("persistLog(previous)"));
  assert.ok(calories.includes("removeMealFromDay(log, m.date, m.id)"));
  assert.ok(calories.includes("saveCalorieLog(next)"));
  assert.ok(calories.includes('data-testid="macro-chart"') && calories.includes('data-testid="nutrient-chart"'));
  assert.ok(calories.includes("aggregateNutrition(sortedLog, granularity)"), "every chart reads the same log, so new meals show up");
  assert.ok(calories.includes("dayFoodDetails("), "tables show meals logged with AI too");
  assert.ok(CALORIE_STORAGE_KEY.startsWith("calories-"), "stays under the synced calories- prefix");
});

test("the server registers the AI endpoint behind sign-in", () => {
  assert.ok(routes.includes("registerFitnessAi(app, requireAuth)"));
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CALORIE_STORAGE_KEY } from "@/lib/calorie-log";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const box = read("components/fitness/session-panel.tsx");
const lifting = read("pages/fitness-lifting.tsx");
const calories = read("pages/fitness-calories.tsx");
const routes = readFileSync(new URL("../../../../server/routes.ts", import.meta.url), "utf8");

test("the entry box is a chat-style text area with a send button and a microphone, and each message goes with the day so far", () => {
  assert.ok(box.includes("<textarea"));
  assert.ok(box.includes('aria-label="Send to AI"'));
  assert.ok(box.includes('"Stop voice typing" : "Start voice typing"'));
  assert.ok(box.includes("aria-pressed={speech.listening}"));
  assert.ok(box.includes("{speech.supported && ("), "the microphone only appears where voice typing works");
  assert.ok(box.includes("keyboard to dictate"), "and the keyboard's own dictation is suggested where it does not");
  assert.ok(box.includes("requestSessionUpdate(kind, text, draft, today)"), "the AI is given the day so far");
  assert.ok(box.includes("applyUpdate(kind, draft, result, text"));
});

test("Enter sends on a computer (Shift+Enter is a new line), while on a phone it is a new line unless Ctrl or Cmd is held", () => {
  assert.ok(box.includes('e.key === "Enter" && !e.shiftKey && (!isMobile || e.metaKey || e.ctrlKey)'));
});

test("every answer is saved to the open day straight away, and a failed request keeps what was typed", () => {
  const submit = box.slice(box.indexOf("async function submit"), box.indexOf("// A change made by hand"));
  assert.ok(submit.includes("onDraftChange(update.draft)"), "saved after each message");
  assert.ok(submit.includes('setText("")'), "the box is cleared only after the answer was applied");
  assert.ok(submit.indexOf("requestSessionUpdate") < submit.indexOf('setText("")'));
  assert.ok(submit.includes("catch (e)") && submit.includes("setError(fitnessErrorMessage(e))"));
  assert.ok(!submit.slice(0, submit.indexOf("requestSessionUpdate")).includes('setText("")'), "nothing is cleared before the answer comes back");
  assert.ok(submit.includes("update.changes.length === 0"), "an answer that changes nothing is explained, not saved");
});

test("the day has an End button, undo, discard, a date, removal of single items, and an automatic-save note", () => {
  assert.ok(box.includes('data-testid="end-session"') && box.includes("onEnd(draft)"));
  assert.ok(box.includes("endButtonLabel(kind, draft, today"));
  assert.ok(box.includes('data-testid="undo-entry"') && box.includes("Undo last entry"));
  assert.ok(box.includes('data-testid="discard-session"') && box.includes("window.confirm("));
  assert.ok(box.includes('aria-label="Day this belongs to"') && box.includes("max={today}"));
  assert.ok(box.includes("removeDraftItem(kind, draft, i, new Date())"));
  assert.ok(box.includes("Saved automatically at"));
  assert.ok(box.includes("best estimates, not measurements"), "meal numbers are labelled as estimates");
  assert.ok(box.includes("draftHasContent(kind, draft)"), "an empty day cannot be ended");
});

test("the lifting page keeps the open day, saves it after every change, and ends it into that day's rows", () => {
  assert.ok(lifting.includes('<FitnessSessionPanel kind="workout"'));
  assert.ok(lifting.includes("loadWorkoutDraft()") && lifting.includes("saveWorkoutDraft(next)"));
  assert.ok(lifting.includes("adoptNewerDraft(current, loadWorkoutDraft())"), "a newer copy from another device is picked up");
  assert.ok(lifting.includes("finishWorkout(finished.summary)"));
  assert.ok(lifting.includes("addWorkoutEntries(removeWorkoutLogging(entries, finished.id), workoutToLogEntries(workout, finished.id))"), "ending again replaces, never doubles");
  assert.ok(lifting.includes("updateDraft(null)"), "ending closes the day so the next entry starts a new one");
  assert.ok(lifting.includes("workoutFromEntries(rows, logId)"), "a saved day can be opened again");
  assert.ok(lifting.includes("if (loadWorkoutDraft())"), "an open day is never overwritten by opening another");
  assert.ok(lifting.includes("newDraft(logId, new Date(), null, workout, true)"));
});

test("the lifting page lists saved days with edit and remove, and its charts include them", () => {
  assert.ok(lifting.includes('data-testid="recent-loggings"'));
  assert.ok(lifting.includes("reopen(l.logId)") && lifting.includes("Edit the workout logged for"));
  assert.ok(lifting.includes("removeWorkoutLogging(entries, l.logId)"));
  assert.ok(lifting.includes('data-testid="session-volume"') && lifting.includes("sessionSummaries(entries)"));
  assert.ok(lifting.includes("bestPerDay"), "two loggings of an exercise on a day are one point on the progression chart");
  assert.ok(lifting.includes('const STORAGE_KEY = "workout-ppl-log-v1"'), "stays under the synced workout- prefix");
  assert.ok(lifting.includes("localStorage.setItem(STORAGE_KEY, JSON.stringify(next))"));
});

test("the calorie page keeps the open day, and ending it writes one entry into that day's totals and marks the day complete", () => {
  assert.ok(calories.includes('<FitnessSessionPanel kind="meal"'));
  assert.ok(calories.includes("loadMealDraft()") && calories.includes("saveMealDraft(next)"));
  assert.ok(calories.includes("addMealToDay(removeMealEverywhere(log, finished.id), meal, finished.id"), "ending again replaces, even on another date");
  assert.ok(calories.includes("adoptNewerDraft(current, loadMealDraft())"), "a newer copy from another device is picked up");
  assert.ok(calories.includes("dayComplete: true"));
  assert.ok(calories.includes("updateDraft(null)"));
  assert.ok(calories.includes("mealFromLogged(day, meal)") && calories.includes("if (loadMealDraft())"));
  assert.ok(calories.includes("reopen(m.id)") && calories.includes("Edit the food logged for"));
  assert.ok(calories.includes("removeMealFromDay(log, m.date, m.id)"));
  assert.ok(calories.includes("saveCalorieLog(next)"));
});

test("the calorie page's charts read the same log, so ended days show up", () => {
  assert.ok(calories.includes('data-testid="macro-chart"') && calories.includes('data-testid="nutrient-chart"'));
  assert.ok(calories.includes("aggregateNutrition(sortedLog, granularity)"), "every chart reads the same log, so new meals show up");
  assert.ok(calories.includes("dayFoodDetails("), "tables show meals logged with AI too");
  assert.ok(CALORIE_STORAGE_KEY.startsWith("calories-"), "stays under the synced calories- prefix");
});

test("the server registers the AI endpoint behind sign-in", () => {
  assert.ok(routes.includes("registerFitnessAi(app, requireAuth)"));
});

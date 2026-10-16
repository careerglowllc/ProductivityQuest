import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CALORIE_STORAGE_KEY } from "@/lib/calorie-log";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const box = read("components/fitness/session-panel.tsx");
const lifting = read("pages/fitness-lifting.tsx");
const goals = read("components/fitness/daily-goals.tsx");
const calories = read("pages/fitness-calories.tsx");
const routes = readFileSync(new URL("../../../../server/routes.ts", import.meta.url), "utf8");

test("the entry box is a chat-style text area with a send button and a microphone, and each message goes with the day so far", () => {
  assert.ok(box.includes("<textarea"));
  assert.ok(box.includes('aria-label="Send to AI"'));
  assert.ok(box.includes('"Stop voice typing" : "Start voice typing"'));
  assert.ok(box.includes("aria-pressed={speech.listening}"));
  assert.ok(box.includes("{speech.supported && ("), "the microphone only appears where voice typing works");
  assert.ok(box.includes("keyboard to dictate"), "and the keyboard's own dictation is suggested where it does not");
  assert.ok(box.includes("requestSessionUpdate(kind, text, draft, today, plan)"), "the AI is given the day so far and the routine");
  assert.ok(box.includes("applyUpdate(kind, draft, result, text"));
});

test("Enter sends the message on every device (Shift+Enter is a new line), and a phone keyboard shows a Send key", () => {
  assert.ok(box.includes('e.key === "Enter" && !e.shiftKey'));
  assert.ok(!box.includes("isMobile"), "no special case for phones");
  assert.ok(box.includes('enterKeyHint="send"'));
});

test("on a phone the calories page shows the title, the thin today row, the entry box and then the Stats widget, before anything else", () => {
  const page = calories;
  const strip = page.indexOf("{isMobile && <TodayStrip");
  const panel = page.indexOf("{isMobile && panel}");
  const stats = page.indexOf("{isMobile && statsWidget}");
  const cards = page.indexOf("{!isMobile && (");
  const desktopPanel = page.indexOf("{!isMobile && panel}");
  assert.ok(page.indexOf("<h1") < strip, "the row comes right after the title");
  assert.ok(strip > 0 && strip < panel && panel < stats && stats < cards && cards < desktopPanel, "row, entry box, Stats, then the desktop layout");
  assert.ok(page.includes("compact={isMobile}"), "the entry box is compact on a phone");
  assert.ok(page.includes("draft !== null && draft.date === today"), "the row shows when today's log is still open");
  assert.ok(page.includes("{!isMobile && <p className=\"text-slate-400 italic text-sm\">"), "the long subtitle is left out on a phone");
});

test("the lifting page runs title, entry box, Stats, progression, Logged with AI, your routine, then the collapsed sections", () => {
  const order = ["<h1", "{panel}", "{statsWidget}", "{/* Progression chart */}", 'data-testid="recent-loggings"', "<RoutineEditor", 'testId="session-volume"', 'testId="current-bests"', 'testId="full-log"'];
  const at = order.map((marker) => lifting.indexOf(marker));
  assert.ok(at.every((i) => i > 0), "every part is there");
  assert.deepEqual([...at].sort((a, b) => a - b), at, "in that order");
  assert.ok(!lifting.includes("TodayStrip") && !lifting.includes("WORKOUT_TABS") && !lifting.includes("Sessions Logged"), "no thin row, no Push / Pull / Legs tabs, no count cards");
  assert.ok(!lifting.includes("{isMobile && panel}") && !lifting.includes("{!isMobile && panel}"), "the same order on a phone and on a desktop");
  assert.ok(lifting.includes("compact={isMobile}"));
  assert.ok(lifting.includes("{!isMobile && <p className=\"text-slate-400 italic text-sm\">"), "the long subtitle is left out on a phone");
});

test("the Stats widget on the lifting page shows what was done today", () => {
  assert.ok(lifting.includes("rows: todayLiftRows(previewEntries, today)") && lifting.includes("todayLog={todayLog}"));
  assert.ok(lifting.includes("draft !== null && draft.date === today"), "the dot shows while today's log is still open");
});

test("Session Volume, Current Bests and the Full Workout Log are collapsed until tapped, and the Progression chart is not", () => {
  for (const id of ["session-volume", "current-bests", "full-log"]) {
    assert.ok(lifting.includes(`<CollapsibleSection\n          testId="${id}"`), `${id} is a collapsible section`);
  }
  const progression = lifting.slice(lifting.indexOf("{/* Progression chart */}"), lifting.indexOf('data-testid="recent-loggings"'));
  assert.ok(!progression.includes("CollapsibleSection"), "the progression chart is always open");
  assert.equal((lifting.match(/<CollapsibleSection\n/g) ?? []).length, 3);
  const section = read("components/fitness/collapsible-section.tsx");
  assert.ok(section.includes("useState(false)") && section.includes("{open && <div"), "closed by default, and its content is only built when open");
  assert.ok(lifting.includes("[...entries].sort((a, b) => b.date.localeCompare(a.date))"), "the full log lists everything");
});

test("the row and the Stats widget follow the open day, so they change with every message", () => {
  assert.ok(lifting.includes("workoutLogWithDraft(entries, draft)") && lifting.includes("liftStripText(todayLift(previewEntries, today))") && lifting.includes("liftWeek(previewEntries, today)"));
  assert.ok(calories.includes("mealLogWithDraft(log, draft)") && calories.includes("mealStripText(todayStat)") && calories.includes("calorieWeek(previewLog, today, CALORIE_GOAL)"));
  assert.ok(calories.includes("todayStat.calories / CALORIE_GOAL"), "the hairline fills toward the calorie goal");
});

test("the lifting page has a routine section, and gives the AI the plan", () => {
  assert.ok(lifting.includes("useRoutine()") && lifting.includes("planFromRoutine(routine)"));
  assert.ok(lifting.includes("<RoutineEditor routine={routine} onSave={saveRoutineState} />"));
  assert.ok(lifting.includes("plan={plan}"), "the entry box gets the plan, so the AI and the plan check use it");
});

test("the progression chart, the session volume chart and the current bests only use lifts in the routine", () => {
  assert.ok(lifting.includes("routineEntries(entries, plan)"));
  const charts = lifting.slice(lifting.indexOf("const sessions = useMemo"), lifting.indexOf("const fullLogSorted"));
  assert.ok(charts.includes("sessionSummaries(liftEntries)"), "session volume");
  assert.ok(charts.includes("new Set(liftEntries.map((e) => e.exercise))"), "the exercise list");
  assert.ok(charts.includes("for (const e of liftEntries)") && charts.includes("liftEntries.find((e) => e.exercise === selectedExercise"), "progression");
  assert.ok(charts.indexOf("const bestsByType") > 0 && charts.slice(charts.indexOf("const bestsByType")).includes("for (const e of liftEntries)"), "current bests");
  assert.ok(!/for \(const e of entries\)/.test(charts), "no chart reads every logged row");
  assert.ok(lifting.includes("fullLogSorted = useMemo") && lifting.slice(lifting.indexOf("const fullLogSorted")).startsWith("const fullLogSorted = useMemo(\n    () => [...entries]"), "the full log still lists everything");
});

test("the page says when charts are limited to the routine, when no routine is set, and which lifts are left out", () => {
  assert.ok(lifting.includes('data-testid="routine-hint"') && lifting.includes("Set up your routine below"));
  assert.ok(lifting.includes('data-testid="outside-routine"') && lifting.includes("not in your routine and left out of the charts"));
  assert.ok(lifting.includes("Counts only lifts in your routine."));
  assert.ok(lifting.includes("None of the lifts in your routine are logged yet."));
});

test("the desktop calories layout keeps the count cards above the entry box, with the Logged-with-AI list straight after the box and its goals widget", () => {
  assert.ok(calories.includes("Days Logged"));
  assert.ok(calories.indexOf("{!isMobile && panel}") < calories.indexOf('data-testid="recent-meals"'));
  assert.ok(!calories.includes("goalsWidget") && !calories.includes('"-mt-4"'), "no separate widget element; the goals come with the box");
});

test("the Calories page's goals widget is handed to the entry box, so it sits right under it, holds the open day's controls, and follows the day being logged", () => {
  const phone = ["{isMobile && panel}", "{isMobile && statsWidget}"].map((marker) => calories.indexOf(marker));
  assert.ok(phone.every((i) => i > 0) && phone[0] < phone[1], "box with its goals, then Stats");
  assert.ok(/<FitnessSessionPanel[^]*?below=\{\(parts\) => <DailyGoals day=\{previewLog\.find\(\(d\) => d\.date === \(draft\?\.date \?\? today\)\)\} today=\{today\} parts=\{parts\} \/>\}/.test(calories), "the day being logged, from the log plus the open day");
  assert.ok(calories.includes("previewLog = useMemo(() => mealLogWithDraft(log, draft), [log, draft])"));
  assert.ok(calories.includes('"vitaminC", "vitaminA", "vitaminD"] as NutrientKey[]'), "vitamin D can be charted over time too");
  assert.ok(box.includes("{below?.(parts)}") && box.indexOf("</section>") < box.indexOf("{below?.(parts)}"), "drawn straight after the box");
  assert.ok(box.includes('{kind === "workout" && draft && ('), "the summary box is for workouts only");
  assert.ok(!box.includes("Today's food") && !box.includes("Total so far"));
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
  assert.ok(goals.includes("best estimates, not measurements"), "meal numbers are labelled as estimates");
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
  assert.ok(lifting.includes('testId="session-volume"') && lifting.includes("sessionSummaries(liftEntries)"));
  assert.ok(lifting.includes("bestPerDay"), "two loggings of an exercise on a day are one point on the progression chart");
  assert.ok(lifting.includes('const STORAGE_KEY = "workout-ppl-log-v1"'), "stays under the synced workout- prefix");
  assert.ok(lifting.includes("localStorage.setItem(STORAGE_KEY, JSON.stringify(next))"));
});

test("the calorie page keeps the open day, and ending it writes one entry into that day's totals and marks the day complete", () => {
  assert.ok(/<FitnessSessionPanel\s+kind="meal"/.test(calories));
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

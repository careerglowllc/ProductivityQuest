import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { FitnessSessionPanel } from "./session-panel";
import { localToday, type FitnessDraft, type FitnessKind } from "@/lib/fitness-entry";
import { addEntry, newDraft } from "@shared/fitness-session";
import { normalizeMeal, normalizeWorkout, type ParsedMeal, type ParsedWorkout } from "@shared/fitness-log";
import { emptyRoutine, planFromRoutine, type RoutinePlan } from "@shared/fitness-routine";

const today = localToday();
const now = new Date("2026-10-13T12:00:00Z");

const pull = (date = today): ParsedWorkout => normalizeWorkout({
  date, workoutType: "Pull", exercises: [
    { name: "Lat Pulldown", kind: "weight", sets: [{ weight: 120, unit: "lb", reps: 8 }, { weight: 120, unit: "lb", reps: 7 }], warmup: "60 lb x12" },
    { name: "Seated Row", sets: [], warmup: "80 lb x10" },
  ],
}, date, { keepEmpty: true });
const food = (date = today): ParsedMeal => normalizeMeal({ date, items: [
  { name: "egg", quantity: "2", confidence: "high", calories: 140, protein: 12, carbs: 1, fat: 10 },
  { name: "latte", quantity: "12 oz", confidence: "low", calories: 150, protein: 8, carbs: 12, fat: 8 },
] }, date);

const render = (kind: FitnessKind, draft: FitnessDraft | null, compact = false, plan?: RoutinePlan) =>
  renderToStaticMarkup(createElement(FitnessSessionPanel, { kind, draft, compact, plan, onDraftChange: () => {}, onEnd: () => {} }));
const button = (html: string, testId: string) => html.match(new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`))?.[0] ?? "";

test("with no day open there is a box to start one and an explanation, but no summary or end button", () => {
  const html = render("workout", null);
  assert.match(html, /Log today&#x27;s workout/);
  assert.match(html, /Send your first exercise and its warm-up/);
  assert.match(html, /Press End today&#x27;s workout when you are done/);
  assert.match(html, /placeholder="Pull day\. First up: lat pulldown/);
  assert.match(html, /aria-label="Send to AI"/);
  assert.doesNotMatch(html, /session-summary|end-session|undo-entry/);
  assert.match(render("meal", null), /Press End day when you are done eating/);
});

test("an open workout shows today's summary with each exercise, its sets and warm-up, and says it saves itself", () => {
  const html = render("workout", newDraft("lift-1", now, "lat pulldown, warm-up 60 for 12", pull()));
  assert.match(html, /data-testid="session-title">Today&#x27;s pull day</);
  assert.match(html, /In progress/);
  assert.match(html, /Saved automatically at/);
  assert.match(html, /Lat Pulldown · Pull/);
  assert.match(html, /120 lb: 8 \/ 7 — Warm-up: 60 lb x12/);
  assert.match(html, /Seated Row · Pull/);
  assert.match(html, /No sets yet — Warm-up: 80 lb x10/);
  assert.match(html, /It is not in your charts until you end the workout/);
  assert.match(html, /placeholder="Next set or next exercise/);
  assert.match(html, /aria-label="Add to this day"/);
  assert.match(html, /aria-label="Remove Lat Pulldown · Pull"/);
});

test("End today's workout is there once the day holds something, and Undo only when there is a step to undo", () => {
  const draft = newDraft("lift-1", now, "first", pull());
  const html = render("workout", draft);
  assert.match(html, /<\/svg> End today&#x27;s workout<\/button>/);
  assert.doesNotMatch(button(html, "end-session"), / disabled=""/);
  assert.match(button(html, "undo-entry"), / disabled=""/, "nothing to undo after the first message");
  assert.match(button(html, "discard-session"), /type="button"/);
  assert.match(html, /<\/svg> Discard this workout<\/button>/);

  const second = addEntry(draft, now, "120 for 6", pull());
  assert.doesNotMatch(button(render("workout", second), "undo-entry"), / disabled=""/);
});

test("a day with nothing in it cannot be ended", () => {
  const empty = newDraft("lift-1", now, null, { ...pull(), exercises: [{ name: "Seated Row", workoutType: "Pull" as const, kind: "reps" as const, sets: [] }] });
  const html = render("workout", empty);
  assert.match(button(html, "end-session"), / disabled=""/);
  assert.match(html, /No sets yet/);
  const none = render("meal", newDraft("meal-1", now, null, { ...food(), items: [], description: "" }));
  assert.match(none, /Nothing in it yet/);
  assert.match(button(none, "end-session"), / disabled=""/);
});

test("a day left open from an earlier date says so and names that date on the button", () => {
  const html = render("workout", newDraft("lift-1", now, "x", pull("2026-03-02")));
  assert.match(html, /data-testid="session-stale"/);
  assert.match(html, /This day is from Mar 2 and was never ended/);
  assert.match(html, /<\/svg> End Mar 2 workout<\/button>/);
  assert.match(html, /Pull day · Mon, Mar 2, 2026/);
  assert.doesNotMatch(render("workout", newDraft("lift-1", now, "x", pull())), /session-stale/);
});

test("a saved day opened for editing says so, saves changes, and keeps the saved version until then", () => {
  const html = render("workout", newDraft("lift-1", now, null, pull(), true));
  assert.match(html, /Editing a saved day/);
  assert.match(html, /<\/svg> Save changes<\/button>/);
  assert.match(html, /<\/svg> Discard changes<\/button>/);
  assert.match(html, /Your saved version stays in the charts until you save your changes/);
  assert.doesNotMatch(html, /session-stale/);
});

test("the day can be moved to another date, but not into the future", () => {
  const html = render("workout", newDraft("lift-1", now, "x", pull()));
  assert.match(html, /<input[^>]*type="date"[^>]*aria-label="Day this belongs to"/);
  assert.ok(html.includes(`value="${today}"`));
  assert.ok(html.includes(`max="${today}"`));
});

test("today's food shows each item with its numbers, the running total for the day, and an End day button", () => {
  const html = render("meal", newDraft("meal-1", now, "eggs and a latte", food()));
  assert.match(html, /data-testid="session-title">Today&#x27;s food</);
  assert.match(html, /2 egg/);
  assert.match(html, /12 oz latte \(rough guess\)/);
  assert.match(html, /best estimates, not measurements/);
  assert.match(html, /<\/svg> End day<\/button>/);
  assert.match(html, /<\/svg> Discard this day<\/button>/);
  assert.match(html, /placeholder="Add more: a chicken burrito bowl/);
  assert.match(html, /It is not in your charts until you end the day/);
});

const chipText = (html: string, key: string) => (html.match(new RegExp(`<div[^>]*data-testid="chip-${key}".*?</p></div>`))?.[0] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

test("each food shows calories, protein, carbs, fat, calcium, sugar and fiber, and its own remove button", () => {
  const html = render("meal", newDraft("meal-1", now, "eggs and a latte", food()));
  const items = html.match(/<li[^>]*data-testid="meal-item".*?<\/li>/g) ?? [];
  assert.equal(items.length, 2);
  assert.match(items[0], /2 egg/);
  assert.deepEqual(Array.from(items[0].matchAll(/data-testid="chip-(\w+)"/g)).map((m) => m[1]), ["calories", "protein", "carbs", "fat", "calcium", "sugar", "fiber"]);
  assert.equal(chipText(items[0], "calories"), "140 kcal");
  assert.equal(chipText(items[0], "protein"), "12 g Protein");
  assert.equal(chipText(items[1], "carbs"), "12 g Carbs");
  assert.match(items[1], /aria-label="Remove 12 oz latte \(rough guess\)"/);
  assert.doesNotMatch(items[0], /Calories 140 ·/, "no longer one line of text");
});

test("the day's total is a block of bigger tiles, under a Total so far heading", () => {
  const html = render("meal", newDraft("meal-1", now, "eggs and a latte", food()));
  const total = html.match(/data-testid="meal-total".*?best estimates/)?.[0] ?? "";
  assert.match(total, /Total so far/);
  assert.match(total, /data-testid="nutrient-chips-total"/);
  assert.equal(chipText(total, "calories"), "290 kcal");
  assert.equal(chipText(total, "protein"), "20 g Protein");
  assert.equal(chipText(total, "fat"), "18 g Fat");
  assert.equal(chipText(total, "sugar"), "0 g Sugar");
  assert.equal(chipText(total, "fiber"), "0 g Fiber");
  assert.equal(chipText(total, "calcium"), "0 mg Calcium");
});

test("a day with no food has no total block, and workouts show no nutrient chips", () => {
  assert.doesNotMatch(render("meal", newDraft("meal-1", now, null, { ...food(), items: [], description: "" })), /meal-total|nutrient-chips/);
  assert.doesNotMatch(render("workout", newDraft("lift-1", now, "x", pull())), /nutrient-chips|meal-item/);
});

test("food saved before sugar, fiber and vitamin D were tracked still shows, with zeros", () => {
  const old = food();
  const stripped = { ...old, items: old.items.map(({ sugar: _s, fiber: _f, vitaminD: _d, ...rest }) => rest as typeof old.items[number]), totals: { ...old.totals, sugar: undefined as unknown as number } };
  const html = render("meal", newDraft("meal-1", now, "x", stripped));
  assert.equal(chipText(html, "sugar"), "0 g Sugar");
  assert.equal(chipText(html, "fiber"), "0 g Fiber");
});

test("the microphone and send buttons are part of the box", () => {
  const html = render("meal", null);
  assert.match(html, /aria-label="Send to AI"/);
  assert.match(html, /keyboard to dictate/, "where voice typing is missing the keyboard's dictation is suggested");
});

test("the phone layout drops the heading and explanation, keeps the box, and uses less space", () => {
  const html = render("meal", null, true);
  assert.doesNotMatch(html, /Log what you ate today<\/div>/);
  assert.doesNotMatch(html, /Press End day when you are done eating/);
  assert.match(html, /placeholder="An everything bagel/);
  assert.match(html, /aria-label="Log what you ate today"/, "the box is still labelled for screen readers");
  assert.match(html, /p-3 sm:p-5 mb-4/);
  assert.match(render("meal", null, false), /p-4 sm:p-5 mb-8/);
  assert.match(html, /rows="2"/);
});

test("the keyboard's return key says Send, and an open day still shows its summary on the phone layout", () => {
  assert.match(render("workout", null), /enterKeyHint="send"/);
  const html = render("workout", newDraft("lift-1", now, "x", pull()), true);
  assert.match(html, /data-testid="session-title">Today&#x27;s pull day</);
  assert.match(html, /enterKeyHint="send"/);
});

test("under a workout summary the plan check shows what is done and what is still to do, when there is a plan", () => {
  const plan = planFromRoutine({ ...emptyRoutine(), Pull: { exercises: "Lat Pulldown 3x8\nSeated Row 3x10\nFace Pull 3x15", notes: "" } });
  const draft = newDraft("lift-1", now, "x", pull());
  const html = render("workout", draft, false, plan);
  assert.match(html, /data-testid="plan-check"/);
  assert.match(html, /Pull plan: 1 of 3 done/);
  assert.match(html, /still to do: Seated Row, Face Pull/);
  assert.doesNotMatch(render("workout", draft), /plan-check/, "no plan, no line");
  assert.doesNotMatch(render("workout", null, false, plan), /plan-check/, "no open day, no line");
});

test("food days never show a plan line", () => {
  const plan = planFromRoutine({ ...emptyRoutine(), Pull: { exercises: "Lat Pulldown 3x8", notes: "" } });
  assert.doesNotMatch(render("meal", newDraft("meal-1", now, "x", food()), false, plan), /plan-check/);
});

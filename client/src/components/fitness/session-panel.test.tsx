import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { FitnessSessionPanel } from "./session-panel";
import { localToday, type FitnessDraft, type FitnessKind } from "@/lib/fitness-entry";
import { addEntry, newDraft } from "@shared/fitness-session";
import { normalizeMeal, normalizeWorkout, type ParsedMeal, type ParsedWorkout } from "@shared/fitness-log";

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

const render = (kind: FitnessKind, draft: FitnessDraft | null) =>
  renderToStaticMarkup(createElement(FitnessSessionPanel, { kind, draft, onDraftChange: () => {}, onEnd: () => {} }));
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

test("today's food shows each item, the running total for the day, and an End day button", () => {
  const html = render("meal", newDraft("meal-1", now, "eggs and a latte", food()));
  assert.match(html, /data-testid="session-title">Today&#x27;s food</);
  assert.match(html, /2 egg/);
  assert.match(html, /12 oz latte \(rough guess\)/);
  assert.match(html, /Total so far:<\/span> Calories 290/);
  assert.match(html, /best estimates, not measurements/);
  assert.match(html, /<\/svg> End day<\/button>/);
  assert.match(html, /<\/svg> Discard this day<\/button>/);
  assert.match(html, /placeholder="Add more: a chicken burrito bowl/);
  assert.match(html, /It is not in your charts until you end the day/);
});

test("the microphone and send buttons are part of the box", () => {
  const html = render("meal", null);
  assert.match(html, /aria-label="Send to AI"/);
  assert.match(html, /keyboard to dictate/, "where voice typing is missing the keyboard's dictation is suggested");
});

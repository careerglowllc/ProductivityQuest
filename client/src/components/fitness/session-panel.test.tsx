import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, Fragment, type ReactNode } from "react";
import { FitnessSessionPanel, type SessionParts } from "./session-panel";
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

const renderFood = (draft: FitnessDraft | null, below?: (parts: SessionParts | null) => ReactNode, compact = false) =>
  renderToStaticMarkup(createElement(FitnessSessionPanel, { kind: "meal", draft, compact, below, onDraftChange: () => {}, onEnd: () => {} }));

test("a food day has no summary box of its own: the open day goes to the widget handed in as `below`, right under the box", () => {
  const seen: (SessionParts | null)[] = [];
  const html = renderFood(newDraft("meal-1", now, "eggs and a latte", food()), (parts) => { seen.push(parts); return createElement("aside", { "data-testid": "below" }, "widget"); });
  assert.doesNotMatch(html, /session-summary|session-title|end-session|undo-entry|meal-item|Today&#x27;s food/);
  assert.ok(html.endsWith("</section><aside data-testid=\"below\">widget</aside>"), "the widget comes straight after the box");
  assert.match(html, /placeholder="Add more: a chicken burrito bowl/);
  assert.equal(seen[0]?.draft.id, "meal-1");
  assert.equal(seen[0]?.foodCount, 2);
});

test("with no day open `below` gets nothing to show, and a food day with no `below` has no controls", () => {
  let called: unknown = "never";
  renderFood(null, (parts) => { called = parts; return null; });
  assert.equal(called, null);
  assert.doesNotMatch(renderFood(newDraft("meal-1", now, "x", food())), /end-session|undo-entry|discard-session|session-saved/);
});

test("the box is a little tighter above a widget", () => {
  assert.match(renderFood(null, () => null), /p-3 sm:p-5 mb-4/);
  assert.match(renderFood(null), /p-4 sm:p-5 mb-8/);
});

const partsOf = (draft: FitnessDraft): SessionParts => {
  const seen: { parts: SessionParts | null } = { parts: null };
  renderFood(draft, (p) => { seen.parts = p; return null; });
  assert.ok(seen.parts);
  return seen.parts;
};
const html = (...nodes: ReactNode[]) => renderToStaticMarkup(createElement(Fragment, null, ...nodes));
const chipText = (markup: string, key: string) => (markup.match(new RegExp(`<div[^>]*data-testid="chip-${key}".*?</p></div>`))?.[0] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

test("the parts for the widget are the Day field and saved note, the foods with their numbers, and End / Undo / Discard", () => {
  const parts = partsOf(newDraft("meal-1", now, "eggs and a latte", food()));
  const meta = html(parts.meta);
  assert.match(meta, /<input[^>]*type="date"[^>]*aria-label="Day this belongs to"/);
  assert.match(meta, /Saved automatically at/);
  const foods = html(parts.foods);
  const items = foods.match(/<li[^>]*data-testid="meal-item".*?<\/li>/g) ?? [];
  assert.equal(items.length, 2);
  assert.match(items[0], /2 egg/);
  assert.match(items[1], /12 oz latte \(rough guess\)/);
  assert.deepEqual(Array.from(items[0].matchAll(/data-testid="chip-(\w+)"/g)).map((m) => m[1]), ["calories", "protein", "carbs", "fat", "calcium", "sugar", "fiber"]);
  assert.equal(chipText(items[0], "calories"), "140 kcal");
  assert.equal(chipText(items[1], "carbs"), "12 g Carbs");
  assert.match(items[1], /aria-label="Remove 12 oz latte \(rough guess\)"/);
  const actions = html(parts.actions);
  assert.match(actions, /<\/svg> End day<\/button>/);
  assert.match(actions, /<\/svg> Undo last entry<\/button>/);
  assert.match(actions, /<\/svg> Discard this day<\/button>/);
  assert.match(actions, /It is not in your charts until you end the day/);
  assert.match(html(parts.tag), /In progress/);
  assert.equal(parts.last, null, "nothing has been sent yet from this page");
});

test("a food day with no foods has nothing to list and cannot be ended; a stale or reopened day says so", () => {
  const empty = partsOf(newDraft("meal-1", now, null, { ...food(), items: [], description: "" }));
  assert.equal(empty.foodCount, 0);
  assert.ok(!empty.foods);
  assert.match(button(html(empty.actions), "end-session"), / disabled=""/);
  const stale = partsOf(newDraft("meal-1", now, "x", food("2026-03-02")));
  assert.match(html(stale.meta), /This day is from Mar 2 and was never ended/);
  assert.match(html(stale.actions), /<\/svg> End Mar 2<\/button>/);
  const reopened = partsOf(newDraft("meal-1", now, null, food(), true));
  assert.match(html(reopened.tag), /Editing a saved day/);
  assert.match(html(reopened.actions), /<\/svg> Save changes<\/button>/);
  assert.match(html(reopened.actions), /<\/svg> Discard changes<\/button>/);
});

test("food saved before sugar, fiber and vitamin D were tracked still lists, with zeros", () => {
  const old = food();
  const stripped = { ...old, items: old.items.map(({ sugar: _s, fiber: _f, vitaminD: _d, ...rest }) => rest as typeof old.items[number]) };
  const foods = html(partsOf(newDraft("meal-1", now, "x", stripped)).foods);
  assert.equal(chipText(foods, "sugar"), "0 g Sugar");
  assert.equal(chipText(foods, "fiber"), "0 g Fiber");
});

test("workouts show no nutrient chips", () => {
  assert.doesNotMatch(render("workout", newDraft("lift-1", now, "x", pull())), /nutrient-chips|meal-item/);
});

test("the box has a send button and no microphone, on both pages", () => {
  for (const kind of ["meal", "workout"] as const) {
    const html = render(kind, null);
    assert.match(html, /aria-label="Send to AI"/);
    assert.doesNotMatch(html, /voice typing|microphone|dictate|aria-pressed|Listening/i);
    assert.equal((html.match(/<button/g) ?? []).length, 1, "the send button is the only button in the box");
  }
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

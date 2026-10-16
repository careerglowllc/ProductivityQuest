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

test("with no day open there is a box to start one and an explanation, but no end button", () => {
  const html = render("workout", null);
  assert.match(html, /Log today&#x27;s workout/);
  assert.match(html, /Send your first exercise and its warm-up/);
  assert.match(html, /Press End today&#x27;s workout when you are done/);
  assert.match(html, /placeholder="Pull day\. First up: lat pulldown/);
  assert.match(html, /aria-label="Send to AI"/);
  assert.doesNotMatch(html, /session-summary|end-session|undo-entry/);
  assert.match(render("meal", null), /Press End day when you are done eating/);
});

const renderWith = (kind: FitnessKind, draft: FitnessDraft | null, below?: (parts: SessionParts | null) => ReactNode, compact = false, plan?: RoutinePlan) =>
  renderToStaticMarkup(createElement(FitnessSessionPanel, { kind, draft, compact, plan, below, onDraftChange: () => {}, onEnd: () => {} }));
const renderFood = (draft: FitnessDraft | null, below?: (parts: SessionParts | null) => ReactNode, compact = false) => renderWith("meal", draft, below, compact);

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

const partsOf = (draft: FitnessDraft, kind: FitnessKind = "meal", plan?: RoutinePlan): SessionParts => {
  const seen: { parts: SessionParts | null } = { parts: null };
  renderWith(kind, draft, (p) => { seen.parts = p; return null; }, false, plan);
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

test("a workout day has no summary box of its own either: its controls go to the widget under the box", () => {
  const seen: (SessionParts | null)[] = [];
  const draft = newDraft("lift-1", now, "lat pulldown, warm-up 60 for 12", pull());
  const html = renderWith("workout", draft, (parts) => { seen.push(parts); return createElement("aside", { "data-testid": "below" }, "widget"); });
  assert.doesNotMatch(html, /session-summary|session-title|end-session|undo-entry|plan-check|Today&#x27;s pull day/);
  assert.ok(html.endsWith("</section><aside data-testid=\"below\">widget</aside>"));
  assert.match(html, /placeholder="Next set or next exercise/);
  assert.match(html, /aria-label="Add to this day"/);
  assert.equal(seen[0]?.draft.id, "lift-1");
  assert.equal(seen[0]?.foodCount, 2, "two exercises");
  assert.equal(seen[0]?.locked, false);
  assert.equal(typeof seen[0]?.onRemove, "function");
  assert.ok(!seen[0]?.foods, "the exercises are drawn by the widget, so there is no food list");
});

test("the parts for a workout day: the Day field and saved note, then End today's workout, Undo and Discard", () => {
  const draft = newDraft("lift-1", now, "first", pull());
  const parts = partsOf(draft, "workout");
  const meta = html(parts.meta);
  assert.match(meta, /<input[^>]*type="date"[^>]*aria-label="Day this belongs to"/);
  assert.ok(meta.includes(`value="${today}"`) && meta.includes(`max="${today}"`), "not into the future");
  assert.match(meta, /Saved automatically at/);
  assert.doesNotMatch(meta, /session-stale/);
  assert.match(html(parts.tag), /In progress/);
  const actions = html(parts.actions);
  assert.match(actions, /<\/svg> End today&#x27;s workout<\/button>/);
  assert.doesNotMatch(button(actions, "end-session"), / disabled=""/);
  assert.match(button(actions, "undo-entry"), / disabled=""/, "nothing to undo after the first message");
  assert.match(actions, /<\/svg> Discard this workout<\/button>/);
  assert.match(actions, /It is not in your charts until you end the workout/);
  const second = addEntry(draft, now, "120 for 6", pull());
  assert.doesNotMatch(button(html(partsOf(second, "workout").actions), "undo-entry"), / disabled=""/);
});

test("a workout with nothing in it cannot be ended; a stale or reopened one says so", () => {
  const empty = newDraft("lift-1", now, null, { ...pull(), exercises: [{ name: "Seated Row", workoutType: "Pull" as const, kind: "reps" as const, sets: [] }] });
  assert.match(button(html(partsOf(empty, "workout").actions), "end-session"), / disabled=""/);
  const stale = partsOf(newDraft("lift-1", now, "x", pull("2026-03-02")), "workout");
  assert.match(html(stale.meta), /This day is from Mar 2 and was never ended/);
  assert.match(html(stale.actions), /<\/svg> End Mar 2 workout<\/button>/);
  const reopened = partsOf(newDraft("lift-1", now, null, pull(), true), "workout");
  assert.match(html(reopened.tag), /Editing a saved day/);
  assert.match(html(reopened.actions), /<\/svg> Save changes<\/button>/);
  assert.match(html(reopened.actions), /<\/svg> Discard changes<\/button>/);
  assert.match(html(reopened.actions), /Your saved version stays in the charts until you save your changes/);
});

test("workouts hand over no food list or nutrient chips", () => {
  assert.ok(!partsOf(newDraft("lift-1", now, "x", pull()), "workout").foods);
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

test("the keyboard's return key says Send on both pages", () => {
  assert.match(render("workout", null), /enterKeyHint="send"/);
  assert.match(render("meal", null, true), /enterKeyHint="send"/);
  assert.match(render("workout", newDraft("lift-1", now, "x", pull()), true), /enterKeyHint="send"/);
});

test("a workout's plan check shows what is done and what is still to do, when there is a plan", () => {
  const plan = planFromRoutine({ ...emptyRoutine(), Pull: { exercises: "Lat Pulldown 3x8\nSeated Row 3x10\nFace Pull 3x15", notes: "" } });
  const draft = newDraft("lift-1", now, "x", pull());
  assert.equal(partsOf(draft, "workout", plan).planLine, "Pull plan: 1 of 3 done · still to do: Seated Row, Face Pull");
  assert.equal(partsOf(draft, "workout").planLine, null, "no plan, no line");
  assert.doesNotMatch(render("workout", draft, false, plan), /plan-check/, "the line is drawn by the widget, not the box");
});

test("food days never have a plan line", () => {
  const plan = planFromRoutine({ ...emptyRoutine(), Pull: { exercises: "Lat Pulldown 3x8", notes: "" } });
  assert.equal(partsOf(newDraft("meal-1", now, "x", food()), "meal", plan).planLine, null);
});

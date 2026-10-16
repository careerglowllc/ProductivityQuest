import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DailyGoals } from "./daily-goals";
import { FitnessSessionPanel, type SessionParts } from "./session-panel";
import { localToday, type FitnessDraft } from "@/lib/fitness-entry";
import { addEntry, newDraft, type MealDraft } from "@shared/fitness-session";
import { normalizeMeal, type ParsedMeal } from "@shared/fitness-log";

const today = localToday();
const render = (day: Parameters<typeof DailyGoals>[0]["day"]) => renderToStaticMarkup(createElement(DailyGoals, { day, today }));
const row = (html: string, key: string) => html.match(new RegExp(`<li[^>]*data-testid="goal-${key}".*?</p></li>`))?.[0] ?? "";
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const width = (html: string, key: string) => /data-testid="goal-fill-\w+"[^>]*width:(\d+)%/.exec(row(html, key))?.[1];

const day = { calories: 1440, protein: 82, carbs: 120, fat: 40, fiber: 14, calcium: 650, vitaminA: 450, vitaminC: 90, vitaminD: 5 };

test("it has a bar for calories, protein, carbs, fat, fiber, calcium and vitamins A, C and D, in that order", () => {
  const html = render(day);
  const keys = Array.from(html.matchAll(/data-testid="goal-(\w+)" data-status/g)).map((m) => m[1]);
  assert.deepEqual(keys, ["calories", "protein", "carbs", "fat", "fiber", "calcium", "vitaminA", "vitaminC", "vitaminD"]);
  assert.match(html, /Today vs your goals/);
  assert.match(html, /2,400 kcal a day/);
});

test("each bar shows the percent of its goal and how far there is to go", () => {
  const html = render(day);
  assert.match(text(row(html, "calories")), /Calories 60% 1,440 of 2,400 kcal · 960 to go/);
  assert.match(text(row(html, "protein")), /Protein 55% 82 of 150 g · 68 to go/);
  assert.match(text(row(html, "fiber")), /Fiber 50% 14 of 28 g · 14 to go/);
  assert.match(text(row(html, "calcium")), /Calcium 50% 650 of 1,300 mg · 650 to go/);
  assert.match(text(row(html, "vitaminD")), /Vitamin D 25% 5 of 20 mcg · 15 to go/);
  assert.equal(width(html, "calories"), "60");
  assert.equal(width(html, "vitaminD"), "25");
});

test("a bar is a labelled progress bar for screen readers", () => {
  const html = render(day);
  assert.match(row(html, "protein"), /role="progressbar"[^>]*aria-label="Protein, 55% of the daily goal"[^>]*aria-valuenow="55"/);
});

test("a goal that is reached says so, and a bar never grows past full", () => {
  const html = render({ ...day, vitaminC: 140, protein: 190 });
  assert.match(row(html, "vitaminC"), /data-status="met"/);
  assert.match(text(row(html, "vitaminC")), /156% 140 of 90 mg · goal reached/);
  assert.equal(width(html, "vitaminC"), "100");
  assert.match(row(html, "vitaminC"), /<svg/, "a check mark");
  assert.match(row(html, "protein"), /data-status="met"/);
  assert.match(row(html, "calories"), /data-status="under"/);
  assert.doesNotMatch(row(html, "calories"), /<svg/);
});

test("calories, carbs and fat that pass their goal turn amber and say how far over", () => {
  const html = render({ ...day, calories: 2650, carbs: 300 });
  assert.match(row(html, "calories"), /data-status="over"/);
  assert.match(text(row(html, "calories")), /110% 2,650 of 2,400 kcal · 250 over/);
  assert.match(row(html, "calories"), /background-color:#F59E0B/);
  assert.match(row(html, "carbs"), /data-status="over"/);
  assert.match(row(html, "fat"), /data-status="under"/);
  assert.equal(width(html, "calories"), "100");
});

test("with nothing logged every bar is empty and the box invites a first meal", () => {
  const html = render(undefined);
  assert.match(html, /data-testid="goals-empty"/);
  assert.match(html, /Log a meal above and these fill in/);
  for (const key of ["calories", "protein", "carbs", "fat", "fiber", "calcium", "vitaminA", "vitaminC", "vitaminD"]) assert.equal(width(html, key), "0");
  assert.match(text(row(html, "calories")), /0% 0 of 2,400 kcal · 2,400 to go/);
  assert.doesNotMatch(render(day), /goals-empty/);
});

test("a day logged before fiber and vitamin D were tracked shows them as 0 instead of breaking", () => {
  const html = render({ calories: 800, protein: 40, carbs: 90, fat: 30, calcium: 300, vitaminA: 100, vitaminC: 10 });
  assert.match(text(row(html, "fiber")), /0% 0 of 28 g · 28 to go/);
  assert.match(text(row(html, "vitaminD")), /0% 0 of 20 mcg · 20 to go/);
});

test("it explains where the goals come from, and that the amounts are estimates", () => {
  assert.match(render(day), /Protein, carbs and fat are 25%, 45% and 30% of the calories\. Fiber, calcium and the vitamins use the daily value/);
  assert.match(render(day), /best estimates, not measurements/);
});

test("sugar has no goal, so it is a single line, only when there is some", () => {
  assert.match(render({ ...day, sugar: 36.4 }), /data-testid="goals-sugar"[^>]*>Sugar: 36\.4 g \(no daily goal\)</);
  assert.doesNotMatch(render(day), /goals-sugar/);
});

test("with no day open the widget is still there, with no controls", () => {
  const html = render(day);
  assert.match(html, /data-testid="goals-title"[^>]*>Today vs your goals</);
  assert.doesNotMatch(html, /end-session|undo-entry|discard-session|session-saved|goals-foods|In progress|Day this belongs to/);
});

// ── with a food day open: the whole entry area, the box and then the widget under it ──
const eggs = (date = today): ParsedMeal => normalizeMeal({ date, items: [
  { name: "egg", quantity: "2", confidence: "high", calories: 140, protein: 12, carbs: 1, fat: 10, sugar: 0.4, calcium: 50 },
  { name: "latte", quantity: "12 oz", confidence: "low", calories: 150, protein: 8, carbs: 12, fat: 8, sugar: 14, calcium: 300 },
] }, date);
const now = new Date("2026-10-13T12:00:00Z");

const area = (draft: FitnessDraft | null, onEnd: (d: FitnessDraft) => void = () => {}) => renderToStaticMarkup(createElement(FitnessSessionPanel, {
  kind: "meal", draft, compact: true, onDraftChange: () => {}, onEnd,
  below: (parts: SessionParts | null) => createElement(DailyGoals, { day: draft ? (draft as MealDraft).summary.totals : undefined, today: localToday(), parts }),
}));
const button = (html: string, testId: string) => html.match(new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`))?.[0] ?? "";

test("an open food day is in the goals widget, under the entry box, and there is no separate Today's food box", () => {
  const html = area(newDraft("meal-1", now, "eggs and a latte", eggs()));
  assert.doesNotMatch(html, /session-summary|session-title|Today&#x27;s food|meal-total|Total so far/);
  assert.ok(html.indexOf("<textarea") > 0 && html.indexOf("<textarea") < html.indexOf('data-testid="daily-goals"'), "the box comes first");
  assert.match(html, /data-testid="goals-title"[^>]*>Today vs your goals</);
  assert.match(html, /In progress/);
  assert.match(html, /Saved automatically at/);
  assert.match(html, /<input[^>]*type="date"[^>]*aria-label="Day this belongs to"/);
});

test("the bars show the open day's totals", () => {
  const html = area(newDraft("meal-1", now, "eggs and a latte", eggs()));
  assert.match(text(row(html, "calories")), /Calories 12% 290 of 2,400 kcal · 2,110 to go/);
  assert.match(text(row(html, "protein")), /Protein 13% 20 of 150 g · 130 to go/);
  assert.match(text(row(html, "calcium")), /Calcium 27% 350 of 1,300 mg/);
  assert.match(html, /Sugar: 14\.4 g \(no daily goal\)/);
});

test("End day, Undo last entry and Discard this day are in the widget, with the note about the charts", () => {
  const draft = newDraft("meal-1", now, "eggs", eggs());
  const widget = area(draft).slice(area(draft).indexOf('data-testid="daily-goals"'));
  assert.match(widget, /<\/svg> End day<\/button>/);
  assert.match(widget, /<\/svg> Undo last entry<\/button>/);
  assert.match(widget, /<\/svg> Discard this day<\/button>/);
  assert.match(widget, /It is not in your charts until you end the day/);
  assert.doesNotMatch(button(widget, "end-session"), / disabled=""/);
  assert.match(button(widget, "undo-entry"), / disabled=""/, "nothing to undo after the first message");
  assert.doesNotMatch(button(area(addEntry(draft, now, "and a bagel", eggs())), "undo-entry"), / disabled=""/);
  assert.doesNotMatch(area(draft).slice(0, area(draft).indexOf('data-testid="daily-goals"')), /end-session|undo-entry|discard-session/, "none of them in the box");
});

test("the foods are folded away until tapped, each with its numbers and a remove button", () => {
  const html = area(newDraft("meal-1", now, "eggs and a latte", eggs()));
  assert.match(html, /<details data-testid="goals-foods"(?![^>]*open)[^>]*><summary[^>]*>Foods logged \(2\)<\/summary>/);
  const items = html.match(/<li[^>]*data-testid="meal-item".*?<\/li>/g) ?? [];
  assert.equal(items.length, 2);
  assert.match(items[0], /2 egg/);
  assert.match(items[0], /data-testid="chip-sugar"/);
  assert.match(items[1], /aria-label="Remove 12 oz latte \(rough guess\)"/);
});

test("an empty day cannot be ended and lists no foods; the other labels follow the day", () => {
  const empty = area(newDraft("meal-1", now, null, { ...eggs(), items: [], description: "", totals: { ...eggs().totals, calories: 0 } }));
  assert.match(button(empty, "end-session"), / disabled=""/);
  assert.doesNotMatch(empty, /goals-foods/);
  assert.match(empty, /Log a meal above and these fill in/);
  const reopened = area(newDraft("meal-1", now, null, eggs(), true));
  assert.match(reopened, /Editing a saved day/);
  assert.match(reopened, /<\/svg> Save changes<\/button>/);
  assert.match(reopened, /<\/svg> Discard changes<\/button>/);
  assert.match(reopened, /Your saved version stays in the charts until you save your changes/);
});

test("a day that is not today is named in the title, and a day left open says so", () => {
  const html = area(newDraft("meal-1", now, "x", eggs("2026-03-02")));
  assert.match(html, /data-testid="goals-title"[^>]*>Mar 2 vs your goals</);
  assert.match(html, /This day is from Mar 2 and was never ended/);
  assert.match(html, /<\/svg> End Mar 2<\/button>/);
  assert.match(area(newDraft("meal-1", now, null, { ...eggs("2026-03-02"), items: [], description: "", totals: { ...eggs().totals, calories: 0 } })), /Nothing in this day yet/);
});

test("the widget with no open day, under the box, has nothing to end or undo", () => {
  const html = area(null);
  assert.match(html, /data-testid="daily-goals"/);
  assert.doesNotMatch(html, /end-session|undo-entry|discard-session/);
});

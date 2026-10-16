import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DailyGoals } from "./daily-goals";

const render = (day: Parameters<typeof DailyGoals>[0]["day"], includesOpenDay?: boolean) => renderToStaticMarkup(createElement(DailyGoals, { day, includesOpenDay }));
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

test("with nothing logged every bar is empty and the box invites a first meal; the open day is mentioned only when there is one", () => {
  const html = render(undefined);
  assert.match(html, /data-testid="goals-empty"/);
  assert.match(html, /Log a meal above and these fill in/);
  for (const key of ["calories", "protein", "carbs", "fat", "fiber", "calcium", "vitaminA", "vitaminC", "vitaminD"]) assert.equal(width(html, key), "0");
  assert.match(text(row(html, "calories")), /0% 0 of 2,400 kcal · 2,400 to go/);
  assert.doesNotMatch(render(day), /goals-empty/);
  assert.doesNotMatch(render(day), /still logging/);
  assert.match(render(day, true), /Includes the food you are still logging/);
});

test("a day logged before fiber and vitamin D were tracked shows them as 0 instead of breaking", () => {
  const html = render({ calories: 800, protein: 40, carbs: 90, fat: 30, calcium: 300, vitaminA: 100, vitaminC: 10 });
  assert.match(text(row(html, "fiber")), /0% 0 of 28 g · 28 to go/);
  assert.match(text(row(html, "vitaminD")), /0% 0 of 20 mcg · 20 to go/);
});

test("it explains where the goals come from", () => {
  assert.match(render(day), /Protein, carbs and fat are 25%, 45% and 30% of the calories\. Fiber, calcium and the vitamins use the daily value/);
});

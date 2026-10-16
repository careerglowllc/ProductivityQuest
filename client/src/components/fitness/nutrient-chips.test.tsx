import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NutrientChips } from "./nutrient-chips";

const render = (totals: Parameters<typeof NutrientChips>[0]["totals"]) => renderToStaticMarkup(createElement(NutrientChips, { totals }));
const chip = (html: string, key: string) => html.match(new RegExp(`<div[^>]*data-testid="chip-${key}".*?</p></div>`))?.[0] ?? "";
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const eggs = { calories: 140, protein: 12, carbs: 1, fat: 10, calcium: 50, sugar: 0.4, fiber: 0, sodium: 140 };

test("a food shows calories, protein, carbs, fat, calcium, sugar and fiber, in that order, and nothing else", () => {
  const html = render(eggs);
  const keys = Array.from(html.matchAll(/data-testid="chip-(\w+)"/g)).map((m) => m[1]);
  assert.deepEqual(keys, ["calories", "protein", "carbs", "fat", "calcium", "sugar", "fiber"]);
  assert.doesNotMatch(html, /sodium|Sodium/);
});

test("each amount has its unit, calories say kcal, and the label sits under the number", () => {
  const html = render(eggs);
  assert.equal(text(chip(html, "calories")), "140 kcal");
  assert.equal(text(chip(html, "protein")), "12 g Protein");
  assert.equal(text(chip(html, "carbs")), "1 g Carbs");
  assert.equal(text(chip(html, "fat")), "10 g Fat");
  assert.equal(text(chip(html, "calcium")), "50 mg Calcium");
  assert.equal(text(chip(html, "sugar")), "0.4 g Sugar");
  assert.equal(text(chip(html, "fiber")), "0 g Fiber");
});

test("an amount that was never recorded reads 0, and big numbers get a thousands separator", () => {
  const html = render({ calories: 1840, calcium: 1250 });
  assert.equal(text(chip(html, "protein")), "0 g Protein");
  assert.equal(text(chip(html, "fiber")), "0 g Fiber");
  assert.match(text(chip(html, "calories")), /^1,840/);
  assert.match(text(chip(html, "calcium")), /^1,250 mg/);
});

test("the chips are one line of seven small tiles, each number in its nutrient's colour", () => {
  const html = render(eggs);
  assert.match(html, /data-testid="nutrient-chips"[^>]*grid-cols-7/);
  assert.equal((html.match(/data-testid="chip-/g) ?? []).length, 7);
  assert.match(chip(html, "protein"), /text-\[12px\]/);
  assert.match(chip(html, "protein"), /color:#34D399/);
  assert.match(chip(html, "calories"), /color:#F87171/);
});

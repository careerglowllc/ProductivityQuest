import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NutrientChips } from "./nutrient-chips";

const render = (totals: Parameters<typeof NutrientChips>[0]["totals"], variant?: "item" | "total") => renderToStaticMarkup(createElement(NutrientChips, { totals, variant }));
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

test("the small row is one line of seven, and the day's total is two rows of four with calories twice as wide", () => {
  const small = render(eggs, "item");
  assert.match(small, /data-testid="nutrient-chips-item"[^>]*grid-cols-7/);
  assert.doesNotMatch(small, /col-span-2/);
  const big = render(eggs, "total");
  assert.match(big, /data-testid="nutrient-chips-total"[^>]*grid-cols-4/);
  assert.equal((big.match(/col-span-2/g) ?? []).length, 1);
  assert.match(chip(big, "calories"), /col-span-2/);
  assert.match(chip(big, "protein"), /border-top:2px solid #34D399/, "each tile has a coloured top edge");
});

test("the total's numbers are larger than a food's", () => {
  assert.match(chip(render(eggs, "total"), "protein"), /text-\[15px\]/);
  assert.match(chip(render(eggs, "total"), "calories"), /text-xl/);
  assert.match(chip(render(eggs, "item"), "protein"), /text-\[12px\]/);
});

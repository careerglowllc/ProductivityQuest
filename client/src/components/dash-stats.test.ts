import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatCard } from "./dash-ui";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const dashboard = read("../pages/dashboard.tsx");
const dashUi = read("./dash-ui.tsx");
const css = read("../index.css");

test("the dashboard shows only Today's momentum and Financial independence", () => {
  assert.equal((dashboard.match(/<StatCard\b/g) ?? []).length, 2);
  assert.ok(dashboard.includes('label="Today\'s momentum"'));
  assert.ok(dashboard.includes('label="Financial independence"'));
  assert.ok(!dashboard.includes("Skill progress"));
  assert.ok(!dashboard.includes("skillProgressPct") && !dashboard.includes("avgSkillLevel"), "the removed tile leaves no dead code");
});

test("each tile is one thin row on phones as well as desktop, as tall as the collapsed questlines bar", () => {
  const card = dashUi.slice(dashUi.indexOf("export function StatCard"));
  assert.ok(!card.includes("min-h-[122px]"), "the tall phone card is gone");
  assert.ok(!card.includes("md:text-[20px]") && card.includes("text-[20px]"), "one figure size");
  for (const phone of ["min-h-[42px]", "py-1.5", "grid-cols-[minmax(0,1fr)_auto]", "col-start-1 row-start-1", "col-start-2 row-span-2", "col-start-1 row-start-2"]) {
    assert.ok(card.includes(phone), phone);
  }
  for (const desktop of ["md:flex", "md:min-h-0", "md:py-2.5", "md:w-28", "md:flex-1", "md:col-auto md:row-auto"]) {
    assert.ok(card.includes(desktop), desktop);
  }
  // 36px button + 2 x 2px padding + 2px border is the collapsed questlines bar: 42px
  assert.ok(dashboard.includes('px-[14px] py-0.5') && dashboard.includes('"min-h-[36px]"'), "the bar the tiles are matched to");
});

test("the tiles stack on phones with a small gap, and the meter becomes a hairline along the tile's bottom edge", () => {
  const block = css.slice(css.indexOf(".dash-stats {"), css.indexOf("/* Module grid"));
  assert.match(block, /@media \(max-width: 767px\)\s*\{\s*\.dash-stats \{ grid-template-columns: 1fr; gap: 8px; margin-bottom: 8px; \}/);
  assert.match(block, /\.dash-stat-card \.dash-meter \{ position: absolute; left: 0; right: 0; bottom: 0; height: 3px; border-radius: 0; \}/);
  assert.ok(!block.includes("grid-template-columns: 1fr 1fr;"), "no two-across layout on phones");
  assert.ok(card().includes("dash-stat-card relative"), "the tile carries the class the rule needs");
});

function card() { return dashUi.slice(dashUi.indexOf("export function StatCard")); }

test("the two tiles sit side by side on desktop and stack on mid widths", () => {
  const block = css.slice(css.indexOf(".dash-stats {"), css.indexOf("/* Module grid"));
  assert.ok(block.includes("grid-template-columns: 1.35fr 1fr;"));
  assert.ok(!block.includes("1.35fr 1fr 1fr"), "no third column is left behind");
  assert.ok(!block.includes(":first-child"), "no full-width first tile");
  assert.match(block, /@media \(min-width: 768px\) and \(max-width: 900px\)\s*\{\s*\.dash-stats \{ grid-template-columns: 1fr; \}/);
});

test("a tile shows its label, caption, figure and a progress bar, and says Calculating while loading", () => {
  const html = renderToStaticMarkup(createElement(StatCard, { label: "Today's momentum", value: "10", unit: "%", caption: "3 of 29 quests done today", pct: 10, tone: "mint", featured: true }));
  assert.match(html, /<section aria-label="Today&#x27;s momentum"/);
  assert.match(html, />10<\/span><span[^>]*>%</);
  assert.match(html, /3 of 29 quests done today/);
  assert.match(html, /role="progressbar" aria-valuenow="10"/);
  assert.match(html, /style="width:10%"/);
  const loading = renderToStaticMarkup(createElement(StatCard, { label: "Today's momentum", value: "—", pct: 0, tone: "mint", loading: true }));
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Calculating…/);
  assert.match(loading, /style="width:0%"/);
  const clamped = renderToStaticMarkup(createElement(StatCard, { label: "x", value: "1", pct: 250, tone: "amber" }));
  assert.match(clamped, /aria-valuenow="100"/);
});

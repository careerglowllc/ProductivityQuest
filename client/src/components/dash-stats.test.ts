import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

test("on desktop each tile is one thin row, while phones keep the tall card", () => {
  const card = dashUi.slice(dashUi.indexOf("export function StatCard"));
  assert.ok(card.includes("min-h-[122px]"), "phone card is unchanged");
  for (const desktop of ["md:min-h-0", "md:flex-row", "md:items-center", "md:py-2.5", "md:text-[20px]", "md:w-28", "md:flex-1"]) {
    assert.ok(card.includes(desktop), desktop);
  }
});

test("the two tiles sit side by side on desktop, stack on mid widths, and are two across on phones until very narrow", () => {
  const block = css.slice(css.indexOf(".dash-stats {"), css.indexOf("/* Module grid"));
  assert.ok(block.includes("grid-template-columns: 1.35fr 1fr;"));
  assert.ok(!block.includes("1.35fr 1fr 1fr"), "no third column is left behind");
  assert.ok(!block.includes(":first-child"), "no full-width first tile");
  assert.match(block, /@media \(min-width: 768px\) and \(max-width: 900px\)\s*\{\s*\.dash-stats \{ grid-template-columns: 1fr; \}/);
  assert.match(block, /@media \(max-width: 480px\)\s*\{\s*\.dash-stats \{ grid-template-columns: 1fr; \}/);
});

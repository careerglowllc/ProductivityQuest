import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const { ITEM } = createRequire(import.meta.url)("../add-dashpass-premium.cjs") as {
  ITEM: { item: string; category: string; tags: string[]; monthlyCost: number; recurType: string; notes: string };
};
const page = readFileSync(new URL("../client/src/pages/finances.tsx", import.meta.url), "utf8");
const listOf = (name: string) => Array.from(page.slice(page.indexOf(`const ${name} = [`), page.indexOf("];", page.indexOf(`const ${name} = [`))).matchAll(/"([^"]+)"/g), (m) => m[1]);

test("DashPass Premium costs $0 a month and says it comes with the Chase Sapphire Preferred", () => {
  assert.equal(ITEM.monthlyCost, 0);
  assert.equal(ITEM.recurType, "Monthly");
  assert.match(ITEM.item, /DashPass Premium/);
  assert.match(ITEM.notes, /Chase Sapphire Preferred/);
});

test("it uses a category and recurrence the Finances page knows", () => {
  assert.ok(listOf("CATEGORIES").includes(ITEM.category));
  assert.ok(listOf("RECUR_TYPES").includes(ITEM.recurType));
});

test("the script does not insert it twice", () => {
  const script = readFileSync(new URL("../add-dashpass-premium.cjs", import.meta.url), "utf8");
  assert.ok(script.includes("WHERE user_id = ${userId} AND item = ${ITEM.item}"));
  assert.ok(script.includes("Already exists"));
});

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const { ITEM } = createRequire(import.meta.url)("../add-giving-what-we-can.cjs") as {
  ITEM: { item: string; category: string; tags: string[]; monthlyCost: number; recurType: string; notes: string };
};
const page = readFileSync(new URL("../client/src/pages/finances.tsx", import.meta.url), "utf8");
const listOf = (name: string) => Array.from(page.slice(page.indexOf(`const ${name} = [`), page.indexOf("];", page.indexOf(`const ${name} = [`))).matchAll(/"([^"]+)"/g), (m) => m[1]);

test("the Giving What We Can donation is $5.50 a month, stored in cents", () => {
  assert.equal(ITEM.monthlyCost, 550);
  assert.equal(ITEM.recurType, "Monthly");
  assert.match(ITEM.item, /Giving What We Can/);
});

test("it is a Charity expense on the Barclays card, using a category and recurrence the Finances page knows", () => {
  assert.ok(listOf("CATEGORIES").includes(ITEM.category));
  assert.equal(ITEM.category, "Charity");
  assert.ok(listOf("RECUR_TYPES").includes(ITEM.recurType));
  assert.match(ITEM.notes, /Barclays/);
  assert.deepEqual(ITEM.tags, [], "no tag that would make it income or an investment");
});

test("the script does not insert it twice", () => {
  const script = readFileSync(new URL("../add-giving-what-we-can.cjs", import.meta.url), "utf8");
  assert.ok(script.includes("WHERE user_id = ${userId} AND item = ${ITEM.item}"));
  assert.ok(script.includes("Already exists"));
});

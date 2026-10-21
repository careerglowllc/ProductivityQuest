import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const { ITEM, MONTHLY_CENTS } = createRequire(import.meta.url)("../update-austin-housing-cost.cjs") as { ITEM: string; MONTHLY_CENTS: number };
const page = readFileSync(new URL("../client/src/pages/finances.tsx", import.meta.url), "utf8");

test("the Tentative Austin Housing Cost is $2,100 a month, stored in cents", () => {
  assert.equal(ITEM, "Tentative Austin Housing Cost");
  assert.equal(MONTHLY_CENTS, 210000);
});

test("the page's starting value for that line matches, so a deleted line comes back at $2,100 and not the old amount", () => {
  const seed = page.slice(page.indexOf(`item: "${ITEM}"`), page.indexOf("notes:", page.indexOf(`item: "${ITEM}"`)));
  assert.ok(seed.includes(`monthlyCost: ${MONTHLY_CENTS}`));
  assert.ok(!page.includes("monthlyCost: 140000"));
});

test("the script only changes that one line and does not run twice over", () => {
  const script = readFileSync(new URL("../update-austin-housing-cost.cjs", import.meta.url), "utf8");
  assert.ok(script.includes("WHERE user_id = ${userId} AND item = ${ITEM} AND monthly_cost <> ${MONTHLY_CENTS}"));
  assert.ok(script.includes("Already"));
});

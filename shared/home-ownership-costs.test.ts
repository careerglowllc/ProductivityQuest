import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HOME_ONE_TIME_COSTS, paidOneTimeCosts, pendingHomeCosts, totalOneTimeCosts } from "./home-ownership-costs";

const amountOf = (label: RegExp) => {
  const rows = HOME_ONE_TIME_COSTS.filter((c) => label.test(c.label));
  assert.equal(rows.length, 1, `exactly one row matches ${label}`);
  return rows[0].amount;
};

test("the repair and renovation rows carry the invoice summary's totals, processing fees included", () => {
  assert.equal(amountOf(/^Flooring replacement/), 17610.56);
  assert.equal(amountOf(/^Mold remediation/), 6500);
  assert.equal(amountOf(/^Kitchen demolition/), 3000);
  assert.equal(amountOf(/^Plumbing shutoff valve/), 335);
  assert.equal(amountOf(/cabinets/i), 19525, "$19,500 plus the $25 fee");
  assert.equal(amountOf(/leak detection/i), 675.94, "$650 plus the $25.94 fee");
  assert.equal(amountOf(/^Landscaping/), 625, "$600 plus the $25 fee");
  assert.equal(amountOf(/^Garage door/), 160);
  assert.equal(amountOf(/range hood/i), 1300);
  assert.equal(amountOf(/^Drainage investigation/), 1250);
  assert.equal(amountOf(/^French drain/), 5900);
});

test("the invoice summary's grand total is exactly what the repair rows add up to", () => {
  const repairs = HOME_ONE_TIME_COSTS.filter((c) => c.pending && !/shed|roof/i.test(c.label));
  assert.equal(repairs.length, 11);
  assert.equal(totalOneTimeCosts(repairs), 56881.5);
});

test("what was already listed and is not on the invoice summary stays", () => {
  assert.equal(amountOf(/^Down payment/), 30000);
  assert.equal(amountOf(/^New shed/), 6158.28);
  assert.equal(amountOf(/^Small roof fix/), 500);
  assert.equal(amountOf(/^Solar inspection/), 299);
  assert.equal(amountOf(/^Solar panel cleaning/), 309);
});

test("the rows it replaced are gone: the old floors and cabinets estimates, the combined molding row, and Oak and Stone invoice #1033", () => {
  const labels = HOME_ONE_TIME_COSTS.map((c) => c.label.toLowerCase());
  assert.equal(labels.some((l) => l === "floors" || l === "cabinets"), false);
  assert.equal(labels.some((l) => l.includes("floor molding")), false);
  assert.equal(labels.some((l) => l.includes("oak and stone") || l.includes("1033")), false);
  assert.equal(labels.some((l) => l.includes("fume hood")), false, "the range hood is listed once");
  assert.equal(new Set(labels).size, labels.length, "no line is listed twice");
  assert.equal(HOME_ONE_TIME_COSTS.some((c) => c.tentative), false, "the invoice totals are final prices");
});

test("the mold, kitchen demo and shutoff valve lines add up to the old molding, demo and plumber visit row", () => {
  assert.equal(totalOneTimeCosts(HOME_ONE_TIME_COSTS.filter((c) => /^(Mold|Kitchen demolition|Plumbing shutoff)/.test(c.label))), 9835);
});

test("the totals, with cents kept exact", () => {
  assert.equal(totalOneTimeCosts(), 94147.78);
  assert.equal(paidOneTimeCosts(), 94147.78, "nothing is tentative, so all of it is spent");
  assert.equal(pendingHomeCosts(), 63539.78, "everything but the down payment and the two solar visits comes off the sale");
  assert.equal(paidOneTimeCosts([{ label: "a", amount: 10 }, { label: "b", amount: 5.25, tentative: true }]), 10, "a tentative row is not spent yet");
  assert.equal(totalOneTimeCosts([{ label: "a", amount: 0.1 }, { label: "b", amount: 0.2 }]), 0.3, "no floating-point drift");
});

test("the Finances page uses this one list for the lifetime card and for what comes off the sale", () => {
  const page = readFileSync(new URL("../client/src/pages/finances.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("const homePendingCosts = pendingHomeCosts();"));
  assert.ok(page.includes("const oneTimeCosts = HOME_ONE_TIME_COSTS;"));
  assert.ok(page.includes("paidOneTimeCosts(oneTimeCosts)"));
  assert.equal(page.includes("homeFloorsCost"), false, "no second copy of the prices");
  assert.equal(page.includes("invoice #1033"), false);
});

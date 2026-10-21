import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  activeOn, currentItems, isActiveOn, isIsoDay, isMemo, isPropertyExpense, isRentalIncome, nextChangeDay, propertyBudget, type BudgetItem,
} from "./finance-schedule";

const { ROWS, ENDING, EFFECTIVE, LAST_OLD_DAY } = createRequire(import.meta.url)("../add-rocklin-budget-nov-2026.cjs") as {
  ROWS: { item: string; category: string; tags: string[]; monthlyCost: number; notes: string | null }[];
  ENDING: string[]; EFFECTIVE: string; LAST_OLD_DAY: string;
};

const P = "Investment Property Housing";
let nextId = 1;
const row = (item: string, monthlyCost: number, extra: Partial<BudgetItem> = {}): BudgetItem => ({ id: nextId++, item, category: P, tags: [], monthlyCost, ...extra });

// What is in the database today for the Rocklin house (in cents), then what the script adds.
const OLD_COSTS: Record<string, number> = {
  [ENDING[0]]: 18000, [ENDING[1]]: 11500, [ENDING[2]]: 11526, [ENDING[3]]: 3400, [ENDING[4]]: 4000,
};
const unchanged = [row("Mortgage/PMI/Property Tax Payment", 446714), row("Brilliant Pest Solutions", 5900, { tags: ["Housing", "Rental"] })];
const ended = ENDING.map((name) => row(name, OLD_COSTS[name], { effectiveUntil: LAST_OLD_DAY }));
const added = ROWS.map((r) => ({ id: nextId++, ...r, effectiveFrom: EFFECTIVE } as BudgetItem));
const all = [...unchanged, ...ended, ...added];

// ── Dates ───────────────────────────────────────────────────────────────────
test("a row counts from its first day to its last day, both included, and a row with no dates always counts", () => {
  const item = { effectiveFrom: "2026-11-01", effectiveUntil: "2026-12-31" };
  assert.deepEqual(["2026-10-31", "2026-11-01", "2026-12-31", "2027-01-01"].map((d) => isActiveOn(item, d)), [false, true, true, false]);
  assert.equal(isActiveOn({}, "2000-01-01"), true);
  assert.equal(isActiveOn({ effectiveFrom: null, effectiveUntil: null }, "2099-01-01"), true);
  assert.equal(isActiveOn({ effectiveUntil: "2026-10-31" }, "2026-10-31"), true);
  assert.equal(isActiveOn({ effectiveUntil: "2026-10-31" }, "2026-11-01"), false);
});

test("only real calendar days are accepted as an effective date", () => {
  assert.equal(isIsoDay("2026-11-01"), true);
  for (const bad of ["2026-02-30", "2026-13-01", "11/01/2026", "2026-1-1", "", null, undefined, 20261101]) assert.equal(isIsoDay(bad), false, String(bad));
});

test("the next change is the first day after today that a row starts, or the day after one ends", () => {
  assert.equal(nextChangeDay(all, "2026-10-20"), "2026-11-01");
  assert.equal(nextChangeDay(all, "2026-11-01"), null, "nothing left to come");
  assert.equal(nextChangeDay([{ effectiveUntil: "2026-12-31" }], "2026-10-01"), "2027-01-01", "the day after the last day");
  assert.equal(nextChangeDay([{ effectiveFrom: "2027-03-01" }, { effectiveFrom: "2026-12-01" }], "2026-10-01"), "2026-12-01");
  assert.equal(nextChangeDay([{}], "2026-10-01"), null);
});

// ── The script's rows ───────────────────────────────────────────────────────
test("the tenant-paid lines are kept at $0 with exactly the subtitle that explains them", () => {
  const expected: Record<string, string> = {
    "PG&E Electricity": "Previously $180/mo; now tenant-paid.",
    "PG&E Gas": "Previously $115/mo; now tenant-paid.",
    "PCWA Water": "Previously $115.26/mo; now tenant-paid.",
    "Recology Garbage": "Previously $34/mo; now tenant-paid.",
    "Sewer": "Previously $40/mo; tenant now reimburses $43/mo.",
    "Landscaping": "Normally $100/mo; now fully covered by tenant.",
  };
  for (const [name, note] of Object.entries(expected)) {
    const found = ROWS.find((r) => r.item === name);
    assert.ok(found, `${name} is added`);
    assert.equal(found.monthlyCost, 0, `${name} is $0`);
    assert.equal(found.notes, note);
    assert.equal(found.category, P);
  }
});

test("the owner-paid lines show their real amounts with no subtitle", () => {
  assert.equal(ROWS.find((r) => r.item === "RNB Property Management")?.monthlyCost, 16500);
  assert.equal(ROWS.find((r) => r.item === "RNB Property Management")?.notes, null);
  assert.equal(unchanged.find((r) => r.item.startsWith("Mortgage"))?.monthlyCost, 446714);
  assert.equal(unchanged.find((r) => r.item === "Brilliant Pest Solutions")?.monthlyCost, 5900);
});

test("rental income is the base rent and the sewer reimbursement only, never the landscaping, resident benefits or deposit", () => {
  const income = ROWS.filter((r) => r.tags.includes("Rental Income"));
  assert.deepEqual(income.map((r) => [r.item, r.monthlyCost, r.category]), [["Rocklin Base Rent", 244900, "Income"], ["Rocklin Sewer Reimbursement", 4300, "Income"]]);
  assert.equal(ROWS.some((r) => /deposit|benefit|landscaping reimb/i.test(r.item)), false);
});

test("every old line is ended the day before, and the new ones all begin on November 1", () => {
  assert.deepEqual([EFFECTIVE, LAST_OLD_DAY], ["2026-11-01", "2026-10-31"]);
  assert.equal(ENDING.length, 5);
  assert.ok(isIsoDay(EFFECTIVE) && isIsoDay(LAST_OLD_DAY));
});

// ── The budget ──────────────────────────────────────────────────────────────
test("from November 1 the dashboard's monthly and annual totals are the ones asked for", () => {
  const b = propertyBudget(all, "2026-11-01");
  assert.deepEqual([b.incomeMonthly, b.expensesMonthly, b.netMonthly], [249200, 469114, -219914]); // +$2,492.00, -$4,691.14, -$2,199.14
  assert.deepEqual([b.incomeAnnual, b.expensesAnnual, b.netAnnual], [2990400, 5629368, -2638968]); // +$29,904.00, -$56,293.68, -$26,389.68
});

test("every property line stays listed from November 1, the tenant-paid ones at $0", () => {
  const b = propertyBudget(all, "2026-11-01");
  assert.deepEqual(b.expenses.map((e) => [e.item, e.monthlyCost]), [
    ["Mortgage/PMI/Property Tax Payment", 446714], ["RNB Property Management", 16500], ["Brilliant Pest Solutions", 5900],
    ["PG&E Electricity", 0], ["PG&E Gas", 0], ["PCWA Water", 0], ["Recology Garbage", 0], ["Sewer", 0], ["Landscaping", 0],
  ].sort((a, b) => (b[1] as number) - (a[1] as number)));
  assert.deepEqual(b.income.map((i) => i.item), ["Rocklin Base Rent", "Rocklin Sewer Reimbursement"]);
});

test("the real $40 sewer bill is kept for reporting: it is not in the totals, and true cash flow is $40 a month lower", () => {
  const b = propertyBudget(all, "2026-11-01");
  assert.deepEqual(b.unlisted.map((i) => [i.item, i.monthlyCost]), [["Sewer (actual bill, paid by owner)", 4000]]);
  assert.equal(b.unlistedMonthly, 4000);
  assert.deepEqual([b.trueNetMonthly, b.trueNetAnnual], [-223914, -2686968]); // -$2,239.14 and -$26,869.68
  assert.equal(b.expensesMonthly, 469114, "the sewer bill is not in the property expenses");
  assert.equal(isMemo(added.find((i) => i.item.startsWith("Sewer (actual"))!), true);
});

test("before November 1 nothing has changed: the old lines at their old amounts and no rental income", () => {
  for (const day of ["2026-10-20", "2026-10-31"]) {
    const b = propertyBudget(all, day);
    assert.equal(b.expensesMonthly, 446714 + 5900 + 18000 + 11500 + 11526 + 3400 + 4000, day);
    assert.equal(b.incomeMonthly, 0, day);
    assert.equal(b.unlisted.length, 0, day);
    assert.ok(b.expenses.some((e) => e.item === ENDING[0] && e.monthlyCost === 18000), "the old electric line is still there");
  }
});

test("earlier months are preserved: the old rows are ended, not changed or removed", () => {
  const [electric] = ended;
  assert.equal(electric.monthlyCost, 18000);
  assert.equal(activeOn(all, "2026-09-15").filter((i) => i.item === ENDING[0]).length, 1);
  assert.equal(activeOn(all, "2026-11-01").filter((i) => i.item === ENDING[0]).length, 0);
  assert.equal(all.filter((i) => ENDING.includes(i.item)).length, 5, "all five old rows still exist");
});

test("the dashboard and charts use the rows in force that day, never both the old and the new line, and never the reporting-only row", () => {
  const nov = currentItems(all, "2026-11-01");
  assert.equal(nov.some((i) => ENDING.includes(i.item)), false);
  assert.equal(nov.some((i) => i.item.startsWith("Sewer (actual")), false);
  assert.equal(nov.some((i) => i.item === "PG&E Electricity"), true);
  const oct = currentItems(all, "2026-10-20");
  assert.equal(oct.some((i) => i.item === "PG&E Electricity"), false, "not before the effective date");
  assert.equal(oct.some((i) => ENDING.includes(i.item)), true);
  assert.equal(oct.some((i) => i.item === "Rocklin Base Rent"), false);
});

test("rental income and property expenses are told apart by their tag and category, and an unrelated line is neither", () => {
  assert.equal(isRentalIncome({ tags: ["Rental Income"] }), true);
  assert.equal(isPropertyExpense({ category: P, tags: ["Rental Income"] }), false);
  assert.equal(isPropertyExpense({ category: P, tags: ["Memo"] }), false);
  assert.equal(isPropertyExpense({ category: "Food", tags: [] }), false);
  assert.equal(isPropertyExpense({ category: "Food", tags: [P] }), true);
});

test("the input lists are never changed", () => {
  const copy = JSON.stringify(all);
  propertyBudget(all, "2026-11-01"); currentItems(all, "2026-11-01"); nextChangeDay(all, "2026-10-20");
  assert.equal(JSON.stringify(all), copy);
});

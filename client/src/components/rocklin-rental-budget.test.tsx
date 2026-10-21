import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RocklinRentalBudget } from "./rocklin-rental-budget";
import type { BudgetItem } from "@shared/finance-schedule";

const { ROWS, ENDING, EFFECTIVE_LABEL, LIVE_FROM, LAST_OLD_DAY } = createRequire(import.meta.url)("../../../add-rocklin-budget-nov-2026.cjs") as {
  ROWS: { item: string; category: string; tags: string[]; monthlyCost: number; notes: string | null }[];
  ENDING: string[]; EFFECTIVE_LABEL: string; LIVE_FROM: string; LAST_OLD_DAY: string;
};

const P = "Investment Property Housing";
let id = 1;
const OLD = [18000, 11500, 11526, 3400, 4000];
const items: BudgetItem[] = [
  { id: id++, item: "Mortgage/PMI/Property Tax Payment", category: P, tags: [], monthlyCost: 446714 },
  { id: id++, item: "Brilliant Pest Solutions", category: P, tags: ["Housing", "Rental"], monthlyCost: 5900 },
  ...ENDING.map((item, i) => ({ id: id++, item, category: P, tags: [], monthlyCost: OLD[i], effectiveUntil: LAST_OLD_DAY })),
  ...ROWS.map((r) => ({ id: id++, ...r, effectiveFrom: LIVE_FROM })),
];
const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const render = (today: string, list: BudgetItem[] = items) => renderToStaticMarkup(createElement(RocklinRentalBudget, { items: list, today, formatCurrency: money }));
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const cell = (html: string, testId: string) => text(html.match(new RegExp(`data-testid="${testId}"[^>]*>(.*?)</td>`))?.[1] ?? "");

test("from November 1 the card shows the expected monthly and annual income, expenses and net cash flow", () => {
  const html = render("2026-11-01");
  assert.doesNotMatch(html, /rocklin-budget-next/, "nothing is scheduled after it");
  assert.deepEqual(["income", "expenses", "net"].map((k) => [cell(html, `budget-${k}-monthly`), cell(html, `budget-${k}-annual`)]), [
    ["+$2,492.00", "+$29,904.00"], ["-$4,691.14", "-$56,293.68"], ["-$2,199.14", "-$26,389.68"],
  ]);
});

test("each tenant-covered line shows $0.00 with its small grey subtitle directly under the name", () => {
  const html = render("2026-11-01");
  const lines = html.match(/<li data-testid="budget-expense-line".*?<\/li>/g) ?? [];
  const sewer = lines.find((l) => /Sewer<\/span>|Sewer\s*<span/.test(l) || text(l).startsWith("Sewer Previously"))!;
  assert.match(text(sewer), /^Sewer Effective Nov 1, 2026 Previously \$40\/mo; tenant now reimburses \$43\/mo\. \$0\.00\/mo$/);
  assert.match(sewer, /<span data-testid="budget-subtitle" class="block text-\[10px\] text-slate-400">/, "small and grey, on its own line under the name");
  assert.ok(sewer.indexOf("Sewer") < sewer.indexOf("budget-subtitle"), "after the name");
  const landscaping = lines.find((l) => text(l).startsWith("Landscaping"))!;
  assert.match(text(landscaping), /Normally \$100\/mo; now fully covered by tenant\. \$0\.00\/mo$/);
  assert.equal((html.match(/data-testid="budget-subtitle"/g) ?? []).length, 6, "six lines carry a subtitle");
});

test("the owner-paid lines show their real amounts and no subtitle", () => {
  const lines = (render("2026-11-01").match(/<li data-testid="budget-expense-line".*?<\/li>/g) ?? []).map(text);
  assert.ok(lines.includes("Mortgage/PMI/Property Tax Payment -$4,467.14/mo"));
  assert.ok(lines.includes("Brilliant Pest Solutions -$59.00/mo"));
  assert.ok(lines.includes("RNB Property Management Effective Nov 1, 2026 -$165.00/mo"));
});

test("rental income is listed on its own, apart from the expenses", () => {
  const html = render("2026-11-01");
  const income = (html.match(/<li data-testid="budget-income-line".*?<\/li>/g) ?? []).map(text);
  assert.deepEqual(income, ["Rocklin Base Rent Effective Nov 1, 2026 +$2,449.00/mo", "Rocklin Sewer Reimbursement Effective Nov 1, 2026 +$43.00/mo"]);
  assert.equal((html.match(/data-testid="budget-expense-line"/g) ?? []).length, 9);
});

test("the sewer bill still paid by the owner is noted, with true cash flow $40 lower", () => {
  const note = text(render("2026-11-01").match(/data-testid="budget-true-cash-flow".*?<\/p>/)![0]);
  assert.match(note, /Sewer \$40\.00\/mo/);
  assert.match(note, /True cash flow is -\$2,239\.14\/mo \(-\$26,869\.68\/yr\)/);
});

test("each new line carries its Effective Nov 1, 2026 tag as a small label by its name, and the older lines do not", () => {
  const html = render("2026-10-20");
  const lines = [...(html.match(/<li data-testid="budget-expense-line".*?<\/li>/g) ?? []), ...(html.match(/<li data-testid="budget-income-line".*?<\/li>/g) ?? [])];
  const tagged = lines.filter((l) => l.includes('data-testid="effective-badge"'));
  assert.equal(tagged.length, 9, "the seven added expense lines and the two rental income lines");
  assert.ok(tagged.every((l) => text(l).includes(EFFECTIVE_LABEL)));
  assert.match(tagged.find((l) => text(l).startsWith("Sewer "))!, /Sewer<span data-testid="effective-badge"[^>]*>Effective Nov 1, 2026<\/span>/, "right beside the name, before its subtitle");
  const untagged = lines.filter((l) => !l.includes('data-testid="effective-badge"')).map((l) => text(l));
  assert.deepEqual(untagged.sort(), ["Brilliant Pest Solutions -$59.00/mo", "Mortgage/PMI/Property Tax Payment -$4,467.14/mo"]);
});

test("before the old lines ended the card shows the old numbers and previews the day the new ones begin", () => {
  const html = render(LAST_OLD_DAY);
  const now = html.slice(html.indexOf('data-testid="rocklin-budget-now"'), html.indexOf('data-testid="rocklin-budget-next"'));
  const next = html.slice(html.indexOf('data-testid="rocklin-budget-next"'));
  assert.match(now, /As of Oct 19, 2026/);
  assert.equal(cell(now, "budget-expenses-monthly"), "-$5,010.40");
  assert.equal(cell(now, "budget-income-monthly"), "$0.00");
  assert.match(now, /None yet\./);
  assert.match(next, /Starting Oct 20, 2026/);
  assert.equal(cell(next, "budget-net-monthly"), "-$2,199.14");
  assert.equal(cell(next, "budget-income-annual"), "+$29,904.00");
});

test("a house with nothing scheduled and no rent shows plain zeros, not an error", () => {
  const html = render("2026-11-01", [items[0]]);
  assert.equal(cell(html, "budget-net-monthly"), "-$4,467.14");
  assert.doesNotMatch(html, /budget-true-cash-flow|rocklin-budget-next/);
  assert.doesNotThrow(() => render("2026-11-01", []));
});

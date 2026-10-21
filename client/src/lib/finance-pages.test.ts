import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const finances = read("pages/finances.tsx");
const dashboard = read("pages/dashboard.tsx");

test("the Finances page works from the rows in force today, and keeps every row for the export and the Rocklin card", () => {
  assert.ok(finances.includes("currentItems(allFinancialItems, financeDay)"));
  assert.ok(finances.includes("<RocklinRentalBudget items={allFinancialItems} today={financeDay}"));
});

test("the Dashboard uses only the rows in force today, in both places it reads the finance items", () => {
  assert.equal((dashboard.match(/useCurrentFinancialItems\(\)/g) ?? []).length, 2);
  assert.ok(!dashboard.includes('queryKey: ["/api/finances"]'), "no unfiltered read is left");
});

test("the CSV export lists every row, scheduled ones too, with the dates they apply", () => {
  const exportFn = finances.slice(finances.indexOf("export async function buildFinancesCSVExport"), finances.indexOf("// Parents pledged"));
  assert.ok(exportFn.includes('"Effective From", "Effective Until"'));
  assert.ok(exportFn.includes("i.effectiveFrom ?? \"\"") && exportFn.includes("i.effectiveUntil ?? \"\""));
  assert.ok(!exportFn.includes("currentItems"), "history is exported, not just what is in force");
});

test("the $0 tenant-paid lines stay in the expense chart's legend with their subtitle, though a $0 line has no slice", () => {
  assert.ok(finances.includes("const pieSlices = granularData.filter(d => d.value > 0);"));
  assert.ok(finances.includes('(d.value > 0 || type === "investmentExpense")'));
  assert.ok(finances.includes("{item.notes && <span className=\"block text-[10px] text-slate-400\">{item.notes}</span>}"));
  assert.ok(finances.includes("{i.notes && <span className=\"block text-[10px] text-slate-400\">{i.notes}</span>}"), "and in the Investment Expenses list");
});

test("the server accepts a note and effective dates when a finance item is added, and refuses bad dates", () => {
  const routes = read("../../server/routes.ts");
  const post = routes.slice(routes.indexOf('app.post("/api/finances"'), routes.indexOf('app.delete("/api/finances/:id"'));
  assert.ok(post.includes("notes, effectiveFrom, effectiveUntil } = req.body"));
  assert.ok(post.includes("!isIsoDay(effectiveFrom)") && post.includes("!isIsoDay(effectiveUntil)"));
  assert.ok(post.includes("effectiveFrom: effectiveFrom ?? null"));
});

test("the new columns have a startup migration, so the live table is never behind the schema", () => {
  const migrations = read("../../server/migrations.ts");
  assert.ok(migrations.includes("ADD COLUMN IF NOT EXISTS effective_from TEXT") && migrations.includes("ADD COLUMN IF NOT EXISTS effective_until TEXT"));
  const schema = read("../../shared/schema.ts");
  assert.ok(schema.includes('effectiveFrom: text("effective_from")') && schema.includes('effectiveUntil: text("effective_until")'));
});

test("the expense list says when changes are scheduled, so a future-dated update is not mistaken for a missing one", () => {
  assert.ok(finances.includes("upcomingChange(allFinancialItems, financeDay)"));
  assert.ok(finances.includes('data-testid="scheduled-changes"') && finances.includes("Scheduled for {when}: {parts}."));
  const list = finances.slice(finances.indexOf(">All Expense Items<"), finances.indexOf("Search expenses"));
  assert.ok(list.includes('data-testid="scheduled-changes"'), "it sits in the All Expense Items header");
});

test("a line's Effective tag shows beside its name in the expense list and the items table", () => {
  assert.equal((finances.match(/\{item\.item\}<EffectiveBadge item=\{item\} \/>/g) ?? []).length, 2);
  assert.ok(finances.includes('import { EffectiveBadge } from "@/components/effective-badge";'));
  const card = read("components/rocklin-rental-budget.tsx");
  assert.equal((card.match(/\{i\.item\}<EffectiveBadge item=\{i\} \/>/g) ?? []).length, 2, "and in both lists of the Rocklin card");
});

test("the Cash Flow tab counts rental income with the W2 salary, in its cards, pie, percentages and exports", () => {
  const tab = finances.slice(finances.indexOf('<TabsContent value="cashflow"'), finances.indexOf('<TabsContent value="networth"'));
  assert.ok(finances.includes("cashflowIncomeOf(financialItems, W2_ITEM_NAME)"));
  assert.ok(finances.includes("const cashflowNetRaw = cashflowIncome - totalExpenses;"));
  assert.ok(finances.includes('Cash Flow (W2 + Rental)') && !finances.includes("Cash Flow (W2 Only)"));
  assert.ok(tab.includes('data-testid="cashflow-rental"') && tab.includes("W2 + Rental Cash Flow"));
  assert.ok(tab.includes("(item.monthlyCost / cashflowIncome) * 100") && tab.includes("% of income"), "the bars are shares of all this income");
  assert.ok(finances.includes('{ name: "Rental Income", value: rentalIncome'), "its own slice in the pie");
  assert.ok(finances.includes('["Rental Income", $(rentalIncome), $(rentalIncome * 12)'), "and its own row in the export");
  assert.ok(!finances.includes("nonW2Income"), "the leftover is only the income that is neither salary nor rent");
});

test("the FIRE savings and the Dashboard's copy of the net use the same cash flow income, so rent counts there too", () => {
  assert.ok(finances.includes("Math.max(0, cashflowNetRaw) * 12"));
  assert.ok(read("pages/dashboard.tsx").includes('cashflowIncomeOf(financialItems, "Post-Tax W2 Salary Income").income - totalExpenses'));
});

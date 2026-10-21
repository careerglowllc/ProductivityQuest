import { Card, CardContent } from "@/components/ui/card";
import { EffectiveBadge } from "@/components/effective-badge";
import { isMemo, isPropertyExpense, isRentalIncome, nextChangeDay, propertyBudget, PROPERTY_CATEGORY, type BudgetItem, type PropertyBudget } from "@shared/finance-schedule";

const dayLabel = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

type Money = (cents: number) => string;
// Income reads with a plus and money going out with a minus; nothing at all reads as plain $0.00.
const signed = (money: Money, cents: number, sign: "+" | "-") => (cents === 0 ? money(0) : `${sign}${money(Math.abs(cents))}`);
const net = (money: Money, cents: number) => (cents === 0 ? money(0) : `${cents > 0 ? "+" : "-"}${money(Math.abs(cents))}`);

function Period({ budget, title, tone, money, testId }: { budget: PropertyBudget; title: string; tone: "now" | "next"; money: Money; testId: string }) {
  const rows: { key: string; label: string; monthly: string; annual: string; color: string }[] = [
    { key: "income", label: "Rental income", monthly: signed(money, budget.incomeMonthly, "+"), annual: signed(money, budget.incomeAnnual, "+"), color: "text-green-300" },
    { key: "expenses", label: "Property expenses", monthly: signed(money, budget.expensesMonthly, "-"), annual: signed(money, budget.expensesAnnual, "-"), color: "text-red-300" },
    { key: "net", label: "Net cash flow", monthly: net(money, budget.netMonthly), annual: net(money, budget.netAnnual), color: budget.netMonthly >= 0 ? "text-emerald-300" : "text-red-300" },
  ];
  return (
    <div data-testid={testId} className={`rounded-lg border p-3 ${tone === "next" ? "border-pink-500/40 bg-pink-500/5" : "border-slate-700/60 bg-slate-900/30"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-pink-400">{title}</p>
      <table className="mt-2 w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-slate-500">
            <th className="text-left font-medium" />
            <th className="text-right font-medium">Monthly</th>
            <th className="text-right font-medium">Annual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} data-testid={`budget-row-${r.key}`} className={`border-t border-slate-700/40 ${r.key === "net" ? "font-bold" : ""}`}>
              <td className="py-1 pr-2 text-slate-300">{r.label}</td>
              <td data-testid={`budget-${r.key}-monthly`} className={`py-1 text-right tabular-nums ${r.color}`}>{r.monthly}</td>
              <td data-testid={`budget-${r.key}-annual`} className={`py-1 text-right tabular-nums ${r.color}`}>{r.annual}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Rental income</p>
      {budget.income.length === 0 && <p className="mt-1 text-[11px] text-slate-500">None yet.</p>}
      <ul className="mt-1 space-y-1">
        {budget.income.map((i) => (
          <li key={i.id} data-testid="budget-income-line" className="flex items-start justify-between gap-3 text-xs">
            <span className="min-w-0 text-slate-200">
              {i.item}<EffectiveBadge item={i} />
              {i.notes && <span className="block text-[10px] text-slate-400">{i.notes}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-green-300">{signed(money, i.monthlyCost, "+")}/mo</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Property expenses</p>
      <ul className="mt-1 space-y-1">
        {budget.expenses.map((i) => (
          <li key={i.id} data-testid="budget-expense-line" className="flex items-start justify-between gap-3 text-xs">
            <span className="min-w-0 text-slate-200">
              {i.item}<EffectiveBadge item={i} />
              {i.notes && <span data-testid="budget-subtitle" className="block text-[10px] text-slate-400">{i.notes}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-red-300">{signed(money, i.monthlyCost, "-")}/mo</span>
          </li>
        ))}
      </ul>

      {budget.unlistedMonthly > 0 && (
        <p data-testid="budget-true-cash-flow" className="mt-3 border-t border-slate-700/40 pt-2 text-[10px] leading-4 text-slate-400">
          Still paid by you and left out above: {budget.unlisted.map((i) => `${i.item.replace(/\s*\(.*\)$/, "")} ${money(i.monthlyCost)}/mo`).join(", ")}.
          True cash flow is {net(money, budget.trueNetMonthly)}/mo ({net(money, budget.trueNetAnnual)}/yr).
        </p>
      )}
    </div>
  );
}

// The rental house's income and its running costs side by side, with what is coming. Takes every row, scheduled ones
// included, and works out each day itself.
export function RocklinRentalBudget({ items, today, formatCurrency }: { items: readonly BudgetItem[]; today: string; formatCurrency: Money }) {
  const property = items.filter((i) => isRentalIncome(i) || isPropertyExpense(i) || (isMemo(i) && i.category === PROPERTY_CATEGORY));
  const now = propertyBudget(property, today);
  const nextDay = nextChangeDay(property, today);
  const next = nextDay ? propertyBudget(property, nextDay) : null;
  return (
    <Card data-testid="rocklin-budget" className="bg-slate-800/60 border-pink-500/30">
      <CardContent className="pb-4 pt-3 px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-white">🏠 Rocklin Rental Budget</p>
          <p className="text-[10px] text-slate-500">Rental income is tracked apart from property expenses</p>
        </div>
        <div className={`mt-3 grid gap-3 ${next ? "md:grid-cols-2" : ""}`}>
          <Period budget={now} title={`As of ${dayLabel(today)}`} tone="now" money={formatCurrency} testId="rocklin-budget-now" />
          {next && nextDay && <Period budget={next} title={`Starting ${dayLabel(nextDay)}`} tone="next" money={formatCurrency} testId="rocklin-budget-next" />}
        </div>
      </CardContent>
    </Card>
  );
}

// Finance items that start or stop on a date. A change to what a bill costs is a new row that begins that day, and
// the row it replaces is ended the day before, so the numbers for any earlier month stay exactly as they were.
// These are the pure rules for which rows count on a day and for the Rocklin rental's budget, shared by the
// Finances page, the Dashboard and the tests.

export interface Scheduled { effectiveFrom?: string | null; effectiveUntil?: string | null }
export interface BudgetItem extends Scheduled {
  id: number; item: string; category: string; tags?: string[] | null; monthlyCost: number; notes?: string | null;
}

export const PROPERTY_CATEGORY = "Investment Property Housing";
export const RENTAL_INCOME_TAG = "Rental Income";
// A row that is kept for reporting only: it is in the data and the CSV export but never added into a total.
export const MEMO_TAG = "Memo";

export const isIsoDay = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

const dayAfter = (iso: string): string => {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

// `effectiveUntil` is the last day a row counts, `effectiveFrom` the first.
export const isActiveOn = (item: Scheduled, day: string): boolean =>
  (!item.effectiveFrom || item.effectiveFrom <= day) && (!item.effectiveUntil || day <= item.effectiveUntil);

export const activeOn = <T extends Scheduled>(items: readonly T[], day: string): T[] => items.filter((i) => isActiveOn(i, day));

export const isMemo = (item: { tags?: string[] | null }): boolean => (item.tags ?? []).includes(MEMO_TAG);

// What the totals, charts and lists use on a day: the rows in force then, without the reporting-only ones.
export const currentItems = <T extends Scheduled & { tags?: string[] | null }>(items: readonly T[], day: string): T[] =>
  activeOn(items, day).filter((i) => !isMemo(i));

// The first day after `day` on which some row starts or stops counting, or null when nothing is scheduled.
export function nextChangeDay(items: readonly Scheduled[], day: string): string | null {
  const days = items.flatMap((i) => [i.effectiveFrom, i.effectiveUntil ? dayAfter(i.effectiveUntil) : null])
    .filter((d): d is string => !!d && d > day);
  return days.length ? days.sort()[0] : null;
}

// ── The Rocklin rental ──────────────────────────────────────────────────────
export const isRentalIncome = (item: { tags?: string[] | null }): boolean => (item.tags ?? []).includes(RENTAL_INCOME_TAG);
export const isPropertyExpense = (item: { category: string; tags?: string[] | null }): boolean =>
  !isMemo(item) && !isRentalIncome(item) && (item.category === PROPERTY_CATEGORY || (item.tags ?? []).includes(PROPERTY_CATEGORY));

export interface PropertyBudget {
  day: string;
  income: BudgetItem[]; expenses: BudgetItem[];
  incomeMonthly: number; expensesMonthly: number; netMonthly: number; // cents
  incomeAnnual: number; expensesAnnual: number; netAnnual: number;
  // Bills still paid by the owner that the budget above leaves out (see MEMO_TAG), so true cash flow can be worked out.
  unlisted: BudgetItem[]; unlistedMonthly: number; trueNetMonthly: number; trueNetAnnual: number;
}

const sum = (items: readonly { monthlyCost: number }[]) => items.reduce((total, i) => total + i.monthlyCost, 0);

// Rental income and property expenses on a day, kept apart, with their monthly and yearly totals and the net.
export function propertyBudget(items: readonly BudgetItem[], day: string): PropertyBudget {
  const active = activeOn(items, day);
  const income = active.filter(isRentalIncome).sort((a, b) => b.monthlyCost - a.monthlyCost);
  const expenses = active.filter(isPropertyExpense).sort((a, b) => b.monthlyCost - a.monthlyCost);
  const unlisted = active.filter((i) => isMemo(i) && i.category === PROPERTY_CATEGORY);
  const incomeMonthly = sum(income), expensesMonthly = sum(expenses), unlistedMonthly = sum(unlisted);
  const netMonthly = incomeMonthly - expensesMonthly;
  return {
    day, income, expenses, incomeMonthly, expensesMonthly, netMonthly,
    incomeAnnual: incomeMonthly * 12, expensesAnnual: expensesMonthly * 12, netAnnual: netMonthly * 12,
    unlisted, unlistedMonthly, trueNetMonthly: netMonthly - unlistedMonthly, trueNetAnnual: (netMonthly - unlistedMonthly) * 12,
  };
}

// Daily nutrition goals, and how far a day's totals are from them.
import { NUTRIENT_INFO, type NutrientKey } from "./fitness-log";

export const CALORIE_GOAL = 2400;

// "budget": an amount to land near, so going past it is shown as over. "reach": a minimum to hit, where more is fine.
export type GoalKind = "budget" | "reach";
export interface DailyGoal { key: NutrientKey; goal: number; kind: GoalKind }

// Protein, carbs and fat are 25%, 45% and 30% of the calories (4, 4 and 9 kcal per gram). Fiber, calcium and the vitamins are
// the FDA daily values (28 g, 1,300 mg, 900 mcg RAE, 90 mg and 20 mcg).
export const DAILY_GOALS: readonly DailyGoal[] = [
  { key: "calories", goal: CALORIE_GOAL, kind: "budget" },
  { key: "protein", goal: 150, kind: "reach" },
  { key: "carbs", goal: 270, kind: "budget" },
  { key: "fat", goal: 80, kind: "budget" },
  { key: "fiber", goal: 28, kind: "reach" },
  { key: "calcium", goal: 1300, kind: "reach" },
  { key: "vitaminA", goal: 900, kind: "reach" },
  { key: "vitaminC", goal: 90, kind: "reach" },
  { key: "vitaminD", goal: 20, kind: "reach" },
];

export type GoalStatus = "under" | "met" | "over";
export interface GoalRow {
  key: NutrientKey; label: string; unit: string; kind: GoalKind;
  value: number; goal: number;
  percent: number; // of the goal, not capped
  fill: number; // 0 to 1, for the length of a bar
  status: GoalStatus;
  difference: number; // how far below (status "under") or above (status "over" or a reached minimum) the goal, never negative
}

const roundFor = (key: NutrientKey, n: number) => (NUTRIENT_INFO[key].unit === "g" ? Math.round(n * 10) / 10 : Math.round(n));

// One row per goal for a day's totals. A nutrient the day never recorded counts as zero.
export function goalRows(totals: Partial<Record<NutrientKey, number>> | null | undefined): GoalRow[] {
  return DAILY_GOALS.map(({ key, goal, kind }) => {
    const raw = totals?.[key];
    const value = roundFor(key, typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 0);
    const status: GoalStatus = value < goal ? "under" : value > goal && kind === "budget" ? "over" : "met";
    return {
      key, kind, goal, value, label: NUTRIENT_INFO[key].label, unit: NUTRIENT_INFO[key].unit,
      percent: Math.round((value / goal) * 100), fill: Math.min(1, value / goal), status,
      difference: roundFor(key, Math.abs(goal - value)),
    };
  });
}

const grouped = (n: number) => n.toLocaleString("en-US");

export const amountText = (value: number, unit: string): string => `${grouped(value)} ${unit}`;

// "1,420 of 2,400 kcal · 980 to go", or "... · goal reached" / "... · 120 over".
export function goalDetail(row: GoalRow): string {
  const base = `${grouped(row.value)} of ${amountText(row.goal, row.unit)}`;
  if (row.status === "under") return `${base} · ${grouped(row.difference)} to go`;
  if (row.status === "over") return `${base} · ${grouped(row.difference)} over`;
  return `${base} · goal reached`;
}

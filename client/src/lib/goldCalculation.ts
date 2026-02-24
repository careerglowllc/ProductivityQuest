/**
 * Gold Calculation for Frontend
 * Must match server/goldCalculation.ts logic exactly
 */

export const GOLD_BASE = 20;
export const TIME_DIVISOR = 20;

export const PRIORITY_BONUSES: Record<string, number> = {
  "Low": 0,
  "Med-Low": 0.03,
  "Medium": 0.05,
  "Med-High": 0.07,
  "High": 0.10,
  "Pareto": 0.15,
};

export function calculateGoldValue(importance: string | null | undefined, duration: number): number {
  const priorityBonus = PRIORITY_BONUSES[importance || "Medium"] ?? PRIORITY_BONUSES["Medium"];
  const timeWeight = duration / TIME_DIVISOR;
  const goldValue = GOLD_BASE * timeWeight * (1 + priorityBonus);
  return Math.round(goldValue);
}

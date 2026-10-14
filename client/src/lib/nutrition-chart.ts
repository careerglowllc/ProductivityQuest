import { NUTRIENTS, macroCalories, type CalorieDayLog, type NutrientKey } from "@shared/fitness-log";

export type Granularity = "day" | "week" | "month";

export function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Monday-start week key, e.g. "2026-06-15" (the Monday of that week).
export function weekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export const monthKey = (dateStr: string): string => dateStr.slice(0, 7);

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export type NutritionPoint = { key: string; label: string; count: number } & Partial<Record<NutrientKey, number>>
  & { proteinKcal: number; carbsKcal: number; fatKcal: number };

const average = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : undefined);

// One point per day, or the average per week or month. A nutrient is averaged over the days that recorded it, so older days that
// never tracked fiber or potassium leave a gap instead of pulling the average down to zero.
export function aggregateNutrition(days: readonly CalorieDayLog[], granularity: Granularity): NutritionPoint[] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const keyOf = (date: string) => (granularity === "day" ? date : granularity === "week" ? weekKey(date) : monthKey(date));
  const groups = new Map<string, CalorieDayLog[]>();
  for (const day of sorted) groups.set(keyOf(day.date), [...(groups.get(keyOf(day.date)) ?? []), day]);
  return Array.from(groups.entries()).map(([key, group]) => {
    const point: NutritionPoint = {
      key, count: group.length, proteinKcal: 0, carbsKcal: 0, fatKcal: 0,
      label: granularity === "day" ? formatDateShort(key) : granularity === "week" ? `Wk of ${formatDateShort(key)}` : monthLabel(key),
    };
    for (const nutrient of NUTRIENTS) {
      const recorded = group.map((d) => d[nutrient] as number | undefined).filter((v): v is number => typeof v === "number");
      const value = average(recorded);
      if (value !== undefined) point[nutrient] = nutrient === "calories" || nutrient === "sodium" || nutrient === "calcium" ? Math.round(value) : value;
    }
    const macros = group.map(macroCalories);
    point.proteinKcal = Math.round(macros.reduce((a, m) => a + m.protein, 0) / group.length);
    point.carbsKcal = Math.round(macros.reduce((a, m) => a + m.carbs, 0) / group.length);
    point.fatKcal = Math.round(macros.reduce((a, m) => a + m.fat, 0) / group.length);
    return point;
  });
}

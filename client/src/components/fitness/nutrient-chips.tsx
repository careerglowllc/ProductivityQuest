import { NUTRIENT_INFO, type NutrientKey } from "@shared/fitness-log";

// One colour per nutrient, used for its numbers here and for its bar in the daily goals.
export const NUTRIENT_COLORS: Partial<Record<NutrientKey, string>> = {
  calories: "#F87171", protein: "#34D399", carbs: "#FBBF24", fat: "#F472B6", sugar: "#E879F9",
  fiber: "#A3E635", calcium: "#38BDF8", vitaminA: "#FB923C", vitaminC: "#FDE047", vitaminD: "#A78BFA",
};

const SHOWN: NutrientKey[] = ["calories", "protein", "carbs", "fat", "calcium", "sugar", "fiber"];
const LABELS: Partial<Record<NutrientKey, string>> = { calories: "kcal" };

// One small row for a single food: calories, protein, carbs, fat, calcium, sugar and fiber. Amounts it never recorded read 0.
export function NutrientChips({ totals }: { totals: Partial<Record<NutrientKey, number>> }) {
  return (
    <div data-testid="nutrient-chips" className="mt-1.5 grid grid-cols-7 gap-1">
      {SHOWN.map((key) => {
        const info = NUTRIENT_INFO[key];
        const value = (totals[key] ?? 0).toLocaleString("en-US");
        const unit = info.unit === "kcal" ? "" : info.unit;
        return (
          <div
            key={key}
            data-testid={`chip-${key}`}
            title={`${info.label} ${value}${unit ? ` ${unit}` : " kcal"}`}
            className="rounded-md bg-slate-900/60 px-0.5 py-1 text-center"
          >
            <p className="whitespace-nowrap text-[12px] font-bold leading-4 tabular-nums" style={{ color: NUTRIENT_COLORS[key] }}>
              {value}
              {unit && <span className="text-[9px] font-normal opacity-70">{unit}</span>}
            </p>
            <p className="text-[8px] uppercase tracking-wide text-slate-500">{LABELS[key] ?? info.label}</p>
          </div>
        );
      })}
    </div>
  );
}

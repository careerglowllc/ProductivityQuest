import { NUTRIENT_INFO, type NutrientKey } from "@shared/fitness-log";

// One colour per nutrient, used for its numbers here and for its bar in the daily goals.
export const NUTRIENT_COLORS: Partial<Record<NutrientKey, string>> = {
  calories: "#F87171", protein: "#34D399", carbs: "#FBBF24", fat: "#F472B6", sugar: "#E879F9",
  fiber: "#A3E635", calcium: "#38BDF8", vitaminA: "#FB923C", vitaminC: "#FDE047", vitaminD: "#A78BFA",
};

const SHOWN: NutrientKey[] = ["calories", "protein", "carbs", "fat", "calcium", "sugar", "fiber"];
const LABELS: Partial<Record<NutrientKey, string>> = { calories: "kcal" };

// Calories, protein, carbs, fat, calcium, sugar and fiber at a glance. "item" is one small row for a single food;
// "total" is two rows of bigger tiles, with calories twice as wide, for the day so far. Amounts a food never recorded read 0.
export function NutrientChips({ totals, variant = "item" }: { totals: Partial<Record<NutrientKey, number>>; variant?: "item" | "total" }) {
  const total = variant === "total";
  return (
    <div data-testid={`nutrient-chips-${variant}`} className={`${total ? "grid grid-cols-4 gap-1.5" : "mt-1.5 grid grid-cols-7 gap-1"}`}>
      {SHOWN.map((key) => {
        const info = NUTRIENT_INFO[key];
        const value = (totals[key] ?? 0).toLocaleString("en-US");
        const unit = info.unit === "kcal" ? "" : info.unit;
        return (
          <div
            key={key}
            data-testid={`chip-${key}`}
            title={`${info.label} ${value}${unit ? ` ${unit}` : " kcal"}`}
            className={`rounded-md bg-slate-900/60 text-center ${total ? "px-1 py-1.5" : "px-0.5 py-1"} ${total && key === "calories" ? "col-span-2" : ""}`}
            style={total ? { borderTop: `2px solid ${NUTRIENT_COLORS[key]}` } : undefined}
          >
            <p className={`whitespace-nowrap font-bold tabular-nums ${total ? (key === "calories" ? "text-xl leading-6" : "text-[15px] leading-5") : "text-[12px] leading-4"}`} style={{ color: NUTRIENT_COLORS[key] }}>
              {value}
              {unit && <span className={`font-normal opacity-70 ${total ? "ml-0.5 text-[10px]" : "text-[9px]"}`}>{unit}</span>}
            </p>
            <p className={`uppercase tracking-wide text-slate-400 ${total ? "text-[10px]" : "text-[8px] text-slate-500"}`}>{LABELS[key] ?? info.label}</p>
          </div>
        );
      })}
    </div>
  );
}

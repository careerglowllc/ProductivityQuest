// ─────────────────────────────────────────────────────────────────────────────
// calorie-log.ts
//
// Shared calorie/nutrition log data + storage helpers, used by both the
// Calorie Log dashboard (fitness-calories.tsx) and the lifting progression
// chart's optional calorie overlay (fitness-lifting.tsx).
//
// Persisted under the synced "calories-" localStorage prefix so it follows the
// user's account across devices (see client/src/lib/synced-storage.ts +
// server/routes.ts SYNCED_KEY_PREFIXES).
// ─────────────────────────────────────────────────────────────────────────────

export const CALORIE_STORAGE_KEY = "calories-daily-log-v1";
export const CALORIE_GOAL = 2200; // rough daily target reference line for the chart

export type Completeness = "unknown/partial" | "explicitly complete";
export type Confidence = "low" | "medium" | "high";

export interface CalorieDayLog {
  date: string; // YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number;
  magnesium: number;
  calcium: number;
  vitaminC: number;
  vitaminA: number;
  foodDetails: string;
  completeness: Completeness;
  confidence: Confidence;
  notes?: string;
}

export const CALORIE_SEED_LOG: CalorieDayLog[] = [
  { date: "2026-06-15", calories: 825, protein: 51, carbs: 94, fat: 26.5, sodium: 1365, magnesium: 67, calcium: 525, vitaminC: 2, vitaminA: 800, foodDetails: "3 slices Trader Joe's sourdough; 3 Trader Joe's mini Brie; 1 scoop Optimum Nutrition vanilla whey; ~1.5 tbsp apricot jam", completeness: "unknown/partial", confidence: "medium", notes: "Macros and micros largely taken from the running total logged that day." },
  { date: "2026-06-16", calories: 670, protein: 37, carbs: 39, fat: 41, sodium: 1440, magnesium: 45, calcium: 380, vitaminC: 8, vitaminA: 900, foodDetails: "Usual double hamburger / Double-Double style burger", completeness: "unknown/partial", confidence: "medium", notes: "Single-item day in the chat." },
  { date: "2026-06-17", calories: 1770, protein: 95, carbs: 129, fat: 83.5, sodium: 2030, magnesium: 173, calcium: 600, vitaminC: 45, vitaminA: 2370, foodDetails: "Everything bagel with cream cheese; 8 oz oat-milk cappuccino; 1 Trader Joe's mini Brie; large bowl with ~5-5.5 chicken thighs in curry sauce, ~1 cup rice, ~1.5 cups cabbage salad", completeness: "unknown/partial", confidence: "medium", notes: "Extra Brie initially added by mistake was moved to June 18 and is not included here." },
  { date: "2026-06-18", calories: 2800, protein: 194, carbs: 194, fat: 139.5, sodium: 4655, magnesium: 363, calcium: 900, vitaminC: 30, vitaminA: 900, foodDetails: "1 Trader Joe's mini Brie; 12 oz coconut-water shake with whey, peanut butter and cacao nibs; ~8 oz tri-tip; Italian deli/poor boy sandwich (revised to ~800 kcal); 1 order prime rib tacos (~700 kcal); 1 Almond Joy; coconut water", completeness: "unknown/partial", confidence: "medium", notes: "Uses user's corrections: one taco order, not two; deli sandwich revised from 950 to ~800 kcal." },
  { date: "2026-06-23", calories: 830, protein: 65, carbs: 38, fat: 41, sodium: 830, magnesium: 130, calcium: 350, vitaminC: 25, vitaminA: 2500, foodDetails: "1 Premier Protein bar; ~6-7 oz salmon with tomato-based sauce, cabbage/arugula salad and some couscous/nuts/dressing", completeness: "unknown/partial", confidence: "medium", notes: "Salmon plate estimate was revised upward after photo." },
  { date: "2026-06-26", calories: 1320, protein: 77, carbs: 114, fat: 58, sodium: 1930, magnesium: 145, calcium: 260, vitaminC: 26, vitaminA: 780, foodDetails: "Turkey, Brie & peach grilled sourdough sandwich; 2 Trader Joe's Lamb Vindaloo frozen meals", completeness: "unknown/partial", confidence: "high", notes: "Final corrected June 26 split." },
  { date: "2026-06-27", calories: 1490, protein: 131, carbs: 73, fat: 70, sodium: 2940, magnesium: 105, calcium: 310, vitaminC: 8, vitaminA: 150, foodDetails: "2 beef Chomps; small meat-heavy Vietnamese banh mi; 1 scoop Optimum whey; Korean fried chicken (2 drumsticks + 1 wing, lightly sauced); ~100 kcal leftover bibimbap; 1 bag Quest protein chips", completeness: "unknown/partial", confidence: "medium", notes: "Corrected from an earlier misunderstanding of 'banh mi' as a pork bun." },
  { date: "2026-06-28", calories: 1250, protein: 52, carbs: 115, fat: 58, sodium: 2400, magnesium: 120, calcium: 330, vitaminC: 15, vitaminA: 550, foodDetails: "Generic taco-truck burrito; ~400 kcal miscellaneous foods", completeness: "unknown/partial", confidence: "low", notes: "Large uncertainty because ~400 kcal of food was not itemized." },
  { date: "2026-06-30", calories: 2165, protein: 152, carbs: 181, fat: 99, sodium: 3000, magnesium: 350, calcium: 700, vitaminC: 35, vitaminA: 1800, foodDetails: "Multigrain avocado toast with ~1 tsp almond butter and ~1/2 small avocado; ~7 oz salmon with ~1 cup salad and herbed yogurt sauce; 10-piece nigiri + 4 tuna roll pieces; usual Italian deli sandwich", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-01", calories: 355, protein: 19, carbs: 36, fat: 14, sodium: 650, magnesium: 45, calcium: 60, vitaminC: 5, vitaminA: 350, foodDetails: "1 fried egg; ~3/4 cup white rice; ~3 tbsp Thai basil ground chicken", completeness: "unknown/partial", confidence: "medium", notes: "Small Thai basil chicken portion confirmed by photo." },
  { date: "2026-07-02", calories: 1690, protein: 95, carbs: 138, fat: 85, sodium: 3300, magnesium: 220, calcium: 850, vitaminC: 15, vitaminA: 1800, foodDetails: "1 Trader Joe's mini Brie; everything bagel with ~2 tbsp cream cheese; usual double hamburger; 10-piece assorted nigiri", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-04", calories: 910, protein: 103, carbs: 5, fat: 51, sodium: 1800, magnesium: 150, calcium: 850, vitaminC: 0, vitaminA: 1500, foodDetails: "3 eggs; ~1/2 lb turkey; ~1/4 lb queso fresco", completeness: "unknown/partial", confidence: "medium", notes: "Very protein-dense, low-carb entry." },
  { date: "2026-07-08", calories: 2595, protein: 159, carbs: 226, fat: 123, sodium: 4400, magnesium: 515, calcium: 775, vitaminC: 15, vitaminA: 1250, foodDetails: "1 Trader Joe's mini Brie; 6 al pastor street tacos; 7-piece nigiri; usual avocado toast with almond butter; 12 oz oat-milk kombucha latte; usual double hamburger", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-13", calories: 2380, protein: 199, carbs: 125, fat: 110, sodium: 4000, magnesium: 300, calcium: 1400, vitaminC: 20, vitaminA: 1800, foodDetails: "1 scoop Ascent whey + 1.5 cups whole lactose-free milk; generic steak burrito without rice; 2 chicken piccata breasts; 3 slices Trader Joe's sourdough; 3 slices Trader Joe's cheddar; 1 bag Quest protein chips", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-14", calories: 1450, protein: 89, carbs: 108, fat: 70, sodium: 2450, magnesium: 185, calcium: 345, vitaminC: 21, vitaminA: 2620, foodDetails: "2 Philz bacon & cheese egg bites; Lazy Dog Korean ribeye bibimbap bowl (~650 kcal); 6-piece cafeteria nigiri", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-15", calories: 950, protein: 43, carbs: 100, fat: 42, sodium: 1850, magnesium: 80, calcium: 430, vitaminC: 3, vitaminA: 550, foodDetails: "Everything bagel with cream cheese; 1 hard-boiled egg; 8 oz oat-milk cappuccino; half deli sandwich with turkey, pastrami, Swiss and mayo", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-16", calories: 2080, protein: 119, carbs: 192, fat: 96, sodium: 2500, magnesium: 370, calcium: 1020, vitaminC: 20, vitaminA: 1050, foodDetails: "Trader Joe's everything bagel + 2 tbsp cream cheese + ~4 oz smoked lox; 3 slices Trader Joe's sourdough; 1 avocado; 4 eggs; protein shake with 1 scoop whey, 2 tbsp peanut butter, 1 banana, blueberries and 1.5 cups whole milk", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-17", calories: 2360, protein: 162, carbs: 143, fat: 125, sodium: 4200, magnesium: 300, calcium: 700, vitaminC: 15, vitaminA: 1200, foodDetails: "2 everything bagels with cream cheese and smoked salmon (~750 kcal); taco-truck burrito with no rice/no beans; 2 SkinnyDipped candies; 1 UNREAL bar; ribeye with butter/garlic (~550 kcal); 1 bag Quest protein chips", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-18", calories: 1510, protein: 87, carbs: 100, fat: 87, sodium: 2100, magnesium: 210, calcium: 1200, vitaminC: 0, vitaminA: 3200, foodDetails: "3 slices Trader Joe's cheddar; 4 slices Trader Joe's sourdough; 5 eggs; ~1.5 tbsp butter; ~3 oz ribeye", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-21", calories: 2700, protein: 150, carbs: 231, fat: 120, sodium: 3100, magnesium: 520, calcium: 1350, vitaminC: 35, vitaminA: 3400, foodDetails: "Lazy Dog bowl (~650 kcal); ~15 hazelnuts; 1 cup steel-cut oatmeal; 5 eggs; 4 slices Trader Joe's sourdough; ~1.5 tbsp butter; protein shake with 1.5 cups whole milk, banana, 1.5 scoops whey and peanut butter", completeness: "explicitly complete", confidence: "medium", notes: "User explicitly said this was the end of the July 21 log." },
  { date: "2026-07-22", calories: 2450, protein: 160, carbs: 184, fat: 118, sodium: 3600, magnesium: 430, calcium: 1050, vitaminC: 20, vitaminA: 3600, foodDetails: "1 slice Trader Joe's sourdough; ~1/2 small avocado; 1 hard-boiled egg; large ~10-piece assorted nigiri; 5 eggs; 4 additional slices Trader Joe's sourdough; 1 slice Trader Joe's cheddar; 1 tbsp butter; ~8 oz New York strip steak", completeness: "explicitly complete", confidence: "medium", notes: "User said the day finished with the New York strip steak." },
  { date: "2026-07-23", calories: 1915, protein: 131, carbs: 125, fat: 101, sodium: 3000, magnesium: 350, calcium: 1050, vitaminC: 15, vitaminA: 3000, foodDetails: "1 beef jalapeño Chomps; 1 turkey Chomps; ~8 oz New York strip steak; 1 banana; 2 slices Trader Joe's cheddar; 5 eggs; 4 slices Trader Joe's sourdough; 1 tbsp butter", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-26", calories: 800, protein: 65, carbs: 15, fat: 50, sodium: 1800, magnesium: 110, calcium: 120, vitaminC: 5, vitaminA: 450, foodDetails: "Cattlemen's Buffalo Western Wings and some pork chop", completeness: "unknown/partial", confidence: "low", notes: "User supplied a rough combined calorie estimate of ~800 kcal." },
  { date: "2026-07-27", calories: 700, protein: 35, carbs: 50, fat: 35, sodium: 1500, magnesium: 70, calcium: 180, vitaminC: 5, vitaminA: 350, foodDetails: "Wayback Burgers chicken sandwich", completeness: "unknown/partial", confidence: "low", notes: "User estimated ~700 kcal." },
  { date: "2026-07-29", calories: 830, protein: 57, carbs: 69, fat: 39, sodium: 1700, magnesium: 95, calcium: 520, vitaminC: 0, vitaminA: 450, foodDetails: "1 beef Chomp; 1 whole-milk latte; 1 Pure Protein bar; 2 Trader Joe's frozen cannelloni", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-08-01", calories: 1170, protein: 65, carbs: 101, fat: 55, sodium: 2100, magnesium: 120, calcium: 650, vitaminC: 8, vitaminA: 500, foodDetails: "Usual Italian deli sandwich; half breakfast burrito; large London Fog milk latte", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-08-02", calories: 1070, protein: 62, carbs: 57, fat: 65, sodium: 2050, magnesium: 105, calcium: 410, vitaminC: 8, vitaminA: 600, foodDetails: "Generic double-meat Mexican food-truck burrito with cheese, no rice, no beans; large Philz Mint Mojito coffee with medium cream and extra-light sweetness", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-08-04", calories: 1790, protein: 101, carbs: 139, fat: 92, sodium: 2600, magnesium: 250, calcium: 580, vitaminC: 16, vitaminA: 1300, foodDetails: "Usual double hamburger; usual avocado toast with almond butter; 1 Trader Joe's mini Brie; 8-piece assorted nigiri; 2 Trader Joe's Organic Coconut Smoothies; 1 bag Quest protein chips", completeness: "unknown/partial", confidence: "medium", notes: "Coconut smoothie calories corrected from 180 to 120 per bottle after label photo." },
  { date: "2026-08-05", calories: 1330, protein: 88, carbs: 107, fat: 63, sodium: 1800, magnesium: 330, calcium: 520, vitaminC: 35, vitaminA: 1800, foodDetails: "1 cup steel-cut oatmeal with almonds and dried cranberries; 1 hard-boiled egg; 1 Trader Joe's mini Brie; 1 small cacao-nib snack; Thai coconut curry chicken plate with rice, chicken, sauce and vegetables", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-08-11", calories: 2090, protein: 123, carbs: 125, fat: 75, sodium: 3200, magnesium: 350, calcium: 700, vitaminC: 85, vitaminA: 3200, foodDetails: "~1.5 cup mixed fruit cup; ~2.5-3 chicken thighs with yogurt sauce and dressed salad; 16 oz oat-milk chai latte; ~1 cup beef & bison chili; ~7 shrimp with sauce, rice and salad", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-08-13", calories: 230, protein: 4, carbs: 43, fat: 5, sodium: 100, magnesium: 45, calcium: 280, vitaminC: 40, vitaminA: 350, foodDetails: "Same ~1.5 cup assorted fruit cup as Aug 11; 8 oz decaf oat-milk cappuccino", completeness: "unknown/partial", confidence: "medium", notes: "Very likely a partial-day log." },
];

export function loadCalorieLog(): CalorieDayLog[] {
  try {
    const raw = localStorage.getItem(CALORIE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return CALORIE_SEED_LOG;
}

/** Seed localStorage once so this log is part of the synced "calories-" store. Safe to call from multiple pages. */
export function ensureCalorieLogSeeded() {
  try {
    if (!localStorage.getItem(CALORIE_STORAGE_KEY)) {
      localStorage.setItem(CALORIE_STORAGE_KEY, JSON.stringify(CALORIE_SEED_LOG));
    }
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Body Weight Log — persisted under the synced "workout-" localStorage prefix
// (see client/src/lib/synced-storage.ts + server/routes.ts SYNCED_KEY_PREFIXES).
// Used by the Weight Log dashboard (fitness-weight.tsx) and its optional
// calorie-overlay comparison against the Calorie Log.
// ─────────────────────────────────────────────────────────────────────────────
export const BODYWEIGHT_STORAGE_KEY = "workout-bodyweight-log-v1";

export interface BodyWeightEntry {
  date: string; // YYYY-MM-DD
  weightLb: number;
  notes?: string;
}

export function loadBodyWeightLog(): BodyWeightEntry[] {
  try {
    const raw = localStorage.getItem(BODYWEIGHT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

/** Persist the full weight log (one entry per date; last write for a given date wins). */
export function saveBodyWeightLog(entries: BodyWeightEntry[]) {
  try {
    localStorage.setItem(BODYWEIGHT_STORAGE_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

/** Upsert a single day's entry (by date) and persist. Returns the updated log. */
export function upsertBodyWeightEntry(entry: BodyWeightEntry): BodyWeightEntry[] {
  const existing = loadBodyWeightLog();
  const next = [...existing.filter((e) => e.date !== entry.date), entry];
  saveBodyWeightLog(next);
  return next;
}

/** Remove a single day's entry (by date) and persist. Returns the updated log. */
export function deleteBodyWeightEntry(date: string): BodyWeightEntry[] {
  const next = loadBodyWeightLog().filter((e) => e.date !== date);
  saveBodyWeightLog(next);
  return next;
}


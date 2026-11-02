// The colour of each importance level, from calm to urgent: green, yellow, orange, red-orange, red, and a deep crimson
// for Pareto. Used for the dot beside every importance choice, so the same level always looks the same.
export const IMPORTANCE_LEVELS = ["Pareto", "High", "Med-High", "Medium", "Med-Low", "Low"] as const;
export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number];

export const IMPORTANCE_COLORS: Record<ImportanceLevel, string> = {
  Pareto: "#b91c1c",
  High: "#ef4444",
  "Med-High": "#f2541b",
  Medium: "#f97316",
  "Med-Low": "#eab308",
  Low: "#22c55e",
};

export const importanceColor = (level: string): string => IMPORTANCE_COLORS[level as ImportanceLevel] ?? "#94a3b8";

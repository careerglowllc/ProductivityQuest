/**
 * Gold Calculation System
 * 
 * Formula: Gold = Base × TimeWeight × (1 + PriorityBonus)
 * 
 * - Base: Starting value for gold calculation (default: 10)
 * - TimeWeight: Task duration in minutes / 20
 * - PriorityBonus: Bonus percentage based on task importance
 */

// ============================
// CONFIGURABLE PARAMETERS
// ============================

/**
 * Base gold value - starting point for all calculations
 * Modify this to adjust overall gold rewards
 */
export const GOLD_BASE = 10;

/**
 * Time divisor - controls how much duration affects gold
 * Higher values = less gold per minute
 * Lower values = more gold per minute
 */
export const TIME_DIVISOR = 20;

/**
 * Priority bonus multipliers by importance level
 * These are BONUS percentages (e.g., 0.15 = 15% bonus)
 */
export const PRIORITY_BONUSES: Record<string, number> = {
  "Low": 0,
  "Med-Low": 0.03,
  "Medium": 0.05,
  "Med-High": 0.07,
  "High": 0.10,
  "Pareto": 0.15,
};

// ============================
// CALCULATION FUNCTION
// ============================

/**
 * Calculate gold value for a task
 * 
 * @param importance - Task importance level (Low, Med-Low, Medium, Med-High, High, Pareto)
 * @param duration - Task duration in minutes
 * @returns Calculated gold value (rounded to nearest integer)
 * 
 * @example
 * calculateGoldValue("High", 60) 
 * // Base: 10, TimeWeight: 60/20 = 3, PriorityBonus: 0.10
 * // Gold = 10 × 3 × (1 + 0.10) = 10 × 3 × 1.10 = 33
 */
export function calculateGoldValue(importance: string | null | undefined, duration: number): number {
  // Get priority bonus (default to Medium if not specified)
  const priorityBonus = PRIORITY_BONUSES[importance || "Medium"] ?? PRIORITY_BONUSES["Medium"];
  
  // Calculate time weight
  const timeWeight = duration / TIME_DIVISOR;
  
  // Apply formula: Gold = Base × TimeWeight × (1 + PriorityBonus)
  const goldValue = GOLD_BASE * timeWeight * (1 + priorityBonus);
  
  // Round to nearest integer
  return Math.round(goldValue);
}

/**
 * Get a human-readable explanation of the gold calculation
 * Useful for debugging or displaying to users
 */
export function explainGoldCalculation(importance: string | null | undefined, duration: number): string {
  const priorityBonus = PRIORITY_BONUSES[importance || "Medium"] ?? PRIORITY_BONUSES["Medium"];
  const timeWeight = duration / TIME_DIVISOR;
  const goldValue = calculateGoldValue(importance, duration);
  
  return `
Gold Calculation:
- Base: ${GOLD_BASE}
- Duration: ${duration} minutes
- Time Weight: ${duration} / ${TIME_DIVISOR} = ${timeWeight.toFixed(2)}
- Importance: ${importance || "Medium"}
- Priority Bonus: ${(priorityBonus * 100).toFixed(0)}%
- Formula: ${GOLD_BASE} × ${timeWeight.toFixed(2)} × (1 + ${priorityBonus}) = ${goldValue}
  `.trim();
}

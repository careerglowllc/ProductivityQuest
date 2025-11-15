/**
 * Skill XP Calculation System
 * 
 * Formula: XP = Base × TimeWeight × (1 + PriorityBonus)
 * 
 * - Base: Starting value for XP calculation (default: 15)
 * - TimeWeight: Task duration in minutes / 15
 * - PriorityBonus: Bonus percentage based on task importance
 * 
 * XP is distributed equally among all categorized skills for a task
 */

// ============================
// CONFIGURABLE PARAMETERS
// ============================

/**
 * Base XP value - starting point for all calculations
 * Modify this to adjust overall XP rewards
 */
export const XP_BASE = 15;

/**
 * Time divisor - controls how much duration affects XP
 * Higher values = less XP per minute
 * Lower values = more XP per minute
 */
export const XP_TIME_DIVISOR = 15;

/**
 * Priority bonus multipliers by importance level
 * These are BONUS percentages (e.g., 0.20 = 20% bonus)
 */
export const XP_PRIORITY_BONUSES: Record<string, number> = {
  "Low": 0,
  "Med-Low": 0.05,
  "Medium": 0.10,
  "Med-High": 0.15,
  "High": 0.20,
  "Pareto": 0.30,
};

// ============================
// CALCULATION FUNCTION
// ============================

/**
 * Calculate XP value for a task (total XP before splitting among skills)
 * 
 * @param importance - Task importance level (Low, Med-Low, Medium, Med-High, High, Pareto)
 * @param duration - Task duration in minutes
 * @returns Calculated XP value (rounded to nearest integer)
 * 
 * @example
 * calculateXPValue("High", 60) 
 * // Base: 15, TimeWeight: 60/15 = 4, PriorityBonus: 0.20
 * // XP = 15 × 4 × (1 + 0.20) = 15 × 4 × 1.20 = 72
 */
export function calculateXPValue(importance: string | null | undefined, duration: number): number {
  // Get priority bonus (default to Medium if not specified)
  const priorityBonus = XP_PRIORITY_BONUSES[importance || "Medium"] ?? XP_PRIORITY_BONUSES["Medium"];
  
  // Calculate time weight
  const timeWeight = duration / XP_TIME_DIVISOR;
  
  // Apply formula: XP = Base × TimeWeight × (1 + PriorityBonus)
  const xpValue = XP_BASE * timeWeight * (1 + priorityBonus);
  
  // Round to nearest integer
  return Math.round(xpValue);
}

/**
 * Calculate XP per skill when XP is distributed among multiple skills
 * 
 * @param importance - Task importance level
 * @param duration - Task duration in minutes
 * @param numSkills - Number of skills to distribute XP among
 * @returns XP per skill (rounded to nearest integer)
 * 
 * @example
 * calculateXPPerSkill("High", 60, 2)
 * // Total XP: 72, Skills: 2
 * // XP per skill: 72 / 2 = 36
 */
export function calculateXPPerSkill(
  importance: string | null | undefined, 
  duration: number, 
  numSkills: number
): number {
  if (numSkills === 0) return 0;
  
  const totalXP = calculateXPValue(importance, duration);
  const xpPerSkill = totalXP / numSkills;
  
  return Math.round(xpPerSkill);
}

/**
 * Get a human-readable explanation of the XP calculation
 * Useful for debugging or displaying to users
 */
export function explainXPCalculation(
  importance: string | null | undefined, 
  duration: number,
  numSkills: number = 1
): string {
  const priorityBonus = XP_PRIORITY_BONUSES[importance || "Medium"] ?? XP_PRIORITY_BONUSES["Medium"];
  const timeWeight = duration / XP_TIME_DIVISOR;
  const totalXP = calculateXPValue(importance, duration);
  const xpPerSkill = calculateXPPerSkill(importance, duration, numSkills);
  
  return `
XP Calculation:
- Base: ${XP_BASE}
- Duration: ${duration} minutes
- Time Weight: ${duration} / ${XP_TIME_DIVISOR} = ${timeWeight.toFixed(2)}
- Importance: ${importance || "Medium"}
- Priority Bonus: ${(priorityBonus * 100).toFixed(0)}%
- Total XP: ${XP_BASE} × ${timeWeight.toFixed(2)} × (1 + ${priorityBonus}) = ${totalXP}
- Skills: ${numSkills}
- XP per skill: ${totalXP} / ${numSkills} = ${xpPerSkill}
  `.trim();
}

import { focusBand, isHighPriority, isReminder } from "./quest-schedule";
import { importanceRank } from "./quest-type";

export type FocusQuest = {
  id: number; title: string; description?: string | null; details?: string | null;
  dueDate?: string | Date | null; startDate?: string | Date | null;
  importance?: string | null; questType?: string | null; completed?: boolean | null; recycled?: boolean | null;
};
export type FocusPreference = { id: string; taskId: number; taskTitle: string; text: string; createdAt: string };
export type FocusEvent = { taskId: number; taskTitle: string; day: string };
export type FocusMemory = { enabled: boolean; preferences: FocusPreference[]; dismissals: FocusEvent[] };
export const emptyFocusMemory = (): FocusMemory => ({ enabled: false, preferences: [], dismissals: [] });
export type FocusAdvice = { taskId: number; include: boolean; score: number; reason: string };
export type FocusRanking = { ids: number[]; reasons: Record<string, string>; mode: "ai" | "rules"; message: string; day: string; total: number; protectedCount: number };
const dateOnly = (value: FocusQuest["dueDate"]) => value ? new Date(value).toISOString().slice(0, 10) : "";
export function protectedFocus(q: FocusQuest, day: string): boolean {
  if (q.completed || q.recycled || isReminder(q)) return false;
  const due = dateOnly(q.dueDate);
  return (!!due && due <= day) || dateOnly(q.startDate) === day;
}
export function eligibleFocus(q: FocusQuest, day: string): boolean {
  if (q.completed || q.recycled || isReminder(q)) return false;
  if (protectedFocus(q, day)) return true;
  const start = dateOnly(q.startDate);
  return !start || start <= day;
}
export function focusSignals(memory: FocusMemory, day: string) {
  const cutoff = new Date(`${day}T12:00:00Z`); cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const byTask = new Map<number, { taskId: number; taskTitle: string; dates: Set<string> }>();
  for (const event of memory.dismissals) {
    if (event.day < cutoff.toISOString().slice(0, 10) || event.day > day) continue;
    const signal = byTask.get(event.taskId) ?? { taskId: event.taskId, taskTitle: event.taskTitle, dates: new Set<string>() };
    signal.dates.add(event.day); byTask.set(event.taskId, signal);
  }
  return Array.from(byTask.values()).map(s => ({ taskId: s.taskId, taskTitle: s.taskTitle, days: s.dates.size }));
}
// The model advises; deterministic code owns dates, exclusions, caps, and task identity.
export function rankFocus(quests: FocusQuest[], day: string, memory: FocusMemory, advice?: FocusAdvice[]): FocusRanking {
  const now = new Date(`${day}T12:00:00`);
  const ai = new Map((advice ?? []).map(a => [a.taskId, a]));
  const signals = new Map(focusSignals(memory, day).map(s => [s.taskId, s.days]));
  const dismissed = new Set(memory.dismissals.filter(e => e.day === day).map(e => e.taskId));
  const reasons: Record<string, string> = {};
  const candidates = quests.filter(q => {
    if (!eligibleFocus(q, day)) return false;
    if (protectedFocus(q, day)) return true;
    if (dismissed.has(q.id)) return false;
    // Explicit feedback can exclude its non-protected target; inferred signals alone cannot.
    if (ai.get(q.id)?.include === false && memory.preferences.some(p => p.taskId === q.id)) return false;
    // AI can add previously missing work, but cannot exclude protected dates.
    return !!focusBand(q, now) || isHighPriority(q) || ai.get(q.id)?.include === true;
  });
  const weight = (q: FocusQuest) => {
    const due = dateOnly(q.dueDate);
    const band = due && due <= day ? 3 : dateOnly(q.startDate) === day ? 2 : 1;
    const base = importanceRank(q.importance) * 20 + (q.questType === "deadline" ? 10 : 0);
    const signalPenalty = memory.enabled && (signals.get(q.id) ?? 0) >= 3 ? 10 : 0;
    return band * 10000 + base + (ai.get(q.id)?.score ?? 0) - signalPenalty;
  };
  candidates.sort((a, b) => {
    if (protectedFocus(a, day) && protectedFocus(b, day)) {
      const ad = dateOnly(a.dueDate), bd = dateOnly(b.dueDate);
      const au = !!ad && ad <= day, bu = !!bd && bd <= day;
      if (au !== bu) return au ? -1 : 1;
      if (au && bu && ad !== bd) return ad.localeCompare(bd);
    }
    return weight(b) - weight(a) || a.id - b.id;
  });
  const protectedCount = candidates.filter(q => protectedFocus(q, day)).length;
  const kept = candidates.slice(0, Math.max(10, protectedCount));
  for (const q of kept) {
    const due = dateOnly(q.dueDate);
    reasons[q.id] = protectedFocus(q, day)
      ? due && due <= day ? "Protected: overdue or due today." : "Protected: starts today."
      : ai.get(q.id)?.reason || (isHighPriority(q) ? "High-priority work ready to start." : "Start date reached or important deadline approaching.");
    if (!protectedFocus(q, day) && memory.enabled && (signals.get(q.id) ?? 0) >= 3) {
      reasons[q.id] += " Slightly lowered after removals on at least 3 distinct days; this is not a permanent exclusion.";
    }
  }
  return { ids: kept.map(q => q.id), reasons, day, total: candidates.length, protectedCount,
    mode: advice ? "ai" : "rules", message: advice ? "AI-assisted order with date and priority safeguards." : "Rules-based focus. AI has not ranked this list." };
}

import { focusBand, isHighPriority, isReminder } from "./quest-schedule";
import { importanceRank } from "./quest-type";

export type FocusQuest = {
  id: number; title: string; description?: string | null; details?: string | null;
  dueDate?: string | Date | null; startDate?: string | Date | null;
  importance?: string | null; questType?: string | null; completed?: boolean | null; recycled?: boolean | null;
  duration?: number | null; recurType?: string | null;
};
// What the user did with a quest when giving feedback: moved it into Smart Focus, took it off, or confirmed where it already was.
export type FocusAction = "include" | "exclude" | "keep";
export const FOCUS_ACTIONS: readonly FocusAction[] = ["include", "exclude", "keep"];
export type FocusPreference = {
  id: string; taskId: number; taskTitle: string; text: string; createdAt: string;
  action?: FocusAction;
  inFocus?: boolean; // where the quest was when the user gave the feedback
};
export type FocusEvent = { taskId: number; taskTitle: string; day: string };
export type FocusMemory = { enabled: boolean; preferences: FocusPreference[]; dismissals: FocusEvent[] };
export const emptyFocusMemory = (): FocusMemory => ({ enabled: false, preferences: [], dismissals: [] });
export type FocusAdvice = { taskId: number; include: boolean; score: number; reason: string };
export type WorkloadLevel = "light" | "normal" | "busy" | "heavy";
export type FocusWorkload = { level: WorkloadLevel; pressure: number; committedMinutes: number; questCount: number; highPriorityCount: number };
export type FocusRanking = {
  ids: number[]; reasons: Record<string, string>; mode: "ai" | "rules"; message: string; day: string; total: number; protectedCount: number;
  workload?: FocusWorkload; heldBack?: number;
};

// How a day's committed workload (quests due or starting today) limits the optional, lower-priority extras.
// These are the general defaults; a per-account override can be passed to rankFocus later.
export type FocusTuning = {
  defaultMinutes: number;                       // assumed length of a quest with no duration
  pointsPerHighPriority: number;                // extra pressure for each Med-High or higher committed quest
  pointsPerQuest: number;                       // extra pressure per committed quest, whatever its length
  levelStarts: { normal: number; busy: number; heavy: number }; // pressure at which each level begins
  lowPriorityExtras: Record<WorkloadLevel, number>;             // how many optional low-priority quests may be listed
  routinesAllowed: Record<WorkloadLevel, boolean>;              // whether routine extras may be listed at all
};
export const DEFAULT_FOCUS_TUNING: FocusTuning = {
  defaultMinutes: 30,
  pointsPerHighPriority: 0.5,
  pointsPerQuest: 0.2,
  levelStarts: { normal: 4, busy: 7, heavy: 10 },
  lowPriorityExtras: { light: Infinity, normal: 4, busy: 2, heavy: 0 },
  routinesAllowed: { light: true, normal: true, busy: false, heavy: false },
};

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
// The user's latest action on each quest (a later one replaces an earlier one).
export function focusStances(memory: FocusMemory): Map<number, FocusPreference & { action: FocusAction }> {
  const latest = new Map<number, FocusPreference & { action: FocusAction }>();
  for (const p of memory.preferences) if (p.action) latest.set(p.taskId, p as FocusPreference & { action: FocusAction });
  return latest;
}
export function focusActionLabel(p: Pick<FocusPreference, "action" | "inFocus">): string | null {
  if (p.action === "include") return "Moved into Smart Focus";
  if (p.action === "exclude") return "Taken off Smart Focus";
  if (p.action === "keep") return p.inFocus === true ? "Kept in Smart Focus" : p.inFocus === false ? "Kept out of Smart Focus" : "Kept where it was";
  return null;
}
// A quest that repeats on a schedule (anything but one-time or none).
export function isRoutine(q: FocusQuest): boolean {
  const recur = (q.recurType || "").toLowerCase().replace(/[^a-z-]/g, "");
  return recur !== "" && recur !== "one-time" && recur !== "none";
}
// How heavy today is, from the quests already committed (overdue, due today, starting today): their number,
// total minutes, and how many are high priority. Optional work never counts toward it.
export function focusWorkload(quests: FocusQuest[], day: string, tuning: FocusTuning = DEFAULT_FOCUS_TUNING): FocusWorkload {
  const committed = quests.filter(q => protectedFocus(q, day));
  const committedMinutes = committed.reduce((sum, q) => sum + (q.duration && q.duration > 0 ? q.duration : tuning.defaultMinutes), 0);
  const highPriorityCount = committed.filter(q => isHighPriority(q)).length;
  const pressure = Math.round((committedMinutes / 60 + highPriorityCount * tuning.pointsPerHighPriority + committed.length * tuning.pointsPerQuest) * 10) / 10;
  const { normal, busy, heavy } = tuning.levelStarts;
  const level: WorkloadLevel = pressure >= heavy ? "heavy" : pressure >= busy ? "busy" : pressure >= normal ? "normal" : "light";
  return { level, pressure, committedMinutes, questCount: committed.length, highPriorityCount };
}
// The model advises; deterministic code owns dates, exclusions, caps, and task identity.
export function rankFocus(quests: FocusQuest[], day: string, memory: FocusMemory, advice?: FocusAdvice[], tuning: FocusTuning = DEFAULT_FOCUS_TUNING): FocusRanking {
  const now = new Date(`${day}T12:00:00`);
  const ai = new Map((advice ?? []).map(a => [a.taskId, a]));
  const signals = new Map(focusSignals(memory, day).map(s => [s.taskId, s.days]));
  const dismissed = new Set(memory.dismissals.filter(e => e.day === day).map(e => e.taskId));
  const stances = focusStances(memory);
  const reasons: Record<string, string> = {};
  const candidates = quests.filter(q => {
    if (!eligibleFocus(q, day)) return false;
    // The user's own take-off is honored even for work due or starting today; the model and plain text feedback cannot hide it.
    if (stances.get(q.id)?.action === "exclude") return false;
    if (protectedFocus(q, day)) return true;
    if (dismissed.has(q.id)) return false;
    // The user's own move wins over the model; protected quests were handled above.
    const action = stances.get(q.id)?.action;
    if (action === "include") return true;
    // Explicit feedback can exclude its non-protected target; inferred signals alone cannot.
    if (ai.get(q.id)?.include === false && memory.preferences.some(p => p.taskId === q.id)) return false;
    // AI can add previously missing work, but cannot exclude protected dates.
    return !!focusBand(q, now) || isHighPriority(q) || ai.get(q.id)?.include === true;
  });
  // A confirmed placement nudges the order a little among otherwise equal quests; a move into Smart Focus ranks above other optional work.
  const stanceNudge = (q: FocusQuest) => {
    const stance = stances.get(q.id);
    if (stance?.action === "keep") return stance.inFocus === true ? 15 : stance.inFocus === false ? -15 : 0;
    return 0;
  };
  const band = (q: FocusQuest) => {
    const due = dateOnly(q.dueDate);
    return due && due <= day ? 3 : dateOnly(q.startDate) === day ? 2 : 1;
  };
  // Only breaks ties between quests with the same due date and importance: the model's judgment, the user's nudges, past removals.
  const tieScore = (q: FocusQuest) => {
    const signalPenalty = memory.enabled && (signals.get(q.id) ?? 0) >= 3 ? 10 : 0;
    // The model's score does not count against something the user moved in themselves.
    const modelScore = stances.get(q.id)?.action === "include" ? 0 : ai.get(q.id)?.score ?? 0;
    return modelScore - signalPenalty + stanceNudge(q) + (q.questType === "deadline" ? 10 : 0);
  };
  // Due or starting today first, then what the user moved in, then earliest due date, then importance, then the model's tie-break.
  const compare = (a: FocusQuest, b: FocusQuest) =>
    band(b) - band(a)
    || Number(stances.get(b.id)?.action === "include") - Number(stances.get(a.id)?.action === "include")
    || (dateOnly(a.dueDate) || "9999-12-31").localeCompare(dateOnly(b.dueDate) || "9999-12-31")
    || importanceRank(b.importance) - importanceRank(a.importance)
    || tieScore(b) - tieScore(a)
    || a.id - b.id;
  candidates.sort(compare);
  const protectedCount = candidates.filter(q => protectedFocus(q, day)).length;
  // A busy day makes room for what matters: only so many optional low-priority quests are listed, and routine
  // or non-deadline ones go first. Protected quests, high-priority work, and quests the user explicitly asked
  // for are never trimmed.
  const workload = focusWorkload(quests, day, tuning);
  const askedFor = (q: FocusQuest) => {
    const stance = stances.get(q.id);
    if (stance?.action === "include" || (stance?.action === "keep" && stance.inFocus === true)) return true;
    return ai.get(q.id)?.include === true && memory.preferences.some(p => p.taskId === q.id);
  };
  const optionalLow = (q: FocusQuest) => !protectedFocus(q, day) && !isHighPriority(q) && !askedFor(q);
  const lowPicks = candidates.filter(optionalLow)
    .sort((a, b) => Number(isRoutine(a)) - Number(isRoutine(b)) || Number(b.questType === "deadline") - Number(a.questType === "deadline") || compare(a, b))
    .filter(q => tuning.routinesAllowed[workload.level] || !isRoutine(q))
    .slice(0, tuning.lowPriorityExtras[workload.level]);
  const allowedLow = new Set(lowPicks.map(q => q.id));
  const listed = candidates.filter(q => !optionalLow(q) || allowedLow.has(q.id));
  const heldBack = candidates.length - listed.length;
  const kept = listed.slice(0, Math.max(10, protectedCount));
  for (const q of kept) {
    const due = dateOnly(q.dueDate);
    const stance = stances.get(q.id);
    const stanceReason = stance?.action === "include" ? "You moved this into Smart Focus."
      : stance?.action === "keep" && stance.inFocus === true ? "You confirmed this belongs in Smart Focus." : "";
    reasons[q.id] = protectedFocus(q, day)
      ? due && due <= day ? "Protected: overdue or due today." : "Protected: starts today."
      : stanceReason || ai.get(q.id)?.reason || (isHighPriority(q) ? "High-priority work ready to start." : "Start date reached or important deadline approaching.");
    if (!protectedFocus(q, day) && memory.enabled && (signals.get(q.id) ?? 0) >= 3) {
      reasons[q.id] += " Slightly lowered after removals on at least 3 distinct days; this is not a permanent exclusion.";
    }
  }
  const base = advice ? "AI-assisted order with date and priority safeguards." : "Rules-based focus. AI has not ranked this list.";
  const dayLabel = { light: "Light", normal: "Full", busy: "Busy", heavy: "Heavy" }[workload.level];
  const note = heldBack > 0 ? ` ${dayLabel} day: ${heldBack} lower-priority ${heldBack === 1 ? "quest" : "quests"} held back.` : "";
  return { ids: kept.map(q => q.id), reasons, day, total: listed.length, protectedCount, workload, heldBack,
    mode: advice ? "ai" : "rules", message: base + note };
}

// The three kinds of quest a user can create. Stored in tasks.quest_type and exported to CSV.
export const QUEST_TYPES = ["reminder", "deadline", "general"] as const;
export type QuestType = (typeof QUEST_TYPES)[number];

// Quests that predate the field, or arrive without one (Notion sync, CSV import), count as general.
export const DEFAULT_QUEST_TYPE: QuestType = "general";

export const QUEST_TYPE_LABELS: Record<QuestType, string> = {
  reminder: "Reminder",
  deadline: "Deadline",
  general: "General to-do",
};

export function isQuestType(value: unknown): value is QuestType {
  return typeof value === "string" && (QUEST_TYPES as readonly string[]).includes(value);
}

export function questTypeLabel(value: string | null | undefined): string {
  return QUEST_TYPE_LABELS[isQuestType(value) ? value : DEFAULT_QUEST_TYPE];
}

// Accepts a stored value ("deadline") or a CSV label ("General to-do"), ignoring case and spacing.
// Anything blank or unrecognised falls back to the default instead of failing a whole import.
export function parseQuestType(raw: string | null | undefined): QuestType {
  const key = (raw ?? "").trim().toLowerCase();
  if (isQuestType(key)) return key;
  const byLabel = QUEST_TYPES.find((type) => QUEST_TYPE_LABELS[type].toLowerCase() === key);
  return byLabel ?? DEFAULT_QUEST_TYPE;
}

const IMPORTANCE_RANK: Record<string, number> = {
  Pareto: 6, High: 5, "Med-High": 4, Medium: 3, "Med-Low": 2, Low: 1,
};

// Quests of one type, soonest due date first (undated last), ties broken by higher importance.
export function compareByDueDateThenImportance(
  a: { dueDate?: string | Date | null; importance?: string | null },
  b: { dueDate?: string | Date | null; importance?: string | null },
): number {
  const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
  const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
  if (aTime !== bTime) return aTime < bTime ? -1 : 1;
  return (IMPORTANCE_RANK[b.importance ?? ""] ?? 0) - (IMPORTANCE_RANK[a.importance ?? ""] ?? 0);
}

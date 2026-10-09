import type { Task } from "../shared/schema";
import { parseQuestType, questTypeLabel, type QuestType } from "../shared/quest-type";

export const TASK_CSV_HEADERS = [
  "ID", "Title", "Description", "Details", "Duration (min)", "Gold Value", "Importance",
  "Kanban Stage", "Recurrence", "Campaign", "Business/Work Filter", "Quest Type", "Due Date",
  "Completed", "Completed At", "Created At", "Skill Tags", "Apple", "Smart Prep", "Delegation",
  "Velin", "Assigned To",
] as const;

// Quotes a field when it contains a comma, quote or newline.
export function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const formatDate = (date: Date | string | null | undefined): string => (date ? new Date(date).toISOString() : "");

export function buildTasksCsv(tasks: Task[]): string {
  const rows = tasks.map((task) => [
    task.id,
    escapeCsvField(task.title),
    escapeCsvField(task.description),
    escapeCsvField(task.details),
    task.duration,
    task.goldValue,
    escapeCsvField(task.importance),
    escapeCsvField(task.kanbanStage),
    escapeCsvField(task.recurType),
    escapeCsvField(task.campaign),
    escapeCsvField(task.businessWorkFilter),
    escapeCsvField(questTypeLabel(task.questType)),
    formatDate(task.dueDate),
    task.completed ? "Yes" : "No",
    formatDate(task.completedAt),
    formatDate(task.createdAt),
    escapeCsvField(task.skillTags?.join("; ")),
    task.apple ? "Yes" : "No",
    task.smartPrep ? "Yes" : "No",
    task.delegationTask ? "Yes" : "No",
    task.velin ? "Yes" : "No",
    escapeCsvField(task.assignedTo ?? "Alex"),
  ].join(","));
  return [TASK_CSV_HEADERS.join(","), ...rows].join("\n");
}

export type ParsedCsvTask = {
  title: string; description: string | null; details: string | null; duration: number; goldValue: number;
  importance: string; kanbanStage: string; recurType: string; campaign: string | null;
  businessWorkFilter: string | null; questType: QuestType; dueDate: Date | null; skillTags: string[];
  apple: boolean; smartPrep: boolean; delegationTask: boolean; velin: boolean; assignedTo: string; completed: false;
};

const parseBoolean = (v: string | undefined) => v?.toLowerCase() === "yes" || v === "1" || v?.toLowerCase() === "true";
const parseDate = (v: string | undefined) => (v && v.trim() ? new Date(v.trim()) : null);
const parseNum = (v: string | undefined, fallback: number) => {
  const n = parseInt(v ?? "", 10);
  return isNaN(n) ? fallback : n;
};

// One CSV row (keyed by header) to a task. A missing "Quest Type" column, as in CSVs exported before
// it existed, becomes the default rather than an error.
export function parseTaskCsvRow(r: Record<string, string>): ParsedCsvTask {
  return {
    title: r["Title"]?.trim() || "",
    description: r["Description"]?.trim() || null,
    details: r["Details"]?.trim() || null,
    duration: parseNum(r["Duration (min)"], 30),
    goldValue: parseNum(r["Gold Value"], 10),
    importance: r["Importance"]?.trim() || "Medium",
    kanbanStage: r["Kanban Stage"]?.trim() || "todo",
    recurType: r["Recurrence"]?.trim() || "none",
    campaign: r["Campaign"]?.trim() || null,
    businessWorkFilter: r["Business/Work Filter"]?.trim() || null,
    questType: parseQuestType(r["Quest Type"]),
    dueDate: parseDate(r["Due Date"]),
    skillTags: r["Skill Tags"] ? r["Skill Tags"].split(";").map((s) => s.trim()).filter(Boolean) : [],
    apple: parseBoolean(r["Apple"]),
    smartPrep: parseBoolean(r["Smart Prep"]),
    delegationTask: parseBoolean(r["Delegation"]),
    velin: parseBoolean(r["Velin"]),
    assignedTo: r["Assigned To"]?.trim() || "Alex",
    completed: false,
  };
}

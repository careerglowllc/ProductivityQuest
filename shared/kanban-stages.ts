// The kanban stages a quest can be in. Creating a quest and editing one offer exactly these, in this order, so a quest made
// with a stage can always be shown and changed later. "Not Started" is the name Notion uses for the first stage too.
export const KANBAN_STAGES = [
  { value: "Not Started", emoji: "📋" },
  { value: "In Progress", emoji: "🔄" },
  { value: "Incubate", emoji: "💡" },
  { value: "Review", emoji: "👀" },
  { value: "Done", emoji: "✅" },
] as const;

export type KanbanStage = (typeof KANBAN_STAGES)[number]["value"];
export const DEFAULT_KANBAN_STAGE: KanbanStage = "Not Started";
export const kanbanStageLabel = (stage: { value: string; emoji: string }): string => `${stage.emoji} ${stage.value}`;

// Older quests were made with the name "To Do" (the create screen's first stage) or "todo" (CSV imports), which are the
// first stage under another name. Anything blank is the first stage too. Unknown names are kept as they are.
const FIRST_STAGE_ALIASES = new Set(["", "to do", "todo", "to-do", "not started", "not-started", "notstarted"]);

export function normalizeKanbanStage(stage: string | null | undefined): string {
  const trimmed = (stage ?? "").trim();
  if (FIRST_STAGE_ALIASES.has(trimmed.toLowerCase())) return DEFAULT_KANBAN_STAGE;
  return KANBAN_STAGES.find((s) => s.value.toLowerCase() === trimmed.toLowerCase())?.value ?? trimmed;
}

export const isKanbanStage = (stage: string): stage is KanbanStage => KANBAN_STAGES.some((s) => s.value === stage);

import { isReminder, smartFocus, type FocusBand, type ScheduledQuest } from "@shared/quest-schedule";
import type { FocusRanking } from "./use-smart-focus";

type FocusTask = ScheduledQuest & { id: number; completed?: boolean; recycled?: boolean; questType?: string | null };
export function selectFocus<T extends FocusTask>(tasks: readonly T[], ranking: FocusRanking | undefined, now = new Date()) {
  const active = tasks.filter((task) => !task.completed && !task.recycled && !isReminder(task));
  if (!ranking) return smartFocus(active, now);
  const byId = new Map(active.map((task) => [task.id, task]));
  const quests = Array.from(new Set(ranking.ids)).flatMap((id) => {
    const task = byId.get(id);
    return task ? [task] : [];
  });
  return {
    groups: quests.length ? [{ band: "personalized" as FocusBand | "personalized", label: "Your focus", quests }] : [],
    shown: quests.length,
    total: Math.max(quests.length, ranking.total),
  };
}

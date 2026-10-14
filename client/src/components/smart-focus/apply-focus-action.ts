import { focusGroup, type FocusAction, type FocusQuest } from "@shared/smart-focus-ai";
import type { FocusRanking } from "./use-smart-focus";

// The visible effect of a feedback choice, applied to the list you are looking at straight away. The server then
// re-ranks (and the AI reads your reason), and its answer replaces this.
export function applyFocusAction(ranking: FocusRanking, taskId: number, action: FocusAction, tasks: readonly FocusQuest[]): FocusRanking {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const group = (id: number) => { const task = byId.get(id); return task ? focusGroup(task, ranking.day) : 1; };
  const listed = ranking.ids.includes(taskId);
  const others = ranking.ids.filter((id) => id !== taskId);
  const placeAt = (index: number) => [...others.slice(0, index), taskId, ...others.slice(index)];
  // The list runs from the highest group down, so the front of a group is the first quest in it or below it.
  const firstOf = (g: number) => { const index = others.findIndex((id) => group(id) <= g); return index === -1 ? others.length : index; };
  const afterGroup = (g: number) => { let index = others.length; others.forEach((id, i) => { if (group(id) >= g) index = i + 1; }); return index; };

  let ids = ranking.ids;
  const reasons = { ...ranking.reasons };
  const note = (text: string) => { const key = String(taskId); reasons[key] = reasons[key]?.includes(text) ? reasons[key] : [reasons[key], text].filter(Boolean).join(" "); };

  if (action === "exclude") ids = others;
  else if (action === "include" && !listed) {
    // A moved-in quest leads the main group, just below what is overdue, due or starting today.
    ids = placeAt(firstOf(1)); note("You moved this into Smart Focus.");
  } else if (action === "include") note("You moved this into Smart Focus.");
  else if (action === "higher" && listed) { ids = placeAt(firstOf(group(taskId))); note("You asked for this to rank higher."); }
  else if (action === "lower" && listed) { ids = placeAt(afterGroup(group(taskId))); note("You asked for this to rank lower."); }
  return { ...ranking, ids, reasons, total: Math.max(0, ranking.total + ids.length - ranking.ids.length) };
}

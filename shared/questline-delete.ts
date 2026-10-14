// Deleting a quest that has quests after it in a questline (A -> B -> C, delete B): the user chooses
// to delete those too, or keep them and move them up (A -> C). This is the logic for both choices.

export interface QuestNode {
  id: number;
  title?: string | null;
  parentTaskId?: number | null;
  indentLevel?: number | null;
  completed?: boolean | null;
  recycled?: boolean | null;
}

export type ChildrenChoice = "delete" | "promote";
export interface Reparent { id: number; parentTaskId: number | null; indentLevel: number }

const isActive = (task: QuestNode) => !task.completed && !task.recycled;

// A quest's ancestors, nearest first. Stops at a parent that is not in the list, or at a loop.
function ancestorsOf(byId: Map<number, QuestNode>, task: QuestNode): QuestNode[] {
  const chain: QuestNode[] = [];
  const seen = new Set([task.id]);
  let current = task.parentTaskId != null ? byId.get(task.parentTaskId) : undefined;
  while (current && !seen.has(current.id)) {
    chain.push(current);
    seen.add(current.id);
    current = current.parentTaskId != null ? byId.get(current.parentTaskId) : undefined;
  }
  return chain;
}

/**
 * What to do when `requested` quests are deleted. Only quests that are still active can be deleted.
 *  - "delete": the active quests nested under them are deleted too.
 *  - "promote": nothing else is deleted; what was under them moves up to the nearest quest that stays.
 * Finished or already-deleted quests under a deleted one are never deleted, but they move up too, so
 * nothing is left pointing at a deleted quest. `reparent` lists only the quests whose place changes.
 */
export function planChildren<T extends QuestNode>(
  tasks: readonly T[], requested: Iterable<number>, choice: ChildrenChoice,
): { deleteIds: number[]; reparent: Reparent[] } {
  const byId = new Map<number, QuestNode>(tasks.map((task) => [task.id, task]));
  const doomed = new Set<number>();
  for (const id of Array.from(requested)) {
    const task = byId.get(id);
    if (task && isActive(task)) doomed.add(id);
  }
  if (choice === "delete") {
    for (let grew = true; grew;) {
      grew = false;
      for (const task of tasks) {
        if (doomed.has(task.id) || !isActive(task) || task.parentTaskId == null || !doomed.has(task.parentTaskId)) continue;
        doomed.add(task.id);
        grew = true;
      }
    }
  }

  const reparent: Reparent[] = [];
  for (const task of [...tasks].sort((a, b) => a.id - b.id)) {
    if (doomed.has(task.id)) continue;
    const chain = ancestorsOf(byId, task);
    const removed = chain.filter((ancestor) => doomed.has(ancestor.id)).length;
    if (removed === 0) continue;
    const parentTaskId = chain.find((ancestor) => !doomed.has(ancestor.id))?.id ?? null;
    const before = task.indentLevel ?? chain.length;
    const indentLevel = Math.max(0, before - removed);
    if (parentTaskId !== (task.parentTaskId ?? null) || indentLevel !== (task.indentLevel ?? chain.length)) {
      reparent.push({ id: task.id, parentTaskId, indentLevel });
    }
  }
  return { deleteIds: Array.from(doomed), reparent };
}

export interface ChildrenAtStake {
  deleting: string[];      // titles of the quests being deleted
  children: string[];      // titles of the active quests after them that would be affected
  connectsTo: string[];    // titles the direct children would connect to if kept
  toTop: boolean;          // some would become a first quest of the questline
}

/** Null when none of the quests being deleted has an active quest after it. */
export function childrenAtStake<T extends QuestNode>(tasks: readonly T[], requested: Iterable<number>): ChildrenAtStake | null {
  const byId = new Map<number, QuestNode>(tasks.map((task) => [task.id, task]));
  const { deleteIds, reparent } = planChildren(tasks, requested, "promote");
  const doomed = new Set(deleteIds);
  const direct = tasks.filter((task) => isActive(task) && !doomed.has(task.id) && task.parentTaskId != null && doomed.has(task.parentTaskId));
  if (direct.length === 0) return null;

  const affected = new Set(direct.map((task) => task.id));
  for (let grew = true; grew;) {
    grew = false;
    for (const task of tasks) {
      if (affected.has(task.id) || doomed.has(task.id) || !isActive(task) || task.parentTaskId == null || !affected.has(task.parentTaskId)) continue;
      affected.add(task.id);
      grew = true;
    }
  }

  const title = (task: QuestNode | undefined) => task?.title?.trim() || "Untitled quest";
  const moves = new Map(reparent.map((move) => [move.id, move.parentTaskId]));
  const connectsTo = new Set<string>();
  let toTop = false;
  for (const task of direct) {
    const parentId = moves.has(task.id) ? moves.get(task.id)! : task.parentTaskId ?? null;
    const parent = parentId != null ? byId.get(parentId) : undefined;
    if (parent) connectsTo.add(title(parent)); else toTop = true;
  }
  return {
    deleting: deleteIds.map((id) => title(byId.get(id))),
    children: tasks.filter((task) => affected.has(task.id)).map(title),
    connectsTo: Array.from(connectsTo),
    toTop,
  };
}

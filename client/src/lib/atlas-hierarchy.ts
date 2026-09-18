export interface AtlasHierarchyTask {
  id: number;
  questlineOrder?: number | null;
  parentTaskId?: number | null;
  indentLevel?: number | null;
}

export function buildAtlasHierarchy<T extends AtlasHierarchyTask>(tasks: T[]) {
  const ordered = [...tasks].sort((a, b) => (a.questlineOrder ?? 0) - (b.questlineOrder ?? 0) || a.id - b.id);
  const ids = new Set(ordered.map((task) => task.id));
  const hasLinks = ordered.some((task) => task.parentTaskId != null);
  const parents = new Map<number, number | null>();
  if (!hasLinks && ordered.some((task) => (task.indentLevel ?? 0) > 0)) {
    const stack: T[] = [];
    ordered.forEach((task) => {
      const depth = Math.max(0, task.indentLevel ?? 0);
      while (stack.length > depth) stack.pop();
      parents.set(task.id, depth > 0 ? stack[depth - 1]?.id ?? null : null);
      stack[depth] = task;
      stack.length = depth + 1;
    });
  } else {
    ordered.forEach((task) => parents.set(task.id, task.parentTaskId != null && ids.has(task.parentTaskId) && task.parentTaskId !== task.id ? task.parentTaskId : null));
  }
  ordered.forEach((task) => {
    const seen = new Set<number>();
    let cursor: number | null | undefined = task.id;
    while (cursor != null) {
      if (seen.has(cursor)) { parents.set(cursor, null); break; }
      seen.add(cursor); cursor = parents.get(cursor);
    }
  });
  const children = new Map<number | null, T[]>();
  ordered.forEach((task) => {
    const parent = parents.get(task.id) ?? null;
    const siblings = children.get(parent) ?? [];
    siblings.push(task); children.set(parent, siblings);
  });
  return { ordered, parents, children };
}
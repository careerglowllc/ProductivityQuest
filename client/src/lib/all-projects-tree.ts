import { buildAtlasHierarchy, type AtlasHierarchyTask } from "@/lib/atlas-hierarchy";

export type ProjectTree<T extends AtlasHierarchyTask> = { id: number; title: string; completed?: boolean | null; tasks: T[] };
export type AllProjectsPoint<T> = { key: string; projectId: number; task?: T; x: number; y: number; depth: number; angle: number; parentKey: string };

export function buildAllProjectsLayout<T extends AtlasHierarchyTask>(projects: ProjectTree<T>[]) {
  const usable = projects;
  const taskCount = usable.reduce((sum, project) => sum + project.tasks.length, 0);
  const maxDepth = Math.max(1, ...usable.map((project) => {
    const hierarchy = buildAtlasHierarchy(project.tasks);
    const depthOf = (task: T, depth = 1): number => Math.max(depth, ...(hierarchy.children.get(task.id) ?? []).map(child => depthOf(child, depth + 1)));
    return Math.max(1, ...(hierarchy.children.get(null) ?? []).map(task => depthOf(task)));
  }));
  const size = Math.max(840, 560 + maxDepth * 246 + Math.sqrt(taskCount) * 66 + usable.length * 38);
  const center = size / 2;
  const points: AllProjectsPoint<T>[] = [];
  const links: Array<{ from: string; to: string; colorIndex: number; complete: boolean }> = [];
  const roots = usable.length || 1;

  usable.forEach((project, projectIndex) => {
    const hierarchy = buildAtlasHierarchy(project.tasks);
    const sector = (Math.PI * 2) / roots;
    const mid = -Math.PI / 2 + projectIndex * sector;
    const projectKey = `project-${project.id}`;
    points.push({ key: projectKey, projectId: project.id, x: center + Math.cos(mid) * 118, y: center + Math.sin(mid) * 118, depth: 0, angle: mid, parentKey: "hub" });
    links.push({ from: "hub", to: projectKey, colorIndex: projectIndex, complete: !!project.completed });
    const leafCount = new Map<number, number>();
    const leaves = (task: T, lineage = new Set<number>()): number => {
      if (lineage.has(task.id)) return 1;
      const next = new Set(lineage); next.add(task.id);
      const children = hierarchy.children.get(task.id) ?? [];
      const count = children.length ? children.reduce((sum, child) => sum + leaves(child, next), 0) : 1;
      leafCount.set(task.id, count); return count;
    };
    (hierarchy.children.get(null) ?? []).forEach(task => leaves(task));
    const totalLeaves = Math.max(1, (hierarchy.children.get(null) ?? []).reduce((sum, task) => sum + (leafCount.get(task.id) ?? 1), 0));
    const span = Math.min(sector * .84, Math.PI * .88);
    let cursor = mid - span / 2;
    const place = (task: T, depth: number, parentKey: string, start: number) => {
      const share = ((leafCount.get(task.id) ?? 1) / totalLeaves) * span;
      const angle = start + share / 2;
      const key = `${project.id}:${task.id}`;
      // Wide project sectors receive a little more radial room, avoiding label collisions
      // without changing the branch's angular family.
      const radius = 228 + Math.min(156, totalLeaves * 5) + (depth - 1) * 154;
      points.push({ key, projectId: project.id, task, x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius, depth, angle, parentKey });
      links.push({ from: parentKey, to: key, colorIndex: projectIndex, complete: !!(task as T & { completed?: boolean; recycled?: boolean }).completed || !!(task as T & { recycled?: boolean }).recycled });
      let childStart = start;
      (hierarchy.children.get(task.id) ?? []).forEach(child => {
        place(child, depth + 1, key, childStart);
        childStart += ((leafCount.get(child.id) ?? 1) / totalLeaves) * span;
      });
    };
    (hierarchy.children.get(null) ?? []).forEach(task => {
      place(task, 1, projectKey, cursor);
      cursor += ((leafCount.get(task.id) ?? 1) / totalLeaves) * span;
    });
  });
  return { size, center, points, links };
}
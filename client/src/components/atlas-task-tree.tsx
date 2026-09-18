import { Check, Circle } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { buildAtlasHierarchy, type AtlasHierarchyTask } from "@/lib/atlas-hierarchy";
import "./atlas-task-tree.css";

export interface AtlasTask extends AtlasHierarchyTask {
  id: number;
  title: string;
  completed: boolean;
  recycled?: boolean | null;
  goldValue?: number;
}

type Point = { x: number; y: number; depth: number };

export function AtlasTaskTree<T extends AtlasTask>({ title, tasks, rootIcon, selectedTaskId, onSelectTask, onToggleTask, onEditTask, actionLabel, isTaskActionPending }: {
  title: string;
  tasks: T[];
  rootIcon?: ReactNode;
  selectedTaskId?: number | null;
  onSelectTask?: (task: T) => void;
  onToggleTask?: (task: T) => void;
  onEditTask?: (task: T) => void;
  actionLabel?: string;
  isTaskActionPending?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const hierarchy = useMemo(() => buildAtlasHierarchy(tasks), [tasks]);
  const layout = useMemo(() => {
    const points = new Map<number, Point>();
    let leaf = 0; let maxDepth = 0;
    const visit = (task: T, depth: number): number => {
      maxDepth = Math.max(maxDepth, depth);
      const children = hierarchy.children.get(task.id) ?? [];
      const x = children.length ? children.reduce((sum, child) => sum + visit(child, depth + 1), 0) / children.length : 74 + leaf++ * 164;
      points.set(task.id, { x, y: 142 + depth * 132, depth }); return x;
    };
    const roots = hierarchy.children.get(null) ?? [];
    roots.forEach((task) => visit(task, 1));
    const naturalWidth = Math.max(330, leaf * 164 + 48);
    const sceneWidth = Math.max(width || 330, naturalWidth);
    const shift = Math.max(0, (sceneWidth - naturalWidth) / 2);
    points.forEach((point, id) => points.set(id, { ...point, x: point.x + shift }));
    return { points, width: sceneWidth, height: Math.max(350, 142 + maxDepth * 132 + 90), rootX: sceneWidth / 2 };
  }, [hierarchy, width]);
  const selected = tasks.find((task) => task.id === selectedTaskId);
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <section className="task-atlas" aria-label={`${title} quest tree`}>
    <div className="task-atlas-scroll" ref={viewportRef}>
      {layout.width > width + 8 && <span className="task-atlas-scroll-cue">Swipe sideways for branches</span>}
      <div className="task-atlas-scene" style={{ width: layout.width, height: layout.height }}>
        <div className="task-atlas-stars" />
        <svg className="task-atlas-lines" width={layout.width} height={layout.height} aria-hidden="true">
          {hierarchy.ordered.map((task) => {
            const point = layout.points.get(task.id); const parentId = hierarchy.parents.get(task.id);
            if (!point) return null;
            const parent = parentId != null ? layout.points.get(parentId) : { x: layout.rootX, y: 58 };
            if (!parent) return null;
            return <path key={task.id} className={task.completed || task.recycled ? "is-complete" : ""} d={`M ${parent.x} ${parentId != null ? parent.y + 17 : 38} C ${parent.x} ${parent.y + 82}, ${point.x} ${point.y - 52}, ${point.x} ${point.y + 17}`} />;
          })}
        </svg>
        <div className="task-atlas-root" style={{ left: layout.rootX }}><span className="task-atlas-root-orb">{rootIcon}</span><strong>{title}</strong><small>{tasks.filter(t => t.completed || t.recycled).length} / {tasks.length} complete</small></div>
        {hierarchy.ordered.map((task) => {
          const point = layout.points.get(task.id)!; const done = task.completed || task.recycled;
          return <button key={task.id} type="button" className={`task-atlas-node ${done ? "is-complete" : ""} ${selectedTaskId === task.id ? "is-selected" : ""}`} style={{ left: point.x, top: point.y } as CSSProperties} onClick={() => onSelectTask?.(task)} aria-pressed={selectedTaskId === task.id} aria-label={`${task.title}, ${done ? "complete" : "in progress"}`} title={task.title}>
            <span className="task-atlas-orb">{done ? <Check size={14} /> : <Circle size={11} />}</span><b>{task.title}</b><small>{point.depth === 1 ? "Quest" : "Subquest"}</small>
          </button>;
        })}
        {!tasks.length && <p className="task-atlas-empty">No quests have been added to this questline.</p>}
      </div>
    </div>
    {selected && <div className="task-atlas-detail"><span>{selected.completed || selected.recycled ? "Complete" : "In progress"}</span><strong>{selected.title}</strong>{onEditTask && <button type="button" onClick={() => onEditTask(selected)}>{actionLabel ?? "Edit quest"}</button>}{onToggleTask && <button type="button" disabled={isTaskActionPending} onClick={() => onToggleTask(selected)}>{selected.completed || selected.recycled ? "Mark in progress" : "Mark complete"}</button>}</div>}
  </section>;
}
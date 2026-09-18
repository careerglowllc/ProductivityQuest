import { Check, Circle, Focus, Maximize2, Target } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { buildAllProjectsLayout } from "@/lib/all-projects-tree";
import type { AtlasTask } from "@/components/atlas-task-tree";
import "./all-projects-tree.css";

type Project<T extends AtlasTask> = { id: number; title: string; completed?: boolean | null; icon?: string | null; tasks: T[] };
const colors = ["#8877d8", "#dd846e", "#449f9a", "#c99746", "#a4689d", "#668bc6"];

export function AllProjectsTree<T extends AtlasTask>({ projects, onOpenProject }: { projects: Project<T>[]; onOpenProject: (projectId: number) => void }) {
  const layout = useMemo(() => buildAllProjectsLayout(projects), [projects]);
  const [selected, setSelected] = useState<{ project: Project<T>; task?: T } | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const byKey = useMemo(() => new Map(layout.points.map(point => [point.key, point])), [layout]);
  const fit = () => setTransform({ x: 0, y: 0, scale: fitScale });
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const padding = 32;
      const nextFit = Math.min(1, Math.max(.22, Math.min((viewport.clientWidth - padding) / layout.size, (viewport.clientHeight - padding) / layout.size)));
      setFitScale(nextFit);
      setTransform({ x: 0, y: 0, scale: nextFit });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport); measure();
    return () => observer.disconnect();
  }, [layout.size]);
  const endPan = (event?: PointerEvent<HTMLDivElement>) => {
    if (!event || drag.current?.pointerId === event.pointerId) drag.current = null;
  };
  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button") || drag.current) return;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: transform.x, originY: transform.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pan = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    setTransform(current => ({ ...current, x: drag.current!.originX + event.clientX - drag.current!.x, y: drag.current!.originY + event.clientY - drag.current!.y }));
  };
  const selectedProject = selected?.project;
  return <section className="all-projects-tree" aria-label="All Projects Tree">
    <header className="all-projects-tree__header"><div><span>Constellation index</span><h2>All Projects Tree</h2></div><p>Drag to explore · use controls to zoom</p></header>
    <div ref={viewportRef} className="all-projects-tree__viewport" onPointerDown={startPan} onPointerMove={pan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan}>
      <div className="all-projects-tree__controls"><button type="button" onClick={() => setTransform(value => ({ ...value, scale: Math.min(Math.max(1.8, fitScale * 4), value.scale + Math.max(.1, fitScale * .22)) }))} aria-label="Zoom in">+</button><button type="button" onClick={() => setTransform(value => ({ ...value, scale: Math.max(fitScale * .45, value.scale - Math.max(.1, fitScale * .22)) }))} aria-label="Zoom out">−</button><button type="button" onClick={fit} aria-label="Fit tree"><Maximize2 size={14} /></button></div>
      <div className="all-projects-tree__world" style={{ width: layout.size, height: layout.size, marginLeft: -layout.size / 2, marginTop: -layout.size / 2, transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
        <div className="all-projects-tree__stars" />
        <svg className="all-projects-tree__connectors" viewBox={`0 0 ${layout.size} ${layout.size}`} aria-hidden="true">
          {layout.links.map(link => { const from = link.from === "hub" ? { x: layout.center, y: layout.center } : byKey.get(link.from); const to = byKey.get(link.to); if (!from || !to) return null; return <path key={`${link.from}-${link.to}`} className={link.complete ? "complete" : ""} style={{ stroke: colors[link.colorIndex % colors.length] }} d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2 + (to.y - from.y) * .12} ${(from.y + to.y) / 2 - (to.x - from.x) * .12} ${to.x} ${to.y}`} />; })}
        </svg>
        <div className="all-projects-tree__hub" style={{ left: layout.center, top: layout.center }}><Target size={20}/><b>ALL<br/>PROJECTS</b></div>
        {layout.points.map(point => {
          const project = projects.find(item => item.id === point.projectId)!; const task = point.task; const done = task && (task.completed || task.recycled);
          const isSelected = selected?.project.id === project.id && selected?.task?.id === task?.id;
          return <button key={point.key} type="button" title={task?.title ?? project.title} onClick={() => setSelected({ project, task })} className={`all-projects-tree__node ${task ? "task" : "project"} ${done ? "complete" : ""} ${isSelected ? "selected" : ""}`} style={{ left: point.x, top: point.y, "--project-color": colors[projects.indexOf(project) % colors.length] } as CSSProperties}>
            <i>{task ? (done ? <Check size={13}/> : <Circle size={10}/>) : project.icon || <Focus size={15}/>}</i><b>{task?.title ?? project.title}</b><small>{task ? (done ? "Complete" : "In progress") : `${project.tasks.length} tasks`}</small>
          </button>;
        })}
        {!projects.length && <p className="all-projects-tree__empty">Your whole project constellation will appear here.</p>}
      </div>
    </div>
    {selected && <footer className="all-projects-tree__detail"><span>{selected.task ? (selected.task.completed || selected.task.recycled ? "Complete task" : "In progress task") : "Project root"}</span><strong>{selected.task?.title ?? selectedProject?.title}</strong><button type="button" onClick={() => onOpenProject(selected.project.id)}>Open project atlas</button></footer>}
  </section>;
}
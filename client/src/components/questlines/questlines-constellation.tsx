import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, CalendarDays, Check, Circle, Clock3, Edit3, Focus as FocusIcon, Plus, Target, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import "./questlines-constellation.css";

export type QuestlineNode = {
  id: number;
  title: string;
  description?: string | null;
  completed?: boolean | null;
  recycled?: boolean | null;
  recycledReason?: string | null;
  parentTaskId?: number | null;
  questlineOrder?: number | null;
  goldValue?: number | null;
  kanbanStage?: string | null;
  dueDate?: string | Date | null;
  duration?: number | null;
  importance?: string | null;
};

export type Questline = {
  id: number;
  title: string;
  description?: string | null;
  icon?: string | null;
  completed?: boolean | null;
  tasks: QuestlineNode[];
};

type Props = {
  questlines: Questline[];
  pending?: boolean;
  onCreate: () => void;
  onEditQuestline: (questline: Questline) => void;
  onDeleteQuestline?: (questline: Questline) => void;
  onToggleTask?: (task: QuestlineNode) => void;
  isTaskPending?: (task: QuestlineNode) => boolean;
  onEditTask?: (task: QuestlineNode) => void;
  onDeleteTask?: (task: QuestlineNode) => void;
  isTaskDeletePending?: (task: QuestlineNode) => boolean;
};

type Point = { x: number; y: number };

function edgePoints(from: Point, to: Point, startRadiusPx: number, endRadiusPx: number, canvasSize: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return { start: from, end: to };
  const ux = dx / distance;
  const uy = dy / distance;
  const pxToPercent = 100 / canvasSize;
  return {
    start: {
      x: from.x + ux * startRadiusPx * pxToPercent,
      y: from.y + uy * startRadiusPx * pxToPercent,
    },
    end: {
      x: to.x - ux * endRadiusPx * pxToPercent,
      y: to.y - uy * endRadiusPx * pxToPercent,
    },
  };
}

const tones = ["#73d7cb", "#d5a7f3", "#efb36e", "#e68aa9", "#83b5ef", "#c9d36c"];
const done = (node: QuestlineNode) => Boolean(
  node.completed || (node.recycled && node.recycledReason === "completed"),
);
type NodeStatus = "finished" | "in-progress" | "not-started";
const statusOf = (node: QuestlineNode): NodeStatus => {
  if (done(node) || node.kanbanStage === "Done") return "finished";
  if (node.kanbanStage === "In Progress" || node.kanbanStage === "Review") return "in-progress";
  return "not-started";
};
const statusLabel = (status: NodeStatus) => status === "finished" ? "Finished" : status === "in-progress" ? "In progress" : "Not started";
const formatDuration = (minutes?: number | null) => {
  if (!minutes || minutes <= 0) return "No estimate";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
};
const dueDetails = (value?: string | Date | null) => {
  if (!value) return { label: "No due date", state: "none" };
  // Due dates are calendar days, not instants. The API commonly serializes
  // midnight UTC; rebuilding the YYYY-MM-DD portion locally prevents the date
  // from appearing one day early in western time zones.
  const serialized = typeof value === "string" ? value : "";
  const dateOnly = serialized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const due = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(due.getTime())) return { label: "No due date", state: "none" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const state = dueDay.getTime() < today.getTime() ? "overdue" : dueDay.getTime() === today.getTime() ? "today" : "upcoming";
  return {
    label: state === "today" ? "Due today" : due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: due.getFullYear() === today.getFullYear() ? undefined : "numeric" }),
    state,
  };
};

function descendants(tasks: QuestlineNode[], rootId: number | null) {
  const children = new Map<number | null, QuestlineNode[]>();
  const ids = new Set(tasks.map((task) => task.id));
  tasks.forEach((task) => {
    const parent = task.parentTaskId != null && ids.has(task.parentTaskId) && task.parentTaskId !== task.id ? task.parentTaskId : null;
    children.set(parent, [...(children.get(parent) || []), task]);
  });
  children.forEach((items) => items.sort((a, b) => (a.questlineOrder ?? 0) - (b.questlineOrder ?? 0)));
  const result: QuestlineNode[] = [];
  const visited = new Set<number>();
  const visit = (parent: number | null) => {
    (children.get(parent) || []).forEach((task) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);
      result.push(task);
      visit(task.id);
    });
  };
  visit(rootId);
  // A malformed cycle or orphan should remain visible rather than disappearing.
  tasks.slice().sort((a, b) => (a.questlineOrder ?? 0) - (b.questlineOrder ?? 0)).forEach((task) => {
    if (!visited.has(task.id)) {
      visited.add(task.id);
      result.push(task);
      visit(task.id);
    }
  });
  return { result, children };
}

function iconFor(value?: string | null): ReactNode {
  return value && value.length < 4 ? <span aria-hidden="true">{value}</span> : <Target size={20} aria-hidden="true" />;
}

function Overview({ questlines, onSelect, onCreate }: { questlines: Questline[]; onSelect: (q: Questline) => void; onCreate: () => void }) {
  const points = useMemo(() => {
    const center = { x: 50, y: 49 };
    return questlines.map((questline, index) => {
      const angle = (-90 + (360 / Math.max(questlines.length, 1)) * index) * Math.PI / 180;
      const radius = questlines.length < 4 ? 31 : 37;
      return { questline, point: { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius } };
    });
  }, [questlines]);
  return (
    <section className="ql-stage" aria-label="Questline constellation overview">
      <div className="ql-stage__grain" />
      <header className="ql-stage__header">
        <div>
          <span className="ql-eyebrow">Personal observatory · {questlines.length} north star{questlines.length === 1 ? "" : "s"}</span>
          <h1>Questlines</h1>
          <p>See the shape of the work you are becoming.</p>
        </div>
        <button className="ql-action ql-action--primary" type="button" onClick={onCreate}><Plus size={16} /> New Questline</button>
      </header>
      <div className="ql-overview">
        <div className="ql-nebula" aria-hidden="true"><i /></div>
        <svg className="ql-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {points.map(({ questline, point }) => <path key={questline.id} d={`M50 49 Q${(50 + point.x) / 2} ${(49 + point.y) / 2} ${point.x} ${point.y}`} className={questline.completed ? "is-complete" : ""} />)}
        </svg>
        <div className="ql-overview__hub"><Target size={25} /><span>YOUR<br />HORIZON</span></div>
         {points.map(({ questline, point }, index) => {
          const total = questline.tasks.length;
          const complete = questline.tasks.filter(done).length;
          return <button key={questline.id} type="button" className={`ql-project-node ${questline.completed ? "is-complete" : ""}`} style={{ "--x": `${point.x}%`, "--y": `${point.y}%`, "--tone": tones[index % tones.length], viewTransitionName: `questline-${questline.id}` } as CSSProperties} onClick={() => onSelect(questline)} aria-label={`Open ${questline.title}, ${complete} of ${total} quests complete`}>
            <span className="ql-project-node__orb">{iconFor(questline.icon)}</span>
            <b>{questline.title}</b><small>{complete}/{total} illuminated</small>
          </button>;
        })}
        {!questlines.length && <div className="ql-empty"><Target size={34} /><h2>Your map is waiting</h2><p>Give one meaningful project a north star, then let its branches unfold.</p><button className="ql-action ql-action--primary" type="button" onClick={onCreate}><Plus size={16} /> Create your first questline</button></div>}
      </div>
      <footer className="ql-stage__footer"><span>Each questline opens into its own constellation.</span><span>Tab to travel between stars</span></footer>
    </section>
  );
}

function Focus({ questline, onBack, onEditQuestline, onDeleteQuestline, onToggleTask, isTaskPending, onEditTask, onDeleteTask, isTaskDeletePending }: Omit<Props, "questlines" | "onCreate"> & { questline: Questline; onBack: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const zoomAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  // Connector lines target these MEASURED icon centers/radii (not the mathematical
  // layout position) so they always touch the circle exactly, regardless of how
  // tall a task's wrapped label grows underneath it.
  const iconRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const hubIconRef = useRef<HTMLSpanElement | null>(null);
  const [visualPositions, setVisualPositions] = useState<Map<number | "hub", Point & { r: number }>>(new Map());
  const tasks = useMemo(() => descendants(questline.tasks, null).result, [questline.tasks]);
  // descendants() already keeps the first occurrence of any duplicated ID.
  // Build every downstream map from that normalized list as well.
  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const selected = selectedId ? byId.get(selectedId) : null;
  const hovered = hoveredId ? byId.get(hoveredId) : null;
  const closeDetails = () => {
    setSelectedId(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };
  const openDetails = (taskId: number) => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedId(taskId);
  };
  useEffect(() => {
    if (selectedId == null) return;
    const frame = window.requestAnimationFrame(() => dialogCloseRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDetails();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedId]);
  const depth = (task: QuestlineNode) => {
    let level = 0; let parent = task.parentTaskId ?? null; const seen = new Set<number>();
    while (parent && !seen.has(parent) && byId.has(parent)) { seen.add(parent); level += 1; parent = byId.get(parent)?.parentTaskId ?? null; }
    return level;
  };
  const layout = useMemo(() => {
    const map = new Map<number, Point>();
    const parentOf = new Map<number, number | null>();
    tasks.forEach((task) => {
      const parent = task.parentTaskId;
      parentOf.set(task.id, parent != null && parent !== task.id && byId.has(parent) ? parent : null);
    });

    // Break malformed cycles deterministically so every quest belongs to one visible tree.
    tasks.forEach((task) => {
      const seen = new Set<number>([task.id]);
      let child = task.id;
      let parent = parentOf.get(child) ?? null;
      while (parent != null) {
        if (seen.has(parent)) {
          parentOf.set(child, null);
          break;
        }
        seen.add(parent);
        child = parent;
        parent = parentOf.get(child) ?? null;
      }
    });

    const children = new Map<number, QuestlineNode[]>();
    tasks.forEach((task) => {
      const parent = parentOf.get(task.id);
      if (parent != null) children.set(parent, [...(children.get(parent) || []), task]);
    });
    children.forEach((items) => items.sort((a, b) => (a.questlineOrder ?? 0) - (b.questlineOrder ?? 0)));
    const roots = tasks
      .filter((task) => parentOf.get(task.id) == null)
      .sort((a, b) => (a.questlineOrder ?? 0) - (b.questlineOrder ?? 0));

    const leafWeight = new Map<number, number>();
    const weigh = (task: QuestlineNode): number => {
      const cached = leafWeight.get(task.id);
      if (cached != null) return cached;
      const descendants = children.get(task.id) || [];
      const weight = descendants.length ? descendants.reduce((sum, child) => sum + weigh(child), 0) : 1;
      leafWeight.set(task.id, weight);
      return weight;
    };
    const findDepth = (task: QuestlineNode): number => {
      const descendants = children.get(task.id) || [];
      return descendants.length ? 1 + Math.max(...descendants.map(findDepth)) : 0;
    };
    const maxDepth = roots.length ? Math.max(...roots.map(findDepth)) : 0;
    const totalLeaves = Math.max(1, roots.reduce((sum, root) => sum + weigh(root), 0));
    const branchIndex = new Map<number, number>();
    const ringSpacing = tasks.length > 18 ? 150 : 165;
    const rootRadius = 145;
    const requiredRadius = rootRadius + maxDepth * ringSpacing;
    const circumferenceSize = Math.ceil((totalLeaves * 118) / Math.PI);
    const canvasSize = Math.max(620, requiredRadius * 2 + 210, circumferenceSize);
    const radiusAt = (level: number) => ((rootRadius + level * ringSpacing) / canvasSize) * 100;

    const place = (task: QuestlineNode, level: number, startAngle: number, endAngle: number, branch: number) => {
      const angle = (startAngle + endAngle) / 2;
      const radius = radiusAt(level);
      map.set(task.id, {
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
      });
      branchIndex.set(task.id, branch);
      const descendants = children.get(task.id) || [];
      if (!descendants.length) return;
      const available = endAngle - startAngle;
      let cursor = startAngle;
      descendants.forEach((child) => {
        const span = available * (weigh(child) / weigh(task));
        place(child, level + 1, cursor, cursor + span, branch);
        cursor += span;
      });
    };

    const rootSpan = (Math.PI * 2) / Math.max(roots.length, 1);
    roots.forEach((root, index) => {
      // Root quests always occupy evenly spaced spokes. A large subtree gets
      // more room inside its own spoke, but never pushes neighboring roots
      // around the center ring.
      const center = -Math.PI / 2 + index * rootSpan;
      const usedSpan = Math.min(rootSpan * 0.82, Math.PI * 0.82);
      place(root, 0, center - usedSpan / 2, center + usedSpan / 2, index);
    });

    return { positions: map, parentOf, branchIndex, canvasSize, dense: tasks.length > 18 || maxDepth > 4 };
  }, [tasks, byId]);
  // Re-measure real icon centers/radii after every layout, zoom, or resize change —
  // wrapped labels of very different lengths shift each icon's actual on-screen
  // center relative to its mathematical (x, y) anchor.
  useEffect(() => {
    const canvas = scrollRef.current?.querySelector<HTMLElement>(".ql-focus-canvas");
    if (!canvas) return;
    const measure = () => {
      const canvasRect = canvas.getBoundingClientRect();
      if (canvasRect.width <= 0 || canvasRect.height <= 0) return;
      const next = new Map<number | "hub", Point & { r: number }>();
      const toPercent = (rect: DOMRect) => ({
        x: ((rect.left + rect.width / 2) - canvasRect.left) / canvasRect.width * 100,
        y: ((rect.top + rect.height / 2) - canvasRect.top) / canvasRect.height * 100,
        r: (rect.width / 2) || 12.5,
      });
      iconRefs.current.forEach((el, id) => next.set(id, toPercent(el.getBoundingClientRect())));
      if (hubIconRef.current) next.set("hub", toPercent(hubIconRef.current.getBoundingClientRect()));
      setVisualPositions(next);
    };
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [tasks, layout, zoom]);
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return;
      frame = window.requestAnimationFrame(() => {
        const space = scroll.querySelector<HTMLElement>(".ql-focus-space");
        if (!space) return;
        // The transformed canvas is centered inside this reachable scroll plane.
        // Center against the plane so CSS translation is never double-counted.
        scroll.scrollLeft = Math.max(0, space.offsetLeft + space.offsetWidth / 2 - scroll.clientWidth / 2);
        scroll.scrollTop = Math.max(0, space.offsetTop + space.offsetHeight / 2 - scroll.clientHeight / 2);
        observer.disconnect();
      });
    });
    observer.observe(scroll);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [questline.id, layout.canvasSize]);
  useEffect(() => {
    const scroll = scrollRef.current;
    const anchor = zoomAnchorRef.current;
    if (!scroll || !anchor) return;
    const frame = window.requestAnimationFrame(() => {
      scroll.scrollLeft = Math.max(0, anchor.x * scroll.scrollWidth - scroll.clientWidth / 2);
      scroll.scrollTop = Math.max(0, anchor.y * scroll.scrollHeight - scroll.clientHeight / 2);
      zoomAnchorRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [zoom]);
  const changeZoom = (next: number) => {
    const scroll = scrollRef.current;
    if (scroll) {
      zoomAnchorRef.current = {
        x: (scroll.scrollLeft + scroll.clientWidth / 2) / Math.max(scroll.scrollWidth, 1),
        y: (scroll.scrollTop + scroll.clientHeight / 2) / Math.max(scroll.scrollHeight, 1),
      };
    }
    setZoom(Math.min(2, Math.max(0.5, Math.round(next * 100) / 100)));
  };
  const centerMap = () => {
    const scroll = scrollRef.current;
    const space = scroll?.querySelector<HTMLElement>(".ql-focus-space");
    if (!scroll || !space) return;
    scroll.scrollTo({
      left: Math.max(0, space.offsetLeft + space.offsetWidth / 2 - scroll.clientWidth / 2),
      top: Math.max(0, space.offsetTop + space.offsetHeight / 2 - scroll.clientHeight / 2),
      behavior: "smooth",
    });
  };
  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    // Buttons must retain their native pointer sequence so a tap/click can open
    // details. Panning/pinching begins only from the constellation's empty surface.
    const isInteractive = (event.target as Element).closest("button, a, input, select, textarea, [role='button']");
    if (event.pointerType === "touch" && !isInteractive) {
      scroll.setPointerCapture(event.pointerId);
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointersRef.current.size === 2) {
        // A second finger landed — hand off from single-finger panning to pinch-zoom.
        dragRef.current = null;
        scroll.classList.remove("is-panning");
        const [a, b] = Array.from(activePointersRef.current.values());
        pinchRef.current = { startDist: Math.hypot(b.x - a.x, b.y - a.y), startZoom: zoom };
        return;
      }
      if (activePointersRef.current.size > 2) return;
    }
    if (event.button !== 0 || isInteractive) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: scroll.scrollLeft, top: scroll.scrollTop, moved: false };
    scroll.setPointerCapture(event.pointerId);
  };
  const movePan = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pinchRef.current && activePointersRef.current.size === 2) {
      event.preventDefault();
      suppressClickRef.current = true;
      const [a, b] = Array.from(activePointersRef.current.values());
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      const nextZoom = Math.min(2, Math.max(0.5, Math.round((pinchRef.current.startZoom * (distance / pinchRef.current.startDist)) * 100) / 100));
      const rect = scroll.getBoundingClientRect();
      zoomAnchorRef.current = {
        x: (scroll.scrollLeft + ((a.x + b.x) / 2 - rect.left)) / Math.max(scroll.scrollWidth, 1),
        y: (scroll.scrollTop + ((a.y + b.y) / 2 - rect.top)) / Math.max(scroll.scrollHeight, 1),
      };
      setZoom(nextZoom);
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    suppressClickRef.current = true;
    scroll.classList.add("is-panning");
    scroll.scrollLeft = drag.left - dx;
    scroll.scrollTop = drag.top - dy;
    event.preventDefault();
  };
  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const wasPinching = pinchRef.current !== null;
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) pinchRef.current = null;
    if (wasPinching) window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    scrollRef.current?.classList.remove("is-panning");
    if (drag.moved) window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  };
  const progress = questline.tasks.length ? Math.round((questline.tasks.filter(done).length / questline.tasks.length) * 100) : 0;
  return <section className="ql-stage ql-stage--focus" aria-label={`${questline.title} questline`}>
    <div className="ql-stage__grain" />
    <header className="ql-focus-header">
      <button className="ql-back" type="button" onClick={onBack}><ArrowLeft size={16} /> All questlines</button>
      <div><span className="ql-eyebrow">Questline · {progress}% illuminated</span><h1>{questline.title}</h1>{questline.description && <p>{questline.description}</p>}</div>
      <div className="ql-header-actions"><button type="button" className="ql-icon-action" onClick={() => onEditQuestline(questline)} aria-label="Edit questline"><Edit3 size={16} /></button>{onDeleteQuestline && <button type="button" className="ql-icon-action ql-icon-action--danger" onClick={() => onDeleteQuestline(questline)} aria-label="Delete questline"><Trash2 size={16} /></button>}</div>
    </header>
      <div className="ql-focus-map">
       <div ref={scrollRef} className="ql-focus-scroll" role="region" aria-label="Pannable and zoomable quest constellation" onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onWheel={(event) => { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); changeZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1)); }} onClickCapture={(event) => { if (suppressClickRef.current) { event.preventDefault(); event.stopPropagation(); } }}>
         <div className="ql-focus-space" style={{ minWidth: `max(100%, ${layout.canvasSize * zoom}px)`, minHeight: `max(100%, ${layout.canvasSize * zoom}px)` }}>
          <div className={`ql-focus-canvas ${layout.dense ? "is-dense" : ""}`} style={{ width: `${layout.canvasSize * zoom}px`, height: `${layout.canvasSize * zoom}px` }}>
          <div className="ql-focus-orbit ql-focus-orbit--one" /><div className="ql-focus-orbit ql-focus-orbit--two" />
           <div className="ql-focus-hub" style={{ viewTransitionName: `questline-${questline.id}` } as CSSProperties} aria-label={`${questline.title}, ${questline.tasks.length} quests`}>
             <span ref={hubIconRef} className="ql-focus-hub__mark" aria-hidden="true"><Target size={18} /></span>
             <strong>{questline.title}</strong>
             <small>{questline.tasks.length} quest{questline.tasks.length === 1 ? "" : "s"}</small>
           </div>
           <svg className="ql-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{tasks.flatMap((task) => { const parent = layout.parentOf.get(task.id); const fromLayout = parent != null && layout.positions.has(parent) ? layout.positions.get(parent)! : { x: 50, y: 50 }; const fromVisual = parent != null ? visualPositions.get(parent) : visualPositions.get("hub"); const from = fromVisual ?? fromLayout; const toLayout = layout.positions.get(task.id); const toVisual = visualPositions.get(task.id); const to = toVisual ?? toLayout; const tone = tones[(layout.branchIndex.get(task.id) ?? 0) % tones.length]; if (!to) return []; const startRadius = fromVisual?.r ?? (parent == null ? 56 : 12.5); const endRadius = toVisual?.r ?? 12.5; const { start, end } = edgePoints(from, to, startRadius, endRadius, layout.canvasSize * zoom); return <path key={task.id} className={done(task) ? "is-complete" : ""} style={{ "--branch-tone": tone } as CSSProperties} d={`M${start.x} ${start.y} C${start.x + (end.x - start.x) * .42} ${start.y},${start.x + (end.x - start.x) * .58} ${end.y},${end.x} ${end.y}`} />; })}</svg>
            {tasks.map((task) => { const point = layout.positions.get(task.id); if (!point) return null; const tone = tones[(layout.branchIndex.get(task.id) ?? 0) % tones.length]; const status = statusOf(task); return <button key={task.id} type="button" className={`ql-task-node is-${status} ${selectedId === task.id ? "is-selected" : ""}`} style={{ "--x": `${point.x}%`, "--y": `${point.y}%`, "--tone": tone } as CSSProperties} onMouseEnter={() => setHoveredId(task.id)} onMouseLeave={() => setHoveredId((current) => current === task.id ? null : current)} onFocus={() => setHoveredId(task.id)} onBlur={() => setHoveredId((current) => current === task.id ? null : current)} onClick={() => openDetails(task.id)} aria-expanded={selectedId === task.id} aria-controls={selectedId === task.id ? "ql-quest-detail" : undefined} aria-label={`${task.title}, ${statusLabel(status)}, ${dueDetails(task.dueDate).label}, ${formatDuration(task.duration)}, depth ${depth(task) + 1}`}><span ref={(el) => { if (el) iconRefs.current.set(task.id, el); else iconRefs.current.delete(task.id); }}>{status === "finished" ? <Check size={13} /> : <Circle size={9} />}</span><b>{task.title}</b><small>{depth(task) ? "Subquest" : "Quest"}</small></button>; })}
            {hovered && hovered.id !== selectedId && layout.positions.has(hovered.id) && (() => { const point = layout.positions.get(hovered.id)!; const due = dueDetails(hovered.dueDate); return <aside className={`ql-node-preview ${point.x > 62 ? "is-left" : ""}`} style={{ "--x": `${point.x}%`, "--y": `${point.y}%` } as CSSProperties} aria-hidden="true"><span className={`ql-node-preview__status is-${statusOf(hovered)}`}>{statusLabel(statusOf(hovered))}</span><strong>{hovered.title}</strong><div><span><CalendarDays size={12} /> {due.label}</span><span><Clock3 size={12} /> {formatDuration(hovered.duration)}</span></div>{hovered.description && <p>{hovered.description}</p>}<small>Click for full details</small></aside>; })()}
          {!tasks.length && <div className="ql-focus-empty"><p>No quests have found this north star yet.</p></div>}
          </div>
        </div>
      </div>
        <div className={`ql-zoom-controls ${selected ? "is-inspecting" : ""}`} aria-label="Map zoom controls">
          <button type="button" onClick={() => changeZoom(zoom - 0.15)} disabled={zoom <= 0.5} aria-label="Zoom out"><ZoomOut size={16} /></button>
          <output aria-live="polite" aria-label={`Map zoom ${Math.round(zoom * 100)} percent`}>{Math.round(zoom * 100)}%</output>
          <button type="button" onClick={() => changeZoom(zoom + 0.15)} disabled={zoom >= 2} aria-label="Zoom in"><ZoomIn size={16} /></button>
          <button type="button" onClick={centerMap} aria-label="Center map"><FocusIcon size={16} /></button>
        </div>
       <div className="ql-status-legend" aria-label="Quest status legend"><span><i className="is-finished" />Finished</span><span><i className="is-in-progress" />In progress</span><span><i className="is-not-started" />Not started</span></div>
       <ol className="sr-only" aria-label="Quest hierarchy">{tasks.map((task) => <li key={task.id}>{task.title} — {task.parentTaskId && byId.has(task.parentTaskId) ? `child of ${byId.get(task.parentTaskId)?.title}` : "root quest"} — {statusLabel(statusOf(task))}</li>)}</ol>
    </div>
      {selected && (() => { const due = dueDetails(selected.dueDate); return <aside id="ql-quest-detail" className="ql-inspector" role="dialog" aria-modal="false" aria-labelledby="ql-quest-detail-title"><div className="ql-inspector__topline"><span className="ql-eyebrow">{selected.parentTaskId ? "Nested quest" : "Root quest"} · {statusLabel(statusOf(selected))}</span><button ref={dialogCloseRef} type="button" onClick={closeDetails} aria-label="Close quest details">×</button></div><h2 id="ql-quest-detail-title">{selected.title}</h2><div className="ql-inspector__facts"><div className={`is-${due.state}`}><CalendarDays size={16} /><span><small>Due</small><strong>{due.label}</strong></span></div><div><Clock3 size={16} /><span><small>Estimate</small><strong>{formatDuration(selected.duration)}</strong></span></div></div><div className="ql-inspector__description"><small>Description</small><p>{selected.description || "No description has been added yet."}</p></div><div className="ql-inspector__actions">{onToggleTask && (!selected.recycled || selected.completed) && <button type="button" className="ql-action ql-action--primary" onClick={() => onToggleTask(selected)} disabled={isTaskPending?.(selected)}>{isTaskPending?.(selected) ? "Updating…" : selected.completed ? "Mark in progress" : "Mark complete"}</button>}{onEditTask && <button type="button" className="ql-action" onClick={() => onEditTask(selected)}><Edit3 size={14} /> Edit quest</button>}{done(selected) && onDeleteTask && <button type="button" className="ql-action ql-icon-action--danger" onClick={() => onDeleteTask(selected)} disabled={isTaskDeletePending?.(selected)}><Trash2 size={14} /> {isTaskDeletePending?.(selected) ? "Removing…" : "Permanently remove"}</button>}</div></aside>; })()}
    <footer className="ql-stage__footer"><span>{questline.tasks.filter(done).length} of {questline.tasks.length} quests complete</span><span>Drag to pan · pinch, Ctrl-scroll, or use controls to zoom</span></footer>
  </section>;
}

export function QuestlinesConstellation(props: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fallbackDirection, setFallbackDirection] = useState<"forward" | "back" | null>(null);
  const selected = props.questlines.find((questline) => questline.id === selectedId) ?? null;
  const transitionTo = (id: number | null) => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const documentWithTransitions = document as Document & {
      startViewTransition?: (update: () => void) => { finished: Promise<void> };
    };
    if (prefersReducedMotion) {
      setFallbackDirection(null);
      setSelectedId(id);
      return;
    }
    if (!documentWithTransitions.startViewTransition) {
      setFallbackDirection(id == null ? "back" : "forward");
      setSelectedId(id);
      return;
    }
    setFallbackDirection(null);
    documentWithTransitions.startViewTransition(() => {
      flushSync(() => setSelectedId(id));
    });
  };
  if (props.pending) return <section className="ql-stage ql-loading" aria-label="Loading questlines"><div className="ql-skeleton ql-skeleton--large" /><div className="ql-skeleton ql-skeleton--small" /><div className="ql-skeleton ql-skeleton--map" /></section>;
  return <div className={`ql-transition-shell ${fallbackDirection ? `is-${fallbackDirection}` : ""}`}>
    {selected ? <Focus {...props} questline={selected} onBack={() => transitionTo(null)} /> : <Overview questlines={props.questlines} onSelect={(questline) => transitionTo(questline.id)} onCreate={props.onCreate} />}
  </div>;
}
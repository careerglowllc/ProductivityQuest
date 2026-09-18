import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, Check, Circle, Edit3, Plus, Target, Trash2 } from "lucide-react";
import "./questlines-constellation.css";

export type QuestlineNode = {
  id: number;
  title: string;
  description?: string | null;
  completed?: boolean | null;
  recycled?: boolean | null;
  parentTaskId?: number | null;
  questlineOrder?: number | null;
  goldValue?: number | null;
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
};

type Point = { x: number; y: number };

const tones = ["#73d7cb", "#d5a7f3", "#efb36e", "#e68aa9", "#83b5ef", "#c9d36c"];
const done = (node: QuestlineNode) => Boolean(node.completed || node.recycled);

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
          return <button key={questline.id} type="button" className={`ql-project-node ${questline.completed ? "is-complete" : ""}`} style={{ "--x": `${point.x}%`, "--y": `${point.y}%`, "--tone": tones[index % tones.length] } as CSSProperties} onClick={() => onSelect(questline)} aria-label={`Open ${questline.title}, ${complete} of ${total} quests complete`}>
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

function Focus({ questline, onBack, onEditQuestline, onDeleteQuestline, onToggleTask, isTaskPending, onEditTask }: Omit<Props, "questlines" | "onCreate"> & { questline: Questline; onBack: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const tasks = useMemo(() => descendants(questline.tasks, null).result, [questline.tasks]);
  const byId = useMemo(() => new Map(questline.tasks.map((task) => [task.id, task])), [questline.tasks]);
  const selected = selectedId ? byId.get(selectedId) : null;
  const depth = (task: QuestlineNode) => {
    let level = 0; let parent = task.parentTaskId ?? null; const seen = new Set<number>();
    while (parent && !seen.has(parent) && byId.has(parent)) { seen.add(parent); level += 1; parent = byId.get(parent)?.parentTaskId ?? null; }
    return level;
  };
  const layout = useMemo(() => {
    const groups = new Map<number, QuestlineNode[]>();
    tasks.forEach((task) => {
      const level = depth(task);
      groups.set(level, [...(groups.get(level) || []), task]);
    });
    const map = new Map<number, Point>();
    const maxLevel = Math.max(0, ...Array.from(groups.keys()));
    const maxSiblings = Math.max(1, ...Array.from(groups.values()).map((items) => items.length));
    // A virtual canvas keeps dense branches legible. The scroll container exposes
    // the full map instead of shrinking labels into an inaccessible cluster.
    const canvasWidth = Math.max(100, maxSiblings * 15 + 24);
    const canvasHeight = Math.max(100, (maxLevel + 1) * 22 + 28);
    groups.forEach((items, level) => items.forEach((task, index) => map.set(task.id, {
      x: ((index + 1) * 100) / (items.length + 1),
      y: 12 + ((level + 1) * 76) / (maxLevel + 2),
    })));
    return { positions: map, width: canvasWidth, height: canvasHeight };
  }, [tasks, byId]);
  const progress = questline.tasks.length ? Math.round((questline.tasks.filter(done).length / questline.tasks.length) * 100) : 0;
  return <section className="ql-stage ql-stage--focus" aria-label={`${questline.title} questline`}>
    <div className="ql-stage__grain" />
    <header className="ql-focus-header">
      <button className="ql-back" type="button" onClick={onBack}><ArrowLeft size={16} /> All questlines</button>
      <div><span className="ql-eyebrow">Questline · {progress}% illuminated</span><h1>{questline.title}</h1>{questline.description && <p>{questline.description}</p>}</div>
      <div className="ql-header-actions"><button type="button" className="ql-icon-action" onClick={() => onEditQuestline(questline)} aria-label="Edit questline"><Edit3 size={16} /></button>{onDeleteQuestline && <button type="button" className="ql-icon-action ql-icon-action--danger" onClick={() => onDeleteQuestline(questline)} aria-label="Delete questline"><Trash2 size={16} /></button>}</div>
    </header>
    <div className="ql-focus-map">
      <div className="ql-focus-scroll" role="region" aria-label="Scrollable quest constellation">
        <div className="ql-focus-canvas" style={{ width: `${layout.width}%`, minHeight: `${layout.height}%` }}>
          <div className="ql-focus-orbit ql-focus-orbit--one" /><div className="ql-focus-orbit ql-focus-orbit--two" />
          <div className="ql-focus-hub"><Target size={26} /><span>{questline.tasks.length}<small>quests</small></span></div>
          <svg className="ql-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{tasks.flatMap((task) => { const from = task.parentTaskId && layout.positions.has(task.parentTaskId) ? layout.positions.get(task.parentTaskId)! : { x: 50, y: 50 }; const to = layout.positions.get(task.id); return to ? <path key={task.id} className={done(task) ? "is-complete" : ""} d={`M${from.x} ${from.y} Q${(from.x + to.x) / 2 + 5} ${(from.y + to.y) / 2} ${to.x} ${to.y}`} /> : []; })}</svg>
          {tasks.map((task) => { const point = layout.positions.get(task.id); if (!point) return null; return <button key={task.id} type="button" className={`ql-task-node ${done(task) ? "is-complete" : ""} ${selectedId === task.id ? "is-selected" : ""}`} style={{ "--x": `${point.x}%`, "--y": `${point.y}%`, "--tone": tones[depth(task) % tones.length] } as CSSProperties} onClick={() => setSelectedId(task.id)} aria-label={`${task.title}, ${done(task) ? "complete" : "in progress"}, depth ${depth(task) + 1}`}><span>{done(task) ? <Check size={13} /> : <Circle size={9} />}</span><b>{task.title}</b><small>{depth(task) ? "Subquest" : "Quest"}</small></button>; })}
          {!tasks.length && <div className="ql-focus-empty"><p>No quests have found this north star yet.</p></div>}
        </div>
      </div>
      <ol className="sr-only" aria-label="Quest hierarchy">{tasks.map((task) => <li key={task.id}>{task.title} — {task.parentTaskId && byId.has(task.parentTaskId) ? `child of ${byId.get(task.parentTaskId)?.title}` : "root quest"} — {done(task) ? "complete" : "in progress"}</li>)}</ol>
    </div>
     {selected && <aside className="ql-inspector" aria-live="polite"><span className="ql-eyebrow">{selected.parentTaskId ? "Nested quest" : "Root quest"} · {done(selected) ? "Complete" : "In progress"}</span><h2>{selected.title}</h2>{selected.description && <p>{selected.description}</p>}<div className="ql-inspector__actions">{onToggleTask && !selected.recycled && <button type="button" className="ql-action ql-action--primary" onClick={() => onToggleTask(selected)} disabled={isTaskPending?.(selected)}>{isTaskPending?.(selected) ? "Updating…" : done(selected) ? "Mark in progress" : "Mark complete"}</button>}{onEditTask && <button type="button" className="ql-action" onClick={() => onEditTask(selected)}><Edit3 size={14} /> Edit quest</button>}<button type="button" className="ql-action" onClick={() => setSelectedId(null)}>Close detail</button></div></aside>}
    <footer className="ql-stage__footer"><span>{questline.tasks.filter(done).length} of {questline.tasks.length} quests complete</span><span>Click any star to inspect its path</span></footer>
  </section>;
}

export function QuestlinesConstellation(props: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = props.questlines.find((questline) => questline.id === selectedId) ?? null;
  if (props.pending) return <section className="ql-stage ql-loading" aria-label="Loading questlines"><div className="ql-skeleton ql-skeleton--large" /><div className="ql-skeleton ql-skeleton--small" /><div className="ql-skeleton ql-skeleton--map" /></section>;
  return selected ? <Focus {...props} questline={selected} onBack={() => setSelectedId(null)} /> : <Overview questlines={props.questlines} onSelect={(questline) => setSelectedId(questline.id)} onCreate={props.onCreate} />;
}
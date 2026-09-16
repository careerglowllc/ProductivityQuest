import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, Circle, GitBranch, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "./questline-atlas.css";

type AtlasNode = { id: string; title: string; parentId: string | null; kind: "stage" | "quest"; order: number; completed: boolean; createdAt: string };
type AtlasProject = { id: string; title: string; description: string; nodes: AtlasNode[] };
type Editor = { id: string | null; parentId: string | null; kind: "stage" | "quest"; order?: number };
type Point = { x: number; y: number };
type AddPoint = Point & { parentId: string | null; order: number };

const starter: AtlasProject = { id: "atlas-starter", title: "Build a life with more room in it", description: "A private observatory for the work that makes the rest of life possible.", nodes: [
  { id: "health", title: "Restore the body", parentId: null, kind: "stage", order: 0, completed: false, createdAt: "2025-01-01" },
  { id: "health-1", title: "Find a sustainable morning", parentId: "health", kind: "quest", order: 0, completed: true, createdAt: "2025-01-01" },
  { id: "health-2", title: "Make movement ordinary", parentId: "health", kind: "quest", order: 1, completed: false, createdAt: "2025-01-01" },
  { id: "craft", title: "Make useful things", parentId: null, kind: "stage", order: 1, completed: false, createdAt: "2025-01-01" },
  { id: "craft-1", title: "Choose the next small tool", parentId: "craft", kind: "quest", order: 0, completed: false, createdAt: "2025-01-01" },
] };

const id = () => `atlas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const keyFor = (userId: string | number) => `lifeos-questline-atlas:${String(userId)}`;

function isDescendant(nodes: AtlasNode[], candidate: string, ancestor: string) {
  let cursor: string | null = candidate;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    if (cursor === ancestor) return true;
    seen.add(cursor);
    cursor = nodes.find((node) => node.id === cursor)?.parentId || null;
  }
  return false;
}

function repair(raw: unknown): AtlasProject {
  const value = raw as Partial<AtlasProject>;
  const source = Array.isArray(value?.nodes) ? value.nodes : [];
  const validIds = new Set<string>();
  const nodes: AtlasNode[] = [];
  source.forEach((item) => {
    if (!item || typeof item !== "object" || typeof (item as AtlasNode).id !== "string" || validIds.has((item as AtlasNode).id)) return;
    const node = item as AtlasNode;
    validIds.add(node.id);
    nodes.push({ id: node.id, title: typeof node.title === "string" && node.title.trim() ? node.title.trim() : "Untitled point", parentId: typeof node.parentId === "string" ? node.parentId : null, kind: node.kind === "stage" ? "stage" : "quest", order: Number.isInteger(node.order) && node.order >= 0 ? node.order : Number.NaN, completed: node.completed === true, createdAt: typeof node.createdAt === "string" ? node.createdAt : new Date().toISOString() });
  });
  nodes.forEach((node) => { if (node.parentId === node.id || !validIds.has(node.parentId || "")) node.parentId = null; });
  nodes.forEach((node) => { if (isDescendant(nodes, node.parentId || "", node.id)) node.parentId = null; });
  const parents = new Set(nodes.map((node) => node.parentId));
  parents.forEach((parentId) => {
    const siblings = nodes.filter((node) => node.parentId === parentId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const used = new Set<number>();
    siblings.forEach((node) => {
      if (Number.isFinite(node.order) && node.order >= 0 && !used.has(node.order)) { used.add(node.order); return; }
      node.order = Number.NaN;
    });
    siblings.forEach((node) => {
      if (Number.isFinite(node.order)) return;
      let openOrder = 0;
      while (used.has(openOrder)) openOrder += 1;
      node.order = openOrder;
      used.add(openOrder);
    });
  });
  return { id: typeof value.id === "string" ? value.id : id(), title: typeof value.title === "string" && value.title.trim() ? value.title : "Untitled questline", description: typeof value.description === "string" ? value.description : "Give this questline a north star.", nodes };
}

function load(key: string): AtlasProject {
  try { const raw = localStorage.getItem(key); return raw ? repair(JSON.parse(raw)) : starter; } catch { return starter; }
}

function AtlasEditor({ open, onOpenChange, editor, setEditor, project, draft, setDraft, description, setDescription, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; editor: Editor | null; setEditor: (editor: Editor) => void; project: AtlasProject; draft: string; setDraft: (value: string) => void; description: string; setDescription: (value: string) => void; onSave: () => void }) {
  if (!editor) return null;
  const editingRoot = editor.id === "root";
   return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="atlas-dialog"><DialogHeader><DialogTitle>{editor.id ? "Edit this point" : editor.parentId ? "Add the next quest" : "Add the next stage"}</DialogTitle><DialogDescription>{editor.id ? "Refine the title or point type. Its position in the tree keeps the parent relationship intact." : editor.parentId ? "This quest will be registered directly beneath its parent." : "This stage will branch directly from the north star."}</DialogDescription></DialogHeader>
    <label className="atlas-field">Title<input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="A clear, memorable outcome" /></label>
    {editingRoot ? <label className="atlas-field">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does reaching this north star make possible?" /></label> : <>
      <label className="atlas-field">Type<select value={editor.kind} onChange={(event) => setEditor({ ...editor, kind: event.target.value as "stage" | "quest" })}><option value="stage">Stage</option><option value="quest">Quest</option></select></label>
    </>}
    <DialogFooter><button type="button" className="atlas-secondary-button" onClick={() => onOpenChange(false)}>Cancel</button><button type="button" className="atlas-primary-button" disabled={!draft.trim()} onClick={onSave}>{editor.id ? "Save changes" : `Add ${editor.kind}`}</button></DialogFooter>
  </DialogContent></Dialog>;
}

export default function QuestlineAtlas() {
  const { user } = useAuth();
  const userId = (user as { id?: string | number } | undefined)?.id ?? "anonymous";
  const storageKey = keyFor(userId);
  const [project, setProject] = useState<AtlasProject>(() => load(storageKey));
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [draft, setDraft] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [notice, setNotice] = useState("");
  const sceneViewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  useEffect(() => { setProject(load(storageKey)); setSelected(null); }, [storageKey]);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(project)); }, [storageKey, project]);
  useEffect(() => { const element = sceneViewportRef.current; if (!element) return; const observer = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width))); observer.observe(element); return () => observer.disconnect(); }, []);

  const layout = useMemo(() => {
    const positions = new Map<string, Point>();
    const addPoints: AddPoint[] = [];
    const childrenOf = (parentId: string | null) => project.nodes.filter((node) => node.parentId === parentId).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    let cursor = 0;
    let maxDepth = 0;
    const horizontalStep = 174;
    const top = 108;
    const verticalStep = 146;

    const place = (nodeId: string, parentId: string | null, level: number) => {
      maxDepth = Math.max(maxDepth, level);
      const children = childrenOf(parentId);
      const branches: { x: number; order: number }[] = [];
      const occupied = new Set(children.map((child) => child.order));
      const nextOpenOrder = (() => {
        let order = 0;
        while (occupied.has(order)) order += 1;
        return order;
      })();
      const branchOrders = children.length === 0
        ? [0, 1]
        : [...children.map((child) => child.order), nextOpenOrder].sort((a, b) => a - b);
      branchOrders.forEach((order) => {
        const child = children.find((candidate) => candidate.order === order);
        if (child) branches.push({ x: place(child.id, child.id, level + 1), order });
        else if (!occupied.has(order)) {
          const x = 70 + cursor++ * horizontalStep;
          addPoints.push({ parentId, order, x, y: top + (level + 1) * verticalStep });
          branches.push({ x, order });
        }
      });
      const x = branches.length ? branches.reduce((sum, branch) => sum + branch.x, 0) / branches.length : 70 + cursor++ * horizontalStep;
      positions.set(nodeId, { x, y: top + level * verticalStep });
      return x;
    };

    place("root", null, 0);
    const contentWidth = Math.max(320, cursor * horizontalStep + 24);
    const sceneWidth = Math.max(width, contentWidth);
    const shift = Math.max(0, (sceneWidth - contentWidth) / 2);
    positions.forEach((point, nodeId) => positions.set(nodeId, { x: point.x + shift, y: point.y }));
    addPoints.forEach((point) => { point.x += shift; });
    return { positions, addPoints, width: sceneWidth, height: Math.max(470, top + (maxDepth + 1) * verticalStep + 105) };
  }, [project.nodes, width]);

  const selectedNode = selected && selected !== "root" ? project.nodes.find((node) => node.id === selected) : undefined;
  const completed = project.nodes.filter((node) => node.completed).length;
  const beginEdit = (next: Editor, title: string) => { setEditor(next); setDraft(title); setDraftDescription(next.id === "root" ? project.description : ""); };
  const beginBranch = (parentId: string | null, order: number) => {
    const parent = parentId ? project.nodes.find((node) => node.id === parentId) : undefined;
    beginEdit({ id: null, parentId, kind: parent ? "quest" : "stage", order }, "");
  };
  const save = () => {
    if (!editor || !draft.trim()) return;
    if (!editor.id && project.nodes.some((node) => node.parentId === editor.parentId && node.order === editor.order)) { setNotice("That branch was already filled. Choose another + in the tree."); setEditor(null); return; }
    const newId = editor.id ? null : id();
    setProject((current) => editor.id ? { ...current, nodes: current.nodes.map((node) => node.id === editor.id ? { ...node, title: draft.trim(), parentId: editor.parentId, kind: editor.kind } : node) } : { ...current, nodes: [...current.nodes, { id: newId!, title: draft.trim(), parentId: editor.parentId, kind: editor.kind, order: editor.order ?? current.nodes.filter((node) => node.parentId === editor.parentId).length, completed: false, createdAt: new Date().toISOString() }] });
    if (newId) setSelected(newId);
    setEditor(null); setNotice(editor.id ? "Point updated." : "Point added to the field.");
  };
  const remove = (nodeId: string) => {
    if (!window.confirm("Delete this point and every point orbiting it?")) return;
    setProject((current) => ({ ...current, nodes: current.nodes.filter((node) => !isDescendant(current.nodes, node.id, nodeId) && node.id !== nodeId) })); setSelected(null);
  };
  const reset = (clear: boolean) => { if (!window.confirm(clear ? "Clear this atlas and start with a blank root?" : "Reset this atlas to the starter example?")) return; const next = clear ? { id: id(), title: "Untitled questline", description: "Give this questline a north star.", nodes: [] } : starter; setProject(next); setSelected(null); setNotice(clear ? "Atlas cleared." : "Starter atlas restored."); };

  return <main className="atlas-page"><header className="atlas-header"><div><p className="atlas-kicker"><GitBranch size={14} /> Private planning observatory</p><h1>Questline Atlas</h1><p className="atlas-intro">One north star. The stages and quests that make it reachable.</p></div><div className="atlas-header-actions"><button className="atlas-quiet-button" onClick={() => reset(false)}><RotateCcw size={15} /> Reset example</button><button className="atlas-danger-button" onClick={() => reset(true)}><Trash2 size={15} /> Clear atlas</button></div></header>
     <section className="atlas-layout"><div className="atlas-scene-frame">{layout.width > width + 8 && <div className="atlas-scroll-cue">Swipe sideways to explore all branches</div>}<div ref={sceneViewportRef} className={`atlas-scene-scroll ${layout.width > width + 8 ? "is-scrollable" : ""}`}><div className="atlas-scene" style={{ width: layout.width, height: layout.height }} aria-label="Questline binary tree"><div className="atlas-stars" /><svg className="atlas-connections" width={layout.width} height={layout.height} aria-hidden="true">{Array.from(layout.positions.entries()).filter(([nodeId]) => nodeId !== "root").map(([nodeId, point]) => { const node = project.nodes.find((item) => item.id === nodeId)!; const parent = layout.positions.get(node.parentId || "root")!; return <path key={nodeId} className={node.completed ? "is-complete" : ""} d={`M ${parent.x} ${parent.y} C ${parent.x} ${parent.y + 62}, ${point.x} ${point.y - 62}, ${point.x} ${point.y}`} />; })}{layout.addPoints.map((point) => { const parent = layout.positions.get(point.parentId || "root")!; return <path key={`add-${point.parentId || "root"}-${point.order}`} className="is-open-branch" d={`M ${parent.x} ${parent.y} C ${parent.x} ${parent.y + 62}, ${point.x} ${point.y - 54}, ${point.x} ${point.y}`} />; })}</svg>
      <div className="atlas-root" style={{ left: layout.positions.get("root")!.x, top: layout.positions.get("root")!.y }}><button className={`atlas-orb atlas-root-orb ${selected === "root" ? "is-selected" : ""}`} onClick={() => setSelected("root")} aria-label={`Select ${project.title}`}><GitBranch size={23} /></button><strong>{project.title}</strong><span>{completed} / {project.nodes.length} illuminated</span></div>
      {project.nodes.map((node) => { const point = layout.positions.get(node.id)!; return <button key={node.id} className={`atlas-orbit-node ${node.kind} ${node.completed ? "is-complete" : ""} ${selected === node.id ? "is-selected" : ""}`} style={{ left: point.x, top: point.y } as CSSProperties} onClick={() => setSelected(node.id)} aria-label={`${node.title}, ${node.completed ? "complete" : "in progress"}`}><span className="atlas-orb"><i>{node.completed ? <Check size={12} /> : <Circle size={8} />}</i></span><b>{node.title}</b><small>{node.kind}</small></button>; })}
       {layout.addPoints.map((point) => <button key={`branch-${point.parentId || "root"}-${point.order}`} type="button" className="atlas-add-branch" style={{ left: point.x, top: point.y } as CSSProperties} onClick={() => beginBranch(point.parentId, point.order)} aria-label={`Add ${point.parentId ? "child quest" : "stage"} to ${point.parentId ? project.nodes.find((node) => node.id === point.parentId)?.title : project.title}`} title={point.parentId ? "Add child quest" : "Add stage"}><Plus size={15} aria-hidden="true" /></button>)}
       {!project.nodes.length && <div className="atlas-empty"><p>Start your first branch</p><span>Use either + below the north star. Each new point belongs to the node directly above it.</span></div>}<div className="atlas-scene-footer"><span>{project.nodes.length + 1} {project.nodes.length ? "points" : "point"} · Use + to build the next branch</span></div></div></div></div>
        <aside className="atlas-inspector">{selectedNode ? <div><span className="atlas-panel-label">{selectedNode.kind} selected</span><h2>{selectedNode.title}</h2><p className="atlas-parent">Child of {project.nodes.find((node) => node.id === selectedNode.parentId)?.title || project.title}</p><div className="atlas-selection-guide"><strong>Tree position defines the relationship</strong><span>The + beneath this point creates another child. Adjacent points remain siblings, and the tree expands to fit them.</span></div><div className={`atlas-status ${selectedNode.completed ? "is-complete" : ""}`}>{selectedNode.completed ? <Check size={14} /> : <Circle size={12} />}{selectedNode.completed ? "Complete" : "In progress"}</div><div className="atlas-action-stack"><button className="atlas-secondary-button" onClick={() => setProject((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === selectedNode.id ? { ...node, completed: !node.completed } : node) }))}>{selectedNode.completed ? "Mark in progress" : "Mark complete"}</button><button className="atlas-secondary-button" onClick={() => beginEdit({ id: selectedNode.id, parentId: selectedNode.parentId, kind: selectedNode.kind, order: selectedNode.order }, selectedNode.title)}><Pencil size={14} /> Edit point</button><button className="atlas-delete-link" onClick={() => remove(selectedNode.id)}><Trash2 size={14} /> Delete branch</button></div></div> : <div className="atlas-project-panel"><span className="atlas-panel-label">North star</span><h2>{project.title}</h2><p>{project.description}</p><div className="atlas-selection-guide"><strong>Build directly in the tree</strong><span>Each point starts with two branches. Keep using + to add as many sibling children as you need; the tree expands horizontally.</span></div><button className="atlas-secondary-button atlas-edit-root" onClick={() => beginEdit({ id: "root", parentId: null, kind: "stage" }, project.title)}><Pencil size={15} /> Edit north star</button></div>}{notice && <p className="atlas-notice" role="status">{notice}</p>}<div className="atlas-legend"><span><i className="legend-stage" /> Stage</span><span><i className="legend-quest" /> Quest</span><span><i className="legend-done"><Check size={10} /></i> Complete</span></div></aside></section>
    <AtlasEditor open={!!editor} onOpenChange={(open) => !open && setEditor(null)} editor={editor} setEditor={setEditor} project={project} draft={draft} setDraft={setDraft} description={draftDescription} setDescription={setDraftDescription} onSave={() => { if (editor?.id === "root") { setProject((current) => ({ ...current, title: draft.trim() || current.title, description: draftDescription.trim() })); setEditor(null); setNotice("Root questline updated."); } else save(); }} />
  </main>;
}
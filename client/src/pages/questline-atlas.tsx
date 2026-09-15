import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, Circle, GitBranch, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "./questline-atlas.css";

type AtlasNode = { id: string; title: string; parentId: string | null; kind: "stage" | "quest"; completed: boolean; createdAt: string };
type AtlasProject = { id: string; title: string; description: string; nodes: AtlasNode[] };
type Editor = { id: string | null; parentId: string | null; kind: "stage" | "quest" };
type Point = { x: number; y: number };

const starter: AtlasProject = { id: "atlas-starter", title: "Build a life with more room in it", description: "A private observatory for the work that makes the rest of life possible.", nodes: [
  { id: "health", title: "Restore the body", parentId: null, kind: "stage", completed: false, createdAt: "2025-01-01" },
  { id: "health-1", title: "Find a sustainable morning", parentId: "health", kind: "quest", completed: true, createdAt: "2025-01-01" },
  { id: "health-2", title: "Make movement ordinary", parentId: "health", kind: "quest", completed: false, createdAt: "2025-01-01" },
  { id: "craft", title: "Make useful things", parentId: null, kind: "stage", completed: false, createdAt: "2025-01-01" },
  { id: "craft-1", title: "Choose the next small tool", parentId: "craft", kind: "quest", completed: false, createdAt: "2025-01-01" },
  { id: "belong", title: "Tend the constellation", parentId: null, kind: "stage", completed: false, createdAt: "2025-01-01" },
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
    nodes.push({ id: node.id, title: typeof node.title === "string" && node.title.trim() ? node.title.trim() : "Untitled point", parentId: typeof node.parentId === "string" ? node.parentId : null, kind: node.kind === "stage" ? "stage" : "quest", completed: node.completed === true, createdAt: typeof node.createdAt === "string" ? node.createdAt : new Date().toISOString() });
  });
  nodes.forEach((node) => { if (node.parentId === node.id || !validIds.has(node.parentId || "")) node.parentId = null; });
  nodes.forEach((node) => { if (isDescendant(nodes, node.parentId || "", node.id)) node.parentId = null; });
  return { id: typeof value.id === "string" ? value.id : id(), title: typeof value.title === "string" && value.title.trim() ? value.title : "Untitled questline", description: typeof value.description === "string" ? value.description : "Give this questline a north star.", nodes };
}

function load(key: string): AtlasProject {
  try { const raw = localStorage.getItem(key); return raw ? repair(JSON.parse(raw)) : starter; } catch { return starter; }
}

function AtlasEditor({ open, onOpenChange, editor, setEditor, project, draft, setDraft, description, setDescription, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; editor: Editor | null; setEditor: (editor: Editor) => void; project: AtlasProject; draft: string; setDraft: (value: string) => void; description: string; setDescription: (value: string) => void; onSave: () => void }) {
  if (!editor) return null;
  const editingRoot = editor.id === "root";
  const choices = project.nodes.filter((node) => node.id !== editor.id && !isDescendant(project.nodes, node.id, editor.id || ""));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="atlas-dialog"><DialogHeader><DialogTitle>{editor.id ? "Shape the next branch" : "Place a new point"}</DialogTitle><DialogDescription>{editor.id ? "Rename this point or move it to another orbit." : "Add a stage or quest to the constellation."}</DialogDescription></DialogHeader>
    <label className="atlas-field">Title<input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="A clear, memorable outcome" /></label>
    {editingRoot ? <label className="atlas-field">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does reaching this north star make possible?" /></label> : <>
      <label className="atlas-field">Kind<select value={editor.kind} onChange={(event) => setEditor({ ...editor, kind: event.target.value as "stage" | "quest" })} disabled={!!editor.id}><option value="stage">Stage</option><option value="quest">Quest</option></select></label>
      <label className="atlas-field">Parent<select value={editor.parentId || ""} onChange={(event) => setEditor({ ...editor, parentId: event.target.value || null })}><option value="">Root questline</option>{choices.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select></label>
    </>}
    <DialogFooter><button type="button" className="atlas-secondary-button" onClick={() => onOpenChange(false)}>Cancel</button><button type="button" className="atlas-primary-button" disabled={!draft.trim()} onClick={onSave}>{editor.id ? "Save changes" : "Add to atlas"}</button></DialogFooter>
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
    const depth = new Map<string, number>();
    const walk = (parent: string | null, level: number) => project.nodes.filter((node) => node.parentId === parent).forEach((node) => { depth.set(node.id, level); walk(node.id, level + 1); });
    walk(null, 0);
    const maxDepth = Math.max(0, ...Array.from(depth.values()));
    const byLevel = Array.from({ length: maxDepth + 1 }, (_, level) => project.nodes.filter((node) => depth.get(node.id) === level));
    const responsiveMinimum = width <= 520 ? 650 : width <= 900 ? 720 : width;
    const sceneWidth = Math.max(responsiveMinimum, ...byLevel.map((nodes) => nodes.length * 174 + 100));
    const positions = new Map<string, Point>([["root", { x: sceneWidth / 2, y: 112 }]]);
    byLevel.forEach((nodes, level) => nodes.forEach((node, index) => positions.set(node.id, { x: ((index + 1) / (nodes.length + 1)) * sceneWidth, y: 240 + level * 128 })));
    return { byLevel, positions, width: sceneWidth, height: Math.max(440, 410 + maxDepth * 128) };
  }, [project.nodes, width]);

  const selectedNode = selected && selected !== "root" ? project.nodes.find((node) => node.id === selected) : undefined;
  const completed = project.nodes.filter((node) => node.completed).length;
  const beginEdit = (next: Editor, title: string) => { setEditor(next); setDraft(title); setDraftDescription(next.id === "root" ? project.description : ""); };
  const save = () => {
    if (!editor || !draft.trim()) return;
    if (editor.id && (editor.parentId === editor.id || (editor.parentId && isDescendant(project.nodes, editor.parentId, editor.id)))) { setNotice("A point cannot orbit itself or one of its descendants."); return; }
    setProject((current) => editor.id ? { ...current, nodes: current.nodes.map((node) => node.id === editor.id ? { ...node, title: draft.trim(), parentId: editor.parentId } : node) } : { ...current, nodes: [...current.nodes, { id: id(), title: draft.trim(), parentId: editor.parentId, kind: editor.kind, completed: false, createdAt: new Date().toISOString() }] });
    setEditor(null); setNotice(editor.id ? "Point updated." : "Point added to the field.");
  };
  const remove = (nodeId: string) => {
    if (!window.confirm("Delete this point and every point orbiting it?")) return;
    setProject((current) => ({ ...current, nodes: current.nodes.filter((node) => !isDescendant(current.nodes, node.id, nodeId) && node.id !== nodeId) })); setSelected(null);
  };
  const reset = (clear: boolean) => { if (!window.confirm(clear ? "Clear this atlas and start with a blank root?" : "Reset this atlas to the starter example?")) return; const next = clear ? { id: id(), title: "Untitled questline", description: "Give this questline a north star.", nodes: [] } : starter; setProject(next); setSelected(null); setNotice(clear ? "Atlas cleared." : "Starter atlas restored."); };

  return <main className="atlas-page"><header className="atlas-header"><div><p className="atlas-kicker"><GitBranch size={14} /> Private planning observatory</p><h1>Questline Atlas</h1><p className="atlas-intro">One north star. The stages and quests that make it reachable.</p></div><div className="atlas-header-actions"><button className="atlas-quiet-button" onClick={() => reset(false)}><RotateCcw size={15} /> Reset example</button><button className="atlas-danger-button" onClick={() => reset(true)}><Trash2 size={15} /> Clear atlas</button></div></header>
    <section className="atlas-layout"><div ref={sceneViewportRef} className="atlas-scene-scroll"><div className="atlas-scene" style={{ width: layout.width, height: layout.height }} aria-label="Questline constellation tree"><div className="atlas-stars" /><svg className="atlas-connections" width={layout.width} height={layout.height} aria-hidden="true">{Array.from(layout.positions.entries()).filter(([nodeId]) => nodeId !== "root").map(([nodeId, point]) => { const node = project.nodes.find((item) => item.id === nodeId)!; const parent = layout.positions.get(node.parentId || "root")!; return <path key={nodeId} className={node.completed ? "is-complete" : ""} d={`M ${parent.x} ${parent.y} C ${parent.x} ${parent.y + 62}, ${point.x} ${point.y - 62}, ${point.x} ${point.y}`} />; })}</svg>
      <div className="atlas-root" style={{ left: layout.positions.get("root")!.x, top: layout.positions.get("root")!.y }}><button className={`atlas-orb atlas-root-orb ${selected === "root" ? "is-selected" : ""}`} onClick={() => setSelected("root")} aria-label={`Select ${project.title}`}><GitBranch size={23} /></button><strong>{project.title}</strong><span>{completed} / {project.nodes.length} illuminated</span></div>
      {project.nodes.map((node) => { const point = layout.positions.get(node.id)!; return <button key={node.id} className={`atlas-orbit-node ${node.kind} ${node.completed ? "is-complete" : ""} ${selected === node.id ? "is-selected" : ""}`} style={{ left: point.x, top: point.y } as CSSProperties} onClick={() => setSelected(node.id)} aria-label={`${node.title}, ${node.completed ? "complete" : "in progress"}`}><span className="atlas-orb"><i>{node.completed ? <Check size={12} /> : <Circle size={8} />}</i></span><b>{node.title}</b><small>{node.kind}</small></button>; })}
      {!project.nodes.length && <div className="atlas-empty"><p>The field is quiet.</p><span>Add a first stage to begin mapping the work.</span><button onClick={() => beginEdit({ id: null, parentId: null, kind: "stage" }, "")}><Plus size={15} /> Add first stage</button></div>}<div className="atlas-scene-footer"><span>Atlas field · {project.nodes.length + 1} points</span><button onClick={() => beginEdit({ id: null, parentId: null, kind: "stage" }, "")}><Plus size={14} /> Stage</button><button onClick={() => beginEdit({ id: null, parentId: null, kind: "quest" }, "")}><Plus size={14} /> Quest</button></div></div></div>
      <aside className="atlas-inspector">{selectedNode ? <div><span className="atlas-panel-label">{selectedNode.kind} point</span><h2>{selectedNode.title}</h2><p className="atlas-parent">Orbiting {project.nodes.find((node) => node.id === selectedNode.parentId)?.title || "the root questline"}</p><div className={`atlas-status ${selectedNode.completed ? "is-complete" : ""}`}>{selectedNode.completed ? <Check size={14} /> : <Circle size={12} />}{selectedNode.completed ? "Complete" : "In progress"}</div><div className="atlas-action-stack"><button className="atlas-primary-button" onClick={() => setProject((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === selectedNode.id ? { ...node, completed: !node.completed } : node) }))}>{selectedNode.completed ? "Mark in progress" : "Mark complete"}</button><button className="atlas-secondary-button" onClick={() => beginEdit({ id: selectedNode.id, parentId: selectedNode.parentId, kind: selectedNode.kind }, selectedNode.title)}><Pencil size={14} /> Rename or reparent</button><button className="atlas-secondary-button" onClick={() => beginEdit({ id: null, parentId: selectedNode.id, kind: "quest" }, "")}><Plus size={14} /> Add child quest</button><button className="atlas-delete-link" onClick={() => remove(selectedNode.id)}><Trash2 size={14} /> Delete branch</button></div></div> : <div className="atlas-project-panel"><span className="atlas-panel-label">North star</span><h2>{project.title}</h2><p>{project.description}</p><button className="atlas-primary-button" onClick={() => beginEdit({ id: "root", parentId: null, kind: "stage" }, project.title)}><Pencil size={15} /> Edit root questline</button></div>}{selected === "root" && <div className="atlas-root-detail"><span className="atlas-panel-label">Description</span><p>{project.description}</p><button className="atlas-secondary-button" onClick={() => beginEdit({ id: "root", parentId: null, kind: "stage" }, project.title)}>Edit title and description</button></div>}{notice && <p className="atlas-notice" role="status">{notice}</p>}<div className="atlas-legend"><span><i className="legend-stage" /> Stage</span><span><i className="legend-quest" /> Quest</span><span><i className="legend-done"><Check size={10} /></i> Complete</span></div></aside></section>
    <AtlasEditor open={!!editor} onOpenChange={(open) => !open && setEditor(null)} editor={editor} setEditor={setEditor} project={project} draft={draft} setDraft={setDraft} description={draftDescription} setDescription={setDraftDescription} onSave={() => { if (editor?.id === "root") { setProject((current) => ({ ...current, title: draft.trim() || current.title, description: draftDescription.trim() })); setEditor(null); setNotice("Root questline updated."); } else save(); }} />
  </main>;
}
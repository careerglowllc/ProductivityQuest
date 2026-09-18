import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { calculateGoldValue } from "@/lib/goldCalculation";
import type { QuestlineDraftNode } from "@/components/add-questline-modal";
import "./questline-draft-tree.css";

type Point = { x: number; y: number };
type OpenPoint = Point & { parentId: string | null };

interface Props {
  title: string;
  description: string;
  icon: string;
  nodes: QuestlineDraftNode[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onUpdateNode: (id: string, updates: Partial<QuestlineDraftNode>) => void;
  onAddChild: (id: string) => void;
  onAddSibling: (id: string) => void;
  onAddRoot: () => void;
  onDelete: (id: string) => void;
  onFocusField?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

function getRelationships(nodes: QuestlineDraftNode[]) {
  const parents = new Map<string, string | null>();
  const children = new Map<string | null, QuestlineDraftNode[]>();
  const stack: QuestlineDraftNode[] = [];
  nodes.forEach((node) => {
    while (stack.length && stack[stack.length - 1].indentLevel >= node.indentLevel) stack.pop();
    const parentId = stack.length ? stack[stack.length - 1].id : null;
    parents.set(node.id, parentId);
    children.set(parentId, [...(children.get(parentId) ?? []), node]);
    stack.push(node);
  });
  return { parents, children };
}

export function QuestlineDraftTree(props: Props) {
  const { title, description, icon, nodes, onTitleChange, onDescriptionChange, onIconChange, onUpdateNode, onAddChild, onAddSibling, onAddRoot, onDelete, onFocusField } = props;
  const [selectedId, setSelectedId] = useState<string>("root");
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(680);
  const relationships = useMemo(() => getRelationships(nodes), [nodes]);

  useEffect(() => {
    if (selectedId !== "root" && !nodes.some((node) => node.id === selectedId)) setSelectedId("root");
  }, [nodes, selectedId]);
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setViewportWidth(Math.max(320, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => {
    const points = new Map<string, Point>();
    const openPoints: OpenPoint[] = [];
    let cursor = 0;
    let maxDepth = 0;
    const stepX = 158;
    const stepY = 132;
    const top = 68;
    const visitParent = (parentId: string | null, depth: number): number => {
      maxDepth = Math.max(maxDepth, depth);
      const childNodes = relationships.children.get(parentId) ?? [];
      const branchXs = childNodes.map((child) => {
        const x = visitParent(child.id, depth + 1);
        points.set(child.id, { x, y: top + depth * stepY });
        return x;
      });
      const openCount = childNodes.length ? 1 : 2;
      for (let i = 0; i < openCount; i++) {
        const x = 78 + cursor++ * stepX;
        openPoints.push({ parentId, x, y: top + depth * stepY });
        branchXs.push(x);
      }
      return branchXs.reduce((sum, x) => sum + x, 0) / branchXs.length;
    };
    const rootX = visitParent(null, 1);
    const naturalWidth = Math.max(340, cursor * stepX + 40);
    const width = Math.max(viewportWidth, naturalWidth);
    const shift = Math.max(0, (width - naturalWidth) / 2);
    points.forEach((point, id) => points.set(id, { ...point, x: point.x + shift }));
    openPoints.forEach((point) => { point.x += shift; });
    return { points, openPoints, rootX: rootX + shift, width, height: Math.max(380, top + (maxDepth + 1) * stepY) };
  }, [relationships, viewportWidth]);

  const selected = nodes.find((node) => node.id === selectedId);
  const field = "bg-slate-800/70 border-purple-400/30 text-yellow-100 h-9 text-sm";
  const connection = (parent: Point, child: Point) => `M ${parent.x} ${parent.y + 22} C ${parent.x} ${parent.y + 72}, ${child.x} ${child.y - 54}, ${child.x} ${child.y - 18}`;
  const parentPoint = (id: string | null) => id ? layout.points.get(id)! : { x: layout.rootX, y: 24 };

  return <div className="draft-atlas">
    <div className="draft-atlas-viewport" ref={viewportRef}>
      {layout.width > viewportWidth + 8 && <span className="draft-atlas-cue">Swipe sideways for branches</span>}
      <div className="draft-atlas-scene" style={{ width: layout.width, height: layout.height }}>
        <div className="draft-atlas-stars" />
        <svg className="draft-atlas-lines" width={layout.width} height={layout.height} aria-hidden="true">
          {nodes.map((node) => <path key={node.id} d={connection(parentPoint(relationships.parents.get(node.id) ?? null), layout.points.get(node.id)!)} />)}
          {layout.openPoints.map((point, index) => <path className="is-open" key={`${point.parentId}-${index}`} d={connection(parentPoint(point.parentId), point)} />)}
        </svg>
        <button type="button" className={`draft-atlas-root ${selectedId === "root" ? "is-selected" : ""}`} style={{ left: layout.rootX } as CSSProperties} onClick={() => setSelectedId("root")}>
          <span><GitBranch size={20} /></span><b>{title || "Untitled questline"}</b>
        </button>
        {nodes.map((node) => {
          const point = layout.points.get(node.id)!;
          return <button type="button" key={node.id} className={`draft-atlas-node ${selectedId === node.id ? "is-selected" : ""}`} style={{ left: point.x, top: point.y } as CSSProperties} onClick={() => setSelectedId(node.id)}>
            <span>{node.emoji || "✦"}</span><b>{node.title || "Untitled"}</b>
          </button>;
        })}
        {layout.openPoints.map((point, index) => <button type="button" key={`open-${point.parentId}-${index}`} className="draft-atlas-add" style={{ left: point.x, top: point.y } as CSSProperties} onClick={() => point.parentId ? onAddChild(point.parentId) : onAddRoot()} aria-label={point.parentId ? "Add child" : "Add quest"} title={point.parentId ? "Add child" : "Add quest"}><Plus size={15} /></button>)}
      </div>
    </div>

    <aside className="draft-atlas-inspector">
      {selected ? <>
        <div><span className="draft-atlas-label">Selected quest</span><h3>{selected.title || "Untitled quest"}</h3><p>Child of {relationships.parents.get(selected.id) ? nodes.find(node => node.id === relationships.parents.get(selected.id))?.title || "untitled quest" : title || "questline"}</p></div>
        <NodeFields node={selected} field={field} onUpdate={onUpdateNode} onFocus={onFocusField} />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onAddChild(selected.id)}><Plus className="w-3.5 h-3.5 mr-1" /> Child</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onAddSibling(selected.id)}><Plus className="w-3.5 h-3.5 mr-1" /> Sibling</Button>
        </div>
        <Button type="button" size="sm" variant="ghost" className="text-red-300 hover:text-red-200" onClick={() => onDelete(selected.id)}><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete this branch</Button>
      </> : <>
        <div><span className="draft-atlas-label">Questline root</span><h3>{title || "Untitled questline"}</h3><p>Select any quest to edit all of its details.</p></div>
        <div><Label htmlFor="draft-root-icon" className="text-xs text-purple-200">Icon</Label><Input id="draft-root-icon" value={icon} onChange={(event) => onIconChange(event.target.value)} className={field} maxLength={8} /></div>
        <div><Label htmlFor="draft-root-title" className="text-xs text-purple-200">Questline title *</Label><Input id="draft-root-title" value={title} onChange={(event) => onTitleChange(event.target.value)} onFocus={onFocusField} className={field} maxLength={200} placeholder="A clear north star" /></div>
        <div><Label htmlFor="draft-root-description" className="text-xs text-purple-200">Description</Label><Textarea id="draft-root-description" value={description} onChange={(event) => onDescriptionChange(event.target.value)} onFocus={onFocusField} className={`${field} min-h-[72px]`} maxLength={500} /></div>
      </>}
    </aside>
  </div>;
}

function NodeFields({ node, field, onUpdate, onFocus }: { node: QuestlineDraftNode; field: string; onUpdate: Props["onUpdateNode"]; onFocus?: Props["onFocusField"] }) {
  const input = (key: keyof QuestlineDraftNode) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onUpdate(node.id, { [key]: event.target.value });
  const id = (fieldName: string) => `draft-node-${node.id}-${fieldName}`;
  return <div className="draft-atlas-fields">
    <div className="grid grid-cols-[56px_1fr] gap-2">
      <div><Label htmlFor={id("icon")} className="text-xs text-purple-200">Icon</Label><Input id={id("icon")} value={node.emoji} onChange={input("emoji")} className={field} maxLength={8} /></div>
      <div><Label htmlFor={id("title")} className="text-xs text-purple-200">Title *</Label><Input id={id("title")} value={node.title} onChange={input("title")} onFocus={onFocus} className={field} maxLength={200} /></div>
    </div>
    <div><Label htmlFor={id("description")} className="text-xs text-purple-200">Description</Label><Textarea id={id("description")} value={node.description} onChange={input("description")} onFocus={onFocus} className={`${field} min-h-[62px]`} maxLength={500} /></div>
    <div className="grid grid-cols-2 gap-2">
      <div><Label htmlFor={id("due-date")} className="text-xs text-purple-200">Due date</Label><Input id={id("due-date")} type="date" value={node.dueDate} onChange={input("dueDate")} onFocus={onFocus} className={`${field} [color-scheme:dark]`} /></div>
      <div><Label htmlFor={id("duration")} className="text-xs text-purple-200">Duration (min)</Label><Input id={id("duration")} type="number" min="1" value={node.duration} onChange={input("duration")} onFocus={onFocus} className={field} /></div>
    </div>
    <div><Label htmlFor={id("importance")} className="text-xs text-purple-200">Importance · 🪙 {calculateGoldValue(node.importance, parseInt(node.duration) || 30)}</Label><Select value={node.importance} onValueChange={(value) => onUpdate(node.id, { importance: value })}><SelectTrigger id={id("importance")} className={field}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pareto">⭐ Pareto</SelectItem><SelectItem value="High">🔴 High</SelectItem><SelectItem value="Med-High">🟠 Med-High</SelectItem><SelectItem value="Medium">🟡 Medium</SelectItem><SelectItem value="Med-Low">🟢 Med-Low</SelectItem><SelectItem value="Low">⚪ Low</SelectItem></SelectContent></Select></div>
    <div className="grid grid-cols-2 gap-2">
      <div><Label htmlFor={id("work-filter")} className="text-xs text-purple-200">Work filter</Label><Select value={node.businessWorkFilter} onValueChange={(value) => onUpdate(node.id, { businessWorkFilter: value })}><SelectTrigger id={id("work-filter")} className={field}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="General">General</SelectItem><SelectItem value="Apple">Apple</SelectItem><SelectItem value="MW">MW</SelectItem><SelectItem value="GPR">GPR</SelectItem></SelectContent></Select></div>
      <div><Label htmlFor={id("campaign")} className="text-xs text-purple-200">Campaign</Label><Select value={node.campaign} onValueChange={(value) => onUpdate(node.id, { campaign: value })}><SelectTrigger id={id("campaign")} className={field}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem><SelectItem value="Main">Main</SelectItem><SelectItem value="Side">Side</SelectItem></SelectContent></Select></div>
    </div>
  </div>;
}
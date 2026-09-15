import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { UserSkill } from "@/../../shared/schema";
import "./constellation-stage.css";

export type ConstellationMilestone = { id: string; title: string; level?: number; x: number; y: number; parents?: string[] };
type Props = { skills: UserSkill[]; getMilestones: (skill: UserSkill) => ConstellationMilestone[]; getCustomIcon: (skill: UserSkill) => LucideIcon; pending: boolean; error?: Error | null; onRetry: () => void; onToggle: (id: number, milestoneId: string) => void; onEditSkill: (s: UserSkill) => void; onDeleteSkill: (s: UserSkill) => void; onAddSkill: () => void; onWhySkills: () => void; onEditMilestones: (s: UserSkill) => void };

const ORDER = ["Mindset", "Scholar", "Charisma", "Physical", "Artist", "Connector", "Craftsman", "Explorer", "Merchant", "Health"];
const COLORS: Record<string, string> = { Mindset: "#66e3e1", Scholar: "#b596ee", Charisma: "#e68eb4", Physical: "#f0d879", Artist: "#d77f8c", Connector: "#66e3e1", Craftsman: "#b596ee", Explorer: "#e68eb4", Merchant: "#f0d879", Health: "#d77f8c" };
const DESC: Record<string, string> = { Mindset: "transmute / reframe", Scholar: "study / synthesis", Charisma: "presence / influence", Physical: "strength / performance", Artist: "ideas / expression", Connector: "trust / belonging", Craftsman: "tools / creation", Explorer: "discovery / courage", Merchant: "value / leverage", Health: "vitality / longevity" };
const ICONS: Record<string, ReactNode> = {
  Mindset: <><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/></>,
  Scholar: <><path d="M3 5.5 12 2l9 3.5v11L12 20l-9-3.5z"/><path d="M12 20V8M3 5.5l9 4 9-4"/></>,
  Charisma: <><path d="M3 12c2.4-4.7 6-6.4 9-6.4s6.6 1.7 9 6.4c-2.4 4.7-6 6.4-9 6.4S5.4 16.7 3 12Z"/><path d="M7 12c1.5 1.4 3.2 2.1 5 2.1s3.5-.7 5-2.1"/></>,
  Physical: <><path d="M7 20v-5.2c0-1.3.9-2.3 2.1-2.5l2.4-.4 1.7-4.2c.4-1 1.6-1.4 2.4-.7.6.5.8 1.3.5 2L15 12.2l3.7.7c1.4.3 2.3 1.5 2.3 2.9V20"/><path d="M7 16H4v-3M12 8l-1.4-2.6a1.5 1.5 0 0 1 2.7-1.3L15 6"/></>,
  Artist: <><path d="m14 4 6 6M4 20l1.4-4.6L16.5 4.3a2.1 2.1 0 0 1 3 3L8.4 18.6z"/><path d="m13 7 4 4"/></>,
  Connector: <><path d="m8.5 12.5 2-2a2.1 2.1 0 0 1 3 0l.3.3a2.1 2.1 0 0 1 3 3l-3.2 3.2a3.5 3.5 0 0 1-5 0l-5-5a2.1 2.1 0 0 1 3-3l2 2"/><path d="m12 12 1.2 1.2"/></>,
  Craftsman: <path d="m14.7 6.3 3-3a4.3 4.3 0 0 0-5.5 5.5L4 17a2.1 2.1 0 1 0 3 3l8.2-8.2a4.3 4.3 0 0 0 5.5-5.5l-3 3z"/>,
  Explorer: <><circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/><path d="M12 3.5v2M20.5 12h-2M12 20.5v-2M3.5 12h2"/></>,
  Merchant: <><path d="M4 9h16l-1 11H5zM6 9a6 6 0 0 1 12 0"/><path d="M9 13a3 3 0 0 0 6 0"/></>,
  Health: <><path d="M20.4 5.8a4.4 4.4 0 0 0-6.2 0L12 8l-2.2-2.2a4.4 4.4 0 0 0-6.2 6.2L12 20.4l8.4-8.4a4.4 4.4 0 0 0 0-6.2Z"/><path d="M7 12h2l1-2 2 4 1-2h4"/></>,
};
function HubIcon({ name, custom }: { name: string; custom?: LucideIcon }) { if (!ICONS[name] && custom) { const C = custom; return <C aria-hidden="true" />; } return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name] || ICONS.Mindset}</svg>; }
function polar(cx: number, cy: number, radius: number, degrees: number): [number, number] { const a = degrees * Math.PI / 180; return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]; }

type OverviewBough = { point: [number, number]; leaves: { end: [number, number]; angle: number; active: boolean }[] };
type OverviewGeometry = { angle: number; hub: [number, number]; trunk: [number, number]; boughs: OverviewBough[]; label: [number, number]; labelRect: { left: number; top: number; right: number; bottom: number } };

function rectsOverlap(a: OverviewGeometry["labelRect"], b: OverviewGeometry["labelRect"], gap: number) {
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
}

function pointNearRect(point: [number, number], rect: OverviewGeometry["labelRect"], gap: number) {
  return point[0] > rect.left - gap && point[0] < rect.right + gap && point[1] > rect.top - gap && point[1] < rect.bottom + gap;
}

/** Single source of truth for rendered overview geometry and deterministic QA. */
function buildOverviewGeometry(w: number, h: number, strict = false): OverviewGeometry[] {
  const dimension = Math.min(w, h);
  const r = dimension * (w < 620 ? .235 : .255);
  const outer = dimension * (w < 620 ? .43 : .46);
  const span = outer - r;
  const compact = w < 767 || h < 500;
  const narrow = w <= 400;
  const labelHalfW = compact ? (narrow ? 28 : 32) : 76;
  const labelHalfH = compact ? (narrow ? 10 : 11) : 19;
  const cx = w / 2, cy = h * .49;
  const result: OverviewGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -90 + i * 36;
    const hub = polar(cx, cy, r, angle);
    const trunk = polar(hub[0], hub[1], span * .26, angle);
    const boughs = [-1, 1].map(side => {
      const boughAngle = angle + side * 6;
      const point = polar(hub[0], hub[1], span * .5, boughAngle);
      const leaves = [-1, 0, 1].map(j => {
        const leafAngle = boughAngle + j * 4.5;
        const end = polar(cx, cy, r + span * (.54 + (j === 0 ? .04 : .01)), leafAngle);
        return { end, angle: leafAngle, active: side === -1 && j === 0 };
      });
      return { point, leaves };
    });
    const raw = polar(cx, cy, outer, angle);
    const tangent: [number, number] = [-Math.sin(angle * Math.PI / 180), Math.cos(angle * Math.PI / 180)];
    const points = [hub, trunk, ...boughs.flatMap(b => [b.point, ...b.leaves.map(l => l.end)])];
    const offsets = Array.from({ length: 81 }, (_, n) => n === 0 ? 0 : (n % 2 ? -1 : 1) * Math.ceil(n / 2) * 4);
    let placed: OverviewGeometry | null = null;
    for (const radialOffset of [0, 12, -12, 24, -24, 36, -36]) {
      for (const offset of offsets) {
        const radial: [number, number] = [Math.cos(angle * Math.PI / 180) * radialOffset, Math.sin(angle * Math.PI / 180) * radialOffset];
        const candidate: [number, number] = [raw[0] + radial[0] + tangent[0] * offset, raw[1] + radial[1] + tangent[1] * offset];
        const x = Math.max(labelHalfW + 8, Math.min(w - labelHalfW - 8, candidate[0]));
        const y = Math.max(labelHalfH + 8, Math.min(h - labelHalfH - 8, candidate[1]));
        const rect = { left: x - labelHalfW, top: y - labelHalfH, right: x + labelHalfW, bottom: y + labelHalfH };
        const ownCollision = points.some(point => pointNearRect(point, rect, 9));
        const neighborCollision = result.some(item => rectsOverlap(rect, item.labelRect, 8));
        if (!ownCollision && !neighborCollision) { placed = { angle, hub, trunk, boughs, label: [x, y], labelRect: rect }; break; }
      }
      if (placed) break;
    }
    if (!placed) {
      if (strict) throw new Error(`No valid overview label placement for sector ${i} at ${w}×${h}`);
      const x = Math.max(labelHalfW + 2, Math.min(w - labelHalfW - 2, raw[0]));
      const y = Math.max(labelHalfH + 2, Math.min(h - labelHalfH - 2, raw[1]));
      placed = { angle, hub, trunk, boughs, label: [x, y], labelRect: { left: x - labelHalfW, top: y - labelHalfH, right: x + labelHalfW, bottom: y + labelHalfH } };
    }
    result.push(placed);
  }
  return result;
}

/** Deterministic guard for the exact geometry rendered by the overview. */
function checkOverviewGeometry(w: number, h: number): boolean {
  const geometry = buildOverviewGeometry(w, h, true);
  const dimension = Math.min(w, h);
  const r = dimension * (w < 620 ? .235 : .255);
  const outer = dimension * (w < 620 ? .43 : .46);
  const span = outer - r;
  return geometry.every((tree, i) => {
    const leafAngles = tree.boughs.flatMap(b => b.leaves.map(leaf => leaf.angle));
    const angleDelta = (a: number) => Math.abs((((a - tree.angle) + 540) % 360) - 180);
    const points = [tree.hub, tree.trunk, ...tree.boughs.flatMap(b => [b.point, ...b.leaves.map(l => l.end)])];
    const pairwiseClear = geometry.every((other, j) => i === j || !rectsOverlap(tree.labelRect, other.labelRect, 0));
    const ownClear = points.every(point => !pointNearRect(point, tree.labelRect, 8));
    const radialClear = r + span * .58 < outer - Math.max(22, dimension * .035);
    return leafAngles.every(a => angleDelta(a) <= 14) && ownClear && pairwiseClear && radialClear &&
      geometry.length === 10 &&
      tree.labelRect.left >= 0 && tree.labelRect.top >= 0 && tree.labelRect.right <= w && tree.labelRect.bottom <= h;
  });
}

export function ConstellationStage({ skills, getMilestones, getCustomIcon, pending, error, onRetry, onToggle, onEditSkill, onDeleteSkill, onAddSkill, onWhySkills, onEditMilestones }: Props) {
  const canonical = useMemo(() => ORDER.map(n => skills.find(s => s.skillName === n)).filter(Boolean) as UserSkill[], [skills]);
  const stageRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [focusId, setFocusId] = useState<number | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [linked, setLinked] = useState<number | null>(null);
  const focused = skills.find(s => s.id === focusId);
  const milestones = focused ? getMilestones(focused) : [];
  const done = new Set((focused?.completedMilestones as string[] | null) || []);
  const byId = new Map(milestones.map(m => [m.id, m]));
  const status = (m: ConstellationMilestone) => done.has(m.id) ? "mastered" : m.parents?.length && m.parents.every(p => done.has(p)) ? "available" : m.parents?.length ? "locked" : "progress";

  useEffect(() => { const el = stageRef.current; if (!el) return; const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height })); ro.observe(el); return () => ro.disconnect(); }, []);
  useEffect(() => {
    if (import.meta.env.DEV) {
      const boxes = [[1280, 720], [1024, 738], [390, 780], [780, 390], [667, 326], [320, 480], [360, 640]] as const;
      boxes.forEach(([w, h]) => {
        if (!checkOverviewGeometry(w, h)) throw new Error(`Constellation overview geometry check failed at ${w}×${h}`);
      });
    }
  }, []);
  useEffect(() => { const sync = () => { const q = new URLSearchParams(window.location.search).get("domain"); const s = skills.find(x => x.skillName.toLowerCase().replace(/\s+/g, "-") === q); setFocusId(s?.id ?? null); setNodeId(null); }; sync(); window.addEventListener("popstate", sync); return () => window.removeEventListener("popstate", sync); }, [skills]);
  useEffect(() => { if (!mapRef.current) return; if (focused) mapRef.current.setAttribute("inert", ""); else mapRef.current.removeAttribute("inert"); }, [focused]);
  const updateUrl = (skill?: UserSkill) => { const u = new URL(window.location.href); skill ? u.searchParams.set("domain", skill.skillName.toLowerCase().replace(/\s+/g, "-")) : u.searchParams.delete("domain"); window.history.pushState({ domain: skill?.skillName }, "", u); };
  const enter = (skill: UserSkill) => { setFocusId(skill.id); setNodeId(null); updateUrl(skill); };
  const close = () => { setFocusId(null); setNodeId(null); updateUrl(); };
  const cycle = (direction: number) => { if (!canonical.length) return; const i = Math.max(0, canonical.findIndex(s => s.id === focused?.id)); enter(canonical[(i + direction + canonical.length) % canonical.length]); };
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === "Escape" && focused) close(); else if (e.key === "ArrowLeft") cycle(-1); else if (e.key === "ArrowRight") cycle(1); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); });

  if (error) return <main className="constellation-stage constellation-error"><h1>Unable to illuminate your skills</h1><p>{error.message || "The constellation could not be loaded."}</p><button onClick={onRetry}>Try again</button></main>;
  const w = size.w || 900, h = size.h || 620;
  const geometry = buildOverviewGeometry(w, h);
  const overview = canonical.map((skill, i) => ({ skill, i, ...geometry[i] }));
  const depthMap = (nodes: ConstellationMilestone[]) => { const map = new Map<string, number>(); const visiting = new Set<string>(); const walk = (node: ConstellationMilestone): number => { if (map.has(node.id)) return map.get(node.id)!; if (visiting.has(node.id)) return 0; visiting.add(node.id); const depth = node.parents?.length ? Math.max(...node.parents.map(id => walk(byId.get(id) || { id, title: id, x: 0, y: 0, parents: [] }))) + 1 : 0; visiting.delete(node.id); map.set(node.id, depth); return depth; }; nodes.forEach(walk); return map; };
  const dm = depthMap(milestones), maxDepth = milestones.length ? Math.max(...Array.from(dm.values())) : 0;
  const depthGroups = Array.from({ length: maxDepth + 1 }, (_, d) => milestones.filter(m => dm.get(m.id) === d));
  const focusPos = new Map<string, [number, number]>();
  depthGroups.forEach((group, depth) => group.forEach((node, index) => focusPos.set(node.id, [w * (.08 + (index + 1) * .84 / (group.length + 1)), h * (.68 - (maxDepth ? depth / maxDepth : 0) * .50)])));
  return <main ref={stageRef} className="constellation-stage" aria-label="Life OS skill constellation">
    <section ref={mapRef} className={`constellation-map ${focused ? "is-hidden" : ""}`} aria-label="Ten skill constellation overview" aria-hidden={!!focused}>
      <div className="constellation-nebula"><i /></div>
      <svg className="constellation-lines" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">{overview.flatMap(({ skill, i, hub, trunk, boughs }) => [
        <path key={`${skill.id}-trunk`} className={`constellation-path trunk ${linked === i ? "linked" : ""}`} d={`M${hub[0]} ${hub[1]} Q${(hub[0] + trunk[0]) / 2} ${(hub[1] + trunk[1]) / 2} ${trunk[0]} ${trunk[1]}`} />,
        ...boughs.flatMap((bough, boughIndex) => [
          <path key={`${skill.id}-bough-${boughIndex}`} className={`constellation-path bough ${linked === i ? "linked" : ""}`} d={`M${trunk[0]} ${trunk[1]} Q${(trunk[0] + bough.point[0]) / 2} ${(trunk[1] + bough.point[1]) / 2} ${bough.point[0]} ${bough.point[1]}`} />,
          ...bough.leaves.map((leaf, leafIndex) => {
            const bend = (leaf.end[0] - bough.point[0]) * .08;
            return <path key={`${skill.id}-leaf-${boughIndex}-${leafIndex}`} className={`constellation-path ${leaf.active ? "active" : "faint"} ${linked === i ? "linked" : ""}`} d={`M${bough.point[0]} ${bough.point[1]} Q${(bough.point[0] + leaf.end[0]) / 2 - bend} ${(bough.point[1] + leaf.end[1]) / 2} ${leaf.end[0]} ${leaf.end[1]}`} />;
          }),
        ]),
      ])}</svg>
      {overview.flatMap(({ skill, i, hub, label, trunk, boughs }) => <Fragment key={skill.id}>
        <span className="node-dot trunk-junction progress" style={{ left: trunk[0], top: trunk[1] }} aria-hidden="true" />
        {boughs.map((bough, boughIndex) => <Fragment key={`${skill.id}-bough-nodes-${boughIndex}`}>
          <span className="node-dot split-junction progress" style={{ left: bough.point[0], top: bough.point[1] }} aria-hidden="true" />
          {bough.leaves.map((leaf, leafIndex) => <span key={`${skill.id}-leaf-node-${boughIndex}-${leafIndex}`} className={`node-dot ${leaf.active ? "progress" : "locked"}`} style={{ left: leaf.end[0], top: leaf.end[1] }} aria-hidden="true" />)}
        </Fragment>)}
        <span className={`atlas-skill ${linked === i ? "linked" : ""}`} style={{ "--x": `${hub[0]}px`, "--y": `${hub[1]}px`, "--lx": `${label[0]}px`, "--ly": `${label[1]}px`, "--tone": COLORS[skill.skillName] || "#b596ee" } as CSSProperties}>
        <button className="atlas-hub" aria-label={`Open ${skill.skillName} skill tree`} onMouseEnter={() => setLinked(i)} onMouseLeave={() => setLinked(null)} onFocus={() => setLinked(i)} onBlur={() => setLinked(null)} onClick={() => enter(skill)}><HubIcon name={skill.skillName} custom={getCustomIcon(skill)} /></button>
        <button className="atlas-label" onMouseEnter={() => setLinked(i)} onMouseLeave={() => setLinked(null)} onFocus={() => setLinked(i)} onBlur={() => setLinked(null)} onClick={() => enter(skill)}><b>{skill.skillName}</b><small>{DESC[skill.skillName] || "personal practice"}</small></button>
        </span>
      </Fragment>)}
      <button className="constellation-pager prev" aria-label="Previous skill" onClick={() => cycle(-1)}>‹</button><button className="constellation-pager next" aria-label="Next skill" onClick={() => cycle(1)}>›</button><button className="atlas-caption" onClick={close}>Overview · {canonical.length} skills</button>
      <div className="constellation-utility"><button onClick={onWhySkills}>Why skills?</button><button onClick={onAddSkill}>Add skill</button></div>
    </section>
    <section className={`constellation-focus ${focused ? "is-active" : ""}`} aria-label={focused ? `${focused.skillName} focused skill tree` : undefined}>
      {focused && <><svg className="focus-lines" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">{milestones.flatMap(node => (node.parents || []).map(parent => { const from = focusPos.get(parent), to = focusPos.get(node.id); if (!from || !to) return null; const controlX = (from[0] + to[0]) / 2 + (to[1] - from[1]) * .12; return <path key={`${parent}-${node.id}`} className={`constellation-path ${status(node) === "locked" ? "faint" : "active"}`} d={`M${from[0]} ${from[1]} Q${controlX} ${(from[1] + to[1]) / 2} ${to[0]} ${to[1]}`} />; }))}</svg>
        {milestones.map(node => { const pos = focusPos.get(node.id); if (!pos) return null; return <button key={node.id} className={`focus-node ${status(node)}`} style={{ left: pos[0], top: pos[1] }} aria-label={`${node.title}, ${status(node)}`} disabled={pending} onClick={() => setNodeId(node.id)} />; })}
        <div className="focus-hub" style={{ "--tone": COLORS[focused.skillName] || "#b596ee" } as CSSProperties}><HubIcon name={focused.skillName} custom={getCustomIcon(focused)} /></div><div className="focus-title"><b>{focused.skillName}</b><small>{DESC[focused.skillName] || "personal practice"} · Level {focused.level} · {focused.xp}/{focused.maxXp} XP</small></div>
        <button className="focus-back" onClick={close}>‹&nbsp; All skills</button><button className="constellation-pager prev" aria-label="Previous skill" onClick={() => cycle(-1)}>‹</button><button className="constellation-pager next" aria-label="Next skill" onClick={() => cycle(1)}>›</button>
        <aside className={`node-inspector ${nodeId ? "show" : ""}`} aria-live="polite">{nodeId && byId.get(nodeId) && (() => { const selected = byId.get(nodeId)!; const state = status(selected); return <><span>{state} · {selected.id}</span><h2>{selected.title}</h2><p>{selected.parents?.length ? `Prerequisites: ${selected.parents.map(p => byId.get(p)?.title).filter(Boolean).join(" · ")}` : "Foundation milestone · no prerequisites"}</p><small>{state === "mastered" ? "Path illuminated · complete" : state === "available" ? "Prerequisite met · ready" : "Prerequisite path still forming"}</small><div className="inspector-actions"><button disabled={pending || state === "locked"} onClick={() => { onToggle(focused.id, selected.id); setNodeId(null); }}>{pending ? "Saving…" : state === "mastered" ? "Dim this node" : "Light this node"}</button><button onClick={() => setNodeId(null)}>Close</button></div></>; })()}</aside>
        <div className="focus-low-controls"><button onClick={() => onEditSkill(focused)}>Edit skill</button><button onClick={() => onEditMilestones(focused)}>Customize</button>{focused.isCustom && <button onClick={() => onDeleteSkill(focused)}>Delete</button>}</div>
      </>}
    </section>
  </main>;
}
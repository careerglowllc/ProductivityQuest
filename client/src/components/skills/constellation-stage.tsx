import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { UserSkill } from "@/../../shared/schema";

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
  useEffect(() => { const sync = () => { const q = new URLSearchParams(window.location.search).get("domain"); const s = skills.find(x => x.skillName.toLowerCase().replace(/\s+/g, "-") === q); setFocusId(s?.id ?? null); setNodeId(null); }; sync(); window.addEventListener("popstate", sync); return () => window.removeEventListener("popstate", sync); }, [skills]);
  useEffect(() => { if (!mapRef.current) return; if (focused) mapRef.current.setAttribute("inert", ""); else mapRef.current.removeAttribute("inert"); }, [focused]);
  const updateUrl = (skill?: UserSkill) => { const u = new URL(window.location.href); skill ? u.searchParams.set("domain", skill.skillName.toLowerCase().replace(/\s+/g, "-")) : u.searchParams.delete("domain"); window.history.pushState({ domain: skill?.skillName }, "", u); };
  const enter = (skill: UserSkill) => { setFocusId(skill.id); setNodeId(null); updateUrl(skill); };
  const close = () => { setFocusId(null); setNodeId(null); updateUrl(); };
  const cycle = (direction: number) => { if (!canonical.length) return; const i = Math.max(0, canonical.findIndex(s => s.id === focused?.id)); enter(canonical[(i + direction + canonical.length) % canonical.length]); };
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === "Escape" && focused) close(); else if (e.key === "ArrowLeft") cycle(-1); else if (e.key === "ArrowRight") cycle(1); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); });

  if (error) return <main className="constellation-stage constellation-error"><h1>Unable to illuminate your skills</h1><p>{error.message || "The constellation could not be loaded."}</p><button onClick={onRetry}>Try again</button></main>;
  const w = size.w || 900, h = size.h || 620, cx = w / 2, cy = h * .49;
  const overview = canonical.map((skill, i) => {
    const r = Math.min(w, h) * .255, outer = Math.min(w, h) * .45, angle = -90 + i * (360 / 10), hub = polar(cx, cy, r, angle);
    const branchPaths = Array.from({ length: 6 }, (_, j) => { const a = angle - 28 + j * 11; const fraction = .48 + (j % 3) * .14; const radius = r + (outer - r) * fraction; const p1 = polar(hub[0], hub[1], (radius - r) * .32, a + (j % 2 ? 7 : -6)); const p2 = polar(hub[0], hub[1], (radius - r) * .66, a - (j % 2 ? 7 : -4)); const end = polar(cx, cy, radius, a); return { points: [p1, p2, end], d: `M${hub[0]} ${hub[1]} L${p1[0]} ${p1[1]} L${p2[0]} ${p2[1]} L${end[0]} ${end[1]}`, active: j < 2 }; });
    const label = polar(cx, cy, outer, angle);
    return { skill, i, hub, label, branchPaths };
  });
  const depthMap = (nodes: ConstellationMilestone[]) => { const map = new Map<string, number>(); const visiting = new Set<string>(); const walk = (node: ConstellationMilestone): number => { if (map.has(node.id)) return map.get(node.id)!; if (visiting.has(node.id)) return 0; visiting.add(node.id); const depth = node.parents?.length ? Math.max(...node.parents.map(id => walk(byId.get(id) || { id, title: id, x: 0, y: 0, parents: [] }))) + 1 : 0; visiting.delete(node.id); map.set(node.id, depth); return depth; }; nodes.forEach(walk); return map; };
  const dm = depthMap(milestones), maxDepth = milestones.length ? Math.max(...Array.from(dm.values())) : 0;
  const depthGroups = Array.from({ length: maxDepth + 1 }, (_, d) => milestones.filter(m => dm.get(m.id) === d));
  const focusPos = new Map<string, [number, number]>();
  depthGroups.forEach((group, depth) => group.forEach((node, index) => focusPos.set(node.id, [w * (.08 + (index + 1) * .84 / (group.length + 1)), h * (.68 - (maxDepth ? depth / maxDepth : 0) * .50)])));
  return <main ref={stageRef} className="constellation-stage" aria-label="Life OS skill constellation">
    <section ref={mapRef} className={`constellation-map ${focused ? "is-hidden" : ""}`} aria-label="Ten skill constellation overview" aria-hidden={!!focused}>
      <div className="constellation-nebula"><i /></div>
      <svg className="constellation-lines" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">{overview.flatMap(({ branchPaths, skill, i }) => branchPaths.map((p, j) => <path key={`${skill.id}-branch-${j}`} className={`constellation-path ${p.active ? "active" : "faint"} ${linked === i ? "linked" : ""}`} d={p.d} />))}</svg>
      {overview.flatMap(({ skill, i, hub, label, branchPaths }) => <Fragment key={skill.id}>
        {branchPaths.flatMap((branch, branchIndex) => branch.points.map((point, pointIndex) => <span key={`${skill.id}-${branchIndex}-${pointIndex}`} className={`node-dot ${pointIndex === 0 ? "progress" : "locked"}`} style={{ left: point[0], top: point[1] }} aria-hidden="true" />))}
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
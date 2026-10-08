import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Target, X } from "lucide-react";
import type { BusinessBranch } from "@shared/command-center";

const EASE = [0.22, 1, 0.36, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");
export const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function scrollToId(id: string, reduced: boolean | null) {
  document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

// Fades and lifts into place the first time it scrolls into view.
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5, delay, ease: EASE }}>{children}</motion.div>;
}

// Counts the numbers inside a string up from zero; the settled text is exactly the original.
export function CountUp({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (reduced) { setProgress(1); return; }
    if (!inView) return;
    const controls = animate(0, 1, { duration: 1.4, ease: EASE, onUpdate: setProgress });
    return () => controls.stop();
  }, [inView, reduced]);
  const parts = text.split(/(\d[\d,]*(?:\.\d+)?)/);
  const step = (token: string) => {
    if (progress >= 1) return token;
    const decimals = token.includes(".") ? token.split(".")[1].length : 0;
    const value = parseFloat(token.replace(/,/g, "")) * progress;
    return token.includes(",") ? value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : value.toFixed(decimals);
  };
  return <span ref={ref}><span aria-hidden="true">{parts.map((part, i) => (i % 2 ? step(part) : part))}</span><span className="cc-sr">{text}</span></span>;
}

const toneOf = (status: string) => /protect/i.test(status) ? "protect" : /resolve/i.test(status) ? "resolve" : /maintain/i.test(status) ? "maintain" : /option/i.test(status) ? "option" : "other";
const toneRank = ["protect", "resolve", "maintain", "option", "other"];

// Ventures grouped into lanes by the role/status the briefing gives each one.
export function PortfolioBoard({ businesses, gate }: { businesses: BusinessBranch[]; gate?: string }) {
  const reduced = useReducedMotion();
  const lanes = new Map<string, BusinessBranch[]>();
  businesses.forEach(b => lanes.set(b.status, [...(lanes.get(b.status) ?? []), b]));
  const ordered = Array.from(lanes.entries()).sort(([a], [b]) => toneRank.indexOf(toneOf(a)) - toneRank.indexOf(toneOf(b)));
  return <div>
    <div className="cc-board" role="group" aria-label="Ventures grouped by role">
      {ordered.map(([status, items], laneIndex) => <motion.div key={status} className={`cc-lane tone-${toneOf(status)}`}
        initial={reduced ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, delay: laneIndex * 0.1, ease: EASE }}>
        <div className="cc-lane-head"><span>{status}</span><b>{items.length}</b></div>
        {items.map(b => <button type="button" key={b.name} className="cc-chip" onClick={() => scrollToId(`cc-venture-${slug(b.name)}`, reduced)}>
          <strong>{b.name}</strong><small>{b.role}</small></button>)}
      </motion.div>)}
    </div>
    {gate && <p className="cc-board-gate"><Target size={13} />{gate}</p>}
  </div>;
}

// Stage bars that narrow down the page. The taper is decoration only: it carries no conversion data.
export function FunnelGraphic({ stages }: { stages: string[] }) {
  const reduced = useReducedMotion();
  const last = Math.max(stages.length - 1, 1);
  return <div>
    <ol className="cc-funnel" aria-label="Conversion pathway, first stage to last">
      {stages.map((label, i) => <motion.li key={i} className="cc-funnel-row"
        style={{ width: `${100 - (i / last) * 50}%`, "--t": Math.round((i / last) * 100) } as CSSProperties}
        initial={reduced ? false : { opacity: 0, scaleX: 0.7 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.5, delay: i * 0.07, ease: EASE }}>
        <span className="cc-funnel-index">{pad(i + 1)}</span><span>{label}</span>
      </motion.li>)}
    </ol>
    <p className="cc-muted cc-caption">Shape is illustrative. It shows order, not conversion rates.</p>
  </div>;
}

// A rising staircase: rung 1 at the bottom left, the last rung at the top right.
export function CapitalLadder({ steps }: { steps: string[] }) {
  const reduced = useReducedMotion();
  const last = Math.max(steps.length - 1, 1);
  return <div>
    <ol className="cc-ladder" aria-label="Capital ladder, first rung first">
      {steps.map((text, i) => <motion.li key={i} className="cc-rung"
        style={{ marginLeft: `${(i / last) * 24}%`, "--t": Math.round((i / last) * 100) } as CSSProperties}
        initial={reduced ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.45, delay: i * 0.12, ease: EASE }}>
        <span className="cc-funnel-index">{pad(i + 1)}</span><span>{text}</span>
      </motion.li>)}
    </ol>
    <p className="cc-muted cc-caption">Climb one rung at a time, from the bottom up.</p>
  </div>;
}

// Numbered nodes on a ring with animated arrows between them, and a marker that keeps circling.
export function LoopDiagram({ steps }: { steps: string[] }) {
  const reduced = useReducedMotion();
  const n = steps.length;
  if (n < 2) return null;
  const C = 160, R = 108, NR = 17, gap = (NR + 6) / R;
  const theta = (i: number) => ((-90 + (360 / n) * i) * Math.PI) / 180;
  const point = (angle: number) => ({ x: C + Math.cos(angle) * R, y: C + Math.sin(angle) * R });
  return <div className="cc-loop">
    <svg viewBox="0 0 320 320" role="img" aria-label={`Compounding loop of ${n} steps, repeating from the start: ${steps.join(", then ")}.`}>
      <defs><marker id="cc-loop-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--cc-accent)" /></marker></defs>
      <circle cx={C} cy={C} r={R} className="cc-loop-guide" />
      {steps.map((_, i) => {
        const from = point(theta(i) + gap), to = point(theta(i + 1) - gap);
        return <motion.path key={`arc-${i}`} d={`M${from.x} ${from.y} A${R} ${R} 0 0 1 ${to.x} ${to.y}`} fill="none" stroke="var(--cc-accent)" strokeWidth={1.7}
          markerEnd="url(#cc-loop-arrow)" initial={reduced ? false : { pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.6, delay: 0.3 + i * 0.22, ease: EASE }} />;
      })}
      <g className="cc-orbit"><circle cx={C} cy={C - R} r={3.6} fill="var(--cc-gold)" /></g>
      {steps.map((_, i) => {
        const p = point(theta(i));
        return <motion.g key={`node-${i}`} initial={reduced ? false : { opacity: 0, scale: 0.4 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.4, delay: i * 0.22, ease: EASE }}>
          <circle cx={p.x} cy={p.y} r={NR} className="cc-loop-node" />
          <text x={p.x} y={p.y} className="cc-loop-num" textAnchor="middle" dominantBaseline="central">{pad(i + 1)}</text>
        </motion.g>;
      })}
      <text x={C} y={C - 4} textAnchor="middle" className="cc-loop-center">COMPOUND</text>
      <text x={C} y={C + 12} textAnchor="middle" className="cc-loop-center sub">repeat from 01</text>
    </svg>
  </div>;
}

export function PrincipleCards({ items }: { items: string[] }) {
  return <ol className="cc-principles">{items.map((text, i) => <li key={i}><Reveal delay={i * 0.05} className="cc-principle"><span>{pad(i + 1)}</span><p>{text}</p></Reveal></li>)}</ol>;
}

export function DiagnosticFlow({ items }: { items: { signal: string; interpretation: string }[] }) {
  return <div className="cc-diag-list">{items.map((d, i) => <Reveal key={i} delay={i * 0.06} className="cc-diag">
    <strong><Target size={13} />{d.signal}</strong>
    <p><ArrowRight size={14} />{d.interpretation}</p>
  </Reveal>)}</div>;
}

export function ConceptGrid({ concepts, avoid }: { concepts: string[]; avoid: string[] }) {
  return <>
    <div className="cc-concepts">{concepts.map((text, i) => <Reveal key={i} delay={i * 0.06} className="cc-concept"><span>{pad(i + 1)}</span><p>{text}</p></Reveal>)}</div>
    {avoid.length > 0 && <div className="cc-avoid-block"><p className="cc-kicker">Guardrails / what to avoid</p>
      {avoid.map((text, i) => <Reveal key={i} delay={i * 0.06} className="cc-avoid"><X size={14} /><p>{text}</p></Reveal>)}</div>}
  </>;
}

export function SuccessChecks({ items }: { items: string[] }) {
  const reduced = useReducedMotion();
  return <ul className="cc-success">{items.map((text, i) => <motion.li key={i} initial={reduced ? false : { opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}>
    <svg viewBox="0 0 24 24" className="cc-check" aria-hidden="true"><circle cx="12" cy="12" r="10.5" />
      <motion.path d="M7 12.5l3.2 3.2L17 9" initial={reduced ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.25 + i * 0.08 }} /></svg>
    <span>{text}</span></motion.li>)}</ul>;
}

import type { ReactNode } from "react";
import { Activity, ArrowRight, CheckCheck, Compass, GitBranch, Layers3, Lightbulb, Repeat2, ShieldCheck, Users, Workflow } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import type { CommandBriefing, CommandEntry } from "@shared/command-center";
import {
  CapitalLadder, ConceptGrid, CountUp, DiagnosticFlow, FunnelGraphic, LoopDiagram, PortfolioBoard,
  PrincipleCards, Reveal, SuccessChecks, scrollToId, slug,
} from "./briefing-visuals";

export const allocationColors = ["#61A9BD", "#CED14E", "#44986D", "#DD83C9", "#1F74AD"];

export function Section({ title, number, icon, children, id }: { title: string; number?: string; icon: ReactNode; children: ReactNode; id?: string }) {
  return <section className="cc-panel" id={id}><div className="cc-section-heading">{icon}<h3>{title}</h3>{number && <span className="cc-section-number">{number}</span>}</div>{children}</section>;
}
function List({ items }: { items: string[] }) {
  return <ul className="cc-list">{items.map((text, i) => <li key={i}>{text}</li>)}</ul>;
}
function Flow({ items }: { items: string[] }) {
  return <ol className="cc-flow">{items.map((text, i) => <li key={i}><span className="cc-flow-index">{String(i + 1).padStart(2, "0")}</span><span>{text}</span></li>)}</ol>;
}

export function AttentionAllocation({ entry, onEdit }: { entry: CommandEntry; onEdit: () => void }) {
  const reduced = useReducedMotion();
  const illustrative = !!entry.briefing && entry.allocation.length === 2 && entry.allocation[0].value === 80 && entry.allocation[1].value === 20;
  return <Section title="Attention allocation" number="PARETO" icon={<Compass />} id="cc-attention">
    <p className="cc-kicker">{illustrative ? "Proposed · illustrative 80/20 model" : "Entry’s attention plan"}</p>
    <p className="cc-muted">Share of planned attention—not revenue, actual finances, or measured time.</p>
    {entry.allocation.length > 0 ? <>
      <div className="cc-chart cc-donut" role="img" aria-label={`Attention allocation: ${entry.allocation.map(a => `${a.name}: ${a.value}%`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={entry.allocation} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={entry.allocation.length > 1 ? 3 : 0}
            startAngle={90} endAngle={-270} isAnimationActive={!reduced} animationDuration={1200} animationEasing="ease-out" stroke="var(--cc-panel)" strokeWidth={2}>
            {entry.allocation.map((a, i) => <Cell key={a.name + i} fill={allocationColors[i]} />)}
          </Pie><Tooltip formatter={(value: number, name: string) => [`${value}% of planned attention`, name]} contentStyle={{ background: "var(--cc-panel)", border: "1px solid var(--cc-line)", color: "var(--cc-ink)", borderRadius: 5 }} /></PieChart>
        </ResponsiveContainer>
        <div className="cc-donut-center" aria-hidden="true"><strong>{entry.allocation.map(a => a.value).join(" / ")}</strong><span>planned attention</span></div>
      </div>
      <ul aria-label="Attention allocation text alternative">{entry.allocation.map((a, i) => <li key={i} className="cc-legend"><span><i className="cc-swatch" style={{ background: allocationColors[i] }} />{a.name}</span><strong>{a.value}%</strong></li>)}</ul>
    </> : <p className="cc-muted">No allocation defined. Assign attention to up to five priorities.</p>}
    <button className="cc-button" onClick={onEdit} style={{ marginTop: 14 }}>Edit allocation <ArrowRight size={14} /></button>
  </Section>;
}

function ReadingProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  if (reduced) return null;
  return <motion.div className="cc-progress" style={{ scaleX }} aria-hidden="true" />;
}

const jumpLinks = [
  ["cc-attention", "Attention"], ["cc-principles", "Principles"], ["cc-ventures", "Ventures"], ["cc-creative", "Creative"],
  ["cc-funnel", "Funnel"], ["cc-delegation", "Delegation"], ["cc-capital", "Capital"], ["cc-success", "Success"],
] as const;

export function StrategyBriefing({ briefing: b, entry, onEdit }: { briefing: CommandBriefing; entry: CommandEntry; onEdit: () => void }) {
  const reduced = useReducedMotion();
  const gate = b.businesses.length ? b.principles.find(p => /nothing new/i.test(p)) : undefined;
  return <>
    <ReadingProgress />
    <Reveal><div className="cc-north"><p className="cc-kicker">Mission directive / north star</p><h3>{b.northStar}</h3><p className="cc-muted">{b.objective}</p></div></Reveal>
    <nav className="cc-jump" aria-label="Jump to a section">{jumpLinks.map(([id, label]) => <button type="button" key={id} onClick={() => scrollToId(id, reduced)}>{label}</button>)}</nav>
    {b.metrics.length > 0 && <><p className="cc-kicker" style={{ marginBottom: 12 }}>Planning targets · not measured results</p><div className="cc-metrics">{b.metrics.map((m, i) => <Reveal className="cc-metric" key={i} delay={i * 0.08}><span className="cc-kicker">{m.label}</span><strong><CountUp text={m.value} /></strong><p>{m.context}</p></Reveal>)}</div></>}
    <div className="cc-two"><AttentionAllocation entry={entry} onEdit={onEdit} /><Section title="Operating principles" number="01" icon={<ShieldCheck />} id="cc-principles"><PrincipleCards items={b.principles} /></Section></div>
    <Section title="Venture command map" number="02" icon={<GitBranch />} id="cc-ventures">
      <p className="cc-muted" style={{ marginBottom: 18 }}>Ventures grouped by the job each one does. Select one to jump to its detail.</p>
      <PortfolioBoard businesses={b.businesses} gate={gate} />
      <div className="cc-map-root"><span className="cc-kicker">Strategic objective</span><p>{b.objective}</p></div>
      <div className="cc-map-branches">{b.businesses.map((business, i) => <motion.article className="cc-business" id={`cc-venture-${slug(business.name)}`} key={i}
        initial={reduced ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <div className="cc-business-title"><div><p className="cc-kicker">{business.role}</p><h4>{business.name}</h4></div><span className="cc-status">{business.status}</span></div>
        <p className="cc-muted">{business.thesis}</p>
        <div className="cc-two"><div><p className="cc-kicker">Pros / strategic upside</p><List items={business.pros} /></div><div><p className="cc-kicker">Cons / trade-offs</p><List items={business.cons} /></div></div>
        <div className="cc-decision"><b>Decision gate</b>{business.decision}</div>
        <details><summary>Open action sequence · {business.actions.length} steps</summary><Flow items={business.actions} /></details>
      </motion.article>)}</div>
    </Section>
    <Section title="Creative sprint" number="03" icon={<Lightbulb />} id="cc-creative">
      <div className="cc-decision" style={{ marginTop: 0, marginBottom: 18 }}><b>Planning budget · not spend to date</b>{b.creativeSprint.budget}</div>
      <p className="cc-kicker" style={{ marginBottom: 8 }}>Deliverables</p><List items={b.creativeSprint.deliverables} />
      <p className="cc-kicker" style={{ margin: "22px 0 10px" }}>Concepts to explore</p>
      <ConceptGrid concepts={b.creativeSprint.concepts} avoid={b.creativeSprint.avoid} />
    </Section>
    <div className="cc-two"><Section title="Conversion pathway" number="04" icon={<Workflow />} id="cc-funnel"><p className="cc-muted" style={{ marginBottom: 18 }}>Decision sequence—not historical conversion measurements.</p><FunnelGraphic stages={b.funnel} /></Section>
      <Section title="Signal → response" number="05" icon={<Activity />}><DiagnosticFlow items={b.diagnostics} /></Section></div>
    <Section title="Founder’s responsibility matrix" number="06" icon={<Users />} id="cc-delegation"><div className="cc-two"><div><p className="cc-kicker">Own / highest leverage</p><List items={b.delegation.own} /></div><div><p className="cc-kicker">Delegate / release bandwidth</p><List items={b.delegation.delegate} /></div></div><div className="cc-two" style={{ marginTop: 22 }}><div><p className="cc-kicker">Learn / build judgment</p><List items={b.delegation.learn} /></div><div><p className="cc-kicker">Screening / decision criteria</p><List items={b.delegation.screening} /></div></div></Section>
    <div className="cc-two" id="cc-capital"><Section title="Capital ladder" number="07" icon={<Layers3 />}><CapitalLadder steps={b.capitalLadder} /></Section><Section title="Compounding loop" number="08" icon={<Repeat2 />}><LoopDiagram steps={b.compoundCycle} /><Flow items={b.compoundCycle} /><div className="cc-decision"><b>Loop, not a one-off</b>Return to the first step with the lessons from the last.</div></Section></div>
    <Section title="Definition of success" number="09" icon={<CheckCheck />} id="cc-success"><SuccessChecks items={b.success} /></Section>
  </>;
}

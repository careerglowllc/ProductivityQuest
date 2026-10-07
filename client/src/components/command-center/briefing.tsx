import type { ReactNode } from "react";
import { Activity, ArrowRight, CheckCheck, Compass, GitBranch, Layers3, Lightbulb, Repeat2, ShieldCheck, Target, Users, Workflow } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useReducedMotion } from "framer-motion";
import type { CommandBriefing, CommandEntry } from "@shared/command-center";

export const allocationColors = ["#61A9BD", "#CED14E", "#44986D", "#DD83C9", "#1F74AD"];

export function Section({ title, number, icon, children }: { title: string; number?: string; icon: ReactNode; children: ReactNode }) {
  return <section className="cc-panel"><div className="cc-section-heading">{icon}<h3>{title}</h3>{number && <span className="cc-section-number">{number}</span>}</div>{children}</section>;
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
  return <Section title="Attention allocation" number="PARETO" icon={<Compass />}>
    <p className="cc-kicker">{illustrative ? "Proposed · illustrative 80/20 model" : "Entry’s attention plan"}</p>
    <p className="cc-muted">Share of planned attention—not revenue, actual finances, or measured time.</p>
    {entry.allocation.length > 0 ? <>
      <div className="cc-chart" role="img" aria-label={`Attention allocation: ${entry.allocation.map(a => `${a.name}: ${a.value}%`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={entry.allocation} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} isAnimationActive={!reduced} stroke="var(--cc-panel)" strokeWidth={3}>
            {entry.allocation.map((a, i) => <Cell key={a.name + i} fill={allocationColors[i]} />)}
          </Pie><Tooltip formatter={(value: number, name: string) => [`${value}% of planned attention`, name]} contentStyle={{ background: "var(--cc-panel)", border: "1px solid var(--cc-line)", color: "var(--cc-ink)", borderRadius: 5 }} /></PieChart>
        </ResponsiveContainer>
      </div>
      <ul aria-label="Attention allocation text alternative">{entry.allocation.map((a, i) => <li key={i} className="cc-legend"><span><i className="cc-swatch" style={{ background: allocationColors[i] }} />{a.name}</span><strong>{a.value}%</strong></li>)}</ul>
    </> : <p className="cc-muted">No allocation defined. Assign attention to up to five priorities.</p>}
    <button className="cc-button" onClick={onEdit} style={{ marginTop: 14 }}>Edit allocation <ArrowRight size={14} /></button>
  </Section>;
}

export function StrategyBriefing({ briefing: b, entry, onEdit }: { briefing: CommandBriefing; entry: CommandEntry; onEdit: () => void }) {
  return <>
    <div className="cc-north"><p className="cc-kicker">Mission directive / north star</p><h3>{b.northStar}</h3><p className="cc-muted">{b.objective}</p></div>
    {b.metrics.length > 0 && <><p className="cc-kicker" style={{ marginBottom: 12 }}>Planning targets · not measured results</p><div className="cc-metrics">{b.metrics.map((m, i) => <div className="cc-metric" key={i}><span className="cc-kicker">{m.label}</span><strong>{m.value}</strong><p>{m.context}</p></div>)}</div></>}
    <div className="cc-two"><AttentionAllocation entry={entry} onEdit={onEdit} /><Section title="Operating principles" number="01" icon={<ShieldCheck />}><List items={b.principles} /></Section></div>
    <Section title="Venture command map" number="02" icon={<GitBranch />}>
      <p className="cc-muted" style={{ marginBottom: 18 }}>Evaluate each branch by its role, upside, friction, and next decision.</p>
      <div className="cc-map-root"><span className="cc-kicker">Strategic objective</span><p>{b.objective}</p></div>
      <div className="cc-map-branches">{b.businesses.map((business, i) => <article className="cc-business" key={i}>
        <div className="cc-business-title"><div><p className="cc-kicker">{business.role}</p><h4>{business.name}</h4></div><span className="cc-status">{business.status}</span></div>
        <p className="cc-muted">{business.thesis}</p>
        <div className="cc-two"><div><p className="cc-kicker">Pros / strategic upside</p><List items={business.pros} /></div><div><p className="cc-kicker">Cons / trade-offs</p><List items={business.cons} /></div></div>
        <div className="cc-decision"><b>Decision gate</b>{business.decision}</div>
        <details><summary>Open action sequence · {business.actions.length} steps</summary><Flow items={business.actions} /></details>
      </article>)}</div>
    </Section>
    <Section title="Creative sprint" number="03" icon={<Lightbulb />}>
      <div className="cc-decision" style={{ marginTop: 0, marginBottom: 18 }}><b>Planning budget · not spend to date</b>{b.creativeSprint.budget}</div>
      <div className="cc-two"><div><p className="cc-kicker">Deliverables</p><List items={b.creativeSprint.deliverables} /></div><div><p className="cc-kicker">Concepts to explore</p><List items={b.creativeSprint.concepts} /></div></div>
      <details style={{ marginTop: 18 }}><summary className="cc-muted" style={{ cursor: "pointer" }}>Guardrails / what to avoid</summary><List items={b.creativeSprint.avoid} /></details>
    </Section>
    <div className="cc-two"><Section title="Conversion pathway" number="04" icon={<Workflow />}><p className="cc-muted" style={{ marginBottom: 18 }}>Decision sequence—not historical conversion measurements.</p><Flow items={b.funnel} /></Section>
      <Section title="Signal → response" number="05" icon={<Activity />}>{b.diagnostics.map((d, i) => <div className="cc-diagnostic" key={i}><strong><Target size={14} />{d.signal}</strong><p>{d.interpretation}</p></div>)}</Section></div>
    <Section title="Founder’s responsibility matrix" number="06" icon={<Users />}><div className="cc-two"><div><p className="cc-kicker">Own / highest leverage</p><List items={b.delegation.own} /></div><div><p className="cc-kicker">Delegate / release bandwidth</p><List items={b.delegation.delegate} /></div></div><div className="cc-two" style={{ marginTop: 22 }}><div><p className="cc-kicker">Learn / build judgment</p><List items={b.delegation.learn} /></div><div><p className="cc-kicker">Screening / decision criteria</p><List items={b.delegation.screening} /></div></div></Section>
    <div className="cc-two"><Section title="Capital ladder" number="07" icon={<Layers3 />}><Flow items={b.capitalLadder} /></Section><Section title="Compounding loop" number="08" icon={<Repeat2 />}><Flow items={b.compoundCycle} /><div className="cc-decision"><b>Loop, not a one-off</b>Return to the first step with the lessons from the last.</div></Section></div>
    <Section title="Definition of success" number="09" icon={<CheckCheck />}><List items={b.success} /></Section>
  </>;
}

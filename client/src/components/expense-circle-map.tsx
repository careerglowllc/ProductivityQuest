import { useMemo, useState } from "react";
import { circleMap, type MapValue } from "@/lib/circle-map";

export function ExpenseCircleMap({ data, formatCurrency }: {
  data: MapValue[];
  formatCurrency: (value: number) => string;
}) {
  const cells = useMemo(() => circleMap(data), [data]);
  const [selected, setSelected] = useState<string | null>(null);
  const active = cells.find(c => c.data.name === selected)?.data;
  if (!cells.length) return <p className="py-16 text-center text-sm text-slate-400">No positive expenses to display. Add expenses to see your circle map.</p>;
  return <div>
    <p className="text-xs text-slate-400 text-center mb-2">Area represents monthly spending · Tap or focus a region for details</p>
    <svg viewBox="0 0 600 600" className="w-full max-w-[580px] mx-auto" role="group" aria-label="Monthly expenses circular treemap">
      {cells.map(({ data: entry, points, center, radius }) => {
        const size = Math.min(18, Math.max(10, radius / 4));
        const maxChars = Math.max(5, Math.floor(radius * 1.55 / (size * .58)));
        const words = entry.name.split(" ");
        const lines: string[] = [];
        words.forEach(word => {
          const last = lines.length - 1;
          if (last >= 0 && (lines[last] + " " + word).length <= maxChars) lines[last] += " " + word;
          else lines.push(word);
        });
        const showLabel = radius > 26;
        const visible = lines.slice(0, 2).map((line, i) => line.length > maxChars || (i === 1 && lines.length > 2) ? line.slice(0, maxChars - 1) + "…" : line);
        return <g key={entry.name} role="button" tabIndex={0}
          aria-label={`${entry.name}: ${formatCurrency(entry.value)}, ${entry.pct.toFixed(1)} percent of expenses`}
          aria-pressed={selected === entry.name}
          className="cursor-pointer outline-none [&:focus-visible_polygon]:stroke-white [&:focus-visible_polygon]:stroke-[5]"
          onMouseEnter={() => setSelected(entry.name)} onFocus={() => setSelected(entry.name)}
          onClick={() => setSelected(entry.name)}
          onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(entry.name); } }}>
          <title>{entry.name}: {formatCurrency(entry.value)} ({entry.pct.toFixed(1)}%)</title>
          <polygon points={points.map(p => p.join(",")).join(" ")} fill={entry.color}
            stroke={selected === entry.name ? "#fff" : "#0f172a"} strokeWidth={selected === entry.name ? 4 : 2}
            strokeLinejoin="round" />
          {showLabel && <text x={center[0]} y={center[1] - visible.length * size / 2}
            textAnchor="middle" fill="white" fontSize={size} fontWeight={600}
            style={{ pointerEvents: "none", paintOrder: "stroke", stroke: "rgba(0,0,0,.7)", strokeWidth: 3 }}>
            {visible.map((line, i) => <tspan key={i} x={center[0]} dy={i ? size * 1.2 : 0}>{line}</tspan>)}
            <tspan x={center[0]} dy={size * 1.4} fontSize={size * .85}>{formatCurrency(entry.value)}</tspan>
          </text>}
        </g>;
      })}
      <circle cx={300} cy={300} r={289} fill="none" stroke="#94a3b8" strokeWidth={2} pointerEvents="none" />
    </svg>
    <div className="min-h-[64px] text-center text-sm pt-2" aria-live="polite" aria-atomic="true">
      {active ? <><div className="font-semibold text-slate-200">{active.name}</div><div className="text-slate-400">{formatCurrency(active.value)} / month · {active.pct.toFixed(1)}% of expenses</div></> : <span className="text-slate-400">Select a region. All categories and exact amounts are listed below.</span>}
    </div>
  </div>;
}
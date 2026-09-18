import { useMemo, useState } from "react";
import { circleMap, placeExternalLabels, type MapValue } from "@/lib/circle-map";

export function ExpenseCircleMap({ data, formatCurrency }: {
  data: MapValue[];
  formatCurrency: (value: number) => string;
}) {
  const cells = useMemo(() => circleMap(data), [data]);
  const [selected, setSelected] = useState<string | null>(null);
  const active = cells.find(c => c.data.name === selected)?.data;
  const gradientId = (name: string) => `expense-cell-${name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
  const getInnerLabelLayout = (cell: typeof cells[number]) => {
    const size = Math.min(17, Math.max(11, cell.radius / 4.4));
    const usableWidth = cell.radius * 1.42;
    const words = cell.data.name.split(" ");
    const lines: string[] = [];
    words.forEach(word => {
      const last = lines.length - 1;
      const candidate = last >= 0 ? `${lines[last]} ${word}` : word;
      if (last >= 0 && candidate.length * size * .55 <= usableWidth) lines[last] = candidate;
      else lines.push(word);
    });
    const widestLine = Math.max(...lines.map(line => line.length * size * .55), formatCurrency(cell.data.value).length * size * .48);
    const blockHeight = lines.length * size * 1.16 + size;
    const fits = cell.radius >= 42 && lines.length <= 2 && widestLine <= usableWidth && blockHeight <= cell.radius * 1.35;
    return { size, lines, fits };
  };
  const externalCells = cells.filter(cell => !getInnerLabelLayout(cell).fits);
  const chartHeight = Math.max(620, externalCells.length * 38 + 88);
  const mapOffsetY = chartHeight / 2 - 300;
  const externalTextWidth = Math.max(154, ...externalCells.map(cell => Math.max(
    cell.data.name.length * 7.25,
    formatCurrency(cell.data.value).length * 6.6,
  )));
  const sideWidth = Math.ceil(externalTextWidth + 28);
  const chartWidth = 600 + sideWidth * 2;
  const labels = placeExternalLabels(externalCells.map(cell => ({
    id: cell.data.name,
    side: cell.center[0] < 300 ? "left" : "right",
    desiredY: cell.center[1] + mapOffsetY,
  })), 34, chartHeight - 34, 36);
  const labelById = new Map(labels.map(label => [label.id, label]));
  if (!cells.length) return <p className="py-16 text-center text-sm text-slate-400">No positive expenses to display. Add expenses to see your circle map.</p>;

  return <div className="expense-circle-map">
    <p className="mb-4 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500/80 dark:text-slate-400/70">Area represents monthly spending · select a region for detail</p>
    <div className="overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ minWidth: chartWidth }} className="mx-auto block w-full overflow-visible [font-family:Inter,ui-sans-serif,system-ui,sans-serif]" role="group" aria-label="Monthly expenses circular treemap">
        <defs>
          <radialGradient id="expense-map-atmosphere" cx="50%" cy="45%" r="58%">
            <stop offset="0%" stopColor="#7c6ee6" stopOpacity=".13" />
            <stop offset="58%" stopColor="#4f46a5" stopOpacity=".055" />
            <stop offset="100%" stopColor="#111827" stopOpacity="0" />
          </radialGradient>
          <filter id="expense-map-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="expense-cell-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#020617" floodOpacity=".24" />
          </filter>
          {cells.map(({ data: entry }) => (
            <radialGradient key={entry.name} id={gradientId(entry.name)} cx="38%" cy="28%" r="88%">
              <stop offset="0%" stopColor={entry.color} stopOpacity=".9" />
              <stop offset="62%" stopColor={entry.color} stopOpacity=".72" />
              <stop offset="100%" stopColor={entry.color} stopOpacity=".48" />
            </radialGradient>
          ))}
        </defs>
        <circle cx={sideWidth + 300} cy={mapOffsetY + 300} r="348" fill="url(#expense-map-atmosphere)" pointerEvents="none" />
        <circle cx={sideWidth + 300} cy={mapOffsetY + 300} r="304" fill="none" stroke="rgba(139,130,246,.12)" strokeWidth=".75" strokeDasharray="1 9" pointerEvents="none" />
        <circle cx={sideWidth + 300} cy={mapOffsetY + 300} r="294" fill="none" stroke="rgba(196,181,253,.2)" strokeWidth=".65" pointerEvents="none" />
        <g transform={`translate(${sideWidth} ${mapOffsetY})`}>
        {cells.map(({ data: entry, points, center, radius }) => {
        const labelLayout = getInnerLabelLayout({ data: entry, points, center, radius });
        const isExternal = !labelLayout.fits;
        const { size, lines: visible } = labelLayout;
        return <g key={entry.name} role="button" tabIndex={0}
          aria-label={`${entry.name}: ${formatCurrency(entry.value)}, ${entry.pct.toFixed(1)} percent of expenses`}
          aria-pressed={selected === entry.name}
          className="cursor-pointer outline-none [&:focus-visible_polygon]:stroke-violet-200 [&:focus-visible_polygon]:stroke-[1.5]"
          onMouseEnter={() => setSelected(entry.name)} onFocus={() => setSelected(entry.name)}
          onClick={() => setSelected(entry.name)}
          onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(entry.name); } }}>
          <title>{entry.name}: {formatCurrency(entry.value)} ({entry.pct.toFixed(1)}%)</title>
          <polygon points={points.map(p => p.join(",")).join(" ")} fill={`url(#${gradientId(entry.name)})`}
            stroke={selected === entry.name ? "rgba(221,214,254,.9)" : "rgba(226,232,240,.28)"} strokeWidth={selected === entry.name ? 1.5 : .65}
            strokeLinejoin="round" filter={selected === entry.name ? "url(#expense-map-glow)" : "url(#expense-cell-shadow)"} />
          {!isExternal && <text x={center[0]} y={center[1] - visible.length * size / 2}
            textAnchor="middle" fill="rgba(255,255,255,.92)" fontSize={size * .9} fontWeight={500} letterSpacing=".15"
            style={{ pointerEvents: "none", filter: "drop-shadow(0 1px 2px rgba(2,6,23,.7))" }}>
            {visible.map((line, i) => <tspan key={i} x={center[0]} dy={i ? size * 1.2 : 0}>{line}</tspan>)}
            <tspan x={center[0]} dy={size * 1.45} fontSize={size * .72} fontWeight="400" letterSpacing=".5" fill="rgba(255,255,255,.7)">{formatCurrency(entry.value)}</tspan>
          </text>}
        </g>;
      })}
        <circle cx={300} cy={300} r={288} fill="none" stroke="rgba(221,214,254,.42)" strokeWidth=".8" pointerEvents="none" />
        <circle cx={300} cy={300} r={291} fill="none" stroke="rgba(124,110,230,.16)" strokeWidth="4" pointerEvents="none" filter="url(#expense-map-glow)" />
        </g>
        {externalCells.map(cell => {
          const label = labelById.get(cell.data.name);
          if (!label) return null;
          const right = label.side === "right";
          const startX = cell.center[0] + sideWidth;
          const startY = cell.center[1] + mapOffsetY;
          const endX = right ? sideWidth + 614 : sideWidth - 14;
          const elbowX = right ? sideWidth + 588 : sideWidth + 12;
          return <g key={`${cell.data.name}-label`} className="pointer-events-none">
            <path d={`M ${startX} ${startY} L ${elbowX} ${label.y} L ${endX} ${label.y}`} fill="none" stroke="rgba(139,130,246,.42)" strokeWidth=".65" />
            <circle cx={startX} cy={startY} r="2" fill={cell.data.color} opacity=".85" filter="url(#expense-map-glow)" />
            <text x={right ? sideWidth + 622 : sideWidth - 22} y={label.y - 3} textAnchor={right ? "start" : "end"} fill="currentColor" className="fill-slate-700 dark:fill-slate-200" fontSize="11.5" fontWeight="500" letterSpacing=".2">
              {cell.data.name}
            </text>
            <text x={right ? sideWidth + 622 : sideWidth - 22} y={label.y + 12} textAnchor={right ? "start" : "end"} fill="currentColor" className="fill-slate-500 dark:fill-slate-400" fontSize="10.5" fontWeight="400" letterSpacing=".45">
              {formatCurrency(cell.data.value)}
            </text>
          </g>;
        })}
      </svg>
    </div>
    <div className="min-h-[48px] pt-2 text-center" aria-live="polite" aria-atomic="true">
      {active ? <><div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-700 dark:text-slate-200">{active.name}</div><div className="mt-1 text-[11px] font-light tracking-wide text-slate-500 dark:text-slate-400">{formatCurrency(active.value)} / month <span className="mx-1.5 text-violet-400/50">·</span> {active.pct.toFixed(1)}% of expenses</div></> : <span className="text-[10px] font-light uppercase tracking-[0.16em] text-slate-500/80 dark:text-slate-400/70">Select or focus a region for its share of spending</span>}
    </div>
  </div>;
}
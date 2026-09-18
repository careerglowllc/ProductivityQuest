import { useMemo, useState } from "react";
import { circleMap, placeExternalLabels, type MapValue } from "@/lib/circle-map";

export function ExpenseCircleMap({ data, formatCurrency }: {
  data: MapValue[];
  formatCurrency: (value: number) => string;
}) {
  const cells = useMemo(() => circleMap(data), [data]);
  const [selected, setSelected] = useState<string | null>(null);
  const active = cells.find(c => c.data.name === selected)?.data;
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
    <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-400">Area represents monthly spending. Every category is labeled with its monthly amount.</p>
    <div className="overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ minWidth: chartWidth }} className="mx-auto block w-full" role="group" aria-label="Monthly expenses circular treemap">
        <g transform={`translate(${sideWidth} ${mapOffsetY})`}>
        {cells.map(({ data: entry, points, center, radius }) => {
        const labelLayout = getInnerLabelLayout({ data: entry, points, center, radius });
        const isExternal = !labelLayout.fits;
        const { size, lines: visible } = labelLayout;
        return <g key={entry.name} role="button" tabIndex={0}
          aria-label={`${entry.name}: ${formatCurrency(entry.value)}, ${entry.pct.toFixed(1)} percent of expenses`}
          aria-pressed={selected === entry.name}
          className="cursor-pointer outline-none [&:focus-visible_polygon]:stroke-slate-950 [&:focus-visible_polygon]:stroke-[3] dark:[&:focus-visible_polygon]:stroke-white"
          onMouseEnter={() => setSelected(entry.name)} onFocus={() => setSelected(entry.name)}
          onClick={() => setSelected(entry.name)}
          onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(entry.name); } }}>
          <title>{entry.name}: {formatCurrency(entry.value)} ({entry.pct.toFixed(1)}%)</title>
          <polygon points={points.map(p => p.join(",")).join(" ")} fill={entry.color}
            stroke={selected === entry.name ? "rgba(15,23,42,.86)" : "rgba(248,250,252,.72)"} strokeWidth={selected === entry.name ? 3 : 1}
            strokeLinejoin="round" />
          {!isExternal && <text x={center[0]} y={center[1] - visible.length * size / 2}
            textAnchor="middle" fill="#fff" fontSize={size} fontWeight={650}
            style={{ pointerEvents: "none", filter: "drop-shadow(0 1px 1px rgba(15,23,42,.45))" }}>
            {visible.map((line, i) => <tspan key={i} x={center[0]} dy={i ? size * 1.2 : 0}>{line}</tspan>)}
            <tspan x={center[0]} dy={size * 1.4} fontSize={size * .85}>{formatCurrency(entry.value)}</tspan>
          </text>}
        </g>;
      })}
        <circle cx={300} cy={300} r={288} fill="none" stroke="rgba(100,116,139,.45)" strokeWidth={1} pointerEvents="none" />
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
            <path d={`M ${startX} ${startY} L ${elbowX} ${label.y} L ${endX} ${label.y}`} fill="none" stroke="rgba(100,116,139,.7)" strokeWidth="1" />
            <circle cx={startX} cy={startY} r="2.25" fill={cell.data.color} />
            <text x={right ? sideWidth + 622 : sideWidth - 22} y={label.y - 3} textAnchor={right ? "start" : "end"} fill="currentColor" className="fill-slate-700 dark:fill-slate-200" fontSize="13" fontWeight="650">
              {cell.data.name}
            </text>
            <text x={right ? sideWidth + 622 : sideWidth - 22} y={label.y + 13} textAnchor={right ? "start" : "end"} fill="currentColor" className="fill-slate-500 dark:fill-slate-400" fontSize="12">
              {formatCurrency(cell.data.value)}
            </text>
          </g>;
        })}
      </svg>
    </div>
    <div className="min-h-[48px] pt-2 text-center text-sm" aria-live="polite" aria-atomic="true">
      {active ? <><div className="font-semibold text-slate-800 dark:text-slate-100">{active.name}</div><div className="text-slate-500 dark:text-slate-400">{formatCurrency(active.value)} / month · {active.pct.toFixed(1)}% of expenses</div></> : <span className="text-slate-500 dark:text-slate-400">Select or focus a region for its share of spending.</span>}
    </div>
  </div>;
}
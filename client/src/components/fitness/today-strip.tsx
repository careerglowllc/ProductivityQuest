import type { StripText } from "@shared/fitness-today";

// The thin "today" row under the page title on a phone: running totals for today, or a short invitation when there are none.
// `progress` (0 to 1) draws a hairline toward the day's goal; `inProgress` pulses a dot while the day is still open.
export function TodayStrip({ kind, text, accent, progress, inProgress }: {
  kind: "workout" | "meal"; text: StripText; accent: string; progress?: number; inProgress: boolean;
}) {
  return (
    <div
      data-testid={`today-strip-${kind}`}
      role="status"
      aria-label="Today"
      className={`mb-3 overflow-hidden rounded-xl border bg-slate-900/60 ${text.empty ? "border-dashed border-slate-600/70" : "border-slate-700/60"}`}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] leading-5">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>Today</span>
        <span className={`shrink-0 font-semibold ${text.empty ? "italic text-slate-400" : "text-white"}`}>{text.main}</span>
        <span className={`min-w-0 flex-1 truncate text-right ${text.empty ? "text-slate-500" : "text-slate-400"}`}>{text.detail}</span>
        {inProgress && <span data-testid="today-in-progress" title="Today's log is still open" className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" style={{ backgroundColor: accent }} />}
      </div>
      {progress !== undefined && (
        <div className="h-0.5 bg-slate-800" aria-hidden>
          <div className="h-full" data-testid="today-progress" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`, backgroundColor: accent }} />
        </div>
      )}
    </div>
  );
}

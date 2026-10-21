import { useState } from "react";
import { X } from "lucide-react";
import { liftCards, measureText, type BarMode, type BarSet, type ExerciseCard, type WarmupBar } from "@shared/fitness-bests";
import type { WorkoutLogEntry, WorkoutType } from "@shared/fitness-log";
import type { WorkoutDraft } from "@shared/fitness-session";
import type { SessionParts } from "@/components/fitness/session-panel";
import { formatDayShort } from "@/lib/fitness-entry";

const ACCENT = "#34D399";
const GOLD = "#FBBF24";
const TYPE_COLORS: Record<WorkoutType, string> = { Push: "#F472B6", Pull: "#60A5FA", Legs: "#34D399" };

const pct = (fraction: number) => `${Math.round(Math.min(1, Math.max(0, fraction)) * 1000) / 10}%`;

function SetRow({ card, set }: { card: ExerciseCard; set: BarSet }) {
  const color = set.beatsBest ? GOLD : ACCENT;
  const best = card.best !== null ? card.best / card.scale : null;
  const target = card.best !== null ? `, best ${measureText(card.best, card.kind)}` : "";
  return (
    <li data-testid="lift-set" data-beats-best={set.beatsBest}>
      <div className="flex items-center gap-2">
        <span className="w-9 shrink-0 text-[11px] text-slate-400">Set {set.index}</span>
        <div role="img" aria-label={`Set ${set.index}: ${set.label}${target}`} className="relative h-3 flex-1">
          <div className="absolute inset-x-0 bottom-0.5 top-0.5 overflow-hidden rounded-full bg-slate-700/60">
            {best !== null && <div data-testid="lift-shadow" className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct(best), backgroundColor: `${ACCENT}33` }} />}
            <div data-testid="lift-fill" className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: pct(set.value / card.scale), backgroundColor: color }} />
          </div>
          {best !== null && <div data-testid="lift-best-line" className="absolute inset-y-0 border-l border-dashed border-slate-200/80" style={{ left: pct(best) }} />}
        </div>
        <span className={`shrink-0 whitespace-nowrap text-right text-[11px] tabular-nums ${set.beatsBest ? "font-semibold text-amber-300" : "text-slate-200"}`}>
          {set.label}{set.beatsBest ? " \u2605" : ""}
        </span>
      </div>
    </li>
  );
}

// A warm-up set: a thin grey bar on the same scale as the working sets, with no best line and no gold, so it is never read as a record.
function WarmupRow({ card, warmup }: { card: ExerciseCard; warmup: WarmupBar }) {
  return (
    <li data-testid="lift-warmup">
      <div className="flex items-center gap-2">
        <span className="w-9 shrink-0 text-[11px] text-slate-500">W{warmup.index}</span>
        <div role="img" aria-label={`Warm-up set ${warmup.index}: ${warmup.label}`} className="relative h-3 flex-1">
          <div className="absolute inset-x-0 bottom-1 top-1 overflow-hidden rounded-full bg-slate-700/40">
            <div data-testid="lift-warmup-fill" className="absolute inset-y-0 left-0 rounded-full bg-slate-400/60" style={{ width: pct(warmup.value / card.scale) }} />
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap text-right text-[11px] tabular-nums text-slate-400">{warmup.label}</span>
      </div>
    </li>
  );
}

function summaryOf(card: ExerciseCard): { text: string; tone: string } {
  if (card.status === "empty") return card.warmups.length > 0 ? { text: "Warm-up logged \u00b7 no working sets yet", tone: "text-slate-400" } : { text: "No sets yet", tone: "text-slate-500" };
  const top = `Top ${measureText(card.top, card.kind)}`;
  if (card.status === "first") return { text: `${top} \u00b7 first time logged`, tone: "text-slate-400" };
  if (card.status === "new") return { text: `${top} \u00b7 New best!`, tone: "text-amber-300 font-semibold" };
  if (card.status === "matched") return { text: `${top} \u00b7 matches your best`, tone: "text-emerald-300" };
  return { text: `${top} \u00b7 best ${measureText(card.best ?? 0, card.kind)}${card.bestDate ? ` (${formatDayShort(card.bestDate)})` : ""}`, tone: "text-slate-400" };
}

function Card({ card, locked, onRemove }: { card: ExerciseCard; locked: boolean; onRemove: (index: number) => void }) {
  const summary = summaryOf(card);
  return (
    <li data-testid="lift-card" data-status={card.status} className="rounded-lg border border-slate-700/60 bg-slate-800/50 px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-slate-100">
            {card.name}
            <span className="rounded-full border px-1.5 text-[10px] font-normal uppercase tracking-wide" style={{ borderColor: `${TYPE_COLORS[card.workoutType]}66`, color: TYPE_COLORS[card.workoutType] }}>{card.workoutType}</span>
          </p>
          <p data-testid="lift-summary" className={`text-[11px] ${summary.tone}`}>{summary.text}</p>
        </div>
        {card.draftIndex !== null && (
          <button
            type="button"
            disabled={locked}
            onClick={() => onRemove(card.draftIndex!)}
            aria-label={`Remove ${card.name}`}
            title="Remove"
            className="mt-0.5 shrink-0 text-slate-500 hover:text-red-300 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {card.warmups.length > 0 && (
        <div data-testid="lift-warmups" className="mt-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{"Warm-up \u00b7 not counted toward bests"}</p>
          <ul className="mt-1 space-y-0.5">{card.warmups.map((w) => <WarmupRow key={w.index} card={card} warmup={w} />)}</ul>
        </div>
      )}
      {card.sets.length > 0 && (
        <div className={card.warmups.length > 0 ? "mt-2" : ""}>
          {card.warmups.length > 0 && <p className="text-[10px] uppercase tracking-wide text-slate-500">Working sets</p>}
          <ul className="mt-2 space-y-1.5">{card.sets.map((set) => <SetRow key={set.index} card={card} set={set} />)}</ul>
        </div>
      )}
      {(card.warmup || card.notes) && (
        <p data-testid="lift-notes" className="mt-1.5 text-[11px] text-slate-500">
          {[card.warmup ? `Warm-up: ${card.warmup}` : "", card.notes ?? ""].filter(Boolean).join(" \u2014 ")}
        </p>
      )}
    </li>
  );
}

// The day's lifts against your personal bests: a card for each exercise and a bar for each working set. A bar fills to that set's
// weight (or its volume, weight times reps; reps or seconds for lifts done for those). The faint fill behind it and the dashed line
// mark your best on any other day, and a set that goes past it turns gold. It is always there, and shows what was saved today
// when no day is open. While a day is open (`parts`) it is the day's live summary and holds its controls, as Today vs your goals does.
export function LiftBests({ entries, today, parts = null, updating = false }: { entries: readonly WorkoutLogEntry[]; today: string; parts?: SessionParts | null; updating?: boolean }) {
  const [mode, setMode] = useState<BarMode>("weight");
  const draft = parts ? (parts.draft as WorkoutDraft) : null;
  const date = draft?.date ?? today;
  const cards = liftCards({ entries, draft: draft ? { id: draft.id, exercises: draft.summary.exercises } : null, date, mode });
  const heading = date !== today ? `${formatDayShort(date)} vs your bests` : "Today vs your bests";
  return (
    <section data-testid="lift-bests" aria-label={heading} className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 data-testid="bests-title" className="text-sm font-bold text-white">{heading}</h2>
          {draft && <span className="text-[11px] text-slate-400">{draft.summary.workoutType} day</span>}
        </div>
        {(updating || parts) && (
          <span className="flex items-center gap-2">
            {updating && <span data-testid="bests-updating" className="animate-pulse text-[11px] text-slate-400">Updating…</span>}
            {parts?.tag}
          </span>
        )}
      </div>
      {parts?.meta}
      {cards.some((c) => c.kind === "weight") && (
        <div role="group" aria-label="What the bars measure" className="mt-2 inline-flex overflow-hidden rounded-full border border-slate-600 text-[11px]">
          {(["weight", "volume"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`px-3 py-0.5 ${mode === m ? "bg-emerald-400/20 font-semibold text-emerald-200" : "text-slate-400 hover:text-slate-200"}`}
            >
              {m === "weight" ? "Weight" : "Volume"}
            </button>
          ))}
        </div>
      )}
      {cards.length === 0 && (
        <p data-testid="bests-empty" className="mt-2 text-[11px] text-slate-400">
          {date !== today ? "Nothing in this day yet. Add your exercises above and their sets show up here against your bests." : "Nothing lifted today yet. Send your first exercise above and its sets show up here against your bests."}
        </p>
      )}
      {cards.length > 0 && <ul className="mt-2 space-y-2">{cards.map((card, i) => <Card key={`${card.draftIndex ?? "saved"}-${i}`} card={card} locked={parts?.locked ?? true} onRemove={(index) => parts?.onRemove(index)} />)}</ul>}
      {parts?.planLine && <p data-testid="plan-check" className="mt-3 border-t border-slate-700 pt-2 text-xs text-slate-300">{parts.planLine}</p>}
      {parts?.last}
      {parts?.actions}
      <p className="mt-2 text-[10px] leading-4 text-slate-500">
        Each bar fills to that set. The dashed line and faint fill are your best on any other day, and a set past it turns gold.
        Volume is the set's weight times its reps. Warm-up sets are shown apart, in grey, and never count toward a best.
      </p>
    </section>
  );
}

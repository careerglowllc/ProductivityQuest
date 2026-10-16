import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Send, Undo2, Flag, Trash2, X } from "lucide-react";
import {
  applyUpdate, draftHasContent, draftLines, formatDayShort, localToday, newLogId, planCheckText,
  moveDraft, removeDraftItem, requestSessionUpdate, undoDraft, type FitnessDraft, type FitnessKind,
} from "@/lib/fitness-entry";
import { canAdd, isProcessing, nextToSend, queueReducer, runMessage, MAX_WAITING, type QueuedMessage } from "@/lib/fitness-queue";
import { NutrientChips } from "@/components/fitness/nutrient-chips";
import { PendingMessages } from "@/components/fitness/pending-messages";
import { canUndo, endButtonLabel, isStaleDraft, type MealDraft } from "@shared/fitness-session";
import type { RoutinePlan } from "@shared/fitness-routine";

const COPY: Record<FitnessKind, { title: string; intro: string; placeholder: string; next: string; end: string; discard: string }> = {
  workout: {
    title: "Log today's workout",
    intro: "Send your first exercise and its warm-up. Then send each set, or the next exercise, as you go. A summary of the day builds up and saves itself after every message. Press End today's workout when you are done.",
    placeholder: "Pull day. First up: lat pulldown, warm-up 60 pounds for 12…",
    next: "Next set or next exercise: 120 for 8… or seated row, warm-up 80 for 12",
    end: "It is not in your charts until you end the workout.",
    discard: "Discard this workout",
  },
  meal: {
    title: "Log what you ate today",
    intro: "Say what you ate, one meal or snack at a time. Today's summary builds up and saves itself after every message, and the AI estimates calories, macros, calcium and more. Press End day when you are done eating.",
    placeholder: "An everything bagel with cream cheese and a latte…",
    next: "Add more: a chicken burrito bowl and a protein shake…",
    end: "It is not in your charts until you end the day.",
    discard: "Discard this day",
  },
};

// What an open day hands to the widget under the box: the day's own controls, already wired to the box's state.
export interface SessionParts {
  draft: FitnessDraft;
  tag: ReactNode; // "In progress" or "Editing a saved day"
  meta: ReactNode; // the Day field, the saved note, and the stale-day notice
  last: ReactNode; // what the last message changed
  foods: ReactNode; // food days: the foods so far, each with a remove button; null when there are none (and for workouts)
  foodCount: number; // how many foods or exercises the day holds
  planLine: string | null; // workouts: how much of the day's plan is done and what is still to do
  locked: boolean; // a message is being worked in, so the day must not be changed by hand
  onRemove: (index: number) => void; // takes one food or exercise out of the day
  actions: ReactNode; // the note about the charts, and End / Undo / Discard
}

// A chat-style box for one day. Pressing Enter sends at once: the box clears and can be typed in again while the message is
// worked into the day, and further messages wait their turn. The first message starts the day and each later one updates it,
// and every change is saved at once. The day itself is shown by the widget `below` the box, which gets the day's controls.
// Ending the day is what puts it in the charts.
export function FitnessSessionPanel({ kind, draft, onDraftChange, onEnd, accent = "#34D399", compact = false, plan, below }: {
  kind: FitnessKind;
  draft: FitnessDraft | null;
  onDraftChange: (draft: FitnessDraft | null) => void;
  onEnd: (draft: FitnessDraft) => void;
  accent?: string;
  compact?: boolean; // the phone layout: no heading or explanation above the box, and less space below it
  plan?: RoutinePlan; // what a Push, Pull and Legs day usually hold (workouts only)
  below?: (parts: SessionParts | null, updating: boolean) => ReactNode; // drawn right under the box, with the open day's controls (null when no day is open) and whether a message is still being added
}) {
  const copy = COPY[kind];
  const [text, setText] = useState("");
  const [queue, dispatch] = useReducer(queueReducer, [] as QueuedMessage[]);
  const [last, setLast] = useState<{ id: string; lines: string[] } | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const today = localToday();

  // The day as it is right now, so a message that starts after another finished builds on that one's result.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // When the day is ended or discarded, the next one starts with no "last entry" line.
  const hasDraft = draft !== null;
  useEffect(() => { if (!hasDraft) setLast(null); }, [hasDraft]);

  // Sends the next waiting message, once nothing is being sent and nothing has failed ahead of it.
  useEffect(() => {
    const next = nextToSend(queue);
    if (!next) return;
    dispatch({ type: "start", id: next.id });
    void runMessage({
      text: next.text,
      readDraft: () => draftRef.current,
      send: (message, current) => requestSessionUpdate(kind, message, current, localToday(), plan),
      apply: (current, result, message) => applyUpdate(kind, current, result, message, new Date(), () => newLogId(kind === "workout" ? "lift" : "meal")),
      commit: (updated) => { draftRef.current = updated; onDraftChange(updated); },
    }).then((outcome) => {
      if (outcome.ok) {
        setLast({ id: outcome.draft.id, lines: outcome.changes });
        dispatch({ type: "done", id: next.id });
      } else {
        dispatch({ type: "fail", id: next.id, error: outcome.error });
      }
    });
  }, [queue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving or reloading with messages still waiting would lose them, so the browser asks first.
  useEffect(() => {
    if (!queue.some((m) => m.status !== "failed")) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [queue]);

  // Enter: the message is shown as sent, the box is empty and ready for the next one.
  function submit() {
    const message = text.trim();
    if (message.length < 2 || !canAdd(queue)) return;
    dispatch({ type: "add", id: newLogId("msg"), text: message });
    setText("");
    box.current?.focus();
  }

  // A message that failed goes back in the box in front of whatever has been typed since.
  function bringBack(message: QueuedMessage) {
    setText((current) => (current.trim() ? `${message.text}\n${current}` : message.text));
    dispatch({ type: "remove", id: message.id });
    box.current?.focus();
  }

  // A change made by hand (undo, remove, another day) is not a message, so the "last entry" line no longer applies.
  const edit = (next: FitnessDraft | null) => { setLast(null); onDraftChange(next); };
  const removeItem = (index: number) => { if (draft) edit(removeDraftItem(kind, draft, index, new Date())); };

  const lines = draft ? draftLines(kind, draft) : [];
  const planLine = kind === "workout" && draft ? planCheckText(plan, draft) : null;
  const meal = kind === "meal" && draft ? (draft as MealDraft).summary : null;
  // While a message is being worked in, the day cannot be changed by hand: its answer is built on the day as it was.
  const updating = isProcessing(queue);
  const locked = updating;

  const tag = draft && (
    <span className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: `${accent}88`, color: accent }}>
      {draft.reopened ? "Editing a saved day" : "In progress"}
    </span>
  );

  const meta = draft && (
    <>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <label className="flex items-center gap-1.5">
          Day
          <input
            type="date"
            value={draft.date}
            max={today}
            disabled={locked}
            onChange={(e) => { if (e.target.value && e.target.value <= today) edit(moveDraft(draft, new Date(), e.target.value)); }}
            aria-label="Day this belongs to"
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-0.5 text-xs text-slate-100"
          />
        </label>
        <span data-testid="session-saved">Saved automatically at {new Date(draft.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </div>
      {isStaleDraft(draft, today) && (
        <p role="status" data-testid="session-stale" className="mt-2 text-xs text-amber-300">
          This day is from {formatDayShort(draft.date)} and was never ended. Keep adding to it, or end it to save it.
        </p>
      )}
    </>
  );

  const items = meal && lines.length > 0 && (
    <ul className="space-y-1.5" data-testid="session-items">
      {lines.map((line, i) => (
        <li key={i} data-testid="meal-item" className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-2 text-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 font-medium text-slate-100">{line.title}</span>
            <button
              type="button"
              disabled={locked}
              onClick={() => removeItem(i)}
              aria-label={`Remove ${line.title}`}
              title="Remove"
              className="mt-0.5 shrink-0 text-slate-500 hover:text-red-300 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {meal.items[i] && <NutrientChips totals={meal.items[i]} />}
        </li>
      ))}
    </ul>
  );

  const lastEntry = draft && last && last.id === draft.id && last.lines.length > 0
    ? <p className="mt-2 text-xs text-emerald-300" data-testid="session-last-entry">Last entry: {last.lines.join(" · ")}</p>
    : null;

  const actions = draft && (
    <>
      <p className="mt-2 text-[11px] text-slate-500">{draft.reopened ? "Your saved version stays in the charts until you save your changes." : copy.end}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="end-session"
          disabled={locked || !draftHasContent(kind, draft)}
          onClick={() => onEnd(draft)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-900 disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          <Flag className="h-4 w-4" /> {endButtonLabel(kind, draft, today, formatDayShort(draft.date))}
        </button>
        <button
          type="button"
          data-testid="undo-entry"
          disabled={locked || !canUndo(draft)}
          onClick={() => edit(undoDraft(draft, new Date()))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:text-white disabled:opacity-40"
        >
          <Undo2 className="h-4 w-4" /> Undo last entry
        </button>
        <button
          type="button"
          data-testid="discard-session"
          disabled={locked}
          onClick={() => { if (window.confirm(draft.reopened ? "Discard your changes? The saved version stays as it was." : `${copy.discard}? What you entered so far will be lost.`)) edit(null); }}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-red-300 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" /> {draft.reopened ? "Discard changes" : copy.discard}
        </button>
      </div>
    </>
  );

  const parts: SessionParts | null = draft ? { draft, tag, meta, last: lastEntry, foods: items, foodCount: lines.length, planLine, locked, onRemove: removeItem, actions } : null;

  return (
    <>
    <section aria-label={copy.title} data-testid={`session-${kind}`} className={`rounded-2xl border border-slate-700/60 bg-slate-900/50 ${compact || below ? "p-3 sm:p-5 mb-4" : "p-4 sm:p-5 mb-8"}`}>
      {!compact && <div className="mb-1 font-bold text-white">{copy.title}</div>}
      {!draft && !compact && <p className="mb-3 text-xs text-slate-400">{copy.intro}</p>}

      <div className="relative">
        <textarea
          ref={box}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          rows={draft || compact ? 2 : 3}
          maxLength={4000}
          enterKeyHint="send"
          placeholder={draft ? copy.next : copy.placeholder}
          aria-label={draft ? "Add to this day" : copy.title}
          className="w-full resize-y rounded-xl border border-slate-600 bg-slate-800/70 px-3 py-2.5 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1"
          style={{ ["--tw-ring-color" as string]: accent }}
        />
        <div className="absolute bottom-2.5 right-2.5">
          <button
            type="button"
            onClick={submit}
            disabled={text.trim().length < 2 || !canAdd(queue)}
            aria-label="Send to AI"
            title="Send"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-900 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
      <PendingMessages queue={queue} onRetry={(id) => dispatch({ type: "retry", id })} onEdit={bringBack} onRemove={(id) => dispatch({ type: "remove", id })} />
      {!canAdd(queue) && <p role="status" data-testid="queue-full" className="mt-2 text-xs text-amber-300">{MAX_WAITING} messages are waiting. You can add more once some have gone in.</p>}
    </section>
    {below?.(parts, updating)}
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Send, Undo2, Flag, Trash2, X } from "lucide-react";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import {
  applyUpdate, draftHasContent, draftLines, draftTitle, fitnessErrorMessage, formatDayShort, joinTranscript, localToday, newLogId, nutrientText,
  moveDraft, removeDraftItem, requestSessionUpdate, undoDraft, type FitnessDraft, type FitnessKind,
} from "@/lib/fitness-entry";
import { canUndo, endButtonLabel, isStaleDraft, type MealDraft } from "@shared/fitness-session";

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

// A chat-style box for one day. The first message starts the day, each later message updates the same summary above the
// box, and every change is saved at once. Ending the day is what puts it in the charts.
export function FitnessSessionPanel({ kind, draft, onDraftChange, onEnd, accent = "#34D399", compact = false }: {
  kind: FitnessKind;
  draft: FitnessDraft | null;
  onDraftChange: (draft: FitnessDraft | null) => void;
  onEnd: (draft: FitnessDraft) => void;
  accent?: string;
  compact?: boolean; // the phone layout: no heading or explanation above the box, and less space below it
}) {
  const copy = COPY[kind];
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [last, setLast] = useState<{ id: string; lines: string[] } | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeechToText((phrase) => setText((current) => joinTranscript(current, phrase)));
  const today = localToday();

  // When the day is ended or discarded, the next one starts with no "last entry" line.
  const hasDraft = draft !== null;
  useEffect(() => { if (!hasDraft) { setLast(null); setNotice(null); } }, [hasDraft]);

  async function submit() {
    if (busy || text.trim().length < 2) return;
    if (speech.listening) speech.stop();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await requestSessionUpdate(kind, text, draft, today);
      const update = applyUpdate(kind, draft, result, text, new Date(), () => newLogId(kind === "workout" ? "lift" : "meal"));
      if (update.changes.length === 0) {
        setNotice("That did not add or change anything. Say what you did or ate, with the numbers.");
      } else {
        onDraftChange(update.draft);
        setLast({ id: update.draft.id, lines: update.changes });
        setText("");
      }
    } catch (e) {
      setError(fitnessErrorMessage(e));
    } finally {
      setBusy(false);
      box.current?.focus();
    }
  }

  // A change made by hand (undo, remove, another day) is not a message, so the "last entry" line no longer applies.
  const edit = (next: FitnessDraft | null) => { setLast(null); setNotice(null); onDraftChange(next); };

  const lines = draft ? draftLines(kind, draft) : [];
  const meal = kind === "meal" && draft ? (draft as MealDraft).summary : null;
  const locked = busy;

  return (
    <section aria-label={copy.title} data-testid={`session-${kind}`} className={`rounded-2xl border border-slate-700/60 bg-slate-900/50 ${compact ? "p-3 sm:p-5 mb-4" : "p-4 sm:p-5 mb-8"}`}>
      {!compact && <div className="mb-1 font-bold text-white">{copy.title}</div>}
      {!draft && !compact && <p className="mb-3 text-xs text-slate-400">{copy.intro}</p>}

      {draft && (
        <div className="mb-4 mt-2 rounded-xl border bg-slate-800/50 p-3" style={{ borderColor: `${accent}66` }} data-testid="session-summary">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-white" data-testid="session-title">{draftTitle(kind, draft, today)}</span>
            <span className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: `${accent}88`, color: accent }}>
              {draft.reopened ? "Editing a saved day" : "In progress"}
            </span>
          </div>
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

          {lines.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Nothing in it yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5" data-testid="session-items">
              {lines.map((line, i) => (
                <li key={i} className="flex items-start justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium text-slate-100">{line.title}</span>
                    {line.detail && <span className="block text-xs text-slate-400">{line.detail}</span>}
                  </span>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => edit(removeDraftItem(kind, draft, i, new Date()))}
                    aria-label={`Remove ${line.title}`}
                    title="Remove"
                    className="mt-0.5 shrink-0 text-slate-500 hover:text-red-300 disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {meal && meal.items.length > 0 && (
            <>
              <p className="mt-2 border-t border-slate-700 pt-2 text-xs text-slate-300"><span className="font-semibold">Total so far:</span> {nutrientText(meal.totals)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Nutrition numbers are the AI's best estimates, not measurements.</p>
            </>
          )}
          {draft && last && last.id === draft.id && last.lines.length > 0 && (
            <p className="mt-2 text-xs text-emerald-300" data-testid="session-last-entry">Last entry: {last.lines.join(" · ")}</p>
          )}
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
        </div>
      )}

      <div className="relative">
        <textarea
          ref={box}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); }
          }}
          rows={draft || compact ? 2 : 3}
          maxLength={4000}
          enterKeyHint="send"
          placeholder={draft ? copy.next : copy.placeholder}
          aria-label={draft ? "Add to this day" : copy.title}
          disabled={busy}
          className="w-full resize-y rounded-xl border border-slate-600 bg-slate-800/70 px-3 py-2.5 pr-24 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1"
          style={{ ["--tw-ring-color" as string]: accent }}
        />
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
          {speech.supported && (
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Stop voice typing" : "Start voice typing"}
              title={speech.listening ? "Stop voice typing" : "Voice typing"}
              className={`grid h-8 w-8 place-items-center rounded-full border transition-colors ${speech.listening ? "animate-pulse border-red-400 bg-red-500/20 text-red-300" : "border-slate-600 text-slate-300 hover:text-white"}`}
            >
              {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || text.trim().length < 2}
            aria-label="Send to AI"
            title="Send"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-900 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {!speech.supported && <p className="mt-1.5 text-[11px] text-slate-500">Tip: tap the microphone on your keyboard to dictate.</p>}
      {speech.listening && <p role="status" className="mt-1.5 text-[11px] text-red-300">Listening… speak, then tap the microphone to stop.</p>}
      {speech.error && <p role="alert" className="mt-1.5 text-xs text-amber-300">{speech.error}</p>}
      {notice && <p role="status" data-testid="session-notice" className="mt-2 text-sm text-amber-300">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </section>
  );
}

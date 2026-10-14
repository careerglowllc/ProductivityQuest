import { useRef, useState } from "react";
import { Loader2, Mic, MicOff, Send, Check, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import {
  describeMeal, describeWorkout, fitnessErrorMessage, joinTranscript, nutrientText, requestParse, withEditedDate,
  type FitnessKind, type ParseResult,
} from "@/lib/fitness-entry";

const COPY: Record<FitnessKind, { title: string; placeholder: string; example: string }> = {
  workout: {
    title: "Log a workout",
    placeholder: "Today I did incline dumbbell press, 70 pounds for 5, 5, and 4, then lateral raises at 12.5…",
    example: "Say or type the day and what you did: exercises, weight, reps. Add anything about how it felt.",
  },
  meal: {
    title: "Log what you ate",
    placeholder: "Yesterday: everything bagel with cream cheese, a latte, then a chicken burrito bowl and a protein shake…",
    example: "Say or type the day and what you ate. The AI estimates calories, macros, calcium and more.",
  },
};

// A chat-style box: type or dictate, let the AI turn it into structured data, check it, then save it to the log.
export function LogEntryBox({ kind, onSave, accent = "#34D399" }: { kind: FitnessKind; onSave: (result: ParseResult, sourceText: string) => void; accent?: string }) {
  const isMobile = useIsMobile();
  const copy = COPY[kind];
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [date, setDate] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeechToText((phrase) => setText((current) => joinTranscript(current, phrase)));

  async function submit() {
    if (busy || text.trim().length < 2) return;
    if (speech.listening) speech.stop();
    setBusy(true);
    setError(null);
    try {
      const parsed = await requestParse(kind, text);
      setResult(parsed);
      setDate(parsed.kind === "workout" ? parsed.workout.date : parsed.meal.date);
    } catch (e) {
      setError(fitnessErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!result) return;
    onSave(withEditedDate(result, date), text);
    setText("");
    setResult(null);
    box.current?.focus();
  }

  const lines = result ? (result.kind === "workout" ? describeWorkout(result.workout) : describeMeal(result.meal)) : [];

  return (
    <section aria-label={copy.title} data-testid={`log-entry-${kind}`} className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 sm:p-5 mb-8">
      <div className="mb-1 font-bold text-white">{copy.title}</div>
      <p className="mb-3 text-xs text-slate-400">{copy.example}</p>

      <div className="relative">
        <textarea
          ref={box}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && (!isMobile || e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); }
          }}
          rows={3}
          maxLength={4000}
          placeholder={copy.placeholder}
          aria-label={copy.title}
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
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}

      {result && (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-3" data-testid="log-preview">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-white">Check before saving</span>
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              Day
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Day this belongs to"
                className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              />
            </label>
          </div>
          <ul className="space-y-1.5">
            {lines.map((line, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-slate-100">{line.title}</span>
                {line.detail && <span className="block text-xs text-slate-400">{line.detail}</span>}
              </li>
            ))}
          </ul>
          {result.kind === "meal" && (
            <p className="mt-2 border-t border-slate-700 pt-2 text-xs text-slate-300">
              <span className="font-semibold">This meal:</span> {nutrientText(result.meal.totals)}
              {result.meal.dayComplete && <span className="ml-2 text-emerald-300">marked as everything you ate that day</span>}
            </p>
          )}
          {result.kind === "meal" && <p className="mt-1 text-[11px] text-slate-500">Nutrition numbers are the AI's best estimates, not measurements.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={save} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-900" style={{ backgroundColor: accent }}>
              <Check className="h-4 w-4" /> Save to log
            </button>
            <button type="button" onClick={() => setResult(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:text-white">
              <X className="h-4 w-4" /> Edit my text
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

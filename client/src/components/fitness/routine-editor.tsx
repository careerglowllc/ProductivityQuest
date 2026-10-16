import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { ROUTINE_DAYS, describePlanned, parseRoutineText, planFromRoutine, planHasExercises, type Routine, type RoutineDay } from "@shared/fitness-routine";
import type { WorkoutType } from "@shared/fitness-log";

const DAY_COLORS: Record<WorkoutType, string> = { Push: "#F472B6", Pull: "#60A5FA", Legs: "#34D399" };

// The form for one day: what it usually holds, one exercise per line, and a note. It shows what was understood as you type.
export function RoutineDayForm({ day, value, onChange, onSave, onCancel, accent }: {
  day: WorkoutType; value: RoutineDay; onChange: (next: RoutineDay) => void; onSave: () => void; onCancel: () => void; accent: string;
}) {
  const understood = useMemo(() => parseRoutineText(value.exercises), [value.exercises]);
  return (
    <div data-testid="routine-form" className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-200">What a {day} day holds</span>
        <span className="mb-1.5 block text-[11px] text-slate-400">One exercise per line. Add the sets if you like, for example "Lat pulldown 3x8-10".</span>
        <textarea
          value={value.exercises}
          onChange={(e) => onChange({ ...value, exercises: e.target.value })}
          rows={6}
          maxLength={4000}
          aria-label={`${day} day exercises`}
          placeholder={"Incline dumbbell press 3x8-10\nSeated shoulder press 3x8\nLateral raise 4x12"}
          className="w-full resize-y rounded-xl border border-slate-600 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1"
          style={{ ["--tw-ring-color" as string]: accent }}
        />
      </label>
      <div data-testid="routine-understood" className="text-[11px] text-slate-400">
        {understood.length === 0 ? "Nothing yet." : `Understood ${understood.length} ${understood.length === 1 ? "exercise" : "exercises"}:`}
        {understood.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {understood.map((p) => (
              <li key={p.name} className="rounded-full border px-2 py-0.5 text-[11px] text-slate-200" style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14` }}>{describePlanned(p)}</li>
            ))}
          </ul>
        )}
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-200">Notes (optional)</span>
        <textarea
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          rows={2}
          maxLength={600}
          aria-label={`${day} day notes`}
          placeholder="Heavy presses first, last set to failure…"
          className="w-full resize-y rounded-xl border border-slate-600 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1"
          style={{ ["--tw-ring-color" as string]: accent }}
        />
      </label>
      <div className="flex gap-2">
        <button type="button" data-testid="routine-save" onClick={onSave} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-900" style={{ backgroundColor: accent }}>Save {day} day</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:text-white">Cancel</button>
      </div>
    </div>
  );
}

// What each day holds. The AI uses it to recognise lifts and the day, and the charts only
// show lifts that are in it. With `activeType` set to a day, that day is shown first.
export function RoutineEditor({ routine, onSave, activeType = "All", accent = "#34D399", startOpen }: {
  routine: Routine; onSave: (next: Routine) => void; activeType?: WorkoutType | "All"; accent?: string; startOpen?: boolean;
}) {
  const plan = useMemo(() => planFromRoutine(routine), [routine]);
  const [open, setOpen] = useState(() => startOpen ?? !planHasExercises(plan));
  const [day, setDay] = useState<WorkoutType>(activeType === "All" ? "Push" : activeType);
  const [draft, setDraft] = useState<RoutineDay | null>(null);

  // Choosing a tab above shows that day here, unless a day is being edited.
  useEffect(() => { if (activeType !== "All" && draft === null) setDay(activeType); }, [activeType]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = ROUTINE_DAYS.map((d) => `${d} ${plan[d].exercises.length}`).join(" · ");
  const planned = plan[day];

  return (
    <section data-testid="routine" aria-label="Your routine" className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/50">
      <button
        type="button"
        data-testid="routine-toggle"
        aria-expanded={open}
        aria-controls="routine-body"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-white">Your routine</span>
          <span data-testid="routine-summary" className="block truncate text-[11px] text-slate-400">{planHasExercises(plan) ? counts : "Not set up yet. Tell the AI what each day holds."}</span>
        </span>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div id="routine-body" hidden={!open} className="space-y-3 px-4 pb-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Day">
          {ROUTINE_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={day === d}
              disabled={draft !== null}
              onClick={() => setDay(d)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${day === d ? "text-white" : "border-slate-600 text-slate-400 hover:text-slate-200"}`}
              style={day === d ? { borderColor: DAY_COLORS[d], backgroundColor: `${DAY_COLORS[d]}22` } : undefined}
            >
              {d} <span className="opacity-70">{plan[d].exercises.length}</span>
            </button>
          ))}
        </div>

        {draft ? (
          <RoutineDayForm
            day={day}
            value={draft}
            onChange={setDraft}
            accent={accent}
            onCancel={() => setDraft(null)}
            onSave={() => { onSave({ ...routine, [day]: { exercises: draft.exercises.trim(), notes: draft.notes.trim() } }); setDraft(null); }}
          />
        ) : (
          <div data-testid="routine-view">
            {planned.exercises.length === 0 && !planned.notes ? (
              <p className="rounded-xl border border-dashed border-slate-600/70 px-3 py-3 text-xs text-slate-400">Nothing set for {day} day yet.</p>
            ) : (
              <>
                {planned.exercises.length > 0 && (
                  <ul className="space-y-1 text-sm text-slate-200" data-testid="routine-list">
                    {planned.exercises.map((p) => <li key={p.name}>{describePlanned(p)}</li>)}
                  </ul>
                )}
                {planned.notes && <p className="mt-2 text-xs italic text-slate-400" data-testid="routine-notes">{planned.notes}</p>}
              </>
            )}
            <button
              type="button"
              data-testid="routine-edit"
              onClick={() => setDraft({ ...routine[day] })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:text-white"
            >
              <Pencil aria-hidden className="h-3.5 w-3.5" /> {planned.exercises.length || planned.notes ? `Edit ${day} day` : `Add ${day} day`}
            </button>
          </div>
        )}

        <p className="text-[11px] text-slate-500">The AI uses this to recognise your lifts and tell what kind of day it was. The charts below only show lifts that are in your routine.</p>
      </div>
    </section>
  );
}

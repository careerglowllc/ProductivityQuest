import { CalendarDays, Check, Repeat2 } from "lucide-react";
import { REMINDER_MODES, REMINDER_MODE_LABELS, isReminderMode, DEFAULT_REMINDER_MODE, type ReminderMode } from "@shared/quest-schedule";

// What each timing means, in the words shown under the choice: when it is in the reminders, and what the overdue rule
// (moving overdue quests to today) does with its date.
export const REMINDER_MODE_COPY: Record<ReminderMode, { blurb: string; dateRule: string }> = {
  always: {
    blurb: "Always in your reminders.",
    dateRule: "Its due date follows your overdue rule: when it passes, it moves to today like your other quests.",
  },
  "on-date": {
    blurb: "The day before and on its date, like a birthday.",
    dateRule: "Keeps its date: never moved to today. A repeating one moves on to its next date once the day has passed.",
  },
};

const ICONS: Record<ReminderMode, typeof Repeat2> = { always: Repeat2, "on-date": CalendarDays };

// No hooks on purpose: a pure function of its props, so it renders the same in tests.
export function ReminderTimingPicker({ value, onChange, disabled = false, compact = false }: {
  value?: string | null;
  onChange: (mode: ReminderMode) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const current: ReminderMode = isReminderMode(value) ? value : DEFAULT_REMINDER_MODE;
  return (
    <div data-testid="reminder-timing" className="space-y-2">
      <div role="group" aria-label="Reminder timing" className="grid grid-cols-2 gap-2">
        {REMINDER_MODES.map((mode) => {
          const Icon = ICONS[mode];
          const selected = current === mode;
          return (
            <button
              key={mode}
              type="button"
              data-reminder-mode={mode}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => { if (!selected) onChange(mode); }}
              className={`flex flex-col items-start gap-0.5 rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60 disabled:opacity-60 ${compact ? "px-2.5 py-2" : "px-3 py-2.5"} ${selected ? "border-amber-400/70 bg-slate-900/80 text-yellow-100 ring-1 ring-yellow-500/40" : "border-yellow-600/30 bg-slate-900/40 text-yellow-200/70 hover:bg-slate-900/70"}`}
            >
              <span className={`flex w-full items-center gap-1.5 font-medium ${compact ? "text-xs" : "text-sm"}`}>
                <Icon aria-hidden className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} shrink-0 text-amber-300`} />
                <span className="flex-1 truncate">{REMINDER_MODE_LABELS[mode]}</span>
                {selected && <Check aria-hidden className="h-3.5 w-3.5 shrink-0" data-selected-check />}
              </span>
              <span className={`leading-snug text-yellow-200/60 ${compact ? "text-[10px]" : "text-[11px]"}`}>{REMINDER_MODE_COPY[mode].blurb}</span>
            </button>
          );
        })}
      </div>
      <p data-testid="reminder-date-rule" className="text-xs text-yellow-400/70">{REMINDER_MODE_COPY[current].dateRule}</p>
    </div>
  );
}

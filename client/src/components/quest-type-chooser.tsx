import type { ReactNode } from "react";
import { BellRing, CalendarClock, ListChecks } from "lucide-react";
import { DEFAULT_QUEST_TYPE, QUEST_TYPE_LABELS, QUEST_TYPES, isQuestType, type QuestType } from "@shared/quest-type";

type TypeStyle = { blurb: string; icon: ReactNode; smallIcon: ReactNode; tile: string; card: string; ring: string };

// Tailwind classes are written out in full so the compiler can see them.
export const QUEST_TYPE_UI: Record<QuestType, TypeStyle> = {
  reminder: {
    blurb: "A nudge so something doesn't slip my mind.",
    icon: <BellRing className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />,
    smallIcon: <BellRing className="h-3.5 w-3.5 text-white" aria-hidden />,
    tile: "from-amber-400 to-orange-500 shadow-orange-500/30",
    card: "border-amber-500/40 hover:border-amber-400 hover:shadow-amber-500/20",
    ring: "focus-visible:ring-amber-400",
  },
  deadline: {
    blurb: "Has to be done by an exact date.",
    icon: <CalendarClock className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />,
    smallIcon: <CalendarClock className="h-3.5 w-3.5 text-white" aria-hidden />,
    tile: "from-rose-400 to-red-500 shadow-red-500/30",
    card: "border-rose-500/40 hover:border-rose-400 hover:shadow-rose-500/20",
    ring: "focus-visible:ring-rose-400",
  },
  general: {
    blurb: "Worth doing, but no hard deadline.",
    icon: <ListChecks className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />,
    smallIcon: <ListChecks className="h-3.5 w-3.5 text-white" aria-hidden />,
    tile: "from-emerald-400 to-teal-500 shadow-teal-500/30",
    card: "border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20",
    ring: "focus-visible:ring-emerald-400",
  },
};

const QUEST_TYPE_ICONS = { reminder: BellRing, deadline: CalendarClock, general: ListChecks } as const;
const QUEST_TYPE_TINT: Record<QuestType, string> = {
  reminder: "text-amber-500/80",
  deadline: "text-rose-500/80",
  general: "text-emerald-500/80",
};

// Subtle icon-only marker for quest cards and lists. Unknown or missing types read as general.
export function QuestTypeIcon({ type, className = "h-3.5 w-3.5" }: { type?: string | null; className?: string }) {
  const resolved: QuestType = isQuestType(type) ? type : DEFAULT_QUEST_TYPE;
  const Icon = QUEST_TYPE_ICONS[resolved];
  return (
    <span
      data-quest-type-icon={resolved}
      title={QUEST_TYPE_LABELS[resolved]}
      aria-label={QUEST_TYPE_LABELS[resolved]}
      role="img"
      className="inline-flex shrink-0 items-center"
    >
      <Icon aria-hidden className={`${className} ${QUEST_TYPE_TINT[resolved]}`} />
    </span>
  );
}

// Small pill shown on the form once a type is picked.
export function QuestTypeBadge({ type }: { type: QuestType }) {
  const ui = QUEST_TYPE_UI[type];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-yellow-600/30 bg-slate-800/60 py-1 pl-1 pr-3 text-xs font-medium text-yellow-100">
      <span className={`grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br ${ui.tile}`}>
        {ui.smallIcon}
      </span>
      {QUEST_TYPE_LABELS[type]}
    </span>
  );
}

// One-row, three-button picker for changing the type of an existing quest. Clicking the current type is a no-op.
export function QuestTypeSelector({
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  value?: string | null;
  onChange: (type: QuestType) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const current: QuestType = isQuestType(value) ? value : DEFAULT_QUEST_TYPE;
  return (
    <div role="group" aria-label="Quest type" className="grid grid-cols-3 gap-2" data-testid="quest-type-buttons">
      {QUEST_TYPES.map((type) => {
        const ui = QUEST_TYPE_UI[type];
        const selected = current === type;
        return (
          <button
            key={type}
            type="button"
            data-quest-type={type}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => { if (!selected) onChange(type); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 ${compact ? "py-2 text-xs" : "py-2.5 text-sm"} font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ${ui.ring} ${selected ? `bg-slate-900/80 text-yellow-100 ${ui.card.split(" ")[0]} ring-1 ring-yellow-500/40` : "border-yellow-600/30 bg-slate-900/40 text-yellow-200/70 hover:bg-slate-900/70"}`}
          >
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br ${ui.tile}`}>{ui.smallIcon}</span>
            <span className="truncate">{QUEST_TYPE_LABELS[type]}</span>
          </button>
        );
      })}
    </div>
  );
}

// No hooks on purpose: the component is a pure function of its props, which keeps it easy to test.
export function QuestTypeChooser({ onSelect }: { onSelect: (type: QuestType) => void }) {
  return (
    <div className="px-6 py-6" data-testid="quest-type-chooser">
      <h3 id="quest-type-heading" className="font-serif text-xl text-yellow-100">What kind of quest is this?</h3>
      <p className="mt-1 text-sm text-yellow-200/70">Pick the closest fit. You'll add the details next.</p>
      <div role="group" aria-labelledby="quest-type-heading" className="mt-5 grid grid-cols-3 gap-3 sm:gap-4">
        {QUEST_TYPES.map((type) => {
          const ui = QUEST_TYPE_UI[type];
          return (
            <button
              key={type}
              type="button"
              data-quest-type={type}
              onClick={() => onSelect(type)}
              className={`group flex min-h-[150px] flex-col items-center justify-center gap-2.5 rounded-3xl border bg-slate-800/50 p-3 text-center shadow-lg shadow-transparent transition-all duration-200 hover:-translate-y-1 hover:bg-slate-800/80 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 sm:aspect-square sm:p-4 ${ui.card} ${ui.ring}`}
            >
              <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3 ${ui.tile}`}>
                {ui.icon}
              </span>
              <span className="text-sm font-semibold text-yellow-100 sm:text-base">{QUEST_TYPE_LABELS[type]}</span>
              <span className="text-[11px] leading-snug text-yellow-200/70 sm:text-xs">{ui.blurb}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

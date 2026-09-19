import { useState } from "react";
import {
  ArrowRight, Calendar, CalendarClock, CalendarDays, CheckCircle2, MoreHorizontal,
  Tag, Trash2, Upload, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

type QuestSelectionDockProps = {
  selectedCount: number;
  overdueCount: number;
  onClear: () => void;
  onComplete: () => void;
  onCalendarSync: () => void;
  onRemoveFromCalendar: () => void;
  onRemoveAllFromCalendar: () => void;
  onDelete: () => void;
  onAppendToNotion: () => void;
  onDeleteFromNotion: () => void;
  onCategorize: () => void;
  onReschedule: (date: Date) => void;
  onPushDays: (days: number) => void;
  onMoveOverdue: () => void;
};

const menuClass = "w-56 border-[var(--dash-line-strong)] bg-[var(--dash-surface)] p-1.5 text-[var(--dash-ink)] shadow-[0_18px_45px_rgba(19,25,48,0.18)]";
const menuItemClass = "cursor-pointer gap-2.5 rounded-md px-2.5 py-2 text-[13px] focus:bg-[var(--dash-surface-2)] focus:text-[var(--dash-ink)]";

/** A compact command dock for a selected group of quests. Actions are grouped by
 * intent so the workspace retains its map-like visual calm instead of becoming a
 * row of competing buttons. */
export function QuestSelectionDock({
  selectedCount, overdueCount, onClear, onComplete, onCalendarSync,
  onRemoveFromCalendar, onRemoveAllFromCalendar, onDelete, onAppendToNotion,
  onDeleteFromNotion, onCategorize, onReschedule, onPushDays, onMoveOverdue,
}: QuestSelectionDockProps) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const label = `${selectedCount} quest${selectedCount === 1 ? "" : "s"} selected`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-2xl border border-[var(--dash-line-strong)] bg-[color:var(--dash-surface)] p-3 shadow-[0_18px_55px_rgba(21,28,54,0.16)] backdrop-blur-md sm:flex-row sm:items-center sm:p-3.5">
      <div className="flex min-w-0 items-center gap-3 sm:pr-1">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--dash-violet-soft)] text-[var(--dash-violet)]">
          <CheckCircle2 aria-hidden className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-[var(--dash-ink)]">{label}</p>
          <p className="dash-mono mt-0.5 text-[10px] text-[var(--dash-muted)]">BATCH COMMANDS</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClear}
          aria-label="Clear selected quests"
          title="Clear selection"
          className="dash-focus ml-auto h-8 w-8 shrink-0 rounded-full text-[var(--dash-muted)] hover:bg-[var(--dash-surface-2)] hover:text-[var(--dash-ink)] sm:hidden"
        >
          <X aria-hidden className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 sm:justify-end">
        <Button
          type="button"
          onClick={onComplete}
          className="dash-focus h-10 shrink-0 rounded-xl bg-[var(--dash-violet)] px-4 text-sm font-bold text-white shadow-[0_7px_16px_rgba(102,76,199,0.25)] transition-transform hover:-translate-y-px hover:bg-[var(--dash-violet)]"
        >
          <CheckCircle2 aria-hidden className="mr-2 h-4 w-4" />
          Complete
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="dash-focus h-10 shrink-0 rounded-xl border-[var(--dash-line-strong)] bg-[var(--dash-surface-2)] px-3 text-[var(--dash-ink)] hover:bg-[var(--dash-violet-soft)]">
              <Calendar aria-hidden className="mr-2 h-4 w-4 text-[var(--dash-violet)]" />
              Calendar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" className={menuClass}>
            <DropdownMenuLabel className="dash-mono px-2.5 text-[10px] text-[var(--dash-muted)]">CALENDAR</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onCalendarSync} className={menuItemClass}><Calendar aria-hidden /> Sync selected quests</DropdownMenuItem>
            <DropdownMenuItem onSelect={onRemoveFromCalendar} className={menuItemClass}><CalendarDays aria-hidden /> Remove selected quests</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[var(--dash-line)]" />
            <DropdownMenuItem onSelect={onRemoveAllFromCalendar} className={`${menuItemClass} text-red-500 focus:bg-red-500/10 focus:text-red-500`}><Trash2 aria-hidden /> Clear all calendar quests</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="dash-focus h-10 shrink-0 rounded-xl border-[var(--dash-line-strong)] bg-[var(--dash-surface-2)] px-3 text-[var(--dash-ink)] hover:bg-[var(--dash-violet-soft)]">
              <CalendarDays aria-hidden className="mr-2 h-4 w-4 text-[var(--dash-violet)]" />
              Schedule
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className="w-auto border-[var(--dash-line-strong)] bg-[var(--dash-surface)] p-1 shadow-[0_18px_45px_rgba(19,25,48,0.18)]">
            <CalendarPicker mode="single" onSelect={(date) => { if (date) { onReschedule(date); setRescheduleOpen(false); } }} initialFocus />
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="dash-focus h-10 shrink-0 rounded-xl border-[var(--dash-line-strong)] bg-[var(--dash-surface-2)] px-3 text-[var(--dash-ink)] hover:bg-[var(--dash-violet-soft)]" aria-label="Open selection actions">
              <MoreHorizontal aria-hidden className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className={menuClass}>
            <DropdownMenuLabel className="dash-mono px-2.5 text-[10px] text-[var(--dash-muted)]">ORGANIZE</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onCategorize} className={menuItemClass}><Tag aria-hidden /> Categorize skill</DropdownMenuItem>
            {overdueCount > 0 && (
              <DropdownMenuItem onSelect={onMoveOverdue} className={menuItemClass}>
                <CalendarClock aria-hidden /> Move {overdueCount} overdue to today
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-[var(--dash-line)]" />
            <DropdownMenuLabel className="dash-mono px-2.5 text-[10px] text-[var(--dash-muted)]">SHIFT DUE DATE</DropdownMenuLabel>
            {[1, 3, 5, 7, 14, 30].map((days) => (
              <DropdownMenuItem key={days} onSelect={() => onPushDays(days)} className={menuItemClass}>
                <ArrowRight aria-hidden /> Push {days === 1 ? "1 day" : days === 7 ? "1 week" : days === 14 ? "2 weeks" : days === 30 ? "1 month" : `${days} days`}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-[var(--dash-line)]" />
            <DropdownMenuLabel className="dash-mono px-2.5 text-[10px] text-[var(--dash-muted)]">NOTION</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onAppendToNotion} className={menuItemClass}><Upload aria-hidden /> Append to Notion</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDeleteFromNotion} className={`${menuItemClass} text-red-500 focus:bg-red-500/10 focus:text-red-500`}><Trash2 aria-hidden /> Delete from Notion</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[var(--dash-line)]" />
            <DropdownMenuItem onSelect={onDelete} className={`${menuItemClass} text-red-500 focus:bg-red-500/10 focus:text-red-500`}><Trash2 aria-hidden /> Delete selected quests</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" variant="ghost" size="icon" onClick={onClear} aria-label="Clear selected quests" title="Clear selection" className="dash-focus hidden h-9 w-9 shrink-0 rounded-full text-[var(--dash-muted)] hover:bg-[var(--dash-surface-2)] hover:text-[var(--dash-ink)] sm:inline-flex">
          <X aria-hidden className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
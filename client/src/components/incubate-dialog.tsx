import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INCUBATE_PRESETS, incubateProblem, localDayOf, presetDay, staysInList, type IncubatingQuest } from "@shared/incubate";

const label = (day: Date) => format(day, "MMM dd, yyyy");

// The part of the dialog that asks for the day: quick choices, a calendar, and a button that says what will happen.
export function IncubateForm({ quest, now = new Date(), pending = false, onConfirm, onCancel }: {
  quest: IncubatingQuest; now?: Date; pending?: boolean; onConfirm: (day: Date) => void; onCancel: () => void;
}) {
  const allowed = (day: Date) => incubateProblem(day, quest, now) === null;
  // Starts on the day it already comes back (to change it), otherwise a week out, otherwise the due day, so one tap is enough.
  const current = localDayOf(quest.startDate);
  const due = localDayOf(quest.dueDate);
  const first = [current, presetDay(now, 7), due].find((day): day is Date => !!day && allowed(day));
  const [picked, setPicked] = useState<Date | undefined>(first);
  const soon = picked ? staysInList(picked, quest, now) : false;

  return (
    <div data-testid="incubate-form" className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick choices">
        {INCUBATE_PRESETS.map((p) => {
          const day = presetDay(now, p.days);
          const ok = allowed(day);
          const active = !!picked && picked.getTime() === day.getTime();
          return (
            <button
              key={p.days}
              type="button"
              data-testid="incubate-preset"
              disabled={!ok}
              aria-pressed={active}
              onClick={() => setPicked(day)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40 ${active ? "border-yellow-400 bg-yellow-500/20 text-yellow-100" : "border-slate-600 text-slate-300 hover:text-white"}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex justify-center rounded-lg border border-slate-700/60 bg-slate-900/50">
        <Calendar mode="single" selected={picked} onSelect={(day) => day && setPicked(day)} defaultMonth={picked ?? now} disabled={(day) => !allowed(day)} className="rounded-md border-0" />
      </div>
      {due && <p data-testid="incubate-due-note" className="text-[11px] text-slate-400">Due {label(due)}, so it can only incubate up to then.</p>}
      {soon && <p data-testid="incubate-soon-note" className="text-[11px] text-amber-300">A deadline this close keeps it in your list anyway.</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-slate-300">Cancel</Button>
        <Button type="button" data-testid="incubate-confirm" disabled={!picked || pending} onClick={() => picked && onConfirm(picked)} className="bg-yellow-600 text-white hover:bg-yellow-500">
          {picked ? `Incubate until ${label(picked)}` : "Pick a day"}
        </Button>
      </div>
    </div>
  );
}

// Asked for when a quest is moved to the Incubate stage (and to change the day later). Closing it leaves the quest as it was.
export function IncubateDialog({ open, onOpenChange, quest, pending, onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; quest: IncubatingQuest; pending: boolean; onConfirm: (day: Date) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-2 border-yellow-600/30 bg-slate-900 text-yellow-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-yellow-100">💡 Incubate until when?</DialogTitle>
          <DialogDescription className="text-slate-400">
            The quest stays in your list but leaves your feed until then. The day you pick becomes its start date.
          </DialogDescription>
        </DialogHeader>
        {open && <IncubateForm quest={quest} pending={pending} onConfirm={onConfirm} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

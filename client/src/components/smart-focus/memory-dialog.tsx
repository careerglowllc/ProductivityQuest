import { useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { focusError, useFocusActions, useFocusState } from "./use-smart-focus";
import { focusActionLabel } from "@shared/smart-focus-ai";
import "./smart-focus.css";

export function FocusMemoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const state = useFocusState(open);
  const { forget } = useFocusActions();
  const [confirmClear, setConfirmClear] = useState(false);
  const data = state.data;
  const hasMemory = !!(data?.preferences.length || data?.signals.length);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sf-dialog sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Private preferences</DialogTitle>
          <DialogDescription className="sf-muted">Your words and task-specific signals, stored on your account. Forgetting them changes future recommendations, not the quests themselves.</DialogDescription>
        </DialogHeader>
        {state.isLoading && <div className="space-y-3 py-4" aria-label="Loading private preferences"><div className="sf-skeleton w-3/4" /><div className="sf-skeleton" /><div className="sf-skeleton w-1/2" /></div>}
        {state.isError && <div role="alert" className="sf-error">{focusError(state.error)}<Button variant="ghost" size="sm" onClick={() => state.refetch()}>Retry</Button></div>}
        {forget.isError && <p role="alert" className="sf-error">{focusError(forget.error)} Please try forgetting again.</p>}
        {forget.isSuccess && <p role="status" className="text-xs sf-muted">Memory forgotten. Recommendations have been updated.</p>}
        {data && <>
          <div className="text-xs sf-muted">Day boundary: {data.timezone}. Preferences are stored on your account, not in browser localStorage.</div>
          <section>
            <h3 className="text-sm font-semibold">Explicit preferences <span className="sf-muted font-normal">({data.preferences.length})</span></h3>
            {!data.preferences.length && <p className="mt-2 text-xs sf-muted">No saved feedback. Use AI feedback in any quest menu to tell Smart Focus what matters.</p>}
            {data.preferences.map((preference) => <div key={preference.id} className="sf-memory-item flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-xs font-semibold break-words">{preference.taskTitle}{focusActionLabel(preference) && <span data-testid="preference-action" className="ml-2 rounded border border-[var(--dash-line)] px-1.5 py-0.5 text-[10px] font-normal sf-muted">{focusActionLabel(preference)}</span>}</p><p className="mt-1 text-sm whitespace-pre-wrap break-words">{preference.text}</p><p className="mt-1 text-[11px] sf-muted">{new Date(preference.createdAt).toLocaleDateString()}</p></div>
              <Button variant="outline" size="sm" className="sf-button shrink-0" disabled={forget.isPending} onClick={() => forget.mutate(`preferences/${preference.id}`)}>Forget</Button>
            </div>)}
          </section>
          <section>
            <h3 className="text-sm font-semibold">Inferred task signals <span className="sf-muted font-normal">({data.signals.length})</span></h3>
            <p className="mt-1 text-xs sf-muted">Repeated “Not today” choices are task-specific hints, not assumptions about you.</p>
            {!data.signals.length && <p className="mt-2 text-xs sf-muted">No inferred signals yet.</p>}
            {data.signals.map((signal) => <div key={signal.taskId} className="sf-memory-item flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-xs font-semibold break-words">{signal.taskTitle}</p><p className="mt-1 text-xs sf-muted">Set aside on {signal.days} {signal.days === 1 ? "day" : "days"}.</p></div>
              <Button variant="outline" size="sm" className="sf-button shrink-0" disabled={forget.isPending} onClick={() => forget.mutate(`signals/${signal.taskId}`)}>Forget</Button>
            </div>)}
          </section>
          {hasMemory && <div className="border-t border-[var(--dash-line)] pt-3">
            {confirmClear ? <div className="space-y-2"><p className="text-sm">Forget all saved preferences and inferred signals? This cannot be undone.</p><div className="flex gap-2"><Button variant="destructive" disabled={forget.isPending} onClick={() => forget.mutate("memory", { onSuccess: () => setConfirmClear(false) })}>Forget all</Button><Button variant="outline" className="sf-button" onClick={() => setConfirmClear(false)}>Keep memory</Button></div></div>
              : <Button variant="outline" className="sf-button" onClick={() => setConfirmClear(true)}><Trash2 className="mr-2 h-4 w-4" />Forget all memory</Button>}
          </div>}
        </>}
      </DialogContent>
    </Dialog>
  );
}

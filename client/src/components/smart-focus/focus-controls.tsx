import { useState } from "react";
import { RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FocusMemoryDialog } from "./memory-dialog";
import { focusError, useFocusActions, type useFocusRanking, type useFocusState } from "./use-smart-focus";
import "./smart-focus.css";

export function FocusControls({ state, ranking }: {
  state: ReturnType<typeof useFocusState>; ranking: ReturnType<typeof useFocusRanking>;
}) {
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [enableNotice, setEnableNotice] = useState(false);
  const { settings } = useFocusActions();
  const error = state.error || ranking.refresh.error || ranking.error || settings.error;
  const enabled = state.data?.enabled === true;
  return (
    <section className="sf-panel" aria-label="Smart Focus controls">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-[var(--dash-violet)]" />Smart Focus<span className="rounded border border-[var(--dash-line)] px-1.5 py-0.5 text-[10px] font-normal sf-muted">{ranking.data?.mode === "ai" ? "Personalized AI" : "Rules-based"}</span></h2>
          <p className="mt-1 text-xs sf-muted">{ranking.data?.message || (enabled ? "Choosing your next quests with your preferences." : "AI is off. Your dates and priorities guide this queue.")}</p>
          {ranking.data && ranking.data.protectedCount > 0 && <p className="mt-1 text-[11px] sf-muted">{ranking.data.protectedCount} urgent or starting-today quests protected from “Not today”.</p>}
          {enabled && <p className="mt-1 text-[11px] sf-muted">New AI generations may be limited to once every 60 seconds. Refresh can return rules while you wait.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="sf-button h-8 text-xs" disabled={!state.data || settings.isPending} onClick={() => enabled ? settings.mutate(false) : setEnableNotice(true)}>{settings.isPending ? "Saving…" : enabled ? "Disable AI" : "Enable AI"}</Button>
          <Button size="sm" variant="outline" className="sf-button h-8 text-xs" disabled={!state.data || ranking.isFetching || ranking.refresh.isPending} onClick={() => ranking.refresh.mutate()}><RefreshCw className="mr-1.5 h-3 w-3" />{ranking.refresh.isPending ? "Refreshing…" : "Refresh"}</Button>
          <Button size="sm" variant="outline" className="sf-button h-8 text-xs" onClick={() => setMemoryOpen(true)}><ShieldCheck className="mr-1.5 h-3 w-3" />Private preferences</Button>
        </div>
      </div>
      {enabled && state.data && !state.data.available && <p className="mt-2 text-xs sf-muted">AI is not currently available. Server rules keep the queue working.</p>}
      {enableNotice && <div className="mt-3 rounded-md border border-[var(--dash-line)] bg-[var(--dash-violet-soft)] p-3 space-y-2">
        <h3 className="text-sm font-semibold">Before you enable AI</h3>
        <p className="text-xs">Relevant task content and your saved preferences will be sent to OpenAI to personalize recommendations. AI is optional. You can disable it or forget your memory at any time.</p>
        <div className="flex flex-wrap gap-2"><Button size="sm" className="sf-primary" disabled={settings.isPending} onClick={() => settings.mutate(true, { onSuccess: () => setEnableNotice(false) })}>Enable and personalize</Button><Button size="sm" variant="outline" className="sf-button" onClick={() => setEnableNotice(false)}>Keep AI off</Button></div>
      </div>}
      {(state.isLoading || ranking.isFetching || ranking.refresh.isPending) && <div role="status" aria-label="Updating Smart Focus" className="mt-3 space-y-2"><div className="sf-skeleton w-2/3" /><div className="sf-skeleton w-1/3" /><span className="sr-only">Updating Smart Focus</span></div>}
      {error && <div role="alert" className="sf-error mt-3"><p>{focusError(error)}</p><p className="mt-1">Showing {ranking.data ? "the last available ranking" : "local rules-based focus"} until this succeeds.</p><Button size="sm" variant="ghost" onClick={() => { settings.reset(); ranking.refresh.reset(); if (state.isError) state.refetch(); else ranking.refetch(); }}>Retry</Button></div>}
      {memoryOpen && <FocusMemoryDialog open={memoryOpen} onOpenChange={setMemoryOpen} />}
    </section>
  );
}

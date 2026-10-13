import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { FocusMemoryDialog } from "@/components/smart-focus/memory-dialog";
import { focusError, useFocusActions, useFocusState, useRefreshFocus } from "@/components/smart-focus/use-smart-focus";
import { describeWorkPriorities } from "@/components/smart-focus/work-priorities";
import "@/components/smart-focus/smart-focus.css";

export default function SmartFocusSettingsPage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();
  const state = useFocusState();
  const { settings } = useFocusActions();
  const refresh = useRefreshFocus();
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [enableNotice, setEnableNotice] = useState(false);
  const enabled = state.data?.enabled === true;
  const workPriorities = describeWorkPriorities(state.data?.profile);
  const error = state.error || settings.error || refresh.error;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"} ${!isMobile ? "pt-16" : ""} pb-24`}>
      <div className={`container mx-auto ${isMobile ? "px-4 py-4" : "px-4 py-8"}`}>
        <div className={`${isMobile ? "max-w-full" : "max-w-2xl"} mx-auto`}>
          <div className={isMobile ? "mb-5" : "mb-8"}>
            <Link href="/settings" className="mb-3 inline-flex items-center gap-1.5 text-sm text-yellow-400/80 transition-colors hover:text-yellow-400">
              <ChevronLeft className="h-4 w-4" />
              Back to Settings
            </Link>
            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
                <Sparkles className="h-5 w-5 text-[#ffffff]" />
              </div>
              <h1 className={`${isMobile ? "text-xl" : "text-3xl"} font-serif font-bold text-yellow-100`}>Smart Focus</h1>
            </div>
            <p className="ml-[52px] text-sm text-yellow-200/70">Choose what the Smart Focus tab on your Quests page shows.</p>
          </div>

          <section className="sf-panel" aria-label="Smart Focus on or off">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">
                  Smart Focus is {state.data ? (enabled ? "on" : "off") : "…"}
                </h2>
                <p className="mt-1 text-xs sf-muted">
                  {enabled
                    ? "The Smart Focus tab lists what to work on today, personalized with your private preferences. Overdue, due-today and starting-today quests are always included."
                    : "While it is off, the Smart Focus tab shows no quests and points you here."}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="sf-button h-8 shrink-0 text-xs"
                disabled={!state.data || settings.isPending}
                onClick={() => (enabled ? settings.mutate(false) : setEnableNotice(true))}
              >
                {settings.isPending ? "Saving…" : enabled ? "Disable" : "Enable"}
              </Button>
            </div>
            {enabled && state.data && !state.data.available && (
              <p className="mt-2 text-xs sf-muted">AI is not available on this server right now. Smart Focus keeps working from your dates and priorities.</p>
            )}
            {enableNotice && (
              <div className="mt-3 space-y-2 rounded-md border border-[var(--dash-line)] bg-[var(--dash-violet-soft)] p-3">
                <h3 className="text-sm font-semibold">Before you enable Smart Focus</h3>
                <p className="text-xs">Relevant quest content and your saved preferences are sent to OpenAI to personalize recommendations. You can disable Smart Focus or forget your preferences at any time.</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="sf-primary" disabled={settings.isPending} onClick={() => settings.mutate(true, { onSuccess: () => setEnableNotice(false) })}>Enable Smart Focus</Button>
                  <Button size="sm" variant="outline" className="sf-button" onClick={() => setEnableNotice(false)}>Keep it off</Button>
                </div>
              </div>
            )}
          </section>

          {enabled && (
            <section className="sf-panel" aria-label="Refresh Smart Focus">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Refresh</h2>
                  <p className="mt-1 text-xs sf-muted">Re-rank your quests now. New AI results can be requested about once a minute.</p>
                </div>
                <Button size="sm" variant="outline" className="sf-button h-8 shrink-0 text-xs" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
                  <RefreshCw className="mr-1.5 h-3 w-3" />{refresh.isPending ? "Refreshing…" : "Refresh now"}
                </Button>
              </div>
              {refresh.data && (
                <p role="status" className="mt-2 text-xs sf-muted">
                  {refresh.data.mode === "ai" ? "Personalized AI" : "Rules-based"}: {refresh.data.message || `${refresh.data.ids.length} quests chosen.`}
                </p>
              )}
            </section>
          )}

          <section className="sf-panel" aria-label="Private preferences">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Private preferences</h2>
                <p className="mt-1 text-xs sf-muted">
                  {state.data
                    ? `${state.data.preferences.length} saved ${state.data.preferences.length === 1 ? "preference" : "preferences"} and ${state.data.signals.length} inferred ${state.data.signals.length === 1 ? "signal" : "signals"}. Stored on your account, only used by Smart Focus.`
                    : "Review or forget what Smart Focus has learned from your feedback."}
                </p>
              </div>
              <Button size="sm" variant="outline" className="sf-button h-8 shrink-0 text-xs" onClick={() => setMemoryOpen(true)}>
                <ShieldCheck className="mr-1.5 h-3 w-3" />Review
              </Button>
            </div>
          </section>

          {workPriorities.length > 0 && (
            <section className="sf-panel" aria-label="Work priorities">
              <h2 className="text-sm font-semibold">Work priorities</h2>
              <p className="mt-1 text-xs sf-muted">Built in for your account. They shift how important a quest counts in Smart Focus, by its work filter.</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
                {workPriorities.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </section>
          )}

          {error && (
            <div role="alert" className="sf-error">
              <p>{focusError(error)}</p>
              <Button size="sm" variant="ghost" onClick={() => { settings.reset(); refresh.reset(); if (state.isError) state.refetch(); }}>Dismiss</Button>
            </div>
          )}

          <p className="mt-4 text-xs text-yellow-200/60">
            To give Smart Focus feedback on a quest, use the quest menu or select a quest and choose AI feedback.
          </p>
        </div>
      </div>
      {memoryOpen && <FocusMemoryDialog open={memoryOpen} onOpenChange={setMemoryOpen} />}
    </div>
  );
}

import { Link } from "wouter";
import { Settings, Sparkles } from "lucide-react";
import { SMART_FOCUS_SETTINGS_PATH } from "./focus-gate";
import "./smart-focus.css";

// Shown in place of the Smart Focus list while Smart Focus is off.
export function FocusOffNotice() {
  return (
    <div data-testid="smart-focus-off" className="rounded-[10px] border border-dashed border-[var(--dash-line-strong)] bg-[var(--dash-surface)] p-10 text-center">
      <Sparkles aria-hidden className="mx-auto mb-3 h-8 w-8 text-[var(--dash-violet)] opacity-60" />
      <h3 className="text-lg font-bold tracking-tight text-[var(--dash-ink)]">Smart Focus is off</h3>
      <p className="mt-1 text-sm text-[var(--dash-muted)]">
        Go to the Smart Focus page in settings to adjust.
      </p>
      <Link
        href={SMART_FOCUS_SETTINGS_PATH}
        className="dash-focus mt-4 inline-flex items-center gap-1.5 rounded-md border border-[var(--dash-line)] bg-[var(--dash-surface-2)] px-3 py-1.5 text-sm font-semibold text-[var(--dash-ink)] hover:bg-[var(--dash-violet-soft)]"
      >
        <Settings aria-hidden className="h-4 w-4" />
        Smart Focus settings
      </Link>
    </div>
  );
}

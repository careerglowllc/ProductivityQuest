import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// A card that starts closed and opens when its header is tapped. The content is only built while it is open.
export function CollapsibleSection({ testId, title, icon, summary, children }: {
  testId: string; title: string; icon: ReactNode; summary?: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = `${testId}-body`;
  return (
    <section data-testid={testId} aria-label={title} className="mb-4 rounded-2xl border border-slate-700/60 bg-slate-900/50">
      <button
        type="button"
        data-testid={`${testId}-toggle`}
        aria-expanded={open}
        aria-controls={open ? bodyId : undefined}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 font-bold text-white">{icon}{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {summary && !open && <span data-testid={`${testId}-summary`} className="text-[11px] text-slate-400">{summary}</span>}
          <ChevronDown aria-hidden className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && <div id={bodyId} data-testid={`${testId}-body`} className="px-4 pb-4">{children}</div>}
    </section>
  );
}

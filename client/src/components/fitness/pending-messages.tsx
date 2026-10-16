import { AlertCircle, Clock, Loader2, Pencil, RotateCcw, X } from "lucide-react";
import { isBlocked, type QueuedMessage } from "@/lib/fitness-queue";

// What was typed but is not in the day yet: the message being added now, the ones waiting behind it, and any that failed
// (which can be retried, put back in the box to edit, or removed).
export function PendingMessages({ queue, onRetry, onEdit, onRemove }: {
  queue: readonly QueuedMessage[]; onRetry: (id: string) => void; onEdit: (message: QueuedMessage) => void; onRemove: (id: string) => void;
}) {
  if (queue.length === 0) return null;
  const blocked = isBlocked(queue);
  return (
    <ul data-testid="pending-messages" aria-label="Messages being added" aria-live="polite" className="mt-2 space-y-1.5">
      {queue.map((m) => (
        <li
          key={m.id}
          data-testid="pending-message"
          data-status={m.status}
          className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${m.status === "failed" ? "border-red-400/40 bg-red-500/10" : "border-slate-700/60 bg-slate-800/50"}`}
        >
          <span className="mt-0.5 shrink-0" aria-hidden>
            {m.status === "sending" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" /> : m.status === "queued" ? <Clock className="h-3.5 w-3.5 text-slate-500" /> : <AlertCircle className="h-3.5 w-3.5 text-red-300" />}
          </span>
          <span className="min-w-0 flex-1">
            <span data-testid="pending-text" className="block truncate text-slate-200" title={m.text}>{m.text}</span>
            <span className={`block text-[11px] ${m.status === "failed" ? "text-red-300" : "text-slate-500"}`}>
              {m.status === "sending" ? "Adding it now…" : m.status === "queued" ? (blocked ? "Waiting for the message above to be sorted out" : "Waiting its turn") : m.error}
            </span>
          </span>
          {m.status === "failed" && (
            <span className="flex shrink-0 items-center gap-2.5">
              <button type="button" onClick={() => onRetry(m.id)} aria-label="Try this message again" title="Try again" className="text-slate-300 hover:text-white"><RotateCcw className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => onEdit(m)} aria-label="Put this message back in the box to edit it" title="Edit" className="text-slate-300 hover:text-white"><Pencil className="h-3.5 w-3.5" /></button>
            </span>
          )}
          {m.status !== "sending" && (
            <button type="button" onClick={() => onRemove(m.id)} aria-label="Remove this message" title="Remove" className="shrink-0 text-slate-500 hover:text-red-300"><X className="h-3.5 w-3.5" /></button>
          )}
        </li>
      ))}
    </ul>
  );
}

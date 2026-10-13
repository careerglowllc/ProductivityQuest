import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Quote as QuoteIcon } from "lucide-react";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { QUOTE_HISTORY_KEY, loadQuoteHistory, loadQuotes, localDay, pickQuoteOfTheDay } from "@/lib/quotes";

// One slim row with today's quote, picked at random each day and never repeated within the past 7 days.
export function QuoteOfTheDay({ className = "" }: { className?: string }) {
  const [version, setVersion] = useState(0);
  // Picks up quote-list or history changes made on another device or on the quotes page.
  useEffect(() => subscribeUserDataRefresh(() => setVersion((v) => v + 1)), []);
  const day = localDay();
  const { quote, history } = useMemo(() => pickQuoteOfTheDay(loadQuotes(), day, loadQuoteHistory()), [day, version]);

  // Remember today's pick so a reload (or another device) shows the same quote.
  useEffect(() => {
    if (!quote) return;
    try {
      const json = JSON.stringify(history);
      if (localStorage.getItem(QUOTE_HISTORY_KEY) !== json) localStorage.setItem(QUOTE_HISTORY_KEY, json);
    } catch { /* storage full or blocked */ }
  }, [quote, history]);

  if (!quote) return null;
  const attribution = [quote.author, quote.source].filter(Boolean).join(", ");
  return (
    <Link href="/journal/quotes">
      <a
        data-testid="quote-of-the-day"
        title={`“${quote.text}”${attribution ? ` — ${attribution}` : ""}`}
        className={`dash-focus flex min-h-[40px] items-center gap-2.5 rounded-[10px] border border-[var(--dash-line)] bg-[var(--dash-surface)] px-3.5 py-2 transition-colors hover:border-[var(--dash-violet)] ${className}`}
      >
        <QuoteIcon aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--dash-violet)]" />
        <p className="line-clamp-2 min-w-0 flex-1 text-[12.5px] leading-snug text-[var(--dash-ink)] sm:line-clamp-1">
          <span className="italic">“{quote.text}”</span>
          {quote.author && <span className="text-[var(--dash-muted)]"> — {quote.author}</span>}
        </p>
      </a>
    </Link>
  );
}

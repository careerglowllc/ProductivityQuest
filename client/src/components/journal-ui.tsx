import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

/** All journal-family destinations, used for the "related pages" strip that
 *  appears on every journal page (matches the Life OS journal reference). */
export const JOURNAL_NAV: { label: string; path: string }[] = [
  { label: "Journal home", path: "/journal" },
  { label: "Daily GLEW", path: "/journal/daily-glew" },
  { label: "Gratitude", path: "/journal/gratitude" },
  { label: "Excitement", path: "/journal/excitement" },
  { label: "Empowering thoughts", path: "/journal/empowering-thoughts" },
  { label: "Weekly planning", path: "/journal/weekly-planning" },
  { label: "Reference beliefs", path: "/reference-beliefs" },
];

/** Full-bleed page background + centered editorial content column. Desktop
 *  gets the usual pt-16 offset for the fixed top bar; mobile gets safe-area
 *  bottom padding for the bottom nav (handled by jrnl-content in index.css). */
export function JournalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--jrnl-bg)] pb-8 md:pt-16">
      <main className="jrnl-content pt-6 md:pt-9">{children}</main>
    </div>
  );
}

export function JournalBackLink() {
  return (
    <Link href="/journal">
      <a className="dash-focus mb-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--jrnl-sage-deep)] hover:text-[var(--jrnl-rose)]">
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Back to Journal
      </a>
    </Link>
  );
}

/** Editorial hero: eyebrow + serif display title + supporting copy, with an
 *  optional "streak"/count box on the trailing edge. */
export function JournalHero({
  eyebrow, title, emphasis, copy, statValue, statLabel,
}: {
  eyebrow: string;
  title: string;
  emphasis?: string;
  copy: string;
  statValue?: string;
  statLabel?: string;
}) {
  return (
    <section className="mb-6 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="jrnl-display text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--jrnl-rose)]">{eyebrow}</p>
        <h1 className="jrnl-display mt-1 text-[42px] leading-none tracking-tight text-[var(--jrnl-ink)] sm:text-[51px]">
          {title}{emphasis && <> <em className="italic text-[var(--jrnl-rose)]">{emphasis}</em></>}
        </h1>
        <p className="mt-2 max-w-[420px] text-sm text-[var(--jrnl-muted)]">{copy}</p>
      </div>
      {statValue && (
        <div className="min-w-[150px] border-t border-[var(--jrnl-line)] pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <p className="jrnl-display text-[26px] leading-none text-[var(--jrnl-sage-deep)]">{statValue}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--jrnl-muted)]">{statLabel}</p>
        </div>
      )}
    </section>
  );
}

export function RelatedJournalNav() {
  const [location] = useLocation();
  return (
    <nav aria-label="Related journal pages" className="mb-6 flex flex-wrap gap-1.5">
      {JOURNAL_NAV.map((l) => {
        const active = location === l.path;
        return (
          <Link key={l.path} href={l.path}>
            <a
              aria-current={active ? "page" : undefined}
              className={`dash-focus whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${
                active
                  ? "border-[var(--jrnl-rose)] bg-[var(--jrnl-rose-soft)] text-[var(--jrnl-ink)]"
                  : "border-[var(--jrnl-line)] bg-[var(--jrnl-paper)]/60 text-[var(--jrnl-muted)] hover:border-[var(--jrnl-rose)] hover:bg-[var(--jrnl-rose-soft)]"
              }`}
            >
              {l.label}
            </a>
          </Link>
        );
      })}
    </nav>
  );
}

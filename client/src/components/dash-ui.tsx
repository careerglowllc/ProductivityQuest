import { Link } from "wouter";
import { ArrowRight, Loader2 } from "lucide-react";

// ── Shared Life OS surfaces ───────────────────────────────────────────────
// All colors come from the --dash-* tokens in index.css, which flip between the
// light and dark palettes. That keeps these surfaces out of reach of the global
// light-mode class-substring override block. Used by the dashboard and any page
// migrated to the new design system (e.g. the Shop page).

export function DashCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-[10px] border border-[var(--dash-line)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow)] ${className}`}
    >
      {children}
    </div>
  );
}

export function DashCardHead({ title, href, linkLabel, subtitle }: {
  title: string; href?: string; linkLabel?: string; subtitle?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--dash-line)] px-5 py-3.5">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-bold text-[var(--dash-ink)]">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-xs text-[var(--dash-muted)]">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href}>
          <a className="dash-focus flex shrink-0 items-center gap-1 rounded text-[11px] font-semibold text-[var(--dash-blue)] hover:underline">
            {linkLabel || "View all"} <ArrowRight aria-hidden className="h-3 w-3" />
          </a>
        </Link>
      )}
    </div>
  );
}

/** Top-level progress metric. `tone` maps to the token meaning: mint = completion,
 *  amber = attention/reward, violet = progression. While `loading`, shows a spinner
 *  instead of the value/caption so we never flash a wrong intermediate number
 *  (e.g. 100%) before all the underlying data has actually finished loading. */
// One thin row on every screen size: label over caption on the left, the figure on the right, and the progress meter as a
// hairline along the bottom edge on a phone (see .dash-stat-card in index.css). About as tall as the collapsed questlines bar.
export function StatCard({ label, value, unit, pct, tone, caption, featured = false, loading = false }: {
  label: string; value: string; unit?: string; pct: number;
  tone: "mint" | "amber" | "violet"; caption?: string; featured?: boolean; loading?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const toneVar = `var(--dash-${tone})`;
  return (
    <section
      aria-label={label}
      aria-busy={loading || undefined}
      className={`dash-stat-card relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 overflow-hidden rounded-[10px] border bg-[var(--dash-surface)] min-h-[42px] px-3.5 py-1.5 shadow-[var(--dash-shadow)] md:flex md:min-h-0 md:justify-start md:gap-3.5 md:py-2.5 ${
        featured ? "" : "border-[var(--dash-line)]"
      }`}
      style={featured ? { borderColor: toneVar } : undefined}
    >
      <p className="dash-mono col-start-1 row-start-1 truncate leading-3 text-[var(--dash-muted)] md:col-auto md:row-auto md:shrink-0">{label}</p>
      {loading ? (
        <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-2 md:col-auto md:row-auto md:flex-1">
          <Loader2 aria-hidden className="h-4 w-4 shrink-0 animate-spin" style={{ color: toneVar }} />
          <span className="text-xs text-[var(--dash-muted)]">Calculating…</span>
        </div>
      ) : (
        <>
          <p className="col-start-2 row-span-2 row-start-1 flex items-baseline gap-1 md:col-auto md:row-auto md:shrink-0">
            <span className="text-[20px] font-bold leading-none tracking-[-0.04em] text-[var(--dash-ink)]">{value}</span>
            {unit && <span className="text-[12px] font-medium" style={{ color: toneVar }}>{unit}</span>}
          </p>
          {caption && <p className="col-start-1 row-start-2 truncate text-[11px] leading-[14px] text-[var(--dash-muted)] md:col-auto md:row-auto md:min-w-0 md:flex-1">{caption}</p>}
        </>
      )}
      <div
        className={`dash-meter md:w-28 md:shrink-0 ${tone === "mint" ? "mint" : tone === "amber" ? "amber" : ""}`}
        role="progressbar"
        aria-valuenow={loading ? undefined : Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} progress`}
      >
        <i style={{ width: loading ? "0%" : `${clamped}%` }} />
      </div>
    </section>
  );
}

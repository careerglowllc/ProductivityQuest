import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

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
 *  amber = attention/reward, violet = progression. */
export function StatCard({ label, value, unit, pct, tone, caption, featured = false }: {
  label: string; value: string; unit?: string; pct: number;
  tone: "mint" | "amber" | "violet"; caption?: string; featured?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const toneVar = `var(--dash-${tone})`;
  return (
    <section
      aria-label={label}
      className={`flex min-h-[122px] flex-col justify-between rounded-[10px] border bg-[var(--dash-surface)] p-[19px] shadow-[var(--dash-shadow)] ${
        featured ? "" : "border-[var(--dash-line)]"
      }`}
      style={featured ? { borderColor: toneVar } : undefined}
    >
      <p className="dash-mono text-[var(--dash-muted)]">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[30px] font-bold leading-none tracking-[-0.04em] text-[var(--dash-ink)]">{value}</span>
        {unit && <span className="text-[13px] font-medium" style={{ color: toneVar }}>{unit}</span>}
      </p>
      {caption && <p className="mt-1 truncate text-[11px] text-[var(--dash-muted)]">{caption}</p>}
      <div
        className={`dash-meter mt-2.5 ${tone === "mint" ? "mint" : tone === "amber" ? "amber" : ""}`}
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} progress`}
      >
        <i style={{ width: `${clamped}%` }} />
      </div>
    </section>
  );
}

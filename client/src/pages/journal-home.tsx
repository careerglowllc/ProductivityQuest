import type { ComponentType } from "react";
import { Link } from "wouter";
import { ArrowRight, BookMarked, BookOpen, ClipboardList, Dumbbell, Flame, Heart, HeartHandshake, Quote, Radar, Sparkles, Weight, Zap } from "lucide-react";
import { JournalShell, JournalHero } from "@/components/journal-ui";

type Destination = { title: string; description: string; path: string; icon: ComponentType<{ className?: string }>; tone: "sage" | "rose" };

const DESTINATIONS: Destination[] = [
  { title: "Journal Essays", description: "Long-form essays, reflections, and stories — the ideas worth writing all the way out.", path: "/journal/essays", icon: BookOpen, tone: "sage" },
  { title: "Daily GLEW", description: "Gratitudes, wins, exciteds, and lessons learned — one day at a time.", path: "/journal/daily-glew", icon: HeartHandshake, tone: "rose" },
  { title: "Gratitude Journal", description: "A running list of things you're grateful for.", path: "/journal/gratitude", icon: Heart, tone: "rose" },
  { title: "Sparks", description: "What you're excited about and the empowering thoughts you're reinforcing, with every Daily GLEW Excited.", path: "/journal/sparks", icon: Zap, tone: "sage" },
  { title: "Inspirational Quotes", description: "Your collection of quotes, with one picked at random each day for the dashboard.", path: "/journal/quotes", icon: Quote, tone: "rose" },
  { title: "Weekly Deep Planning", description: "One deep-dive reflection and plan per week.", path: "/journal/weekly-planning", icon: ClipboardList, tone: "rose" },
  { title: "Reference Beliefs", description: "Principles and reference notes worth re-reading when you need them.", path: "/reference-beliefs", icon: BookMarked, tone: "sage" },
];

export const BODY_LOGS: { label: string; path: string; icon: ComponentType<{ className?: string }> }[] = [
  { label: "Weightlifting log", path: "/fitness/lifting", icon: Dumbbell },
  { label: "Calorie log", path: "/fitness/calories", icon: Flame },
  { label: "Weight log", path: "/fitness/weight", icon: Weight },
];

const TONES = {
  sage: "bg-[var(--jrnl-sage-soft)] text-[var(--jrnl-sage-deep)]",
  rose: "bg-[var(--jrnl-rose-soft)] text-[var(--jrnl-rose)]",
} as const;

// Phones get a compact two-column grid so every link fits on one screen; from sm up the full cards are unchanged.
const cardClass = "group dash-focus flex flex-row items-center gap-2.5 rounded-xl border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-2.5 shadow-[var(--jrnl-shadow)] transition-all hover:-translate-y-0.5 hover:border-[var(--jrnl-rose)] sm:flex-col sm:items-stretch sm:gap-3 sm:p-5";
const iconClass = "grid h-8 w-8 shrink-0 place-items-center rounded-full sm:h-10 sm:w-10";

function Open() {
  return (
    <span className="mt-auto hidden items-center gap-1 pt-1 text-[11px] font-semibold text-[var(--jrnl-muted)] transition-colors group-hover:text-[var(--jrnl-rose)] sm:inline-flex">
      Open <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </span>
  );
}

export default function JournalHomePage() {
  return (
    <JournalShell>
      <JournalHero
        compactOnMobile
        eyebrow="Your reflection hub"
        title="Journal,"
        emphasis="all in one place."
        copy="Choose a space to write in, look back on, or plan from."
      />

      <nav aria-label="Journal sections" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
        {DESTINATIONS.map(({ title, description, path, icon: Icon, tone }) => (
          <Link key={path} href={path} className={cardClass}>
            <span className={`${iconClass} ${TONES[tone]}`}>
              <Icon aria-hidden className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <span className="jrnl-display min-w-0 text-[17px] leading-tight text-[var(--jrnl-ink)] sm:text-[22px]">{title}</span>
            <span className="hidden text-[13px] leading-relaxed text-[var(--jrnl-muted)] sm:block">{description}</span>
            <Open />
          </Link>
        ))}

        <Link href="/command-center" className={`${cardClass} col-span-2 border-[var(--jrnl-sage)] lg:col-span-3 sm:flex-row sm:items-center sm:gap-5`}>
          <span className={`${iconClass} ${TONES.sage}`}>
            <Radar aria-hidden className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--jrnl-sage-deep)]">Strategy</span>
            <span className="jrnl-display text-[17px] leading-tight text-[var(--jrnl-ink)] sm:text-[22px]">Command Center</span>
            <span className="hidden text-[13px] leading-relaxed text-[var(--jrnl-muted)] sm:block">Private strategy debriefs for your macro goals — finance, mental health, fitness, and relationships.</span>
          </span>
          <Open />
        </Link>
      </nav>

      <section aria-label="Body logs" className="mt-4 sm:mt-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--jrnl-sage-deep)]">Body logs</p>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:mt-3 sm:flex sm:flex-wrap sm:gap-3">
          {BODY_LOGS.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              className="dash-focus inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] px-1.5 py-2 text-center text-[11px] font-semibold leading-tight text-[var(--jrnl-ink)] shadow-[var(--jrnl-shadow)] transition-colors hover:border-[var(--jrnl-rose)] hover:text-[var(--jrnl-rose)] sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-2.5 sm:text-[13px]"
            >
              <Icon aria-hidden className="h-4 w-4" />
              {label}
              <ArrowRight aria-hidden className="hidden h-3.5 w-3.5 sm:block" />
            </Link>
          ))}
        </div>
      </section>
    </JournalShell>
  );
}

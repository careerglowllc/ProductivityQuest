import type { ComponentType } from "react";
import { Link } from "wouter";
import { ArrowRight, BookMarked, BookOpen, ClipboardList, Heart, HeartHandshake, Radar, Sparkles, Zap } from "lucide-react";
import { JournalShell, JournalHero } from "@/components/journal-ui";

type Destination = { title: string; description: string; path: string; icon: ComponentType<{ className?: string }>; tone: "sage" | "rose" };

const DESTINATIONS: Destination[] = [
  { title: "Journal Essays", description: "Long-form essays, reflections, and stories — the ideas worth writing all the way out.", path: "/journal/essays", icon: BookOpen, tone: "sage" },
  { title: "Daily GLEW", description: "Gratitudes, wins, exciteds, and lessons learned — one day at a time.", path: "/journal/daily-glew", icon: HeartHandshake, tone: "rose" },
  { title: "Gratitude Journal", description: "A running list of things you're grateful for.", path: "/journal/gratitude", icon: Heart, tone: "rose" },
  { title: "Excitement Journal", description: "A running list of things you're excited about.", path: "/journal/excitement", icon: Zap, tone: "sage" },
  { title: "Empowering Thoughts", description: "The thoughts and beliefs you're reinforcing right now.", path: "/journal/empowering-thoughts", icon: Sparkles, tone: "sage" },
  { title: "Weekly Deep Planning", description: "One deep-dive reflection and plan per week.", path: "/journal/weekly-planning", icon: ClipboardList, tone: "rose" },
  { title: "Reference Beliefs", description: "Principles and reference notes worth re-reading when you need them.", path: "/reference-beliefs", icon: BookMarked, tone: "sage" },
];

const TONES = {
  sage: "bg-[var(--jrnl-sage-soft)] text-[var(--jrnl-sage-deep)]",
  rose: "bg-[var(--jrnl-rose-soft)] text-[var(--jrnl-rose)]",
} as const;

const cardClass = "group dash-focus flex flex-col gap-3 rounded-xl border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-5 shadow-[var(--jrnl-shadow)] transition-all hover:-translate-y-0.5 hover:border-[var(--jrnl-rose)]";

function Open() {
  return (
    <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[11px] font-semibold text-[var(--jrnl-muted)] transition-colors group-hover:text-[var(--jrnl-rose)]">
      Open <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </span>
  );
}

export default function JournalHomePage() {
  return (
    <JournalShell>
      <JournalHero
        eyebrow="Your reflection hub"
        title="Journal,"
        emphasis="all in one place."
        copy="Choose a space to write in, look back on, or plan from."
      />

      <nav aria-label="Journal sections" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DESTINATIONS.map(({ title, description, path, icon: Icon, tone }) => (
          <Link key={path} href={path} className={cardClass}>
            <span className={`grid h-10 w-10 place-items-center rounded-full ${TONES[tone]}`}>
              <Icon aria-hidden className="h-5 w-5" />
            </span>
            <span className="jrnl-display text-[22px] leading-tight text-[var(--jrnl-ink)]">{title}</span>
            <span className="text-[13px] leading-relaxed text-[var(--jrnl-muted)]">{description}</span>
            <Open />
          </Link>
        ))}

        <Link href="/command-center" className={`${cardClass} border-[var(--jrnl-sage)] sm:col-span-2 lg:col-span-3 sm:flex-row sm:items-center sm:gap-5`}>
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${TONES.sage}`}>
            <Radar aria-hidden className="h-5 w-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--jrnl-sage-deep)]">Strategy</span>
            <span className="jrnl-display text-[22px] leading-tight text-[var(--jrnl-ink)]">Command Center</span>
            <span className="text-[13px] leading-relaxed text-[var(--jrnl-muted)]">Private strategy debriefs for your macro goals — finance, mental health, fitness, and relationships.</span>
          </span>
          <Open />
        </Link>
      </nav>
    </JournalShell>
  );
}

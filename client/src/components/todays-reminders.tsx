import { Link } from "wouter";
import { BellRing } from "lucide-react";
import { remindersForToday } from "@shared/quest-schedule";

type ReminderTask = { id: number; title: string; emoji?: string | null; questType?: string | null; completed?: boolean | null; recycled?: boolean | null; importance?: string | null; startDate?: string | Date | null; dueDate?: string | Date | null };

// A compact dashboard card listing today's open reminders; absent when there are none.
export function TodaysReminders({ tasks, className = "" }: { tasks: readonly ReminderTask[]; className?: string }) {
  const reminders = remindersForToday(tasks, new Date());
  if (reminders.length === 0) return null;
  return (
    <section
      aria-label="Today's reminders"
      data-testid="todays-reminders"
      className={`rounded-[10px] border border-[var(--dash-line)] bg-[var(--dash-surface)] px-3.5 py-3 ${className}`}
    >
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--dash-ink)]">
        <BellRing aria-hidden className="h-4 w-4 text-[var(--dash-violet)]" />
        Today's reminders
        <span className="dash-mono text-[11px] font-normal text-[var(--dash-muted)]">{reminders.length}</span>
      </h2>
      <ul className="flex max-h-28 flex-wrap gap-x-2 gap-y-1.5 overflow-y-auto">
        {reminders.map((task) => (
          <li key={task.id} className="max-w-full">
            <Link href={`/tasks?taskId=${task.id}`}>
              <a
                title={task.title}
                className="dash-focus inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--dash-line)] bg-[var(--dash-surface-2)] px-2.5 py-1.5 text-[12px] text-[var(--dash-ink)] transition-colors hover:border-[var(--dash-violet)]"
              >
                {task.emoji ? <span aria-hidden>{task.emoji}</span> : null}
                <span className="truncate">{task.title}</span>
              </a>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

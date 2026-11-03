import { useEffect, useState } from "react";
import { DashCard, DashCardHead } from "@/components/dash-ui";
import { WINDOW_AFTER_MINUTES, WINDOW_BEFORE_MINUTES, scheduleWindow, timeLabel, type ScheduleEvent } from "@/lib/dash-schedule";

// The phone version of Today's schedule: a few lines (30 minutes back to 3 hours ahead) instead of 24 hourly rows.
export function CompactSchedule({ events, now: fixedNow }: { events: ScheduleEvent[]; now?: Date }) {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (fixedNow) return;
    const timer = window.setInterval(() => setTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [fixedNow]);
  const now = fixedNow ?? new Date(tick);
  const { allDay, rows, nowIndex } = scheduleWindow(events, now);

  const nowLine = (
    <div key="now" data-testid="schedule-now" className="flex items-center gap-1.5 py-0.5">
      <span className="dash-mono w-[58px] shrink-0 text-right text-[10px] font-semibold text-[var(--dash-coral)]">{timeLabel(now)}</span>
      <span className="-ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--dash-coral)]" />
      <span className="h-px flex-1 bg-[var(--dash-coral)]" />
    </div>
  );
  const items = rows.map((row, index) => {
    const { event } = row;
    const colored = !!event.calendarColor;
    return (
      <div key={`${event.id}-${index}`} data-testid="schedule-row" data-state={row.state} className={`flex items-center gap-1.5 ${row.state === "past" ? "opacity-60" : ""}`}>
        <span className="dash-mono w-[58px] shrink-0 text-right text-[10px] text-[var(--dash-muted-2)]">{timeLabel(row.start)}</span>
        <div
          className={`min-w-0 flex-1 truncate rounded border px-2 py-1 text-[12px] font-medium leading-tight ${colored ? "text-white" : "border-purple-500 bg-purple-600/40"}`}
          style={colored ? { backgroundColor: event.calendarColor, borderColor: event.calendarColor } : undefined}
        >
          {event.title}
        </div>
      </div>
    );
  });
  const body = [...items.slice(0, nowIndex), nowLine, ...items.slice(nowIndex)];

  return (
    <DashCard className="flex flex-col overflow-hidden">
      <DashCardHead
        title="Today's schedule"
        subtitle={now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        href="/calendar"
        linkLabel="Full calendar"
        compact
      />
      <div className="space-y-1 p-2" data-testid="compact-schedule">
        {allDay.length > 0 && (
          <div className="flex flex-wrap gap-1 pb-0.5" data-testid="schedule-all-day">
            {allDay.map((event, index) => (
              <span
                key={`${event.id}-${index}`}
                className="max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight text-white"
                style={{ backgroundColor: event.calendarColor || "#7c3aed" }}
                title="All day"
              >
                {event.title}
              </span>
            ))}
          </div>
        )}
        {body}
        {rows.length === 0 && (
          <p className="px-1 pt-0.5 text-center text-[11px] text-[var(--dash-muted)]">
            Nothing from {WINDOW_BEFORE_MINUTES} minutes ago to the next {WINDOW_AFTER_MINUTES / 60} hours.
          </p>
        )}
      </div>
    </DashCard>
  );
}

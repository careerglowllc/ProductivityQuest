/**
 * Calendar Page — Apple Calendar-style UI
 *
 * Clean, touch-first calendar with Day / 3-Day / Week / Month views.
 * Syncs with Google Calendar and ProductivityQuest tasks.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, invalidateCalendarEvents } from "@/lib/queryClient";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  X,
  Clock,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Types ──────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  completed?: boolean;
  importance?: string;
  goldValue?: number;
  campaign?: string;
  skillTags?: string[];
  duration?: number;
  source?: string;
  calendarColor?: string;
  calendarName?: string;
  recurType?: string;
  googleEventId?: string;
}

type ViewMode = "day" | "3day" | "week" | "month";

// ─── Constants ──────────────────────────────────────────────────────────

const HOUR_HEIGHT = 60;
const TOTAL_HEIGHT = 24 * HOUR_HEIGHT;
const SNAP_MINUTES = 5;
const LONG_PRESS_MS = 400;
const MOVE_THRESHOLD = 8;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_NARROW = ["S", "M", "T", "W", "T", "F", "S"];

// ─── Helpers ────────────────────────────────────────────────────────────

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function formatHourCompact(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function minuteOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function snapMinutes(m: number): number {
  return Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
}

function eventColor(ev: CalendarEvent): string {
  if (ev.calendarColor) return ev.calendarColor;
  if (ev.completed) return "#6b7280";
  switch (ev.importance) {
    case "Pareto":
    case "High":
      return "#ef4444";
    case "Med-High":
      return "#f97316";
    case "Medium":
      return "#eab308";
    case "Med-Low":
      return "#3b82f6";
    case "Low":
      return "#22c55e";
    default:
      return "#a855f7";
  }
}

function isDraggable(ev: CalendarEvent): boolean {
  return ev.source === "productivityquest" || ev.source === "standalone";
}

function layoutEvents(events: CalendarEvent[]): Map<string, { col: number; total: number }> {
  const result = new Map<string, { col: number; total: number }>();
  if (!events.length) return result;

  const sorted = [...events].sort((a, b) => {
    const diff = new Date(a.start).getTime() - new Date(b.start).getTime();
    if (diff !== 0) return diff;
    return new Date(b.end).getTime() - new Date(a.end).getTime();
  });

  const columns: { end: number; id: string }[][] = [];

  for (const ev of sorted) {
    const start = minuteOfDay(new Date(ev.start));
    const end = minuteOfDay(new Date(ev.end));
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      const lastEnd = col[col.length - 1].end;
      if (start >= lastEnd) {
        col.push({ end, id: ev.id });
        result.set(ev.id, { col: c, total: 0 });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([{ end, id: ev.id }]);
      result.set(ev.id, { col: columns.length - 1, total: 0 });
    }
  }

  const totalCols = columns.length;
  result.forEach((layout) => {
    layout.total = totalCols;
  });
  return result;
}

function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter((ev) => sameDay(new Date(ev.start), date));
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function CalendarPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("calendarView");
    return (saved as ViewMode) || (isMobile ? "3day" : "week");
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("09:00");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDuration, setNewEventDuration] = useState("60");
  const [dragEvent, setDragEvent] = useState<CalendarEvent | null>(null);
  const [dragMinute, setDragMinute] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("calendarView", view);
  }, [view]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = useMemo(() => new Date(), []);

  // Data fetching
  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"] });

  const { data: calendarData, isLoading } = useQuery<{ events: CalendarEvent[]; stats?: any }>({
    queryKey: [`/api/google-calendar/events?year=${year}&month=${month}`],
    refetchOnWindowFocus: false,
  });

  const events = calendarData?.events || [];

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const { data: prevData } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: [`/api/google-calendar/events?year=${prevYear}&month=${prevMonth}`],
    enabled: view !== "month",
    refetchOnWindowFocus: false,
  });
  const { data: nextData } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: [`/api/google-calendar/events?year=${nextYear}&month=${nextMonth}`],
    enabled: view !== "month",
    refetchOnWindowFocus: false,
  });

  const allEvents = useMemo(() => {
    const merged = [...events];
    if (prevData?.events) merged.push(...prevData.events);
    if (nextData?.events) merged.push(...nextData.events);
    const seen = new Set<string>();
    return merged.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [events, prevData, nextData]);

  // Mutations
  const updateStandaloneEvent = useMutation({
    mutationFn: async ({ id, startTime, duration }: { id: string; startTime: string; duration?: number }) => {
      const numId = id.replace("standalone-", "");
      const body: Record<string, unknown> = { startTime };
      if (duration !== undefined) body.duration = duration;
      return apiRequest("PATCH", `/api/standalone-events/${numId}`, body);
    },
    onSuccess: () => invalidateCalendarEvents(queryClient),
  });

  const updateTaskSchedule = useMutation({
    mutationFn: async ({ id, scheduledTime }: { id: string; scheduledTime: string }) => {
      return apiRequest("PATCH", `/api/tasks/${id}`, { scheduledTime });
    },
    onSuccess: () => {
      invalidateCalendarEvents(queryClient);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const createStandaloneEvent = useMutation({
    mutationFn: async (data: { title: string; startTime: string; duration: number; color?: string }) => {
      return apiRequest("POST", "/api/standalone-events", data);
    },
    onSuccess: () => invalidateCalendarEvents(queryClient),
  });

  const deleteStandaloneEvent = useMutation({
    mutationFn: async (id: string) => {
      const numId = id.replace("standalone-", "");
      return apiRequest("DELETE", `/api/standalone-events/${numId}`);
    },
    onSuccess: () => invalidateCalendarEvents(queryClient),
  });

  // Navigation
  const navigate = useCallback((dir: -1 | 1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "day") d.setDate(d.getDate() + dir);
      else if (view === "3day") d.setDate(d.getDate() + 3 * dir);
      else if (view === "week") d.setDate(d.getDate() + 7 * dir);
      else { d.setMonth(d.getMonth() + dir); d.setDate(1); }
      return d;
    });
  }, [view]);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  // Auto-scroll to current time
  useEffect(() => {
    if (view === "month") return;
    const timer = setTimeout(() => {
      if (!scrollRef.current) return;
      const now = new Date();
      const top = now.getHours() * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT - 100;
      scrollRef.current.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [view, currentDate]);

  // Swipe navigation
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const onSwipeStart = useCallback((e: React.TouchEvent) => {
    if (dragEvent) return;
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY };
  }, [dragEvent]);

  const onSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current || dragEvent) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeRef.current.x;
    const dy = t.clientY - swipeRef.current.y;
    swipeRef.current = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      navigate(dx > 0 ? -1 : 1);
    }
  }, [navigate, dragEvent]);

  // Event move (drag)
  const moveEvent = useCallback((ev: CalendarEvent, newStartMinute: number) => {
    const snapped = snapMinutes(Math.max(0, Math.min(1440 - 15, newStartMinute)));
    const origStart = new Date(ev.start);
    const newStart = new Date(origStart);
    newStart.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);

    if (ev.source === "standalone") {
      updateStandaloneEvent.mutate({ id: ev.id, startTime: newStart.toISOString() });
    } else if (ev.source === "productivityquest") {
      updateTaskSchedule.mutate({ id: ev.id, scheduledTime: newStart.toISOString() });
    }
  }, [updateStandaloneEvent, updateTaskSchedule]);

  // Create new event
  const openNewEvent = useCallback((date?: Date, minute?: number) => {
    const d = date || currentDate;
    const m = minute !== undefined ? snapMinutes(minute) : 9 * 60;
    setNewEventDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
    setNewEventTime(
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
    );
    setNewEventTitle("");
    setNewEventDuration("60");
    setShowNewEventModal(true);
  }, [currentDate]);

  const handleCreateEvent = useCallback(() => {
    if (!newEventTitle.trim()) return;
    const [y, mo, d] = newEventDate.split("-").map(Number);
    const [h, mi] = newEventTime.split(":").map(Number);
    const start = new Date(y, mo - 1, d, h, mi);
    createStandaloneEvent.mutate(
      { title: newEventTitle.trim(), startTime: start.toISOString(), duration: parseInt(newEventDuration) || 60, color: "#a855f7" },
      { onSuccess: () => { setShowNewEventModal(false); toast({ title: "Event created" }); } }
    );
  }, [newEventTitle, newEventDate, newEventTime, newEventDuration, createStandaloneEvent, toast]);

  // Delete event
  const handleDeleteEvent = useCallback((ev: CalendarEvent) => {
    if (ev.source === "standalone") {
      deleteStandaloneEvent.mutate(ev.id, {
        onSuccess: () => { setSelectedEvent(null); toast({ title: "Event deleted" }); },
      });
    } else if (ev.source === "productivityquest") {
      apiRequest("POST", `/api/tasks/${ev.id}/unschedule`, { removeFromGoogleCalendar: true }).then(() => {
        invalidateCalendarEvents(queryClient);
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        setSelectedEvent(null);
        toast({ title: "Removed from calendar" });
      });
    }
  }, [deleteStandaloneEvent, queryClient, toast]);

  // View dates
  const viewDates = useMemo((): Date[] => {
    if (view === "day") return [new Date(currentDate)];
    if (view === "3day") {
      return [0, 1, 2].map((i) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + i);
        return d;
      });
    }
    if (view === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
      });
    }
    return [];
  }, [view, currentDate]);

  // Title string
  const titleStr = useMemo(() => {
    if (view === "month") return `${MONTH_NAMES[month]} ${year}`;
    if (view === "day") {
      return currentDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
    if (viewDates.length > 1) {
      const first = viewDates[0];
      const last = viewDates[viewDates.length - 1];
      if (first.getMonth() === last.getMonth()) {
        return `${MONTH_NAMES[first.getMonth()].slice(0, 3)} ${first.getDate()}\u2013${last.getDate()}, ${first.getFullYear()}`;
      }
      return `${MONTH_NAMES[first.getMonth()].slice(0, 3)} ${first.getDate()} \u2013 ${MONTH_NAMES[last.getMonth()].slice(0, 3)} ${last.getDate()}`;
    }
    return `${MONTH_NAMES[month]} ${year}`;
  }, [view, currentDate, viewDates, month, year]);

  const isViewingToday = sameDay(currentDate, today) || (view === "month" && month === today.getMonth() && year === today.getFullYear());

  return (
    <div
      className={`bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 ${
        isMobile ? "fixed inset-0 overflow-hidden" : "min-h-screen pt-24 pb-8 px-8"
      }`}
      style={isMobile ? { top: "env(safe-area-inset-top, 0px)", bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" } : undefined}
    >
      <div className={isMobile ? "h-full flex flex-col" : "max-w-7xl mx-auto"}>
        <div className={isMobile ? "flex-1 flex flex-col min-h-0" : "bg-gray-900/60 border border-purple-500/20 rounded-xl p-4"}>
          {/* Top bar */}
          <div className={`flex items-center justify-between ${isMobile ? "px-2 pt-1.5 pb-1" : "mb-4"} flex-shrink-0`}>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-7 w-7 p-0 text-purple-300 hover:bg-purple-500/10">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className={`font-bold ${isMobile ? "text-sm" : "text-lg"} text-white min-w-0`}>{titleStr}</span>
              <Button variant="ghost" size="sm" onClick={() => navigate(1)} className="h-7 w-7 p-0 text-purple-300 hover:bg-purple-500/10">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              {!isViewingToday && (
                <Button size="sm" onClick={goToToday} className={`${isMobile ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm"} bg-purple-600 hover:bg-purple-500`}>Today</Button>
              )}
              {!isMobile && (
                <Link href="/settings/google-calendar">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-purple-300"><Settings className="w-4 h-4" /></Button>
                </Link>
              )}
              <Button size="sm" onClick={() => openNewEvent()} className={`${isMobile ? "h-7 w-7 p-0" : "h-8 px-3"} bg-purple-600 hover:bg-purple-500`}>
                <Plus className={isMobile ? "w-4 h-4" : "w-4 h-4 mr-1"} />
                {!isMobile && "New Event"}
              </Button>
              {isMobile && (
                <Link href="/settings/google-calendar">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-purple-300"><Settings className="w-3.5 h-3.5" /></Button>
                </Link>
              )}
            </div>
          </div>

          {/* View switcher */}
          <div className={`flex gap-0 bg-gray-800/60 ${isMobile ? "mx-2 p-0.5 rounded-md mb-1" : "p-1 rounded-lg mb-4 max-w-md"} border border-purple-500/20 flex-shrink-0`}>
            {(["day", "3day", "week", "month"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`flex-1 ${isMobile ? "py-0.5 text-[11px]" : "py-1.5 text-sm"} rounded font-medium transition-colors ${view === v ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700/50"}`}>
                {v === "3day" ? "3 Day" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
            </div>
          )}

          {/* Calendar content */}
          {!isLoading && view === "month" && (
            <MonthView year={year} month={month} allEvents={allEvents} today={today} isMobile={isMobile} onSwipeStart={onSwipeStart} onSwipeEnd={onSwipeEnd} onDayClick={(date) => { setCurrentDate(date); setView("day"); }} onEventClick={setSelectedEvent} />
          )}
          {!isLoading && view !== "month" && (
            <TimeGridView
              dates={viewDates}
              allEvents={allEvents}
              today={today}
              isMobile={isMobile}
              scrollRef={scrollRef}
              dragEvent={dragEvent}
              dragMinute={dragMinute}
              onSwipeStart={onSwipeStart}
              onSwipeEnd={onSwipeEnd}
              onEventTap={setSelectedEvent}
              onDragStart={(ev) => setDragEvent(ev)}
              onDragMove={(min) => setDragMinute(min)}
              onDragEnd={(ev, min) => { moveEvent(ev, min); setDragEvent(null); setDragMinute(null); }}
              onDragCancel={() => { setDragEvent(null); setDragMinute(null); }}
              onEmptyTap={(date, minute) => openNewEvent(date, minute)}
            />
          )}
        </div>

        {!isMobile && (
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500/60" />
              <span>Google Calendar synced</span>
            </div>
            {settings?.googleCalendarLastSync && (
              <span>Last sync: {new Date(settings.googleCalendarLastSync).toLocaleString()}</span>
            )}
          </div>
        )}
      </div>

      {selectedEvent && (
        <EventDetailSheet event={selectedEvent} isMobile={isMobile} onClose={() => setSelectedEvent(null)} onDelete={() => handleDeleteEvent(selectedEvent)} />
      )}

      {showNewEventModal && (
        <NewEventModal
          date={newEventDate}
          time={newEventTime}
          title={newEventTitle}
          duration={newEventDuration}
          onDateChange={setNewEventDate}
          onTimeChange={setNewEventTime}
          onTitleChange={setNewEventTitle}
          onDurationChange={setNewEventDuration}
          onCreate={handleCreateEvent}
          onClose={() => setShowNewEventModal(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  TimeGridView — Day / 3-Day / Week
// ═══════════════════════════════════════════════════════════════════════

interface TimeGridViewProps {
  dates: Date[];
  allEvents: CalendarEvent[];
  today: Date;
  isMobile: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  dragEvent: CalendarEvent | null;
  dragMinute: number | null;
  onSwipeStart: (e: React.TouchEvent) => void;
  onSwipeEnd: (e: React.TouchEvent) => void;
  onEventTap: (ev: CalendarEvent) => void;
  onDragStart: (ev: CalendarEvent) => void;
  onDragMove: (minute: number) => void;
  onDragEnd: (ev: CalendarEvent, minute: number) => void;
  onDragCancel: () => void;
  onEmptyTap: (date: Date, minute: number) => void;
}

function TimeGridView({ dates, allEvents, today, isMobile, scrollRef, dragEvent, dragMinute, onSwipeStart, onSwipeEnd, onEventTap, onDragStart, onDragMove, onDragEnd, onDragCancel, onEmptyTap }: TimeGridViewProps) {
  const numCols = dates.length;
  const timeLabelWidth = isMobile ? (numCols > 3 ? 28 : 36) : 56;

  return (
    <div ref={scrollRef as React.RefObject<HTMLDivElement>} className="flex-1 min-h-0 overflow-auto relative" onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}>
      {/* Sticky day headers */}
      <div className="sticky top-0 z-20 flex bg-gray-900/95 backdrop-blur-sm border-b border-purple-500/20">
        <div style={{ width: timeLabelWidth, flexShrink: 0 }} />
        {dates.map((date, i) => {
          const isToday = sameDay(date, today);
          return (
            <div key={i} className={`flex-1 text-center py-1 border-l border-purple-500/10 ${isToday ? "border-b-2 border-b-purple-400" : ""}`}>
              <div className={`text-[10px] font-semibold ${isToday ? "text-purple-400" : "text-gray-400"}`}>
                {isMobile && numCols > 3 ? DAY_NAMES_NARROW[date.getDay()] : DAY_NAMES_SHORT[date.getDay()]}
              </div>
              <div className={`text-sm font-bold ${isToday ? "text-purple-300" : "text-white"}`}>{date.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Time grid body */}
      <div className="flex relative" style={{ height: TOTAL_HEIGHT }}>
        <div style={{ width: timeLabelWidth, flexShrink: 0 }} className="relative">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="absolute right-1 text-gray-500" style={{ top: h * HOUR_HEIGHT - 6, fontSize: isMobile ? (numCols > 3 ? 8 : 9) : 11 }}>
              {isMobile ? formatHourCompact(h) : formatHour(h)}
            </div>
          ))}
        </div>

        {dates.map((date, colIdx) => (
          <DayColumn
            key={`${date.toISOString()}-${colIdx}`}
            date={date}
            events={getEventsForDate(allEvents, date)}
            isToday={sameDay(date, today)}
            isMobile={isMobile}
            numCols={numCols}
            dragEvent={dragEvent}
            dragMinute={dragMinute}
            onEventTap={onEventTap}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
            onEmptyTap={(minute) => onEmptyTap(date, minute)}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MonthView
// ═══════════════════════════════════════════════════════════════════════

interface MonthViewProps {
  year: number;
  month: number;
  allEvents: CalendarEvent[];
  today: Date;
  isMobile: boolean;
  onSwipeStart: (e: React.TouchEvent) => void;
  onSwipeEnd: (e: React.TouchEvent) => void;
  onDayClick: (date: Date) => void;
  onEventClick: (ev: CalendarEvent) => void;
}

function MonthView({ year, month, allEvents, today, isMobile, onSwipeStart, onSwipeEnd, onDayClick, onEventClick }: MonthViewProps) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const weeks = Math.ceil((startDow + totalDays) / 7);

  return (
    <div className="flex-1 min-h-0 overflow-auto flex flex-col" onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}>
      <div className="grid grid-cols-7 border-b border-purple-500/20 flex-shrink-0">
        {DAY_NAMES_SHORT.map((d) => (
          <div key={d} className="text-center py-1 text-[10px] font-semibold text-gray-400">{isMobile ? d[0] : d}</div>
        ))}
      </div>

      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks}, 1fr)` }}>
        {Array.from({ length: weeks }, (_, w) => (
          <div key={w} className="grid grid-cols-7 border-b border-purple-500/10">
            {Array.from({ length: 7 }, (__, dow) => {
              const dayNum = w * 7 + dow - startDow + 1;
              const isValid = dayNum >= 1 && dayNum <= totalDays;
              const date = isValid ? new Date(year, month, dayNum) : null;
              const isToday = date ? sameDay(date, today) : false;
              const dayEvents = date ? getEventsForDate(allEvents, date) : [];
              const maxShow = isMobile ? 2 : 4;

              return (
                <div key={dow} className={`min-h-0 p-0.5 border-r border-purple-500/5 overflow-hidden ${isValid ? "cursor-pointer" : "bg-gray-900/30"}`} onClick={() => date && onDayClick(date)}>
                  {isValid && (
                    <>
                      <div className={`text-xs font-semibold text-center mb-0.5 ${isToday ? "bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto text-[10px]" : "text-gray-300"}`}>{dayNum}</div>
                      <div className="space-y-px">
                        {dayEvents.slice(0, maxShow).map((ev) => (
                          <div key={ev.id} className="truncate rounded-sm px-0.5 text-[9px] leading-tight text-white" style={{ backgroundColor: eventColor(ev) + "80" }} onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}>{ev.title}</div>
                        ))}
                        {dayEvents.length > maxShow && (
                          <div className="text-[8px] text-gray-400 text-center">+{dayEvents.length - maxShow} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  DayColumn — single day column with events + touch drag
// ═══════════════════════════════════════════════════════════════════════

interface DayColumnProps {
  date: Date;
  events: CalendarEvent[];
  isToday: boolean;
  isMobile: boolean;
  numCols: number;
  dragEvent: CalendarEvent | null;
  dragMinute: number | null;
  onEventTap: (ev: CalendarEvent) => void;
  onDragStart: (ev: CalendarEvent) => void;
  onDragMove: (minute: number) => void;
  onDragEnd: (ev: CalendarEvent, minute: number) => void;
  onDragCancel: () => void;
  onEmptyTap: (minute: number) => void;
}

const DayColumn = React.memo(function DayColumn({
  date, events, isToday, isMobile, numCols, dragEvent, dragMinute,
  onEventTap, onDragStart, onDragMove, onDragEnd, onDragCancel, onEmptyTap,
}: DayColumnProps) {
  const colRef = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => layoutEvents(events), [events]);

  const touchState = useRef<{
    ev: CalendarEvent;
    startY: number;
    startMinute: number;
    timer: ReturnType<typeof setTimeout> | null;
    active: boolean;
    moved: boolean;
  } | null>(null);

  const getMinuteFromY = useCallback((clientY: number): number => {
    if (!colRef.current) return 0;
    const rect = colRef.current.getBoundingClientRect();
    const scrollContainer = colRef.current.closest("[class*='overflow-auto']");
    const scrollTop = scrollContainer?.scrollTop || 0;
    const y = clientY - rect.top + scrollTop;
    return Math.max(0, Math.min(1439, (y / TOTAL_HEIGHT) * 1440));
  }, []);

  const handleEventTouchStart = useCallback((ev: CalendarEvent, e: React.TouchEvent) => {
    if (!isDraggable(ev)) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const startMinute = minuteOfDay(new Date(ev.start));

    const state = {
      ev,
      startY: touch.clientY,
      startMinute,
      timer: null as ReturnType<typeof setTimeout> | null,
      active: false,
      moved: false,
    };

    state.timer = setTimeout(() => {
      state.active = true;
      onDragStart(ev);
      onDragMove(startMinute);
      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);

    touchState.current = state;
  }, [onDragStart, onDragMove]);

  useEffect(() => {
    const col = colRef.current;
    if (!col) return;

    const handleTouchMove = (e: TouchEvent) => {
      const ts = touchState.current;
      if (!ts) return;
      const touch = e.touches[0];
      const dy = Math.abs(touch.clientY - ts.startY);

      if (!ts.active) {
        if (dy > MOVE_THRESHOLD) {
          if (ts.timer) clearTimeout(ts.timer);
          touchState.current = null;
          return;
        }
        e.preventDefault();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      ts.moved = true;
      const minute = getMinuteFromY(touch.clientY);
      const delta = minute - ts.startMinute;
      const origStart = minuteOfDay(new Date(ts.ev.start));
      onDragMove(snapMinutes(origStart + delta));
    };

    const handleTouchEnd = () => {
      const ts = touchState.current;
      if (!ts) return;
      if (ts.timer) clearTimeout(ts.timer);
      if (ts.active && ts.moved && dragMinute !== null) {
        onDragEnd(ts.ev, dragMinute);
      } else if (ts.active) {
        onDragCancel();
      }
      touchState.current = null;
    };

    const handleTouchCancel = () => {
      const ts = touchState.current;
      if (ts?.timer) clearTimeout(ts.timer);
      if (ts?.active) onDragCancel();
      touchState.current = null;
    };

    col.addEventListener("touchmove", handleTouchMove, { passive: false });
    col.addEventListener("touchend", handleTouchEnd, { passive: true });
    col.addEventListener("touchcancel", handleTouchCancel, { passive: true });
    return () => {
      col.removeEventListener("touchmove", handleTouchMove);
      col.removeEventListener("touchend", handleTouchEnd);
      col.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [getMinuteFromY, onDragMove, onDragEnd, onDragCancel, dragMinute]);

  // Double-tap to create on empty space
  const lastTap = useRef<number>(0);
  const handleEmptyClick = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 350) {
      const minute = getMinuteFromY(e.clientY);
      onEmptyTap(minute);
    }
    lastTap.current = now;
  }, [getMinuteFromY, onEmptyTap]);

  const now = new Date();
  const showNow = isToday;
  const nowMinute = now.getHours() * 60 + now.getMinutes();

  return (
    <div ref={colRef} className="flex-1 relative border-l border-purple-500/10" style={{ height: TOTAL_HEIGHT }} onClick={handleEmptyClick}>
      {/* Hour grid lines */}
      {Array.from({ length: 24 }, (_, h) => (
        <div key={h} className="absolute left-0 right-0 border-b border-purple-500/[0.08]" style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
      ))}

      {/* Current time indicator */}
      {showNow && (
        <div className="absolute left-0 right-0 z-10 flex items-center pointer-events-none" style={{ top: (nowMinute / 1440) * TOTAL_HEIGHT }}>
          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-lg shadow-red-500/50" />
          <div className="flex-1 h-0.5 bg-red-500 shadow-sm shadow-red-500/50" />
        </div>
      )}

      {/* Events */}
      {events.map((ev) => {
        const l = layout.get(ev.id) || { col: 0, total: 1 };
        const start = new Date(ev.start);
        const end = new Date(ev.end);
        const isBeingDragged = dragEvent?.id === ev.id && dragMinute !== null;

        const topMin = isBeingDragged ? dragMinute! : minuteOfDay(start);
        const durMin = (end.getTime() - start.getTime()) / 60000;
        const top = (topMin / 1440) * TOTAL_HEIGHT;
        const height = Math.max(15, (durMin / 1440) * TOTAL_HEIGHT);
        const colW = 100 / l.total;
        const left = `${l.col * colW}%`;
        const width = `calc(${colW}% - 2px)`;
        const color = eventColor(ev);

        return (
          <div
            key={ev.id}
            data-event-id={ev.id}
            className={`absolute rounded-md border-l-[3px] overflow-hidden cursor-pointer select-none transition-shadow ${isBeingDragged ? "z-30 shadow-xl shadow-purple-500/30 opacity-90 scale-[1.02]" : "z-10 hover:brightness-110"} ${ev.completed ? "opacity-50" : ""}`}
            style={{ top, height, left, width, borderLeftColor: color, backgroundColor: color + "25", touchAction: isDraggable(ev) && isMobile ? "none" : undefined }}
            onClick={(e) => { e.stopPropagation(); if (!touchState.current?.active) onEventTap(ev); }}
            onTouchStart={(e) => handleEventTouchStart(ev, e)}
            onMouseDown={(e) => {
              if (!isDraggable(ev) || isMobile) return;
              e.preventDefault();
              const startMinute = minuteOfDay(start);
              onDragStart(ev);
              onDragMove(startMinute);
              const handleMouseMove = (me: MouseEvent) => {
                const minute = getMinuteFromY(me.clientY);
                const delta = minute - startMinute;
                onDragMove(snapMinutes(minuteOfDay(start) + delta));
              };
              const handleMouseUp = () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
                setTimeout(() => onDragCancel(), 0);
              };
              window.addEventListener("mousemove", handleMouseMove);
              window.addEventListener("mouseup", handleMouseUp);
            }}
          >
            <div className="px-1.5 py-0.5 h-full flex flex-col justify-start">
              <div className="flex items-center gap-1 min-w-0">
                {ev.completed && <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />}
                <span className={`text-[10px] font-semibold truncate ${ev.completed ? "line-through text-gray-400" : "text-white"}`}>{ev.title}</span>
              </div>
              {height > 30 && (
                <span className="text-[9px] text-white/60 truncate">
                  {formatTime(start)}{height > 45 && ` \u2013 ${formatTime(end)}`}
                </span>
              )}
              {height > 55 && ev.source === "google" && ev.calendarName && (
                <span className="text-[8px] text-white/40 truncate">{ev.calendarName}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
//  EventDetailSheet
// ═══════════════════════════════════════════════════════════════════════

function EventDetailSheet({ event, isMobile, onClose, onDelete }: { event: CalendarEvent; isMobile: boolean; onClose: () => void; onDelete: () => void }) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const color = eventColor(event);
  const canModify = isDraggable(event);
  const sourceLabel = event.source === "google"
    ? `Google Calendar${event.calendarName ? ` \u00b7 ${event.calendarName}` : ""}`
    : event.source === "productivityquest" ? "Quest" : "Calendar Event";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className={`bg-gray-900 border-t sm:border border-purple-500/30 ${isMobile ? "w-full rounded-t-2xl max-h-[70vh]" : "rounded-xl max-w-md w-full"} overflow-auto`} onClick={(e) => e.stopPropagation()}>
        {isMobile && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-600" />
          </div>
        )}
        <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: color }} />
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold text-white leading-tight">{event.title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1 -mt-1"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>
              {start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              {" \u00b7 "}
              {formatTime(start)} \u2013 {formatTime(end)}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-300">{sourceLabel}</Badge>
            {event.importance && event.source === "productivityquest" && (
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: color + "60", color }}>{event.importance}</Badge>
            )}
            {event.completed && (
              <Badge className="text-[10px] bg-green-600/20 text-green-300 border-green-600/30">Completed</Badge>
            )}
          </div>

          {event.description && <p className="text-sm text-gray-400 whitespace-pre-wrap">{event.description}</p>}

          {event.skillTags && event.skillTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.skillTags.map((s) => (
                <Badge key={s} variant="outline" className="text-[10px] text-yellow-300 border-yellow-600/30">{s}</Badge>
              ))}
            </div>
          )}

          {event.goldValue && event.goldValue > 0 && <div className="text-sm text-yellow-400">{"\ud83e\ude99"} {event.goldValue} gold</div>}
          {event.campaign && <div className="text-sm text-purple-300">{"\ud83d\udccb"} {event.campaign}</div>}

          {canModify && (
            <div className="pt-2 border-t border-gray-800">
              <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                {event.source === "productivityquest" ? "Remove from Calendar" : "Delete Event"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  NewEventModal
// ═══════════════════════════════════════════════════════════════════════

function NewEventModal({ date, time, title, duration, onDateChange, onTimeChange, onTitleChange, onDurationChange, onCreate, onClose }: {
  date: string; time: string; title: string; duration: string;
  onDateChange: (v: string) => void; onTimeChange: (v: string) => void;
  onTitleChange: (v: string) => void; onDurationChange: (v: string) => void;
  onCreate: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-5 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white">New Event</h3>
        <input
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          placeholder="Event title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && onCreate()}
        />
        <div className="flex gap-2">
          <input type="date" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" value={date} onChange={(e) => onDateChange(e.target.value)} />
          <input type="time" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" value={time} onChange={(e) => onTimeChange(e.target.value)} />
        </div>
        <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" value={duration} onChange={(e) => onDurationChange(e.target.value)}>
          <option value="15">15 min</option>
          <option value="30">30 min</option>
          <option value="60">1 hour</option>
          <option value="90">1.5 hours</option>
          <option value="120">2 hours</option>
          <option value="180">3 hours</option>
        </select>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 text-gray-400">Cancel</Button>
          <Button onClick={onCreate} className="flex-1 bg-purple-600 hover:bg-purple-500" disabled={!title.trim()}>Create</Button>
        </div>
      </div>
    </div>
  );
}

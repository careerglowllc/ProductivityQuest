/**
 * Calendar Page — Apple Calendar-style UI
 *
 * Features:
 *   • Day / 3-Day / Week / Month views
 *   • Long-press → drag to reposition events (changes scheduled time)
 *   • Edge-drag on top/bottom borders → resize event duration
 *   • Tap → event detail sheet
 *   • Double-tap empty space → create new event
 *   • Swipe → navigate dates
 *   • Google Calendar + PQ task + standalone event sync
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, invalidateCalendarEvents } from "@/lib/queryClient";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  X,
  Clock,
  Trash2,
  CheckCircle2,
  Eye,
  SlidersHorizontal,
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

/** What kind of interaction is active */
type DragMode = "move" | "resize-top" | "resize-bottom";

interface DragState {
  event: CalendarEvent;
  mode: DragMode;
  /** For move: current start minute. For resize-top: new start minute. For resize-bottom: new end minute. */
  minute: number;
  /** Original start minute of the event */
  origStartMin: number;
  /** Original end minute of the event */
  origEndMin: number;
}

// ─── Constants ──────────────────────────────────────────────────────────

const HOUR_HEIGHT = 60;
const TOTAL_HEIGHT = 24 * HOUR_HEIGHT;
const SNAP_MINUTES = 5;
const MIN_DURATION = 15; // minimum event length in minutes
const MOVE_THRESHOLD = 8;
const EDGE_ZONE = 10; // px from top/bottom edge that triggers resize

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_NARROW = ["S", "M", "T", "W", "T", "F", "S"];

// ─── Helpers ────────────────────────────────────────────────────────────

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatTimeShort(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/ /g, "").toLowerCase();
}

function minuteOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function snap(m: number): number {
  return Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function eventColor(ev: CalendarEvent): string {
  if (ev.calendarColor) return ev.calendarColor;
  if (ev.completed) return "#6b7280";
  switch (ev.importance) {
    case "Pareto": case "High": return "#ef4444";
    case "Med-High": return "#f97316";
    case "Medium": return "#eab308";
    case "Med-Low": return "#3b82f6";
    case "Low": return "#22c55e";
    default: return "#a855f7";
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
      if (start >= col[col.length - 1].end) {
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
  result.forEach((layout) => { layout.total = totalCols; });
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

  // Unified drag state: covers move + resize-top + resize-bottom
  const [drag, setDrag] = useState<DragState | null>(null);

  // Mobile action bubble: which event was tapped (shows View + Adjust)
  const [tappedEvent, setTappedEvent] = useState<CalendarEvent | null>(null);
  const [tapPosition, setTapPosition] = useState<{ x: number; y: number } | null>(null);

  // Resize mode: which event is currently in "adjust" mode (shows big edge handles)
  const [resizeEventId, setResizeEventId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Imperatively set touch-action on scroll container when in resize mode
  // (CSS via React state may not be applied before browser processes the touch)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (resizeEventId) {
      el.style.touchAction = "none";
      el.style.overflowY = "hidden";
    } else {
      el.style.touchAction = "";
      el.style.overflowY = "";
    }
  }, [resizeEventId]);

  useEffect(() => { localStorage.setItem("calendarView", view); }, [view]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = useMemo(() => new Date(), []);

  // ── Data fetching ──
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
    enabled: view !== "month", refetchOnWindowFocus: false,
  });
  const { data: nextData } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: [`/api/google-calendar/events?year=${nextYear}&month=${nextMonth}`],
    enabled: view !== "month", refetchOnWindowFocus: false,
  });

  const allEvents = useMemo(() => {
    const merged = [...events];
    if (prevData?.events) merged.push(...prevData.events);
    if (nextData?.events) merged.push(...nextData.events);
    const seen = new Set<string>();
    return merged.filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
  }, [events, prevData, nextData]);

  // ── Mutations ──
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
    mutationFn: async ({ id, scheduledTime, duration }: { id: string; scheduledTime: string; duration?: number }) => {
      const body: Record<string, unknown> = { scheduledTime };
      if (duration !== undefined) body.duration = duration;
      return apiRequest("PATCH", `/api/tasks/${id}`, body);
    },
    onSuccess: () => {
      invalidateCalendarEvents(queryClient);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const createStandaloneEvent = useMutation({
    mutationFn: async (data: { title: string; startTime: string; duration: number; color?: string }) =>
      apiRequest("POST", "/api/standalone-events", data),
    onSuccess: () => invalidateCalendarEvents(queryClient),
  });

  const deleteStandaloneEvent = useMutation({
    mutationFn: async (id: string) => {
      const numId = id.replace("standalone-", "");
      return apiRequest("DELETE", `/api/standalone-events/${numId}`);
    },
    onSuccess: () => invalidateCalendarEvents(queryClient),
  });

  // ── Navigation ──
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

  // Auto-scroll to current time when calendar loads or view changes
  useEffect(() => {
    if (view === "month" || isLoading) return;
    // Use a short delay to ensure the scroll container is laid out after render
    const timer = setTimeout(() => {
      if (!scrollRef.current) return;
      const now = new Date();
      const top = now.getHours() * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT - 100;
      scrollRef.current.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 150);
    return () => clearTimeout(timer);
  }, [view, currentDate, isLoading]);

  // ── Swipe navigation ──
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const onSwipeStart = useCallback((e: React.TouchEvent) => {
    if (drag) return;
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, [drag]);
  const onSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current || drag) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeRef.current.x;
    const dy = t.clientY - swipeRef.current.y;
    swipeRef.current = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) navigate(dx > 0 ? -1 : 1);
  }, [navigate, drag]);

  // ── Commit drag/resize result to API ──
  // Helper: format minutes as readable duration
  const fmtDur = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  // Helper: revert an event to its original time/duration
  const revertEvent = useCallback((ev: CalendarEvent, origStartISO: string, origDuration: number) => {
    if (ev.source === "standalone") {
      updateStandaloneEvent.mutate({ id: ev.id, startTime: origStartISO, duration: origDuration });
    } else if (ev.source === "productivityquest") {
      updateTaskSchedule.mutate({ id: ev.id, scheduledTime: origStartISO, duration: origDuration });
    }
  }, [updateStandaloneEvent, updateTaskSchedule]);

  const commitDrag = useCallback((ds: DragState) => {
    const ev = ds.event;
    const origStart = new Date(ev.start);
    const origEnd = new Date(ev.end);
    const origDuration = Math.round((origEnd.getTime() - origStart.getTime()) / 60000);
    const origStartISO = origStart.toISOString();

    if (ds.mode === "move") {
      const newStart = new Date(origStart);
      const snapped = snap(clamp(ds.minute, 0, 1440 - MIN_DURATION));
      newStart.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
      if (ev.source === "standalone") {
        updateStandaloneEvent.mutate({ id: ev.id, startTime: newStart.toISOString() });
      } else if (ev.source === "productivityquest") {
        updateTaskSchedule.mutate({ id: ev.id, scheduledTime: newStart.toISOString() });
      }
      toast({
        title: "Event moved",
        description: `${formatTimeShort(origStart)} → ${formatTimeShort(newStart)}`,
        action: <ToastAction altText="Undo" onClick={() => revertEvent(ev, origStartISO, origDuration)}>Undo</ToastAction>,
      });
    } else if (ds.mode === "resize-top") {
      const newStartMin = snap(clamp(ds.minute, 0, ds.origEndMin - MIN_DURATION));
      const newDuration = ds.origEndMin - newStartMin;
      const newStart = new Date(origStart);
      newStart.setHours(Math.floor(newStartMin / 60), newStartMin % 60, 0, 0);
      if (ev.source === "standalone") {
        updateStandaloneEvent.mutate({ id: ev.id, startTime: newStart.toISOString(), duration: newDuration });
      } else if (ev.source === "productivityquest") {
        updateTaskSchedule.mutate({ id: ev.id, scheduledTime: newStart.toISOString(), duration: newDuration });
      }
      toast({
        title: "Duration changed",
        description: `${fmtDur(origDuration)} → ${fmtDur(newDuration)}`,
        action: <ToastAction altText="Undo" onClick={() => revertEvent(ev, origStartISO, origDuration)}>Undo</ToastAction>,
      });
    } else if (ds.mode === "resize-bottom") {
      const newEndMin = snap(clamp(ds.minute, ds.origStartMin + MIN_DURATION, 1440));
      const newDuration = newEndMin - ds.origStartMin;
      if (ev.source === "standalone") {
        updateStandaloneEvent.mutate({ id: ev.id, startTime: origStart.toISOString(), duration: newDuration });
      } else if (ev.source === "productivityquest") {
        updateTaskSchedule.mutate({ id: ev.id, scheduledTime: origStart.toISOString(), duration: newDuration });
      }
      toast({
        title: "Duration changed",
        description: `${fmtDur(origDuration)} → ${fmtDur(newDuration)}`,
        action: <ToastAction altText="Undo" onClick={() => revertEvent(ev, origStartISO, origDuration)}>Undo</ToastAction>,
      });
    }
  }, [updateStandaloneEvent, updateTaskSchedule, toast, revertEvent]);

  // ── Create new event ──
  const openNewEvent = useCallback((date?: Date, minute?: number) => {
    const d = date || currentDate;
    const m = minute !== undefined ? snap(minute) : 9 * 60;
    setNewEventDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setNewEventTime(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
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

  // ── Delete event ──
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

  // ── View dates ──
  const viewDates = useMemo((): Date[] => {
    if (view === "day") return [new Date(currentDate)];
    if (view === "3day") return [0, 1, 2].map((i) => { const d = new Date(currentDate); d.setDate(d.getDate() + i); return d; });
    if (view === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    }
    return [];
  }, [view, currentDate]);

  // ── Title ──
  const titleStr = useMemo(() => {
    if (view === "month") return `${MONTH_NAMES[month]} ${year}`;
    if (view === "day") return currentDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (viewDates.length > 1) {
      const first = viewDates[0], last = viewDates[viewDates.length - 1];
      if (first.getMonth() === last.getMonth())
        return `${MONTH_NAMES[first.getMonth()].slice(0, 3)} ${first.getDate()}\u2013${last.getDate()}, ${first.getFullYear()}`;
      return `${MONTH_NAMES[first.getMonth()].slice(0, 3)} ${first.getDate()} \u2013 ${MONTH_NAMES[last.getMonth()].slice(0, 3)} ${last.getDate()}`;
    }
    return `${MONTH_NAMES[month]} ${year}`;
  }, [view, currentDate, viewDates, month, year]);

  const isViewingToday = sameDay(currentDate, today) || (view === "month" && month === today.getMonth() && year === today.getFullYear());

  // ═════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════

  return (
    <div
      className={`bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 ${isMobile ? "fixed inset-0 overflow-hidden" : "min-h-screen pt-24 pb-8 px-8"}`}
      style={isMobile ? { top: "env(safe-area-inset-top, 0px)", bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" } : undefined}
    >
      <div className={isMobile ? "h-full flex flex-col" : "max-w-7xl mx-auto"}>
        <div className={isMobile ? "flex-1 flex flex-col min-h-0" : "bg-gray-900/60 border border-purple-500/20 rounded-xl p-4"}>
          {/* Top bar */}
          <div className={`flex items-center justify-between ${isMobile ? "px-2 pt-1.5 pb-1" : "mb-4"} flex-shrink-0`}>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-7 w-7 p-0 text-purple-300 hover:bg-purple-500/10"><ChevronLeft className="w-4 h-4" /></Button>
              <span className={`font-bold ${isMobile ? "text-sm" : "text-lg"} text-white min-w-0`}>{titleStr}</span>
              <Button variant="ghost" size="sm" onClick={() => navigate(1)} className="h-7 w-7 p-0 text-purple-300 hover:bg-purple-500/10"><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <div className="flex items-center gap-1">
              {!isViewingToday && <Button size="sm" onClick={goToToday} className={`${isMobile ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm"} bg-purple-600 hover:bg-purple-500`}>Today</Button>}
              {!isMobile && <Link href="/settings/google-calendar"><Button variant="ghost" size="sm" className="h-8 px-2 text-purple-300"><Settings className="w-4 h-4" /></Button></Link>}
              <Button size="sm" onClick={() => openNewEvent()} className={`${isMobile ? "h-7 w-7 p-0" : "h-8 px-3"} bg-purple-600 hover:bg-purple-500`}>
                <Plus className={isMobile ? "w-4 h-4" : "w-4 h-4 mr-1"} />{!isMobile && "New Event"}
              </Button>
              {isMobile && <Link href="/settings/google-calendar"><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-purple-300"><Settings className="w-3.5 h-3.5" /></Button></Link>}
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

          {isLoading && <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" /></div>}

          {!isLoading && view === "month" && (
            <MonthView year={year} month={month} allEvents={allEvents} today={today} isMobile={isMobile} onSwipeStart={onSwipeStart} onSwipeEnd={onSwipeEnd} onDayClick={(d) => { setCurrentDate(d); setView("day"); }} onEventClick={setSelectedEvent} />
          )}
          {!isLoading && view !== "month" && (
            <TimeGridView
              dates={viewDates} allEvents={allEvents} today={today} isMobile={isMobile} scrollRef={scrollRef}
              drag={drag}
              resizeEventId={resizeEventId}
              onSwipeStart={onSwipeStart} onSwipeEnd={onSwipeEnd}
              onEventTap={(ev, pos) => {
                if (isMobile) {
                  if (tappedEvent?.id === ev.id) {
                    setTappedEvent(null);
                    setTapPosition(null);
                  } else {
                    setTappedEvent(ev);
                    setTapPosition(pos || null);
                  }
                  setResizeEventId(null);
                } else {
                  setSelectedEvent(ev);
                }
              }}
              onDragStart={(ds) => setDrag(ds)}
              onDragUpdate={(minute) => setDrag((prev) => prev ? { ...prev, minute } : null)}
              onDragEnd={() => { if (drag) { commitDrag(drag); setDrag(null); } }}
              onDragCancel={() => setDrag(null)}
              onEmptyTap={(date, minute) => { setTappedEvent(null); setResizeEventId(null); openNewEvent(date, minute); }}
            />
          )}
        </div>

        {!isMobile && (
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500/60" /><span>Google Calendar synced</span></div>
            {settings?.googleCalendarLastSync && <span>Last sync: {new Date(settings.googleCalendarLastSync).toLocaleString()}</span>}
          </div>
        )}
      </div>

      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          isMobile={isMobile}
          onClose={() => setSelectedEvent(null)}
          onDelete={() => handleDeleteEvent(selectedEvent)}
          onAdjust={isMobile && isDraggable(selectedEvent) ? () => {
            setResizeEventId(selectedEvent.id);
            setSelectedEvent(null);
          } : undefined}
        />
      )}

      {/* Mobile action bubble */}
      {tappedEvent && isMobile && !resizeEventId && tapPosition && (
        <EventActionBubble
          event={tappedEvent}
          tapX={tapPosition.x}
          tapY={tapPosition.y}
          onView={() => { setSelectedEvent(tappedEvent); setTappedEvent(null); setTapPosition(null); }}
          onAdjust={() => { setResizeEventId(tappedEvent.id); setTappedEvent(null); setTapPosition(null); }}
          onDismiss={() => { setTappedEvent(null); setTapPosition(null); }}
        />
      )}

      {/* Resize mode banner */}
      {resizeEventId && isMobile && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900/95 border border-purple-500/40 rounded-full px-4 py-2 shadow-xl shadow-purple-500/20 backdrop-blur-sm">
          <SlidersHorizontal className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-white font-medium">Drag edges to resize</span>
          <button
            onClick={() => setResizeEventId(null)}
            className="ml-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full"
          >
            Done
          </button>
        </div>
      )}

      {showNewEventModal && (
        <NewEventModal date={newEventDate} time={newEventTime} title={newEventTitle} duration={newEventDuration}
          onDateChange={setNewEventDate} onTimeChange={setNewEventTime} onTitleChange={setNewEventTitle} onDurationChange={setNewEventDuration}
          onCreate={handleCreateEvent} onClose={() => setShowNewEventModal(false)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  TimeGridView
// ═══════════════════════════════════════════════════════════════════════

interface TimeGridViewProps {
  dates: Date[];
  allEvents: CalendarEvent[];
  today: Date;
  isMobile: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  drag: DragState | null;
  resizeEventId: string | null;
  onSwipeStart: (e: React.TouchEvent) => void;
  onSwipeEnd: (e: React.TouchEvent) => void;
  onEventTap: (ev: CalendarEvent, pos?: { x: number; y: number }) => void;
  onDragStart: (ds: DragState) => void;
  onDragUpdate: (minute: number) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
  onEmptyTap: (date: Date, minute: number) => void;
}

function TimeGridView({ dates, allEvents, today, isMobile, scrollRef, drag, resizeEventId, onSwipeStart, onSwipeEnd, onEventTap, onDragStart, onDragUpdate, onDragEnd, onDragCancel, onEmptyTap }: TimeGridViewProps) {
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
          <DayColumn key={`${date.toISOString()}-${colIdx}`} date={date} events={getEventsForDate(allEvents, date)}
            isToday={sameDay(date, today)} isMobile={isMobile} numCols={numCols}
            drag={drag} resizeEventId={resizeEventId}
            onEventTap={onEventTap} onDragStart={onDragStart} onDragUpdate={onDragUpdate} onDragEnd={onDragEnd} onDragCancel={onDragCancel}
            onEmptyTap={(minute) => onEmptyTap(date, minute)} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MonthView
// ═══════════════════════════════════════════════════════════════════════

interface MonthViewProps {
  year: number; month: number; allEvents: CalendarEvent[]; today: Date; isMobile: boolean;
  onSwipeStart: (e: React.TouchEvent) => void; onSwipeEnd: (e: React.TouchEvent) => void;
  onDayClick: (date: Date) => void; onEventClick: (ev: CalendarEvent) => void;
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
                  {isValid && (<>
                    <div className={`text-xs font-semibold text-center mb-0.5 ${isToday ? "bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto text-[10px]" : "text-gray-300"}`}>{dayNum}</div>
                    <div className="space-y-px">
                      {dayEvents.slice(0, maxShow).map((ev) => (
                        <div key={ev.id} className="truncate rounded-sm px-0.5 text-[9px] leading-tight text-white" style={{ backgroundColor: eventColor(ev) + "80" }} onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}>{ev.title}</div>
                      ))}
                      {dayEvents.length > maxShow && <div className="text-[8px] text-gray-400 text-center">+{dayEvents.length - maxShow} more</div>}
                    </div>
                  </>)}
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
//  DayColumn — events + touch/mouse drag + edge resize
// ═══════════════════════════════════════════════════════════════════════

interface DayColumnProps {
  date: Date; events: CalendarEvent[]; isToday: boolean; isMobile: boolean; numCols: number;
  drag: DragState | null;
  resizeEventId: string | null;
  onEventTap: (ev: CalendarEvent, pos?: { x: number; y: number }) => void;
  onDragStart: (ds: DragState) => void;
  onDragUpdate: (minute: number) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
  onEmptyTap: (minute: number) => void;
}

const DayColumn = React.memo(function DayColumn({
  date, events, isToday, isMobile, numCols, drag, resizeEventId,
  onEventTap, onDragStart, onDragUpdate, onDragEnd, onDragCancel, onEmptyTap,
}: DayColumnProps) {
  const colRef = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => layoutEvents(events), [events]);

  // Flag to suppress onClick after a drag/resize interaction
  const didInteractRef = useRef(false);

  // Touch state ref for long-press detection + drag
  const touchState = useRef<{
    ev: CalendarEvent;
    mode: DragMode | null; // null until determined
    startX: number;
    startY: number;
    startMinute: number;
    offsetInEvent: number; // how far down in the event the touch started (for move)
    origStartMin: number;
    origEndMin: number;
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

  /** Detect whether touch/click is near the top or bottom edge of an event element */
  const detectEdge = useCallback((clientY: number, eventEl: HTMLElement): DragMode => {
    const rect = eventEl.getBoundingClientRect();
    const topDist = clientY - rect.top;
    const bottomDist = rect.bottom - clientY;
    // In resize mode, use a much bigger zone for easy grabbing
    const isResizeActive = resizeEventId !== null;
    const zone = isResizeActive ? 36 : (isMobile ? EDGE_ZONE + 4 : EDGE_ZONE);
    if (topDist <= zone) return "resize-top";
    if (bottomDist <= zone) return "resize-bottom";
    return "move";
  }, [isMobile, resizeEventId]);

  // ── Touch handlers (mobile) — 100% native listeners ──
  // We use refs for values that the native handlers need so closures always
  // read fresh state without requiring the effect to re-register on every render.
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const resizeEventIdRef = useRef(resizeEventId);
  resizeEventIdRef.current = resizeEventId;
  const onEventTapRef = useRef(onEventTap);
  onEventTapRef.current = onEventTap;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragUpdateRef = useRef(onDragUpdate);
  onDragUpdateRef.current = onDragUpdate;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;
  const onDragCancelRef = useRef(onDragCancel);
  onDragCancelRef.current = onDragCancel;

  useEffect(() => {
    const col = colRef.current;
    if (!col) return;

    // Find the event id from a touch target by walking up the DOM
    const findEventId = (el: HTMLElement | null): string | null => {
      while (el && el !== col) {
        if (el.dataset.eventId) return el.dataset.eventId;
        el = el.parentElement;
      }
      return null;
    };

    const findEventEl = (el: HTMLElement | null): HTMLElement | null => {
      while (el && el !== col) {
        if (el.dataset.eventId) return el;
        el = el.parentElement;
      }
      return null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const eventId = findEventId(target);
      if (!eventId) return; // touch on empty space — let swipe/scroll handle it

      const ev = eventsRef.current.find((ev) => ev.id === eventId);
      if (!ev) return;

      const touch = e.touches[0];
      const isResizing = resizeEventIdRef.current === ev.id && isDraggable(ev);

      if (!isResizing) {
        // Not in resize mode — just record for tap detection in touchEnd
        touchState.current = {
          ev, mode: null,
          startX: touch.clientX, startY: touch.clientY,
          startMinute: 0, offsetInEvent: 0, origStartMin: 0, origEndMin: 0,
          timer: null, active: false, moved: false,
        };
        return;
      }

      // In resize mode — detect edge
      const eventEl = findEventEl(target);
      if (!eventEl) return;

      const rect = eventEl.getBoundingClientRect();
      const topDist = touch.clientY - rect.top;
      const bottomDist = rect.bottom - touch.clientY;
      const zone = 36; // generous zone for finger-sized touch targets
      let mode: DragMode;
      if (topDist <= zone) mode = "resize-top";
      else if (bottomDist <= zone) mode = "resize-bottom";
      else {
        // Middle — treat as tap
        touchState.current = {
          ev, mode: null, startX: touch.clientX, startY: touch.clientY,
          startMinute: 0, offsetInEvent: 0, origStartMin: 0, origEndMin: 0,
          timer: null, active: false, moved: false,
        };
        return;
      }

      const origStartMin = minuteOfDay(new Date(ev.start));
      const origEndMin = minuteOfDay(new Date(ev.end));
      const touchMinute = getMinuteFromY(touch.clientY);

      // Claim this touch — prevent scroll
      e.preventDefault();

      touchState.current = {
        ev, mode, startX: touch.clientX, startY: touch.clientY, startMinute: touchMinute,
        offsetInEvent: touchMinute - origStartMin, origStartMin, origEndMin,
        timer: null, active: true, moved: false,
      };
      didInteractRef.current = true;
      const startVal = mode === "resize-top" ? origStartMin : origEndMin;
      onDragStartRef.current({ event: ev, mode, minute: startVal, origStartMin, origEndMin });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const ts = touchState.current;
      if (!ts) return;
      const touch = e.touches[0];
      const dy = Math.abs(touch.clientY - ts.startY);

      if (!ts.active) {
        // Not in active drag — if finger moves too much, cancel (let scroll happen)
        if (dy > MOVE_THRESHOLD) {
          if (ts.timer) clearTimeout(ts.timer);
          touchState.current = null;
          return;
        }
        return;
      }

      // Active resize drag — use RELATIVE movement for precision
      e.preventDefault();
      e.stopPropagation();
      ts.moved = true;

      const currentMinute = getMinuteFromY(touch.clientY);
      const deltaMinutes = currentMinute - ts.startMinute;
      const mode = ts.mode!;

      if (mode === "resize-top") {
        const newTop = snap(ts.origStartMin + deltaMinutes);
        onDragUpdateRef.current(clamp(newTop, 0, ts.origEndMin - MIN_DURATION));
      } else if (mode === "resize-bottom") {
        const newBottom = snap(ts.origEndMin + deltaMinutes);
        onDragUpdateRef.current(clamp(newBottom, ts.origStartMin + MIN_DURATION, 1440));
      }
    };

    const handleTouchEnd = () => {
      const ts = touchState.current;
      if (!ts) return;
      if (ts.timer) clearTimeout(ts.timer);
      if (ts.active && ts.moved) {
        onDragEndRef.current();
      } else if (ts.active) {
        onDragCancelRef.current();
      } else {
        // Simple tap
        onEventTapRef.current(ts.ev, { x: ts.startX, y: ts.startY });
        didInteractRef.current = true;
      }
      touchState.current = null;
    };

    const handleTouchCancel = () => {
      const ts = touchState.current;
      if (ts?.timer) clearTimeout(ts.timer);
      if (ts?.active) onDragCancelRef.current();
      touchState.current = null;
    };

    col.addEventListener("touchstart", handleTouchStart, { passive: false });
    col.addEventListener("touchmove", handleTouchMove, { passive: false });
    col.addEventListener("touchend", handleTouchEnd, { passive: true });
    col.addEventListener("touchcancel", handleTouchCancel, { passive: true });
    return () => {
      col.removeEventListener("touchstart", handleTouchStart);
      col.removeEventListener("touchmove", handleTouchMove);
      col.removeEventListener("touchend", handleTouchEnd);
      col.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [getMinuteFromY]); // Stable deps only — callbacks accessed via refs

  // ── Mouse handlers for desktop ──

  const handleMouseDown = useCallback((ev: CalendarEvent, e: React.MouseEvent) => {
    if (isMobile) return;
    e.stopPropagation();

    // For non-draggable events, just open detail immediately
    if (!isDraggable(ev)) {
      didInteractRef.current = true; // suppress follow-up onClick
      onEventTap(ev, { x: e.clientX, y: e.clientY });
      return;
    }

    e.preventDefault();

    const eventEl = e.currentTarget as HTMLElement;
    const mode = detectEdge(e.clientY, eventEl);
    const origStartMin = minuteOfDay(new Date(ev.start));
    const origEndMin = minuteOfDay(new Date(ev.end));
    const clickMinute = getMinuteFromY(e.clientY);
    const offsetInEvent = clickMinute - origStartMin;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragStarted = false;

    const handleMouseMove = (me: MouseEvent) => {
      const dx = Math.abs(me.clientX - startX);
      const dy = Math.abs(me.clientY - startY);

      if (!dragStarted) {
        // Only start drag after exceeding movement threshold
        if (dx < MOVE_THRESHOLD && dy < MOVE_THRESHOLD) return;
        dragStarted = true;
        didInteractRef.current = true;
        const startVal = mode === "resize-top" ? origStartMin : mode === "resize-bottom" ? origEndMin : origStartMin;
        onDragStart({ event: ev, mode, minute: startVal, origStartMin, origEndMin });
        if (mode === "resize-top" || mode === "resize-bottom") {
          document.body.style.cursor = "ns-resize";
        } else {
          document.body.style.cursor = "grabbing";
        }
      }

      const currentMinute = getMinuteFromY(me.clientY);
      if (mode === "move") {
        onDragUpdate(clamp(snap(currentMinute - offsetInEvent), 0, 1440 - MIN_DURATION));
      } else if (mode === "resize-top") {
        onDragUpdate(clamp(snap(currentMinute), 0, origEndMin - MIN_DURATION));
      } else if (mode === "resize-bottom") {
        onDragUpdate(clamp(snap(currentMinute), origStartMin + MIN_DURATION, 1440));
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";

      if (dragStarted) {
        // Commit drag
        setTimeout(() => onDragEnd(), 0);
      } else {
        // No movement → treat as click → open detail modal
        didInteractRef.current = true; // suppress the follow-up onClick
        onEventTap(ev, { x: e.clientX, y: e.clientY });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [isMobile, detectEdge, getMinuteFromY, onDragStart, onDragUpdate, onDragEnd, onEventTap]);

  // Double-tap to create on empty space
  const lastTap = useRef<number>(0);
  const handleEmptyClick = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 350) {
      onEmptyTap(getMinuteFromY(e.clientY));
    }
    lastTap.current = now;
  }, [getMinuteFromY, onEmptyTap]);

  // Current time indicator
  const now = new Date();
  const nowMinute = now.getHours() * 60 + now.getMinutes();

  return (
    <div ref={colRef} className="flex-1 relative border-l border-purple-500/10" style={{ height: TOTAL_HEIGHT }} onClick={handleEmptyClick}>
      {/* Hour grid lines */}
      {Array.from({ length: 24 }, (_, h) => (
        <div key={h} className="absolute left-0 right-0 border-b border-purple-500/[0.08]" style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
      ))}

      {/* Current time indicator */}
      {isToday && (
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
        const evStartMin = minuteOfDay(start);
        const evEndMin = minuteOfDay(end);
        const evDurMin = (end.getTime() - start.getTime()) / 60000;

        // If this event is being dragged/resized, compute visual position from drag state
        const isDragging = drag?.event.id === ev.id;
        let visTop: number, visHeight: number;

        if (isDragging && drag) {
          if (drag.mode === "move") {
            visTop = (drag.minute / 1440) * TOTAL_HEIGHT;
            visHeight = Math.max(15, (evDurMin / 1440) * TOTAL_HEIGHT);
          } else if (drag.mode === "resize-top") {
            const newStart = clamp(drag.minute, 0, drag.origEndMin - MIN_DURATION);
            const newDur = drag.origEndMin - newStart;
            visTop = (newStart / 1440) * TOTAL_HEIGHT;
            visHeight = Math.max(15, (newDur / 1440) * TOTAL_HEIGHT);
          } else {
            // resize-bottom
            const newEnd = clamp(drag.minute, drag.origStartMin + MIN_DURATION, 1440);
            const newDur = newEnd - drag.origStartMin;
            visTop = (drag.origStartMin / 1440) * TOTAL_HEIGHT;
            visHeight = Math.max(15, (newDur / 1440) * TOTAL_HEIGHT);
          }
        } else {
          visTop = (evStartMin / 1440) * TOTAL_HEIGHT;
          visHeight = Math.max(15, (evDurMin / 1440) * TOTAL_HEIGHT);
        }

        const colW = 100 / l.total;
        const left = `${l.col * colW}%`;
        const width = `calc(${colW}% - 2px)`;
        const color = eventColor(ev);
        const draggable = isDraggable(ev);
        const isInResizeMode = resizeEventId === ev.id && draggable;

        return (
          <div
            key={ev.id}
            data-event-id={ev.id}
            className={`absolute rounded-md border-l-[3px] select-none transition-all duration-150 ${
              isDragging ? "z-30 shadow-xl shadow-purple-500/30 opacity-90 scale-x-[1.02]" :
              isInResizeMode ? "z-30 ring-2 ring-purple-400/70 shadow-lg shadow-purple-500/30" :
              "z-10 hover:brightness-110"
            } ${ev.completed ? "opacity-50" : ""} ${draggable && !isMobile ? "cursor-grab" : "cursor-pointer"}`}
            style={{
              top: visTop, height: visHeight, left, width,
              borderLeftColor: color,
              backgroundColor: isInResizeMode ? color + "40" : color + "25",
              overflow: isInResizeMode ? "visible" : "hidden",
              touchAction: isInResizeMode ? "none" : undefined,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (didInteractRef.current) {
                didInteractRef.current = false;
                return;
              }
              if (!isDragging) onEventTap(ev, { x: e.clientX, y: e.clientY });
            }}
            onMouseDown={(e) => handleMouseDown(ev, e)}
          >
            {/* Top resize handle — prominent in resize mode, subtle on desktop, hidden on mobile normally */}
            {((isInResizeMode) || (draggable && !isMobile)) && (
              <div
                className={`absolute top-0 left-0 right-0 z-20 flex justify-center items-start ${!isMobile ? "cursor-ns-resize" : ""}`}
                style={{ height: isInResizeMode ? 30 : 10 }}
              >
                <div className={`rounded-full transition-all ${
                  isInResizeMode
                    ? "bg-purple-400 shadow-md shadow-purple-400/50 -translate-y-1.5"
                    : isDragging && drag?.mode === "resize-top" ? "bg-white/80" : "bg-white/40"
                }`}
                  style={{
                    width: isInResizeMode ? 40 : 20,
                    height: isInResizeMode ? 6 : 3,
                    marginTop: isInResizeMode ? 0 : 2,
                  }} />
              </div>
            )}

            {/* Event content */}
            <div className="px-1.5 py-0.5 h-full flex flex-col justify-start overflow-hidden" style={{ paddingTop: (isInResizeMode || (draggable && !isMobile)) ? 6 : 2 }}>
              <div className="flex items-center gap-1 min-w-0">
                {ev.completed && <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />}
                <span className={`text-[10px] font-semibold truncate ${ev.completed ? "line-through text-gray-400" : "text-white"}`}>{ev.title}</span>
              </div>
              {visHeight > 30 && (
                <span className="text-[9px] text-white/60 truncate">
                  {formatTime(start)}{visHeight > 45 && ` \u2013 ${formatTime(end)}`}
                </span>
              )}
              {visHeight > 55 && ev.source === "google" && ev.calendarName && (
                <span className="text-[8px] text-white/40 truncate">{ev.calendarName}</span>
              )}
            </div>

            {/* Bottom resize handle */}
            {((isInResizeMode) || (draggable && !isMobile)) && (
              <div
                className={`absolute bottom-0 left-0 right-0 z-20 flex justify-center items-end ${!isMobile ? "cursor-ns-resize" : ""}`}
                style={{ height: isInResizeMode ? 30 : 10 }}
              >
                <div className={`rounded-full transition-all ${
                  isInResizeMode
                    ? "bg-purple-400 shadow-md shadow-purple-400/50 translate-y-1.5"
                    : isDragging && drag?.mode === "resize-bottom" ? "bg-white/80" : "bg-white/40"
                }`}
                  style={{
                    width: isInResizeMode ? 40 : 20,
                    height: isInResizeMode ? 6 : 3,
                    marginBottom: isInResizeMode ? 0 : 2,
                  }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});



// ═══════════════════════════════════════════════════════════════════════
//  EventActionBubble — speech bubble submenu near the tapped event
// ═══════════════════════════════════════════════════════════════════════

function EventActionBubble({ event, tapX, tapY, onView, onAdjust, onDismiss }: {
  event: CalendarEvent;
  tapX: number;
  tapY: number;
  onView: () => void;
  onAdjust: () => void;
  onDismiss: () => void;
}) {
  const canAdjust = isDraggable(event);
  const backdropRef = useRef<HTMLDivElement>(null);
  const viewBtnRef = useRef<HTMLButtonElement>(null);
  const adjustBtnRef = useRef<HTMLButtonElement>(null);

  // Find actual event element position for bubble alignment
  const [pos, setPos] = useState<{ top: number; left: number; right: number; centerY: number } | null>(null);

  useEffect(() => {
    const el = document.querySelector(`[data-event-id="${event.id}"]`) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left, right: rect.right, centerY: rect.top + rect.height / 2 });
    } else {
      setPos({ top: tapY - 20, left: tapX - 50, right: tapX + 50, centerY: tapY });
    }
  }, [event.id, tapX, tapY]);

  // Callbacks in ref so native listeners always see fresh values
  const cbRef = useRef({ onView, onAdjust, onDismiss });
  cbRef.current = { onView, onAdjust, onDismiss };

  // Native DOM listeners — no React synthetic events
  useEffect(() => {
    if (!pos) return;
    const backdrop = backdropRef.current;
    const viewBtn = viewBtnRef.current;
    const adjustBtn = adjustBtnRef.current;
    if (!backdrop) return;

    let handled = false;

    const doView = (e: Event) => {
      if (handled) return;
      handled = true;
      e.stopPropagation();
      e.preventDefault();
      cbRef.current.onView();
    };

    const doAdjust = (e: Event) => {
      if (handled) return;
      handled = true;
      e.stopPropagation();
      e.preventDefault();
      cbRef.current.onAdjust();
    };

    const doDismiss = (e: Event) => {
      if (handled) return;
      handled = true;
      e.stopPropagation();
      e.preventDefault();
      cbRef.current.onDismiss();
    };

    // Button listeners: touchstart fires immediately on iOS
    viewBtn?.addEventListener("touchstart", doView, { passive: false });
    viewBtn?.addEventListener("click", doView);
    adjustBtn?.addEventListener("touchstart", doAdjust, { passive: false });
    adjustBtn?.addEventListener("click", doAdjust);

    // Backdrop dismiss: delayed so the originating tap doesn't dismiss immediately
    let dismissTimer: ReturnType<typeof setTimeout>;
    const enableDismiss = () => {
      backdrop.addEventListener("touchstart", doDismiss, { passive: false });
      backdrop.addEventListener("click", doDismiss);
    };
    dismissTimer = setTimeout(enableDismiss, 200);

    return () => {
      clearTimeout(dismissTimer);
      viewBtn?.removeEventListener("touchstart", doView);
      viewBtn?.removeEventListener("click", doView);
      adjustBtn?.removeEventListener("touchstart", doAdjust);
      adjustBtn?.removeEventListener("click", doAdjust);
      backdrop.removeEventListener("touchstart", doDismiss);
      backdrop.removeEventListener("click", doDismiss);
    };
  }, [pos]);

  // All hooks above — safe to early-return below
  if (!pos) return null;

  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const onRightHalf = pos.right > screenW * 0.6;

  const bubbleW = canAdjust ? 190 : 100;
  const bubbleH = 48;
  const arrowSize = 8;
  const gap = 6;

  let bubbleLeft: number;
  if (onRightHalf) {
    bubbleLeft = pos.left - bubbleW - arrowSize - gap;
  } else {
    bubbleLeft = pos.right + arrowSize + gap;
  }
  bubbleLeft = Math.max(8, Math.min(bubbleLeft, screenW - bubbleW - 8));

  let bubbleTop = pos.centerY - bubbleH / 2;
  bubbleTop = Math.max(8, Math.min(bubbleTop, screenH - bubbleH - 8));

  const arrowTop = Math.max(10, Math.min(pos.centerY - bubbleTop, bubbleH - 10));

  return (
    <>
      {/* Backdrop — SEPARATE div behind the bubble */}
      <div ref={backdropRef} className="fixed inset-0 z-50" />

      {/* Bubble — ABOVE the backdrop */}
      <div
        className="fixed z-[51] animate-in fade-in zoom-in-95 duration-150"
        style={{ top: bubbleTop, left: bubbleLeft, width: bubbleW }}
      >
        <div className="flex items-center gap-1 bg-gray-900/95 border border-purple-500/40 rounded-2xl px-1.5 py-1.5 shadow-2xl shadow-black/50 backdrop-blur-md">
          <button
            ref={viewBtnRef}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl active:bg-purple-500/30 transition-colors cursor-pointer select-none bg-transparent border-0 outline-none"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Eye className="w-5 h-5 text-purple-300 pointer-events-none" />
            <span className="text-sm font-medium text-white pointer-events-none select-none">View</span>
          </button>

          {canAdjust && <div className="w-px h-6 bg-purple-500/30" />}

          {canAdjust && (
            <button
              ref={adjustBtnRef}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl active:bg-purple-500/30 transition-colors cursor-pointer select-none bg-transparent border-0 outline-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <SlidersHorizontal className="w-5 h-5 text-purple-300 pointer-events-none" />
              <span className="text-sm font-medium text-white pointer-events-none select-none">Adjust</span>
            </button>
          )}
        </div>

        {/* Speech bubble arrow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: arrowTop - arrowSize,
            [onRightHalf ? "right" : "left"]: -arrowSize * 2 + 1,
            width: 0,
            height: 0,
            borderTop: `${arrowSize}px solid transparent`,
            borderBottom: `${arrowSize}px solid transparent`,
            ...(onRightHalf
              ? { borderLeft: `${arrowSize}px solid rgb(168 85 247 / 0.4)` }
              : { borderRight: `${arrowSize}px solid rgb(168 85 247 / 0.4)` }),
          }}
        />
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  EventDetailSheet
// ═══════════════════════════════════════════════════════════════════════

function EventDetailSheet({ event, isMobile, onClose, onDelete, onAdjust }: { event: CalendarEvent; isMobile: boolean; onClose: () => void; onDelete: () => void; onAdjust?: () => void }) {
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
        {isMobile && <div className="flex justify-center pt-2 pb-1"><div className="w-10 h-1 rounded-full bg-gray-600" /></div>}
        <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: color }} />
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold text-white leading-tight">{event.title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1 -mt-1"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>{start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} {"\u00b7"} {formatTime(start)} {"\u2013"} {formatTime(end)}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-300">{sourceLabel}</Badge>
            {event.importance && event.source === "productivityquest" && <Badge variant="outline" className="text-[10px]" style={{ borderColor: color + "60", color }}>{event.importance}</Badge>}
            {event.completed && <Badge className="text-[10px] bg-green-600/20 text-green-300 border-green-600/30">Completed</Badge>}
          </div>
          {event.description && <p className="text-sm text-gray-400 whitespace-pre-wrap">{event.description}</p>}
          {event.skillTags && event.skillTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.skillTags.map((s) => <Badge key={s} variant="outline" className="text-[10px] text-yellow-300 border-yellow-600/30">{s}</Badge>)}
            </div>
          )}
          {event.goldValue && event.goldValue > 0 && <div className="text-sm text-yellow-400">{"\ud83e\ude99"} {event.goldValue} gold</div>}
          {event.campaign && <div className="text-sm text-purple-300">{"\ud83d\udccb"} {event.campaign}</div>}
          {canModify && (
            <div className="pt-2 border-t border-gray-800 space-y-2">
              {onAdjust && (
                <Button variant="outline" size="sm" onClick={onAdjust} className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/20">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />Adjust Duration
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />{event.source === "productivityquest" ? "Remove from Calendar" : "Delete Event"}
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
        <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          placeholder="Event title" value={title} onChange={(e) => onTitleChange(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && onCreate()} />
        <div className="flex gap-2">
          <input type="date" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" value={date} onChange={(e) => onDateChange(e.target.value)} />
          <input type="time" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" value={time} onChange={(e) => onTimeChange(e.target.value)} />
        </div>
        <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" value={duration} onChange={(e) => onDurationChange(e.target.value)}>
          <option value="15">15 min</option><option value="30">30 min</option><option value="60">1 hour</option>
          <option value="90">1.5 hours</option><option value="120">2 hours</option><option value="180">3 hours</option>
        </select>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 text-gray-400">Cancel</Button>
          <Button onClick={onCreate} className="flex-1 bg-purple-600 hover:bg-purple-500" disabled={!title.trim()}>Create</Button>
        </div>
      </div>
    </div>
  );
}

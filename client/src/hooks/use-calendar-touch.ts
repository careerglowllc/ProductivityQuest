/**
 * useCalendarTouch — A clean, state-machine-based touch interaction hook
 * for Apple iCal-style calendar event manipulation on mobile.
 *
 * Touch interaction model:
 *   • Instant drag = scroll (native, never intercepted)
 *   • Tap + hold ~500ms = event "lifts" (visual feedback), then drag moves it
 *   • Release after drag = drops event at new time
 *   • Double tap (~300ms) = opens event detail
 *   • Single tap = nothing (prevents accidental opens)
 *
 * Design principles:
 *   • All mutable state lives in a single ref (no stale closures, ever)
 *   • One native touchmove + touchend listener per container (passive:false)
 *   • State machine with clear transitions: IDLE → PENDING → DRAGGING → IDLE
 *   • Visual feedback state exposed via React state for rendering
 *   • Container scroll ref passed in so we can track scroll offsets
 */

import { useRef, useState, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  source?: string;
  [key: string]: any;
};

type TouchPhase = 'IDLE' | 'WAITING' | 'PENDING' | 'DRAGGING';

type ResizeEdge = 'top' | 'bottom' | null;

/** Exposed to the parent for rendering drag state */
export interface TouchDragState {
  /** The event currently being dragged (null if not dragging) */
  draggingEvent: CalendarEvent | null;
  /** The event currently being resized */
  resizingEvent: CalendarEvent | null;
  /** Which edge is being resized */
  resizeEdge: ResizeEdge;
  /** Temporary start/end while dragging, for visual positioning */
  tempTime: { start: Date; end: Date } | null;
  /** True once the finger has actually moved during a drag */
  hasMoved: boolean;
  /** Event ID showing the "pending lift" visual hint (yellow ring) */
  pendingEventId: string | null;
  /** Whether touch-drag is actively in progress (suppresses click & scroll) */
  isDragging: boolean;
}

export interface UseCalendarTouchOptions {
  /** Current calendar view ('day' | '3day' | 'week' | 'month') */
  view: 'day' | '3day' | 'week' | 'month';
  /** Refs to scroll containers for each view */
  scrollContainerRefs: {
    day: React.RefObject<HTMLDivElement | null>;
    threeDay: React.RefObject<HTMLDivElement | null>;
    week: React.RefObject<HTMLDivElement | null>;
  };
  /** Called when a double-tap opens an event detail */
  onEventOpen: (event: CalendarEvent) => void;
  /** Called when a drag/resize completes with the new time. Parent handles save. */
  onEventDrop: (
    event: CalendarEvent,
    newStart: Date,
    newEnd: Date,
    wasResize: boolean,
  ) => void;
  /** Whether we're on mobile */
  isMobile: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────

/** How long to hold before drag activates (Apple iCal is ~500ms) */
const LONG_PRESS_MS = 500;
/** Movement threshold in px — if finger moves more, it's a scroll */
const MOVE_CANCEL_PX = 10;
/** Max ms between two taps to count as double-tap */
const DOUBLE_TAP_MS = 300;
/** Delay before showing the yellow "pending" ring (avoids flash on casual touch) */
const VISUAL_HINT_MS = 150;
/** Snap drag deltas to 5-minute increments */
const SNAP_MINUTES = 5;
/** Pixels per hour in the time grid (each hour slot is 60px) */
const PX_PER_HOUR = 60;
/** Edge zone for auto-scroll during drag (px from container edge) */
const AUTO_SCROLL_ZONE = 50;
/** Auto-scroll speed (px per frame at 60fps) */
const AUTO_SCROLL_SPEED = 8;

// ─── Internal mutable state (lives in a ref, never stale) ─────────────

interface InternalState {
  phase: TouchPhase;
  /** The event being interacted with */
  event: CalendarEvent | null;
  edge: ResizeEdge;
  /** Finger position at touchstart */
  startX: number;
  startY: number;
  /** Current finger position (updated on every move) */
  currentX: number;
  currentY: number;
  /** ScrollTop at the moment drag was activated */
  scrollTopAtDragStart: number;
  /** clientY at the moment drag was activated */
  clientYAtDragStart: number;
  /** Original event start time */
  originalStart: Date | null;
  /** Original event end time */
  originalEnd: Date | null;
  /** Whether finger has moved enough to be considered a "move" during drag */
  hasMoved: boolean;
  /** Timer IDs */
  visualHintTimer: ReturnType<typeof setTimeout> | null;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  /** Auto-scroll interval */
  autoScrollInterval: ReturnType<typeof setInterval> | null;
  /** Double-tap tracking */
  lastTap: { eventId: string; time: number } | null;
  /** Track if touchmoved at all (to suppress click) */
  touchMovedAtAll: boolean;
}

const makeInitialState = (): InternalState => ({
  phase: 'IDLE',
  event: null,
  edge: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  scrollTopAtDragStart: 0,
  clientYAtDragStart: 0,
  originalStart: null,
  originalEnd: null,
  hasMoved: false,
  visualHintTimer: null,
  longPressTimer: null,
  autoScrollInterval: null,
  lastTap: null,
  touchMovedAtAll: false,
});

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useCalendarTouch(options: UseCalendarTouchOptions) {
  const { view, scrollContainerRefs, onEventOpen, onEventDrop, isMobile } = options;

  // All mutable state in a single ref — no stale closures
  const S = useRef<InternalState>(makeInitialState());

  // React state for rendering (only updated when visual changes are needed)
  const [dragState, setDragState] = useState<TouchDragState>({
    draggingEvent: null,
    resizingEvent: null,
    resizeEdge: null,
    tempTime: null,
    hasMoved: false,
    pendingEventId: null,
    isDragging: false,
  });

  // Store latest callbacks in refs so native handlers always call fresh versions
  const onEventOpenRef = useRef(onEventOpen);
  onEventOpenRef.current = onEventOpen;
  const onEventDropRef = useRef(onEventDrop);
  onEventDropRef.current = onEventDrop;

  // Store view and scrollContainerRefs in refs so getScrollContainer is stable
  // (prevents native listener churn on every render)
  const scrollContainerRefsRef = useRef(scrollContainerRefs);
  scrollContainerRefsRef.current = scrollContainerRefs;
  const viewRef = useRef(view);
  viewRef.current = view;
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  // Get the active scroll container — stable reference (empty deps)
  const getScrollContainer = useCallback((): HTMLDivElement | null => {
    const v = viewRef.current;
    const refs = scrollContainerRefsRef.current;
    if (v === 'day') return refs.day.current;
    if (v === '3day') return refs.threeDay.current;
    if (v === 'week') return refs.week.current;
    return null;
  }, []);

  // ── Cleanup helper ──────────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    const s = S.current;
    if (s.visualHintTimer) { clearTimeout(s.visualHintTimer); s.visualHintTimer = null; }
    if (s.longPressTimer) { clearTimeout(s.longPressTimer); s.longPressTimer = null; }
    if (s.autoScrollInterval) { clearInterval(s.autoScrollInterval); s.autoScrollInterval = null; }
  }, []);

  const resetToIdle = useCallback(() => {
    clearTimers();
    const s = S.current;
    s.phase = 'IDLE';
    s.event = null;
    s.edge = null;
    s.hasMoved = false;
    s.touchMovedAtAll = false;
    setDragState({
      draggingEvent: null,
      resizingEvent: null,
      resizeEdge: null,
      tempTime: null,
      hasMoved: false,
      pendingEventId: null,
      isDragging: false,
    });
  }, [clearTimers]);

  // ── Calculate new time from drag delta ──────────────────────────────

  const calcTempTime = useCallback((touchClientY: number): { start: Date; end: Date } | null => {
    const s = S.current;
    if (!s.originalStart || !s.originalEnd) return null;

    const container = getScrollContainer();
    const currentScrollTop = container?.scrollTop || 0;
    const scrollDelta = currentScrollTop - s.scrollTopAtDragStart;
    const pixelDelta = (touchClientY - s.clientYAtDragStart) + scrollDelta;

    // Convert px → minutes, snap to 5-min increments
    const rawMinutes = (pixelDelta / PX_PER_HOUR) * 60;
    const snappedMinutes = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;

    if (s.edge === null) {
      // Moving the whole event
      const newStart = new Date(s.originalStart);
      newStart.setMinutes(newStart.getMinutes() + snappedMinutes);
      const duration = s.originalEnd.getTime() - s.originalStart.getTime();
      const newEnd = new Date(newStart.getTime() + duration);
      return { start: newStart, end: newEnd };
    } else if (s.edge === 'top') {
      // Resizing from top
      const newStart = new Date(s.originalStart);
      newStart.setMinutes(newStart.getMinutes() + snappedMinutes);
      // Enforce minimum 5 minutes
      const minEnd = new Date(newStart.getTime() + 5 * 60000);
      if (s.originalEnd > minEnd) {
        return { start: newStart, end: s.originalEnd };
      }
      return null;
    } else {
      // Resizing from bottom
      const newEnd = new Date(s.originalEnd);
      newEnd.setMinutes(newEnd.getMinutes() + snappedMinutes);
      const minEnd = new Date(s.originalStart.getTime() + 5 * 60000);
      if (newEnd >= minEnd) {
        return { start: s.originalStart, end: newEnd };
      }
      return null;
    }
  }, [getScrollContainer]);

  // ── Auto-scroll during drag ─────────────────────────────────────────

  const updateAutoScroll = useCallback((touchClientY: number) => {
    const s = S.current;
    const container = getScrollContainer();
    if (!container) return;

    // Clear existing auto-scroll
    if (s.autoScrollInterval) {
      clearInterval(s.autoScrollInterval);
      s.autoScrollInterval = null;
    }

    const rect = container.getBoundingClientRect();

    if (touchClientY < rect.top + AUTO_SCROLL_ZONE) {
      // Scroll up
      s.autoScrollInterval = setInterval(() => {
        if (container.scrollTop > 0) container.scrollTop -= AUTO_SCROLL_SPEED;
      }, 16);
    } else if (touchClientY > rect.bottom - AUTO_SCROLL_ZONE) {
      // Scroll down
      s.autoScrollInterval = setInterval(() => {
        const max = container.scrollHeight - container.clientHeight;
        if (container.scrollTop < max) container.scrollTop += AUTO_SCROLL_SPEED;
      }, 16);
    }
  }, [getScrollContainer]);

  // ── Native touchmove handler (attached with passive:false) ──────────

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const s = S.current;
    const touch = e.touches[0];

    // Capture previous Y before updating (needed for programmatic scroll delta)
    const prevY = s.currentY;
    s.currentX = touch.clientX;
    s.currentY = touch.clientY;

    if (s.phase === 'DRAGGING') {
      // We're actively dragging — prevent scroll, update position
      e.preventDefault();
      e.stopPropagation();

      if (!s.hasMoved) s.hasMoved = true;

      // Auto-scroll near edges
      updateAutoScroll(touch.clientY);

      // Calculate and publish new temp time
      const tempTime = calcTempTime(touch.clientY);
      if (tempTime) {
        setDragState(prev => ({ ...prev, tempTime, hasMoved: true }));
      }
      return;
    }

    if (s.phase === 'WAITING' || s.phase === 'PENDING') {
      // Check if finger moved too much — cancel long press
      const dx = touch.clientX - s.startX;
      const dy = touch.clientY - s.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > MOVE_CANCEL_PX) {
        // Finger moved too much — cancel long-press
        s.touchMovedAtAll = true;
        clearTimers();
        s.phase = 'IDLE';
        setDragState(prev => ({ ...prev, pendingEventId: null }));

        // Programmatically scroll since touch-action:none blocks native scroll
        // on event blocks. Without this, users can't scroll by swiping on events.
        e.preventDefault();
        const container = getScrollContainer();
        if (container) {
          const deltaY = touch.clientY - prevY;
          container.scrollTop -= deltaY;
        }
      } else {
        // Finger still within threshold — MUST preventDefault to stop iOS from
        // starting a native scroll gesture. Without this, iOS WKWebView commits
        // to scrolling before LONG_PRESS_MS fires, killing the long-press.
        e.preventDefault();
      }
      return;
    }

    // Continue programmatic scroll after long-press was canceled
    // (user is still swiping with finger down after we went back to IDLE)
    if (s.phase === 'IDLE' && s.touchMovedAtAll) {
      e.preventDefault();
      const container = getScrollContainer();
      if (container) {
        const deltaY = touch.clientY - prevY;
        container.scrollTop -= deltaY;
      }
    }
  }, [clearTimers, calcTempTime, updateAutoScroll, getScrollContainer]);

  // ── Native touchend handler ─────────────────────────────────────────

  const handleTouchEnd = useCallback(() => {
    const s = S.current;

    if (s.phase === 'DRAGGING' && s.event) {
      // Drop the event
      const tempTime = calcTempTime(s.currentY);
      if (tempTime && s.hasMoved) {
        const wasResize = s.edge !== null;
        onEventDropRef.current(s.event, tempTime.start, tempTime.end, wasResize);
      }
      resetToIdle();
      return;
    }

    if (s.phase === 'WAITING' || s.phase === 'PENDING') {
      // Long press didn't complete — this was a tap
      clearTimers();
      s.phase = 'IDLE';
      setDragState(prev => ({ ...prev, pendingEventId: null }));
      // Let the React onClick handler deal with double-tap detection
    }

    // Reset touchMovedAtAll after a brief delay so click handler can read it
    const wasMoved = s.touchMovedAtAll;
    s.touchMovedAtAll = false;
    if (wasMoved) {
      // If finger moved, the click handler should be suppressed.
      // touchMovedAtAll is already reset — the click guard reads from
      // the ref synchronously before this timeout fires.
    }
  }, [calcTempTime, clearTimers, resetToIdle]);

  // ── Native touchcancel handler (iOS fires this when system steals the touch) ──

  const handleTouchCancel = useCallback(() => {
    resetToIdle();
  }, [resetToIdle]);

  // ── Attach native listeners to the active scroll container ──────────

  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    // Prevent native context menu on long-press (iOS/Android show callout)
    const preventContextMenu = (e: Event) => { e.preventDefault(); };
    if (isMobileRef.current) {
      container.addEventListener('contextmenu', preventContextMenu);
    }

    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
      container.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [getScrollContainer, handleTouchMove, handleTouchEnd, handleTouchCancel, view]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // ── React event: touchstart on an event block ───────────────────────

  const handleEventTouchStart = useCallback((event: CalendarEvent, e: React.TouchEvent, edge?: 'top' | 'bottom') => {
    if (!isMobile) return;
    if (event.source !== 'productivityquest' && event.source !== 'standalone') return;

    e.stopPropagation(); // Prevent touch from bubbling to parent handlers

    const touch = e.touches[0];
    const s = S.current;

    // Cancel any existing interaction
    clearTimers();

    // Set up new interaction
    s.phase = 'WAITING';
    s.event = event;
    s.edge = edge || null;
    s.startX = touch.clientX;
    s.startY = touch.clientY;
    s.currentX = touch.clientX;
    s.currentY = touch.clientY;
    s.hasMoved = false;
    s.touchMovedAtAll = false;
    s.originalStart = new Date(event.start);
    s.originalEnd = new Date(event.end);

    // After VISUAL_HINT_MS: show the yellow "pending" ring
    s.visualHintTimer = setTimeout(() => {
      if (s.phase === 'WAITING') {
        s.phase = 'PENDING';
        setDragState(prev => ({ ...prev, pendingEventId: event.id }));
      }
    }, VISUAL_HINT_MS);

    // After LONG_PRESS_MS: activate drag mode
    s.longPressTimer = setTimeout(() => {
      if (s.phase === 'WAITING' || s.phase === 'PENDING') {
        s.phase = 'DRAGGING';

        // Record scroll position and finger position at drag activation
        const container = getScrollContainer();
        s.scrollTopAtDragStart = container?.scrollTop || 0;
        s.clientYAtDragStart = s.currentY;

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(30);

        // Publish drag state to React
        if (edge) {
          setDragState({
            draggingEvent: null,
            resizingEvent: event,
            resizeEdge: edge,
            tempTime: null,
            hasMoved: false,
            pendingEventId: null,
            isDragging: true,
          });
        } else {
          setDragState({
            draggingEvent: event,
            resizingEvent: null,
            resizeEdge: null,
            tempTime: null,
            hasMoved: false,
            pendingEventId: null,
            isDragging: true,
          });
        }
      }
    }, LONG_PRESS_MS);
  }, [isMobile, clearTimers, getScrollContainer]);

  // ── React event: click on an event block (handles double-tap) ───────

  const handleEventClick = useCallback((event: CalendarEvent) => {
    if (!isMobile) return; // Desktop uses its own click handler

    const s = S.current;

    // Suppress click if finger moved or if we were dragging
    if (s.touchMovedAtAll || s.phase === 'DRAGGING' || dragState.isDragging) return;

    // Double-tap detection
    const now = Date.now();
    const last = s.lastTap;

    if (last && last.eventId === event.id && (now - last.time) < DOUBLE_TAP_MS) {
      // Double tap! Open the event.
      s.lastTap = null;
      onEventOpenRef.current(event);
    } else {
      // First tap — record it
      s.lastTap = { eventId: event.id, time: now };
    }
  }, [isMobile, dragState.isDragging]);

  // ── Utility: check if a click should be suppressed ──────────────────

  const shouldSuppressClick = useCallback((): boolean => {
    return S.current.touchMovedAtAll || S.current.phase === 'DRAGGING' || dragState.isDragging;
  }, [dragState.isDragging]);

  return {
    /** Current drag/visual state for rendering */
    dragState,
    /** Attach to onTouchStart on event blocks */
    handleEventTouchStart,
    /** Attach to onClick on event blocks (handles double-tap on mobile) */
    handleEventClick,
    /** Returns true if clicks should be suppressed (finger moved or dragging) */
    shouldSuppressClick,
    /** Manually reset to idle (e.g., after parent saves) */
    resetToIdle,
  };
}

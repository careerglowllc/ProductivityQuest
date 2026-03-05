# Calendar Rebuild — Apple Calendar-Style UI

> **File:** `client/src/pages/calendar.tsx` (~1975 lines)
> **Route:** `/calendar`
> **Last updated:** March 4, 2026

## Overview

A from-scratch rebuild of the ProductivityQuest calendar, replacing the previous implementation with a clean Apple Calendar-style time-grid UI. Built as a single self-contained React component file with no external calendar library dependencies.

### Design Goals

- Apple Calendar-inspired visual language (dark theme, purple accent palette)
- Responsive: full desktop layout + compact iOS Capacitor mobile layout
- Unified event display: ProductivityQuest tasks, standalone events, and Google Calendar events
- Direct manipulation: drag-to-move (desktop click-drag, mobile long-press), edge-drag to resize
- Mobile-first interaction: speech-bubble action menu, explicit resize/adjust mode
- 5-minute snap grid, smooth animations, current-time indicator with auto-scroll
- Persistent undo for all drag/resize/sort operations
- Full-width "lift" effect during move drag for natural feel

---

## Architecture

### Component Hierarchy

```
CalendarPage (default export)
├── TopBar (navigation, today button, undo, sort, new event, settings)
├── ViewSwitcher (day / 3-day / week / month tabs)
├── MonthView (month grid with event dots)
├── TimeGridView (day headers + scrollable time grid)
│   └── DayColumn (React.memo) × N columns
│       ├── Hour grid lines (24 rows)
│       ├── Current time indicator (red line + dot)
│       └── Event blocks (positioned absolutely)
│           ├── Top resize handle (outside-edge grab zone)
│           ├── Event content (title, time, source)
│           └── Bottom resize handle (outside-edge grab zone)
├── EventActionBubble (mobile speech-bubble: View / Adjust)
├── EventDetailSheet (full event detail modal/sheet)
├── NewEventModal (create standalone event form)
├── Resize banner (floating "Drag edges to resize" + Done button)
└── Persistent undo button (top bar, always visible)
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Single file | All calendar logic co-located; avoids cross-file state management complexity |
| No calendar library | Full control over touch handling, snapping, and Capacitor iOS compatibility |
| `React.memo` on DayColumn | Prevents re-render of all columns when only one column's drag state changes |
| Refs for touch state | Avoids re-render on every touch move; mutable state lives in `useRef` |
| Native touch listeners | React synthetic touch events can't call `preventDefault()` on passive listeners; native listeners with `{ passive: false }` are required for iOS |
| Position-based speech bubble | Bubble appears near tapped event, flips sides to avoid screen edge clipping |
| Outside-only resize zones | Resize handles extend OUTSIDE the event bounds so touching inside always triggers move, never accidental resize |
| Full-width drag lift | During move drag, event expands to full column width (lifted out of overlap slot) to prevent off-screen clipping |
| Optimistic updates + delayed invalidation | Instant visual feedback; server refetch delayed 1.5s to keep optimistic UI stable |

---

## Types

### `CalendarEvent`

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  start: string;          // ISO datetime
  end: string;            // ISO datetime
  description?: string;
  completed?: boolean;
  importance?: string;     // "Pareto" | "High" | "Med-High" | "Medium" | "Med-Low" | "Low"
  goldValue?: number;
  campaign?: string;
  skillTags?: string[];
  duration?: number;       // minutes
  source?: string;         // "productivityquest" | "standalone" | "google"
  calendarColor?: string;  // hex from Google Calendar
  calendarName?: string;
  recurType?: string;
  googleEventId?: string;
}
```

### `DragState`

```typescript
interface DragState {
  event: CalendarEvent;
  mode: DragMode;         // "move" | "resize-top" | "resize-bottom"
  minute: number;         // Current drag position (minute of day 0-1440)
  origStartMin: number;   // Original event start (minute of day)
  origEndMin: number;     // Original event end (minute of day)
}
```

---

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `HOUR_HEIGHT` | 60 | Pixels per hour row in the time grid |
| `TOTAL_HEIGHT` | 1440 | Total grid height (24 × 60px) |
| `SNAP_MINUTES` | 5 | Time snapping granularity |
| `MIN_DURATION` | 15 | Minimum event duration in minutes |
| `MOVE_THRESHOLD` | 15 | Pixels of vertical movement before cancelling a long-press (forgiving for finger wobble) |
| `EDGE_ZONE` | 18 | Pixels from top/bottom edge that triggers resize vs move (generous for finger taps) |

---

## Features

### 1. View Modes

| Mode | Columns | Navigation step | Notes |
|------|---------|----------------|-------|
| **Day** | 1 | ±1 day | Full-width single day |
| **3-Day** | 3 | ±3 days | Default on mobile; starts from current date |
| **Week** | 7 | ±7 days | Default on desktop; starts from Sunday |
| **Month** | 7×N grid | ±1 month | Compact dots view; tap day → switches to Day view |

- View preference persisted in `localStorage` under key `calendarView`
- "Today" button appears when not viewing current date/month

### 2. Auto-Scroll to Current Time

On page load or view/date change, the scroll container smoothly scrolls to position the current time (red indicator line) near the top of the viewport. Triggers after data finishes loading with a 150ms layout delay.

**Dependencies:** `[view, currentDate, isLoading]`
**Dedup:** Uses `lastScrollKeyRef` to avoid re-scrolling on data refetches.

### 3. Current Time Indicator

- Red dot + horizontal red line spanning the full column width
- Only shown on today's column (`isToday` check)
- Positioned at `(nowMinute / 1440) × TOTAL_HEIGHT`
- Uses `pointer-events-none` to not interfere with interactions

### 4. Event Color System

| Condition | Color |
|-----------|-------|
| Has `calendarColor` (Google) | Uses Google's color directly |
| Completed | Gray `#6b7280` |
| Pareto / High importance | Red `#ef4444` |
| Med-High | Orange `#f97316` |
| Medium | Yellow `#eab308` |
| Med-Low | Blue `#3b82f6` |
| Low | Green `#22c55e` |
| Default | Purple `#a855f7` |

### 5. Event Layout (Overlap Handling)

The `layoutEvents()` function implements a greedy column-packing algorithm:
1. Sort events by start time (then by duration descending for ties)
2. Place each event in the first available column where it doesn't overlap
3. Build connected overlap groups via sweep line
4. All events in the same overlap group share equal width (`100% / totalColumns`)

Events positioned with `left: ${col * colW}%` and `width: calc(${colW}% - 2px)`.

### 6. Draggability Rules

Only `productivityquest` and `standalone` source events are draggable/resizable. Google Calendar events are read-only (view detail only).

```typescript
function isDraggable(ev: CalendarEvent): boolean {
  return ev.source === "productivityquest" || ev.source === "standalone";
}
```

### 7. Midnight-Crossing Safety

The `safeEndMinute()` helper computes end-minute from timestamp difference rather than `minuteOfDay(end)`, which would return 0 for events crossing midnight. This prevents duration-0 bugs during resize/move.

```typescript
function safeEndMinute(start: Date, end: Date): number {
  const startMin = minuteOfDay(start);
  const durMin = Math.round((end.getTime() - start.getTime()) / 60000);
  return Math.max(startMin + MIN_DURATION, startMin + durMin);
}
```

---

## Interaction Model

### Desktop

| Action | Behavior |
|--------|----------|
| **Click** event | Opens EventDetailSheet |
| **Click + drag** middle | Moves event to new time (cursor: grabbing) |
| **Click + drag** top edge | Resizes start time (cursor: ns-resize) |
| **Click + drag** bottom edge | Resizes end time (cursor: ns-resize) |
| **Double-click** empty space | Opens NewEventModal at that time |
| **Swipe** (touch on desktop) | Navigate dates |

- Movement threshold of 15px before drag activates (prevents accidental drags on click)
- Edge detection zone: 18px from top/bottom border
- Resize handles: outside-edge only (touching inside event body = move, never accidental resize)
- Resize zone uses 4px "inside tolerance" — touching right at the edge (within 4px inside) also triggers resize

### Mobile (iOS Capacitor)

| Action | Behavior |
|--------|----------|
| **Tap** event | Shows speech-bubble action menu (View / Adjust) |
| **Tap** "View" in bubble | Opens EventDetailSheet |
| **Tap** "Adjust" in bubble | Enters resize/adjust mode for that event |
| **Drag** top/bottom handles (adjust mode) | Resizes event duration immediately (no long-press needed) |
| **Long-press** event body (adjust mode) | Enters move mode after 200ms |
| **Drag** during move mode | Moves event vertically, event expands to full column width |
| **Tap** "Done" banner | Exits adjust mode |
| **Tap** empty space (in adjust mode) | Exits adjust mode |
| **Tap** event (not in adjust mode) | Shows action bubble |
| **Double-tap** empty space | Opens NewEventModal |
| **Swipe left/right** | Navigate dates (60px threshold, must exceed vertical) |

### Move Drag — Full-Width Lift Effect

When an event is being moved (dragged vertically):
- The event **expands to full column width** (`left: 0`, `width: calc(100% - 2px)`)
- This "lifts" the event out of its overlap sub-column
- The event stays bounded within the day column — **never goes off-screen**
- Visual indicators: `z-30`, purple shadow, `opacity-90`, `scale-x-[1.02]`

### Resize/Adjust Mode (Mobile)

When "Adjust" is tapped:
1. The event gets a **purple ring highlight** (`ring-2 ring-purple-400/70`) + purple shadow
2. **Resize handles become prominent**: 40px wide, 6px tall purple bars
3. Handles extend **20px above/below** the event for easy grabbing
4. A floating **"Drag edges to resize"** banner appears at the top with safe-area-inset padding
5. **Other overlapping events get `pointerEvents: 'none'`** — touches pass through to the resize target
6. Edge detection zone increases to **36px** (vs 18px normal)
7. Touching the body of the resize event → long-press (200ms) to enter move mode
8. Touching near the resize handles → immediately starts resize (no long-press)
9. "Done" button or tapping empty space exits adjust mode

### Speech Bubble Positioning

The `EventActionBubble` component positions itself contextually near the tapped event:
- **Tap on left half of screen** → bubble appears to the **right**
- **Tap on right half of screen** → bubble appears to the **left**
- Vertically centered on tap point, shifted slightly up
- CSS triangle arrow points toward the event
- Clamped to screen edges (8px padding)
- Touch propagation stopped on bubble to prevent backdrop dismissal

### Auto-Scroll During Drag

When dragging/resizing near the viewport edges:
- **Threshold:** 60px from top/bottom edge of scroll container
- **Speed:** Quadratic acceleration, max 12px per frame at the very edge
- **Method:** `requestAnimationFrame` loop (not setInterval)
- **Position sync:** While auto-scrolling, drag position updates each frame based on `lastTouch` coordinates
- **Cleanup:** Auto-scroll stops on touch end/cancel

### Pre-Drag Cancel (Mobile)

During long-press wait (before drag activates):
- Only **vertical** movement exceeding `MOVE_THRESHOLD` (15px) cancels the long-press
- **Horizontal wobble** is tolerated (natural finger movement during long-press)
- Once drag is active, all movement is tracked

---

## Undo System

### Persistent Undo Button

A dedicated undo button lives in the top bar (next to the Today button):
- **Always visible** — dimmed gray (`text-gray-600`) when no action to undo
- **Yellow** (`text-yellow-400`) when an undo action is available
- No timeout — persists until used or replaced by a new action
- Clicking it: dismisses any active toast → executes undo → shows "Action undone" confirmation

### Toast Undo

Every drag/resize/sort operation shows a toast notification with an inline Undo button:
- **Move:** "Event set to 2:30pm — Moved from 1:00pm" + Undo
- **Resize:** "Duration changed — 1h → 1h 30m" + Undo
- **Sort:** "Sorted 5 tasks — Tasks ordered by priority" + Undo
- Toast duration: 10 seconds
- Tapping Undo: dismisses toast → reverts event → shows "Action undone" (1s)
- `fireOnce` pattern prevents double-tap from undoing twice on iOS

### Undo Mechanics

- **Optimistic revert:** Instantly updates query cache to restore original position
- **API revert:** Fires PATCH to restore original `scheduledTime` + `duration`
- **Sort undo:** Reverts ALL moved tasks to their original positions
- Each new action replaces the previous undo (only one level deep)

---

## Sort / Auto-Schedule

The sort button (↕ icon) reorders PQ tasks on the current day:

1. **Only PQ tasks** — Google Calendar and standalone events are treated as "fixed"
2. **Priority order:** Pareto > High > Med-High > Medium > Med-Low > Low
3. **Start cursor:** Current time (rounded up to next 5-min) or 8:00 AM, whichever is later
4. **Avoids overlaps** with fixed events (Google, standalone, completed PQ tasks)
5. **All events must finish by 9:30 PM**
6. **"Evening Routine"** task is pinned at 9:00 PM
7. **Tiebreaker:** Longer tasks placed first at same priority level
8. Full undo support (reverts all moved tasks)

---

## Data Flow

### Fetching

```
GET /api/google-calendar/events?year={Y}&month={M}
```

Returns unified events from all sources. Three queries run in parallel:
- Current month (primary)
- Previous month (for 3-day/week views crossing month boundaries)
- Next month (same reason)

Events are merged and deduplicated by `id`.

### Mutations

| Action | Source | Endpoint | Payload |
|--------|--------|----------|---------|
| **Move event** | standalone | `PATCH /api/standalone-events/:id` | `{ startTime }` |
| **Move event** | task | `PATCH /api/tasks/:id` | `{ scheduledTime }` |
| **Resize event** | standalone | `PATCH /api/standalone-events/:id` | `{ startTime, duration }` |
| **Resize event** | task | `PATCH /api/tasks/:id` | `{ scheduledTime, duration }` |
| **Create event** | standalone | `POST /api/standalone-events` | `{ title, startTime, duration, color }` |
| **Delete event** | standalone | `DELETE /api/standalone-events/:id` | — |
| **Unschedule task** | task | `POST /api/tasks/:id/unschedule` | `{ removeFromGoogleCalendar: true }` |

All mutations use **optimistic updates** (instant cache modification) followed by **delayed invalidation** (1.5s) via `scheduleInvalidation()`.

### Commit Logic (`commitDrag`)

When a drag/resize ends, the `commitDrag` function processes the final `DragState`:

- **Move:** Snaps to 5-min grid, keeps original duration, updates `scheduledTime` / `startTime`
- **Resize-top:** Calculates new start time + duration from drag position
- **Resize-bottom:** Keeps original start, calculates new duration from drag position

Each path: optimistic update → API mutation → set undo action → show toast with undo button.

---

## Component Details

### `CalendarPage` (default export)

Main orchestrator. Manages all state, mutations, and renders sub-components.

**Key State:**

| Variable | Type | Purpose |
|----------|------|---------|
| `currentDate` | `Date` | Currently focused date |
| `view` | `ViewMode` | Active view mode |
| `selectedEvent` | `CalendarEvent \| null` | Event showing in detail sheet |
| `tappedEvent` | `CalendarEvent \| null` | Event showing action bubble (mobile) |
| `tapPosition` | `{ x, y } \| null` | Screen position of last event tap |
| `drag` | `DragState \| null` | Active drag/resize state |
| `resizeEventId` | `string \| null` | Which event is in adjust/resize mode (mobile) |
| `lastUndoAction` | `{ label, undo } \| null` | Persistent undo action |
| `showNewEventModal` | `boolean` | New event form visibility |
| `isSorting` | `boolean` | Sort operation in progress |

### `TimeGridView`

Renders the scrollable time grid with sticky day headers. Accepts `scrollRef` for auto-scroll. Delegates event rendering to `DayColumn` instances. Passes through drag, resizeEventId, and all callbacks.

### `DayColumn` (React.memo)

The core interaction component. Renders events for one day with full touch/mouse handling.

**Key refs:**
- `colRef` — DOM reference for coordinate calculations
- `touchState` — Mutable touch tracking (avoids re-renders during drag)
- `autoScrollRef` — Auto-scroll state: `{ raf, speed, lastTouch }`
- `didInteractRef` — Flag to suppress synthetic onClick after touch/drag
- Callback refs (`onDragStartRef`, `onDragUpdateRef`, etc.) — Always-fresh references to parent callbacks

**Touch flow (mobile):**
1. `handleTouchStart` → In adjust mode: finds resize event via `querySelector('[data-event-id="..."]')`, checks touch proximity to bounding rect. If near handles → immediate resize start. If on body → registers long-press timer (200ms). If not near resize event → exits adjust mode.
2. `handleTouchStart` → Not in adjust mode: records event + touch position for tap detection.
3. `handleTouchMove` → Pre-drag: cancels if vertical movement > 15px (horizontal wobble tolerated). Active drag: updates drag position, triggers auto-scroll near edges.
4. `handleTouchEnd` → If active drag + moved: commits drag. If active but no movement: cancels. If not active: fires tap handler.

**Mouse flow (desktop):**
1. `handleMouseDown` → Captures start position, detects edge vs body, registers window-level move/up listeners.
2. `handleMouseMove` → If past 15px threshold, starts drag and updates position. Edge detection determines resize-top, resize-bottom, or move.
3. `handleMouseUp` → If drag started, commits; otherwise fires `onEventTap`.

### `EventActionBubble`

Mobile-only speech bubble appearing near tapped events. Two buttons:
- **View** (Eye icon) → opens detail sheet
- **Adjust** (Sliders icon) → enters resize/adjust mode (only for draggable events)

### `EventDetailSheet`

Full event detail modal. Bottom sheet on mobile, centered modal on desktop.
- Shows: title, time range, source badge, importance badge, description, skill tags, gold value, campaign
- Delete/unschedule button for modifiable events
- "Adjust" button on mobile for entering resize mode from detail view

### `NewEventModal`

Simple form for creating standalone events:
- Title (auto-focus, Enter to submit)
- Date picker + time picker
- Duration selector (15m / 30m / 1h / 1.5h / 2h / 3h)
- Default color: purple `#a855f7`

### `MonthView`

Grid calendar showing event dots per day. Tapping a day switches to Day view for that date.

---

## Responsive Behavior

| Aspect | Desktop | Mobile (iOS) |
|--------|---------|-------------|
| Container | `min-h-screen pt-24 pb-8 px-8` | `fixed inset-0` with safe area insets |
| Default view | Week (7 columns) | 3-Day (3 columns) |
| Time labels | Full (`9 AM`) | Compact (`9a`) |
| Hour label width | 56px | 28px (>3 cols) or 36px |
| Day header names | 3-letter (`Mon`) | 1-letter when >3 cols (`M`) |
| Event interaction | Direct click/drag | Tap → action bubble → View/Adjust |
| Resize handles | Subtle (20×3px, white/40) | Prominent in adjust mode (40×6px, purple) |
| Resize trigger | Top/bottom edge detection (18px) | Outside-edge only; 36px zone in adjust mode |
| Move trigger | Click + drag past 15px | Long-press (200ms) in adjust mode |
| Move visual | Event stays in its column | Event expands to full column width (lift effect) |
| Undo | Top-bar button + toast | Top-bar button + toast (single-tap iOS fix) |
| Settings link | In top bar | Compact icon in top bar |
| Detail sheet | Centered modal | Bottom sheet with drag handle |
| Resize banner | N/A | Floating pill at top with safe-area padding |

---

## Touch Handling Details (iOS)

### Why Native Touch Listeners?

iOS WebView (Capacitor) uses passive touch listeners by default. React's synthetic `onTouchStart`/`onTouchMove` cannot call `e.preventDefault()` on passive listeners. Without `preventDefault()`, the browser scrolls the page during drag, creating a broken experience. Native listeners with `{ passive: false }` are required.

### Scroll Lock During Adjust Mode

When `resizeEventId` is set, the scroll container gets `touchAction: 'none'` set imperatively (via `useEffect` on `scrollRef.current.style.touchAction`). This prevents the browser from scrolling during resize, but keeps `overflow: auto` so programmatic auto-scroll still works.

### Overlap Priority in Adjust Mode

When an event is in adjust mode and overlaps with other events:
- The adjusting event gets `z-30` (on top)
- All other events get `pointerEvents: 'none'` — touches pass through them
- The resize event is found via `querySelector('[data-event-id="..."]')` rather than `findEventId(target)` (which could walk up to a wrong overlapping event)
- Touch proximity is checked against the resize event's bounding rect, not the touch target

### Toast Undo on iOS

The toast Undo button uses a `fireOnce()` pattern:
- Wraps the undo function with a permanent `firedRef` lock
- Both `onTouchEnd` and `onClick` handlers fire the wrapped function
- Whichever fires first executes the undo; the other is a no-op
- Prevents double-undo from iOS's touch → click event sequence

---

## Tech Stack

- **React 18** + TypeScript
- **TanStack Query** for data fetching + cache invalidation
- **Capacitor 7** for iOS native wrapper
- **wouter** for routing (`<Link href="...">`)
- **Tailwind CSS** + `animate-in` utilities
- **lucide-react** for icons
- **Radix UI** primitives (`Button`, `Badge`)

---

## File Structure Context

```
client/src/pages/calendar.tsx         ← This file (~1975 lines)
client/src/components/ui/toast.tsx    ← Custom toast with fireOnce pattern
client/src/hooks/use-toast.ts         ← useToast() hook with dismiss()
client/src/lib/queryClient.ts         ← apiRequest(), invalidateCalendarEvents()
client/src/hooks/use-mobile.ts        ← useIsMobile() hook
server/routes.ts                      ← API endpoints (PATCH tasks, standalone events, etc.)
```

---

## Known Behaviors & Edge Cases

1. **Google Calendar events are read-only** — no drag/resize, only view detail
2. **5-minute snap grid** — all event times snap to nearest 5 minutes
3. **15-minute minimum duration** — events cannot be resized shorter than 15 minutes
4. **Cross-month data loading** — previous and next month events loaded for 3-day/week views
5. **View persistence** — selected view mode saved to localStorage
6. **Auto-scroll timing** — waits for `isLoading` to become false + 150ms layout delay, deduped by `lastScrollKeyRef`
7. **Touch propagation** — action bubble stops all touch events to prevent backdrop dismissal
8. **Double-tap detection** — 350ms window for detecting double-tap on empty space
9. **Swipe threshold** — 60px horizontal movement required, must exceed vertical movement
10. **Swipe suppressed during drag** — `swipeRef` logic checks `drag` state
11. **Midnight-crossing events** — `safeEndMinute()` prevents duration-0 bugs
12. **Resize handle outside-only** — Touching inside the event body always triggers move, never accidental resize (4px inside tolerance)
13. **Full-width drag** — During move, event expands to `left: 0, width: calc(100% - 2px)` to prevent off-screen clipping
14. **Delayed invalidation** — Server refetch delayed 1.5s after mutations to keep optimistic UI stable
15. **Single undo level** — Each new action replaces the previous undo; only one undo available at a time
16. **Sort respects fixed events** — Google Calendar, standalone, and completed PQ events are never moved by sort
17. **Evening Routine pinned** — Sort always places "Evening Routine" task at 9:00 PM

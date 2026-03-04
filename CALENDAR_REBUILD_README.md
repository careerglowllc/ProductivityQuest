# Calendar Rebuild — Apple Calendar-Style UI

> **File:** `client/src/pages/calendar.tsx` (~1275 lines)
> **Route:** `/calendar`
> **Last updated:** March 3, 2026

## Overview

A from-scratch rebuild of the ProductivityQuest calendar, replacing the previous implementation with a clean Apple Calendar-style time-grid UI. Built as a single self-contained React component file with no external calendar library dependencies.

### Design Goals

- Apple Calendar-inspired visual language (dark theme, purple accent palette)
- Responsive: full desktop layout + compact iOS Capacitor mobile layout
- Unified event display: ProductivityQuest tasks, standalone events, and Google Calendar events
- Direct manipulation: drag-to-move (desktop), edge-drag to resize, tap-to-view
- Mobile-first interaction: speech-bubble action menu, explicit resize mode
- 5-minute snap grid, smooth animations, current-time indicator with auto-scroll

---

## Architecture

### Component Hierarchy

```
CalendarPage (default export)
├── TopBar (navigation, today button, new event, settings)
├── ViewSwitcher (day / 3-day / week / month tabs)
├── MonthView (month grid with event dots)
├── TimeGridView (day headers + scrollable time grid)
│   └── DayColumn (React.memo) × N columns
│       ├── Hour grid lines (24 rows)
│       ├── Current time indicator (red line + dot)
│       └── Event blocks (positioned absolutely)
│           ├── Top resize handle
│           ├── Event content (title, time, source)
│           └── Bottom resize handle
├── EventActionBubble (mobile speech-bubble submenu)
├── EventDetailSheet (full event detail modal/sheet)
└── NewEventModal (create standalone event form)
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Single file | All calendar logic co-located; avoids cross-file state management complexity |
| No calendar library | Full control over touch handling, snapping, and Capacitor iOS compatibility |
| `React.memo` on DayColumn | Prevents re-render of all columns when only one column's drag state changes |
| Refs for touch state | Avoids re-render on every touch move; mutable state lives in `useRef` |
| Position-based speech bubble | Bubble appears near tapped event, flips sides to avoid screen edge clipping |

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

### `ViewMode`

```typescript
type ViewMode = "day" | "3day" | "week" | "month";
```

### `DragMode`

```typescript
type DragMode = "move" | "resize-top" | "resize-bottom";
```

### `DragState`

```typescript
interface DragState {
  event: CalendarEvent;
  mode: DragMode;
  minute: number;        // Current drag position (minute of day 0-1440)
  origStartMin: number;  // Original event start (minute of day)
  origEndMin: number;    // Original event end (minute of day)
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
| `MOVE_THRESHOLD` | 8 | Pixels of movement before a drag starts (prevents accidental drags) |
| `EDGE_ZONE` | 10 | Pixels from top/bottom edge that triggers resize vs move |

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
3. All events in the same overlap group share equal width (`100% / totalColumns`)

### 6. Draggability Rules

Only `productivityquest` and `standalone` source events are draggable/resizable. Google Calendar events are read-only (view detail only).

```typescript
function isDraggable(ev: CalendarEvent): boolean {
  return ev.source === "productivityquest" || ev.source === "standalone";
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

- Movement threshold of 8px before drag activates (prevents accidental drags on click)
- Edge detection zone: 10px from top/bottom border

### Mobile (iOS Capacitor)

| Action | Behavior |
|--------|----------|
| **Tap** event | Shows speech-bubble action menu (View / Adjust) |
| **Tap** "View" in bubble | Opens EventDetailSheet |
| **Tap** "Adjust" in bubble | Enters resize mode for that event |
| **Drag** top/bottom handles (resize mode) | Resizes event duration |
| **Tap** "Done" banner | Exits resize mode |
| **Tap** elsewhere | Dismisses action bubble |
| **Double-tap** empty space | Opens NewEventModal |
| **Swipe left/right** | Navigate dates (60px threshold) |

### Speech Bubble Positioning

The `EventActionBubble` component positions itself contextually near the tapped event:
- **Tap on left half of screen** → bubble appears to the **right**
- **Tap on right half of screen** → bubble appears to the **left**
- Vertically centered on tap point, shifted slightly up
- CSS triangle arrow points toward the event
- Clamped to screen edges (8px padding)
- Touch propagation stopped on bubble to prevent backdrop dismissal

### Resize Mode

When "Adjust" is tapped on mobile:
1. The event gets a purple ring highlight + expanded handles
2. Edge detection zone increases from 10px to 24px for easier grabbing
3. A floating "Drag edges to resize" banner appears at the bottom
4. Touching the middle of the event shows the action bubble again
5. "Done" button exits resize mode

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

All mutations invalidate calendar event queries on success via `invalidateCalendarEvents(queryClient)`.

### Commit Logic (`commitDrag`)

When a drag/resize ends, the `commitDrag` function processes the final `DragState`:

- **Move:** Snaps to 5-min grid, keeps original duration, updates `scheduledTime` / `startTime`
- **Resize-top:** Calculates new start time + duration from drag position
- **Resize-bottom:** Keeps original start, calculates new duration from drag position

---

## Component Details

### `CalendarPage` (default export)

Main orchestrator. Manages all state, mutations, and renders sub-components.

**State:**

| Variable | Type | Purpose |
|----------|------|---------|
| `currentDate` | `Date` | Currently focused date |
| `view` | `ViewMode` | Active view mode |
| `selectedEvent` | `CalendarEvent \| null` | Event showing in detail sheet |
| `tappedEvent` | `CalendarEvent \| null` | Event showing action bubble (mobile) |
| `tapPosition` | `{ x, y } \| null` | Screen position of last event tap |
| `drag` | `DragState \| null` | Active drag/resize state |
| `resizeEventId` | `string \| null` | Which event is in resize mode (mobile) |
| `showNewEventModal` | `boolean` | New event form visibility |
| `newEventDate/Time/Title/Duration` | `string` | New event form fields |

### `TimeGridView`

Renders the scrollable time grid with sticky day headers. Accepts `scrollRef` for auto-scroll. Delegates event rendering to `DayColumn` instances.

### `DayColumn` (React.memo)

The core interaction component. Renders events for one day with full touch/mouse handling.

**Key refs:**
- `colRef` — DOM reference for coordinate calculations
- `touchState` — Mutable touch tracking (avoids re-renders during drag)
- `didInteractRef` — Flag to suppress synthetic onClick after touch/drag

**Touch flow (mobile):**
1. `handleEventTouchStart` → stores event + touch position in `touchState`
2. `handleTouchMove` (native listener) → if in resize mode and active, updates drag state
3. `handleTouchEnd` → if no movement detected, fires `onEventTap`; if drag completed, fires `onDragEnd`

**Mouse flow (desktop):**
1. `handleMouseDown` → captures start position, registers window-level move/up listeners
2. `handleMouseMove` → if past threshold, starts drag and updates position
3. `handleMouseUp` → if drag started, commits; otherwise fires `onEventTap`

### `EventActionBubble`

Mobile-only speech bubble appearing near tapped events. Two buttons:
- **View** (Eye icon) → opens detail sheet
- **Adjust** (Sliders icon) → enters resize mode (only for draggable events)

Positioned dynamically based on tap coordinates with screen-edge clamping and side-flipping.

### `EventDetailSheet`

Full event detail modal. Bottom sheet on mobile, centered modal on desktop.
- Shows: title, time range, source badge, importance badge, description, skill tags, gold value, campaign
- Delete/unschedule button for modifiable events

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
| Resize handles | Always visible (subtle) | Only in explicit resize mode (prominent) |
| Settings link | In top bar | Compact icon in top bar |
| Detail sheet | Centered modal | Bottom sheet with drag handle |

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
client/src/pages/calendar.tsx    ← This file (1275 lines)
client/src/lib/queryClient.ts    ← apiRequest(), invalidateCalendarEvents()
client/src/hooks/use-mobile.ts   ← useIsMobile() hook
server/routes.ts                 ← API endpoints (PATCH tasks, standalone events, etc.)
```

---

## Known Behaviors & Edge Cases

1. **Google Calendar events are read-only** — no drag/resize, only view detail
2. **5-minute snap grid** — all event times snap to nearest 5 minutes
3. **15-minute minimum duration** — events cannot be resized shorter than 15 minutes
4. **Cross-month data loading** — previous and next month events loaded for 3-day/week views
5. **View persistence** — selected view mode saved to localStorage
6. **Auto-scroll timing** — waits for `isLoading` to become false + 150ms layout delay
7. **Touch propagation** — action bubble stops all touch events to prevent backdrop dismissal
8. **Double-tap detection** — 350ms window for detecting double-tap on empty space
9. **Swipe threshold** — 60px horizontal movement required, must exceed vertical movement

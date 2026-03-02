# Mobile UX Features — ProductivityQuest iOS App

> Comprehensive guide to all mobile-specific UI/UX features in the ProductivityQuest iOS Capacitor app.  
> Last updated: March 2, 2026

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Task Detail Modal — Swipe Down to Close](#task-detail-modal--swipe-down-to-close)
- [Calendar View — Swipe Navigation](#calendar-view--swipe-navigation)
- [Toast Notifications — Swipe to Dismiss](#toast-notifications--swipe-to-dismiss)
- [Mobile Quest Header — Clean Layout](#mobile-quest-header--clean-layout)
- [Task Selection Bar — Two-Row Grid](#task-selection-bar--two-row-grid)
- [Batch Actions — Push, Overdue→Today, Reschedule](#batch-actions--push-overduetoday-reschedule)
- [Reschedule Calendar Overlay](#reschedule-calendar-overlay)
- [Task Filters — Compact Layout](#task-filters--compact-layout)
- [Task Cards — Importance Border Colors](#task-cards--importance-border-colors)
- [Task Cards — Gold Display](#task-cards--gold-display)
- [Emoji Picker — Shapes & Symbols](#emoji-picker--shapes--symbols)
- [Timezone Handling](#timezone-handling)
- [Calendar Sync — Google Calendar](#calendar-sync--google-calendar)
- [Task Completion — Gold & XP Rewards](#task-completion--gold--xp-rewards)
- [iOS-Specific Gotchas](#ios-specific-gotchas)

---

## Architecture Overview

- **Framework**: React 18.3.1 + TypeScript
- **Mobile wrapper**: Capacitor 7.x for iOS
- **Remote URL**: App loads from `https://productivityquest.onrender.com` (configured in `capacitor.config.ts`)
- **Mobile detection**: `useIsMobile()` hook returns `true` for viewport < 768px
- **Bottom tab bar**: Fixed `bottom-0`, `h-16` (4rem), respects `safe-area-inset-bottom`
- **TestFlight distribution**: Built via Xcode, distributed through Apple TestFlight

### Key Files

| File | Purpose |
|------|---------|
| `client/src/pages/home.tsx` | Main quest/task page — filters, selection bar, batch actions, calendar overlay |
| `client/src/components/task-card.tsx` | Task card rendering for mobile, compact/grid, desktop views |
| `client/src/components/task-detail-modal.tsx` | Full-screen task detail modal with swipe-down-to-close |
| `client/src/components/emoji-picker.tsx` | Searchable emoji picker with keyword database |
| `client/src/components/ui/toast.tsx` | Custom swipe-to-dismiss toasts |
| `client/src/components/ui/toaster.tsx` | Toast container with swipe threshold override |
| `client/src/pages/calendar.tsx` | Calendar view with swipe navigation |

---

## Task Detail Modal — Swipe Down to Close

**File**: `task-detail-modal.tsx`

### How It Works

Users can swipe down on the task detail modal to close it. The modal content follows the finger with a 1:1 drag, and closing is triggered when the drag exceeds a threshold.

### Implementation Details

1. **Callback ref** on inner wrapper div (not `useEffect` + `contentRef`) — because Radix `DialogPortal` renders asynchronously, `contentRef.current` is null when `useEffect` fires
2. **Native `addEventListener`** with `{ passive: false }` — React's `onTouchMove` is registered as passive in iOS WebView, which cannot call `preventDefault()`
3. **Scrollable parent detection**: `handleTouchStart` walks the DOM tree from the touch target upward to find any scrollable ancestor (`scrollHeight > clientHeight + 1`)
4. **Scroll guard**: Only begins swiping when `startScrollTop <= 2 && currentScrollTop <= 2 && deltaY > 5` — prevents swipe-to-close from triggering while scrolling content
5. **Radix animation override**: `!animate-none` class on mobile `DialogContent` to disable conflicting Radix open/close animations that fight with `translateY`
6. **Stable closure**: `onOpenChangeRef` prevents stale closure of `onOpenChange` prop

### Key Code Pattern

```tsx
const swipeCallbackRef = useCallback((node: HTMLDivElement | null) => {
  if (!node) return;
  node.addEventListener("touchstart", handleTouchStart, { passive: true });
  node.addEventListener("touchmove", handleTouchMove, { passive: false });
  node.addEventListener("touchend", handleTouchEnd, { passive: true });
}, []);
```

### Thresholds

- Minimum Y delta to start tracking: **5px**
- Close threshold: **80px** OR velocity > **0.5px/ms**
- Scroll tolerance: top **2px** (not strict 0)

---

## Calendar View — Swipe Navigation

**File**: `calendar.tsx`

### How It Works

Horizontal swipe on the calendar view navigates between days/weeks/months. The content follows the finger with 1:1 tracking, then animates to the next/previous period on release.

### Implementation Details

- Native touch event listeners with `{ passive: false }` for `touchmove`
- 1:1 finger tracking via CSS `translateX` during drag
- Swipe threshold: **50px** or velocity check on release
- Animated transition to next/previous day/week on release
- Prevents vertical scroll interference during horizontal swipe

---

## Toast Notifications — Swipe to Dismiss

**File**: `toast.tsx`, `toaster.tsx`

### Problem

Radix UI's Sonner toast `pointer-events` don't fire in iOS Capacitor WebView — the built-in swipe-to-dismiss is completely broken.

### Solution

Custom native touch handlers replace Radix's swipe system:

1. `swipeThreshold={10000}` in `toaster.tsx` disables Radix's built-in swipe (threshold too high to reach)
2. Custom `onTouchStart` / `onTouchMove` / `onTouchEnd` handlers on each toast element
3. Horizontal swipe detection with **50px** threshold
4. `translateX` follows finger, then animates off-screen on release
5. Calls `toast.dismiss(id)` after animation completes

---

## Mobile Quest Header — Clean Layout

**File**: `home.tsx`

### Design

On mobile, the quest page has no top header bar. The "Your Quests (138)" title sits at the very top of the page (with safe-area-inset padding), followed immediately by the search bar + Add/File buttons.

- **Gold display**: Removed from quest page header — visible on task cards and dashboard
- **Profile/settings**: Accessible via bottom tab navigation
- **Desktop**: Retains the QuestList logo header with nav links

### Layout Order (Mobile)

1. `Your Quests (138)` title
2. Search bar + `+ Add` + `File` buttons (single row)
3. Filter bar (compact single row with flex-wrap)
4. Task list / grid

---

## Task Selection Bar — Two-Row Grid

**File**: `home.tsx`

### Design

When tasks are selected, a fixed bar appears above the bottom tab. It uses two rows on mobile:

**Row 1** (4-column grid):
- ✅ **Complete** — marks selected tasks as done
- 📅 **Calendar** — dropdown: Sync / Remove from Calendar / Clear ALL Calendar
- 📁 **Organize** — dropdown: categorize, skills
- ⋯ **More** — dropdown: Delete, Delete from Notion, Notion sync actions

**Row 2** (3-column grid):
- 📆 **Push** — dropdown with day options: +1, +2, +3, +7, +14, +30
- ⏰ **Overdue→Today** — moves all overdue tasks to today's date
- 🗓️ **Reschedule** — opens calendar overlay to pick a new date

### Position

- Fixed at `bottom-[calc(4rem+env(safe-area-inset-bottom))]` — sits above the tab bar
- `z-40` layer

---

## Batch Actions — Push, Overdue→Today, Reschedule

**File**: `home.tsx`

### Push (Postpone) Tasks

Pushes selected tasks' due dates forward by N days. Available options: +1, +2, +3, +7, +14, +30 days.

- Uses **local timezone** for date calculation
- Creates UTC midnight of the new local date: `new Date(Date.UTC(localYear, localMonth, localDay + N))`
- Batch mutation via `PATCH /api/tasks/:id`

### Overdue → Today

Finds all selected tasks whose due date is before today and moves them to today.

- Uses **local timezone** `now.getFullYear()/getMonth()/getDate()` (not UTC) to determine "today"
- Only affects tasks with `dueDate < todayStartUTC`

### Reschedule

Opens a calendar overlay where user picks a specific date. All selected tasks are moved to that date.

- Calendar overlay: backdrop + centered card
- **Tap outside to dismiss**: both backdrop and centering div have `onClick` to close, calendar card has `stopPropagation`

---

## Reschedule Calendar Overlay

**File**: `home.tsx`

### Design

Full-screen overlay with translucent backdrop and centered calendar picker card.

### Dismiss Behavior

- Tapping outside the calendar card dismisses it (acts as Cancel)
- The centering container (`z-[71]`) has its own `onClick` handler because it was previously intercepting clicks before the backdrop's handler
- Calendar card uses `onClick={(e) => e.stopPropagation()}` to prevent bubble-through

---

## Task Filters — Compact Layout

**File**: `home.tsx`

### Mobile Layout

All filter pills and controls sit in a single flex-wrap row inside a Card:

| Element | Type |
|---------|------|
| All (N) | Badge |
| Today (N) | Badge |
| Priority (N) | Badge |
| More ▾ | Dropdown (High Reward, Quick Tasks, Routines) |
| 💼 Business (N) | Dropdown (Apple, General, MW) |
| All/None | Button — select/deselect all visible tasks |
| Grid/List toggle | Button — icon-only |

- Badge height: `text-[10px] px-2 py-1`
- Button height: `h-[22px]` to match badge height
- All/None + Grid toggle float right via `ml-auto`
- Filter state persisted to `localStorage` key `tasksFilter`

### Desktop Layout

Full-width row with larger badges, all filter types visible, plus Sort dropdown (Due Date / Importance).

---

## Task Cards — Importance Border Colors

**File**: `task-card.tsx`

### Color Mapping

| Importance | Border Color | Selected Border |
|------------|-------------|-----------------|
| Pareto | `border-red-500/70` | `border-red-500` + shadow |
| High | `border-red-500/50` | `border-red-500` + shadow |
| Med-High | `border-orange-500/50` | `border-orange-500` + shadow |
| Medium | `border-yellow-500/50` | `border-yellow-500` + shadow |
| Med-Low | `border-blue-400/50` | `border-blue-400` + shadow |
| Low | `border-green-400/50` | `border-green-400` + shadow |

### Key Functions

- `getImportanceBorder(importance)` — returns unselected border class
- `getImportanceBorderSelected(importance)` — returns brighter border + `shadow-md` for selected state

### Design Principle

Selection **brightens** the importance border color instead of overriding with a generic yellow. This preserves visual priority information even when tasks are selected.

---

## Task Cards — Gold Display

**File**: `task-card.tsx`

Gold is shown in the mobile meta row using the Lucide `Coins` icon (2D, simple style) instead of the 🪙 emoji (which looked too 3D).

```tsx
<Coins className="w-3 h-3 text-yellow-400" />
<span>{gold}</span>
```

### Meta Row Order (Mobile)

Importance dot · Duration · Date · Recurrence icon · Skill icons · Gold (Coins icon)

---

## Emoji Picker — Shapes & Symbols

**File**: `emoji-picker.tsx`

### Categories

| Category | Examples |
|----------|---------|
| Common | 📝 📋 ⭐ 🚀 🔥 ✨ |
| Work | 💼 💻 📊 📧 ⏰ |
| Health | 🏃 🧘 💊 🏋️ |
| Learn | 📖 🎓 🧪 🎨 |
| Clothing | 👕 👗 👟 👒 |
| Life | 🏠 🛒 🚗 🌅 |
| Fun | 🎮 🎲 ⚽ 🏀 |
| Food | ☕ 🍕 🍔 🍣 |
| Nature | 🌳 🌊 🦋 🌺 |
| Tools | ⚙️ 🔧 🔨 🔑 |
| **Shapes** | 🔴🟠🟡🟢🔵🟣🟤⚫⚪ · 🟥🟧🟨🟩🟦🟪🟫⬛⬜ · ◼️◻️◾◽▪️▫️ · 🔺🔻🔶🔷 · ♦️♠️♣️♥️ · ●○■□▲▼◆◇ |
| **Lines** | 〰️➰➿〽️ · ✴️❇️✳️ · │─╱╲┼═║ · ➡️⬅️⬆️⬇️↗️↘️↙️↖️↕️↔️🔄🔃 |
| Symbols | ♾️💲⚛️☮️☯️💯‼️⁉️❌©️®️™️🏁🚩 |

### Search

Keyword-based search with scoring:
- **Exact match** = score 3
- **Prefix match** = score 2
- **Substring match** = score 1

Example: searching "circle" returns 🔴🟠🟡🟢🔵🟣🟤⚫⚪🔘⭕●○ etc.

---

## Timezone Handling

### Critical Rule

**Always use local timezone** for "today" calculations, never UTC:

```typescript
// ✅ CORRECT — local timezone
const now = new Date();
const todayStartUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

// ❌ WRONG — at 9:25 PM PST, UTC is already the next day
const todayStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
```

### Date Storage Convention

Dates are stored as **midnight UTC of the local date**. For example, if the user is in PST and it's March 1 at 9:25 PM:
- Local date = March 1
- Stored as `2025-03-01T00:00:00.000Z`

### Locations Using Local Timezone

1. `handleMoveOverdueToToday` — "today" boundary for overdue detection
2. `getFilterCounts` — "due today" count  
3. Due-today filter — task filtering
4. Batch grouping — date headers in sorted lists
5. `handleRescheduleSelected` — date picker value conversion
6. `handlePushDays` — push day calculation fallback

---

## Calendar Sync — Google Calendar

### Sync Flow

1. User selects tasks → taps Calendar → Sync to Calendar
2. Tasks with due dates are sent to Google Calendar via API
3. Events created in user's primary Google Calendar
4. Calendar events reference task IDs for bi-directional sync

### Sync Actions (Selection Bar)

| Action | Description |
|--------|------------|
| Sync to Calendar | Creates Google Calendar events for selected tasks |
| Remove from Calendar | Deletes Google Calendar events for selected tasks |
| Clear ALL Calendar | Removes all synced events from Google Calendar |

### Error Handling

- Expired OAuth tokens surface a destructive toast
- Sync results show detailed breakdown: "X tasks synced (Y new, Z already in calendar)"

---

## Task Completion — Gold & XP Rewards

### Flow

1. User taps Complete (individual or batch)
2. Task marked as `completed: true`
3. Gold earned based on task properties (importance, duration, etc.)
4. XP distributed to associated skills
5. Recurring tasks: automatically rescheduled to next due date instead of completing

### Gold Display

- Task cards show gold value in meta row
- Dashboard shows total gold
- Completion modal shows gold earned

---

## iOS-Specific Gotchas

### 1. Radix UI Pointer Events

**Problem**: Radix UI components use `pointer-events` which don't fire in iOS Capacitor WebView.  
**Solution**: Replace with native `touchstart`/`touchmove`/`touchend` listeners.  
**Affected**: Toast swipe, modal swipe, any Radix draggable.

### 2. React `onTouchMove` is Passive

**Problem**: React registers `onTouchMove` as a passive event in iOS, so `e.preventDefault()` is ignored (cannot prevent scroll during swipe).  
**Solution**: Use native `element.addEventListener("touchmove", handler, { passive: false })`.

### 3. React Query Cache Invalidation

**Problem**: `queryClient.invalidateQueries({ queryKey: ["calendar-events"] })` uses **array element equality**, not substring matching. `["/api/calendar/events"]` won't match.  
**Solution**: Match the exact query key array used in `useQuery`.

### 4. Safe Area Insets

iOS devices with notch/Dynamic Island need safe-area padding:
- Top content: `pt-[calc(env(safe-area-inset-top)+0.5rem)]`
- Bottom tab bar: `pb-[env(safe-area-inset-bottom)]`
- Bottom-fixed elements: `bottom-[calc(4rem+env(safe-area-inset-bottom))]`

### 5. Portal Timing

Radix `DialogPortal` renders asynchronously. A `useEffect` that reads `contentRef.current` will find it null.  
**Solution**: Use **callback refs** which fire when the DOM node actually mounts.

---

## Related Documentation

- `MOBILE_DEVELOPMENT.md` — Capacitor build/deploy workflow
- `IOS_DEVELOPMENT_GUIDE.md` — Xcode, signing, TestFlight
- `GOOGLE_CALENDAR_SYNC_README.md` — Calendar sync implementation
- `CALENDAR_DRAG_DROP_FEATURE.md` — Calendar drag/resize
- `CUSTOM_SKILLS.md` — Skills system
- `README.md` — Full project overview

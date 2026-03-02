# Mobile UX Test Cases — ProductivityQuest iOS App

> Manual test cases for all mobile-specific UI/UX features.  
> Last updated: March 2, 2026

---

## Table of Contents

- [Task Detail Modal — Swipe Down to Close](#task-detail-modal--swipe-down-to-close)
- [Calendar Swipe Navigation](#calendar-swipe-navigation)
- [Toast Swipe to Dismiss](#toast-swipe-to-dismiss)
- [Quest Page Header](#quest-page-header)
- [Task Selection Bar](#task-selection-bar)
- [Batch Actions — Push Tasks](#batch-actions--push-tasks)
- [Batch Actions — Overdue to Today](#batch-actions--overdue-to-today)
- [Batch Actions — Reschedule](#batch-actions--reschedule)
- [Task Filters](#task-filters)
- [Task Card Importance Borders](#task-card-importance-borders)
- [Task Card Gold Display](#task-card-gold-display)
- [Emoji Picker](#emoji-picker)
- [Timezone Handling](#timezone-handling)
- [Google Calendar Sync](#google-calendar-sync)
- [Task Completion](#task-completion)

---

## Task Detail Modal — Swipe Down to Close

### TC-MODAL-001: Basic swipe down closes modal
**Steps**: Open any task → swipe down with finger  
**Expected**: Modal follows finger, closes when dragged > 80px  
**Verify**: Task list is visible after close

### TC-MODAL-002: Swipe too short bounces back
**Steps**: Open task → swipe down < 40px → release  
**Expected**: Modal animates back to full position, stays open

### TC-MODAL-003: Scrollable content doesn't trigger close
**Steps**: Open task with long description → scroll content up/down  
**Expected**: Content scrolls normally, swipe-to-close does NOT trigger

### TC-MODAL-004: Swipe at top of scrolled content
**Steps**: Open task → scroll content down → scroll back to top → swipe down  
**Expected**: Modal closes (scroll is at top, so swipe-to-close activates)

### TC-MODAL-005: Fast flick closes modal
**Steps**: Open task → quick fast flick downward (small distance, high velocity)  
**Expected**: Modal closes even if drag distance < 80px (velocity threshold)

### TC-MODAL-006: Double-tap to open then swipe
**Steps**: Double-tap a task card → modal opens → swipe down  
**Expected**: Modal opens on double-tap, closes on swipe-down

---

## Calendar Swipe Navigation

### TC-CAL-001: Swipe left to go forward
**Steps**: Open calendar → swipe left  
**Expected**: Calendar advances to next day/week/month (depending on view)

### TC-CAL-002: Swipe right to go back
**Steps**: Open calendar → swipe right  
**Expected**: Calendar goes to previous day/week/month

### TC-CAL-003: Content follows finger
**Steps**: Start swipe and hold mid-drag  
**Expected**: Calendar content is offset 1:1 with finger position

### TC-CAL-004: Short swipe bounces back
**Steps**: Swipe < 50px then release  
**Expected**: Calendar snaps back to current period, no navigation

### TC-CAL-005: Vertical scroll unaffected
**Steps**: Scroll vertically through calendar events  
**Expected**: Vertical scroll works normally, no horizontal swipe triggered

---

## Toast Swipe to Dismiss

### TC-TOAST-001: Swipe right dismisses toast
**Steps**: Trigger a toast (e.g., complete a task) → swipe toast to the right  
**Expected**: Toast slides off screen and disappears

### TC-TOAST-002: Swipe left dismisses toast
**Steps**: Trigger a toast → swipe toast to the left  
**Expected**: Toast slides off screen and disappears

### TC-TOAST-003: Partial swipe bounces back
**Steps**: Swipe toast < 50px then release  
**Expected**: Toast snaps back to center position

### TC-TOAST-004: Toast auto-dismisses
**Steps**: Trigger a toast → wait without touching  
**Expected**: Toast auto-dismisses after timeout

---

## Quest Page Header

### TC-HEADER-001: No gold/profile bar on mobile
**Steps**: Open quest page on mobile  
**Expected**: "Your Quests (N)" title is at the very top of the page (below safe area), no gold counter or profile avatar visible

### TC-HEADER-002: Safe area respected
**Steps**: Open quest page on iPhone with notch/Dynamic Island  
**Expected**: "Your Quests" title does not overlap with notch or Dynamic Island

### TC-HEADER-003: Search bar inline with buttons
**Steps**: View quest page  
**Expected**: Search input, + Add button, and File button are all in one row below the title

### TC-HEADER-004: Desktop retains header
**Steps**: Open quest page on desktop/wide screen  
**Expected**: QuestList logo header bar is visible at the top with navigation

---

## Task Selection Bar

### TC-SEL-001: Selection bar appears on task selection
**Steps**: Tap a task card checkbox  
**Expected**: Blue selection bar appears above bottom tab, shows "N selected"

### TC-SEL-002: Row 1 buttons work
**Steps**: Select tasks → check Row 1 buttons  
**Expected**: Complete, Calendar ▾, Organize ▾, More ▾ all visible in 4-column grid

### TC-SEL-003: Row 2 buttons work
**Steps**: Select tasks → check Row 2 buttons  
**Expected**: Push ▾, Overdue→Today, Reschedule all visible in 3-column grid

### TC-SEL-004: Dismiss selection
**Steps**: Tap X button on selection bar  
**Expected**: Selection cleared, bar disappears

### TC-SEL-005: Selection count updates
**Steps**: Select 3 tasks → deselect 1  
**Expected**: Counter shows "2 selected"

---

## Batch Actions — Push Tasks

### TC-PUSH-001: Push +1 day
**Steps**: Select a task due today → Push → +1 Day  
**Expected**: Task due date moves to tomorrow, toast confirms

### TC-PUSH-002: Push +7 days
**Steps**: Select tasks → Push → +1 Week  
**Expected**: All selected tasks move 7 days forward

### TC-PUSH-003: Push uses local timezone
**Steps**: At 11 PM local time, select a task due today → Push → +1 Day  
**Expected**: Task moves to tomorrow (local), NOT day-after-tomorrow (which UTC would give)

### TC-PUSH-004: Push multiple tasks
**Steps**: Select 5 tasks with different due dates → Push → +3 Days  
**Expected**: Each task's due date advances by 3 days from its original date

---

## Batch Actions — Overdue to Today

### TC-OVERDUE-001: Moves overdue tasks
**Steps**: Select tasks including some with past due dates → tap Overdue→Today  
**Expected**: Only overdue tasks are moved to today, already-current/future tasks unchanged

### TC-OVERDUE-002: Local timezone boundary
**Steps**: At 9:30 PM PST (when UTC is already next day), select task due today → tap Overdue→Today  
**Expected**: Task due today is NOT moved (it's not overdue), tasks from yesterday ARE moved

### TC-OVERDUE-003: No overdue tasks
**Steps**: Select only tasks due today or future → tap Overdue→Today  
**Expected**: Toast says "0 overdue tasks" or appropriate message

---

## Batch Actions — Reschedule

### TC-RESCH-001: Calendar overlay opens
**Steps**: Select tasks → tap Reschedule  
**Expected**: Calendar overlay appears with date picker

### TC-RESCH-002: Select date reschedules
**Steps**: In reschedule overlay → tap a date  
**Expected**: All selected tasks moved to chosen date, overlay closes

### TC-RESCH-003: Tap outside closes overlay
**Steps**: Open reschedule overlay → tap outside the calendar card  
**Expected**: Overlay closes without changing any dates (acts as Cancel)

### TC-RESCH-004: Calendar card tap doesn't close
**Steps**: Open reschedule overlay → tap within the calendar card (not on a date)  
**Expected**: Overlay stays open (click doesn't propagate to backdrop)

---

## Task Filters

### TC-FILTER-001: All filters visible in one row
**Steps**: View filter bar on mobile  
**Expected**: All, Today, Priority, More ▾, 💼 Business ▾, All/None, Grid toggle — all visible inline

### TC-FILTER-002: Filter badges switch
**Steps**: Tap "Today" filter  
**Expected**: Badge becomes active (gold gradient), task list shows only today's tasks

### TC-FILTER-003: More dropdown filters
**Steps**: Tap "More" ▾ filter  
**Expected**: Dropdown shows: Reward, Quick, Routines with counts

### TC-FILTER-004: Business dropdown filters  
**Steps**: Tap "💼 Business" ▾ filter  
**Expected**: Dropdown shows: Apple, General, MW with counts

### TC-FILTER-005: Select All / None toggle
**Steps**: Tap "All" button → tap "None" button  
**Expected**: All visible tasks selected → all deselected

### TC-FILTER-006: Grid/List toggle
**Steps**: Tap grid icon button  
**Expected**: Tasks switch from list to grid view (and back)

### TC-FILTER-007: Filter persists across sessions
**Steps**: Set filter to "Today" → navigate away → return to quests  
**Expected**: "Today" filter still active (persisted in localStorage)

---

## Task Card Importance Borders

### TC-BORDER-001: Unselected border matches importance
**Steps**: View tasks with different importance levels  
**Expected**: Red border for High/Pareto, orange for Med-High, yellow for Medium, blue for Med-Low, green for Low

### TC-BORDER-002: Selected border brightens
**Steps**: Select a "Medium" importance task  
**Expected**: Border becomes brighter yellow (not generic gold), plus subtle shadow glow

### TC-BORDER-003: Mixed selection shows individual colors
**Steps**: Select tasks with different importance levels  
**Expected**: Each selected task shows its own brightened importance color, not all the same

---

## Task Card Gold Display

### TC-GOLD-001: Coins icon visible
**Steps**: View a task card on mobile  
**Expected**: Lucide Coins icon (2D, not 🪙 emoji) shown in meta row with gold amount

### TC-GOLD-002: Gold in correct position
**Steps**: View task card meta row  
**Expected**: Gold is the last item in meta row (after importance, duration, date, recurrence, skills)

---

## Emoji Picker

### TC-EMOJI-001: Search finds brown circle
**Steps**: Open emoji picker → type "brown"  
**Expected**: 🟤 brown circle and 🟫 brown square appear in results

### TC-EMOJI-002: Search finds shapes
**Steps**: Type "triangle"  
**Expected**: 🔺🔻▲▼ appear in results

### TC-EMOJI-003: Search finds lines
**Steps**: Type "line"  
**Expected**: 〰️│─╱╲┼═║ and other line characters appear

### TC-EMOJI-004: Shapes category tab
**Steps**: Tap "Shapes" category tab  
**Expected**: Grid shows all colored circles, squares, diamonds, triangles, card suits, geometric shapes

### TC-EMOJI-005: Lines category tab
**Steps**: Tap "Lines" category tab  
**Expected**: Grid shows wavy lines, loops, box-drawing chars, arrows

### TC-EMOJI-006: Search "circle" finds all colors
**Steps**: Type "circle"  
**Expected**: At least 12 results including 🔴🟠🟡🟢🔵🟣🟤⚫⚪🔘⭕○●

---

## Timezone Handling

### TC-TZ-001: "Due Today" filter at 11 PM
**Steps**: At 11 PM local time (when UTC is next day), check Due Today filter  
**Expected**: Shows tasks due today (local), not tomorrow

### TC-TZ-002: Push +1 at 11 PM
**Steps**: At 11 PM PST, push a task +1 day  
**Expected**: Task moves to tomorrow (local March 2), not day-after-tomorrow (March 3)

### TC-TZ-003: Overdue detection at 11 PM  
**Steps**: At 11 PM PST, task due today → check if marked overdue  
**Expected**: Task is NOT overdue (it's still today locally)

### TC-TZ-004: Date grouping headers
**Steps**: View tasks sorted by due date with tasks due today and tomorrow  
**Expected**: "Today" and "Tomorrow" headers show correct dates based on local timezone

---

## Google Calendar Sync

### TC-GCAL-001: Sync tasks to calendar
**Steps**: Select tasks with due dates → Calendar ▾ → Sync to Calendar  
**Expected**: Tasks appear as events in Google Calendar, toast shows "X synced (Y new, Z existing)"

### TC-GCAL-002: Remove from calendar
**Steps**: Select synced tasks → Calendar ▾ → Remove from Calendar  
**Expected**: Events removed from Google Calendar

### TC-GCAL-003: Clear ALL calendar
**Steps**: Calendar ▾ → Clear ALL Calendar  
**Expected**: All synced events removed from Google Calendar

### TC-GCAL-004: Expired token error
**Steps**: Let OAuth token expire → try to sync  
**Expected**: Destructive toast with error message, not silent failure

### TC-GCAL-005: Calendar events in calendar view
**Steps**: Sync tasks → open Calendar view  
**Expected**: Synced tasks appear as color-coded events in calendar

---

## Task Completion

### TC-COMPLETE-001: Single task completion
**Steps**: Tap complete on a task  
**Expected**: Task marked complete, gold earned, XP distributed, completion animation

### TC-COMPLETE-002: Batch completion
**Steps**: Select multiple tasks → Complete  
**Expected**: All selected tasks completed, total gold shown

### TC-COMPLETE-003: Recurring task rescheduling
**Steps**: Complete a recurring task  
**Expected**: Task is NOT marked completed but instead moves to next occurrence date

### TC-COMPLETE-004: Gold earned matches card value
**Steps**: Note gold value on task card → complete task  
**Expected**: Gold earned in completion toast matches the card's displayed value

---

## Environment Notes

- **Device**: iPhone with notch or Dynamic Island
- **OS**: iOS 16+
- **App**: Capacitor WebView loading from remote URL
- **Timezone tests**: Best tested in western US timezone (PST/PDT) after 4 PM
- **Calendar tests**: Require Google Calendar OAuth setup in Settings

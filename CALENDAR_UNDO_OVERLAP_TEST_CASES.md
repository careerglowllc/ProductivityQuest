# Calendar Undo & Overlapping Events Test Cases

## Overview
Test cases for two new calendar features:
1. **Undo functionality** for drag/resize operations
2. **Side-by-side layout** for overlapping events (Apple Calendar style)

## Test Date
November 19, 2025

---

## UNDO FEATURE TEST CASES

### TC-UND-001: Undo Button Appears in Toast After Drag
**Preconditions:**
- User is logged in
- ProductivityQuest event visible in Day view calendar

**Steps:**
1. Drag an event to a new time slot
2. Release the event
3. Observe toast notification

**Expected Result:**
- Toast appears with title "Event Rescheduled"
- Toast shows updated time and duration
- Toast contains "Undo" button with Undo2 icon
- Toast stays visible for 5 seconds

**Status:** ⬜ Not Tested

---

### TC-UND-002: Undo Button Appears in Toast After Resize
**Preconditions:**
- User is logged in
- ProductivityQuest event visible in Day view calendar

**Steps:**
1. Drag bottom resize handle to change event duration
2. Release the resize handle
3. Observe toast notification

**Expected Result:**
- Toast appears with title "Duration Updated"
- Toast shows updated time and duration
- Toast contains "Undo" button with Undo2 icon
- Toast stays visible for 5 seconds

**Status:** ⬜ Not Tested

---

### TC-UND-003: Click Undo Button Reverts Drag
**Preconditions:**
- Event has been dragged to new position
- Toast with Undo button is visible

**Steps:**
1. Click "Undo" button in toast
2. Observe event behavior

**Expected Result:**
- Event instantly moves back to original position
- Toast shows "Undone" message
- Backend receives revert request
- Original time and date restored

**Status:** ⬜ Not Tested

---

### TC-UND-004: Click Undo Button Reverts Resize
**Preconditions:**
- Event has been resized
- Toast with Undo button is visible

**Steps:**
1. Click "Undo" button in toast
2. Observe event behavior

**Expected Result:**
- Event instantly returns to original height
- Toast shows "Undone" message
- Backend receives revert request
- Original duration restored

**Status:** ⬜ Not Tested

---

### TC-UND-005: Keyboard Shortcut Cmd+Z (Mac) Undoes Drag
**Preconditions:**
- User on macOS
- Event has been dragged to new position

**Steps:**
1. Press `Cmd + Z` on keyboard
2. Observe event behavior

**Expected Result:**
- Event instantly reverts to original position
- Toast shows "Undone" message
- Backend syncs reverted state
- Works even if toast was dismissed

**Status:** ⬜ Not Tested

---

### TC-UND-006: Keyboard Shortcut Ctrl+Z (Windows) Undoes Drag
**Preconditions:**
- User on Windows/Linux
- Event has been resized

**Steps:**
1. Press `Ctrl + Z` on keyboard
2. Observe event behavior

**Expected Result:**
- Event instantly reverts to original size
- Toast shows "Undone" message
- Backend syncs reverted state
- Works even if toast was dismissed

**Status:** ⬜ Not Tested

---

### TC-UND-007: Undo Not Available When No Recent Changes
**Preconditions:**
- User is logged in
- No recent drag/resize operations

**Steps:**
1. Press `Cmd + Z` or `Ctrl + Z`
2. Observe behavior

**Expected Result:**
- Toast appears: "Nothing to Undo"
- Description: "No recent calendar changes to undo"
- No events are modified

**Status:** ⬜ Not Tested

---

### TC-UND-008: Undo Clears After Execution
**Preconditions:**
- Event has been dragged
- Undo has been executed once

**Steps:**
1. Press `Cmd + Z` or `Ctrl + Z` again
2. Observe behavior

**Expected Result:**
- Toast shows "Nothing to Undo"
- Undo stack is cleared
- Cannot undo the same change twice

**Status:** ⬜ Not Tested

---

### TC-UND-009: Mobile - Tap Undo Button Works (iOS)
**Preconditions:**
- User on iOS device
- Event has been dragged/resized

**Steps:**
1. Tap "Undo" button in toast notification
2. Observe event behavior

**Expected Result:**
- Event reverts instantly via touch tap
- Toast shows "Undone"
- Same behavior as desktop click

**Status:** ⬜ Not Tested

---

### TC-UND-010: Undo Works Across Different Days
**Preconditions:**
- Event dragged from one day to another

**Steps:**
1. Drag event from Monday to Tuesday
2. Click Undo button or press Cmd+Z
3. Observe event position

**Expected Result:**
- Event returns to original day (Monday)
- Both `dueDate` and `scheduledTime` reverted
- Event appears in correct day column

**Status:** ⬜ Not Tested

---

## OVERLAPPING EVENTS TEST CASES

### TC-OVL-001: Two Events Same Time Show Side-by-Side
**Preconditions:**
- Day view active
- Two events scheduled at same start time (e.g., both at 2:00 PM)

**Steps:**
1. Navigate to Day view
2. Observe event layout

**Expected Result:**
- Events appear side-by-side (not overlapping)
- Each event takes 50% width
- Small gap between events
- Both fully visible

**Status:** ⬜ Not Tested

---

### TC-OVL-002: Three Events Same Time Show in Columns
**Preconditions:**
- Day view active
- Three events at same start time

**Steps:**
1. Create three events all starting at 3:00 PM
2. View in Day view

**Expected Result:**
- Three columns of equal width (~33% each)
- All events visible side-by-side
- Minimal gaps between columns
- No overlapping

**Status:** ⬜ Not Tested

---

### TC-OVL-003: Partial Overlap Shows Correct Columns
**Preconditions:**
- Event A: 2:00 PM - 3:00 PM
- Event B: 2:30 PM - 3:30 PM

**Steps:**
1. View both events in Day view
2. Observe layout

**Expected Result:**
- Events appear side-by-side during overlap (2:30-3:00)
- Event A extends alone before 2:30 PM
- Event B extends alone after 3:00 PM
- Width adjusts based on overlap period

**Status:** ⬜ Not Tested

---

### TC-OVL-004: Longer Events Get Priority Position
**Preconditions:**
- Event A: 1:00 PM - 5:00 PM (4 hours)
- Event B: 2:00 PM - 3:00 PM (1 hour)

**Steps:**
1. View both events in Day view
2. Observe which event appears in left column

**Expected Result:**
- Longer event (Event A) appears in left column
- Shorter event (Event B) appears in right column
- Layout algorithm sorts by duration

**Status:** ⬜ Not Tested

---

### TC-OVL-005: Four+ Events Create Multiple Columns
**Preconditions:**
- Four or more events with overlapping times

**Steps:**
1. Create 4 events all overlapping at 10:00 AM
2. View in Day view

**Expected Result:**
- Four narrow columns created
- Each ~25% width
- All events remain readable
- No text overflow issues

**Status:** ⬜ Not Tested

---

### TC-OVL-006: Drag Event Updates Column Layout
**Preconditions:**
- Event A and B side-by-side (overlapping)

**Steps:**
1. Drag Event B to different time (no longer overlaps A)
2. Release drag

**Expected Result:**
- Event A expands to full width (no longer sharing column)
- Event B appears at new time with full width
- Layout recalculates instantly
- Optimistic UI updates immediately

**Status:** ⬜ Not Tested

---

### TC-OVL-007: Resize Creates/Removes Overlap
**Preconditions:**
- Event A: 2:00 PM - 3:00 PM (full width)
- Event B: 4:00 PM - 5:00 PM (full width)

**Steps:**
1. Resize Event A's bottom handle to extend to 4:30 PM
2. Release resize

**Expected Result:**
- Event A and B now overlap (4:00-4:30)
- Both events split into columns during overlap
- Event A extends alone before 4:00 PM
- Event B extends alone after 4:30 PM

**Status:** ⬜ Not Tested

---

### TC-OVL-008: No Overlap in 3-Day View (Grid-Based)
**Preconditions:**
- 3-Day view active
- Two events same time in same day

**Steps:**
1. Switch to 3-Day view
2. Observe event layout in hour cells

**Expected Result:**
- Events stack vertically in hour cell (not side-by-side)
- 3-Day view uses grid layout (different from Day view)
- Both events visible within cell

**Status:** ⬜ Not Tested

---

### TC-OVL-009: No Overlap in Week View (Grid-Based)
**Preconditions:**
- Week view active
- Two events same time in same day

**Steps:**
1. Switch to Week view
2. Observe event layout

**Expected Result:**
- Events stack vertically in hour cell
- Week view uses grid layout (not absolute positioning)
- Both events visible but stacked

**Status:** ⬜ Not Tested

---

### TC-OVL-010: Mobile Day View Shows Overlap Columns
**Preconditions:**
- Mobile device (iOS/Android)
- Day view with overlapping events

**Steps:**
1. View Day view on mobile
2. Observe overlapping events

**Expected Result:**
- Side-by-side layout works on mobile
- Columns may be narrower but still visible
- Touch interactions work correctly
- Events remain readable

**Status:** ⬜ Not Tested

---

## Edge Cases

### TC-EDGE-001: Undo After Page Refresh
**Steps:**
1. Drag an event
2. Refresh the page
3. Try to undo with Cmd+Z

**Expected Result:**
- Toast shows "Nothing to Undo"
- Undo state does not persist across page loads
- Event remains in dragged position

**Status:** ⬜ Not Tested

---

### TC-EDGE-002: Very Narrow Overlapping Events (5+ columns)
**Steps:**
1. Create 6 events all at same time
2. Observe in Day view

**Expected Result:**
- Events create 6 narrow columns
- Text may truncate but titles visible
- Events remain clickable
- Layout doesn't break

**Status:** ⬜ Not Tested

---

### TC-EDGE-003: Undo During Optimistic Update
**Steps:**
1. Drag event to new position
2. Immediately press Cmd+Z before backend confirms
3. Observe behavior

**Expected Result:**
- Event reverts to original position
- Backend receives undo request (overrides drag request)
- No visual glitches

**Status:** ⬜ Not Tested

---

## Notes
- Undo feature uses keyboard shortcuts: `Cmd+Z` (Mac), `Ctrl+Z` (Windows/Linux)
- Undo stack only stores last change (single-level undo)
- Toast with Undo button visible for 5 seconds
- Side-by-side layout only applies to Day view (absolute positioning)
- 3-Day and Week views use grid layout (events stack vertically)
- Column width calculated as: `100% / totalColumns`
- Events sorted by start time, then duration (longer first)

## Related Files
- `/client/src/pages/calendar.tsx` - Calendar undo and overlap implementation

## Dependencies
- TanStack Query for optimistic updates
- Toast component for Undo button
- Keyboard event listeners (window.addEventListener)

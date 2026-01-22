# Calendar Event Modal Test Cases

## Overview
Test cases for the calendar event detail modal, including Reschedule and Delete functionality with Google Calendar integration awareness.

## Test Date
November 19, 2025

## Features Tested
1. Event modal display for ProductivityQuest and Google Calendar events
2. Reschedule button functionality
3. Delete button with two-way sync awareness
4. Optimistic UI updates
5. Modal prevention after drag operations

---

## TC-CEM-001: Open Modal on Click (ProductivityQuest Event)
**Preconditions:**
- User is logged in
- Calendar page loaded
- At least one ProductivityQuest task visible in calendar

**Steps:**
1. Click on a ProductivityQuest event in the calendar (without dragging)
2. Observe modal opens

**Expected Result:**
- Modal opens immediately
- Shows event title, date, time
- Shows "Reschedule" and "Delete" buttons
- Shows "View Details" button
- Shows "Close" button
- No "Open in Google Calendar" button

**Status:** ⬜ Not Tested

---

## TC-CEM-002: Open Modal on Click (Google Calendar Event)
**Preconditions:**
- User is logged in
- Google Calendar integration active
- At least one Google Calendar event visible

**Steps:**
1. Click on a Google Calendar event in the calendar
2. Observe modal opens

**Expected Result:**
- Modal opens immediately
- Shows event title, date, time, calendar name
- Shows "Reschedule" and "Delete" buttons
- Shows "Open in Google Calendar" button
- Shows "Close" button
- No "View Details" button

**Status:** ⬜ Not Tested

---

## TC-CEM-003: Modal Does NOT Open After Drag
**Preconditions:**
- User is logged in
- ProductivityQuest task visible in calendar

**Steps:**
1. Click and drag a ProductivityQuest event to a new time
2. Release mouse button
3. Observe behavior

**Expected Result:**
- Event moves to new position instantly (optimistic UI)
- Toast notification appears immediately
- Modal does NOT open
- `hasDragged` flag prevents modal from triggering

**Status:** ⬜ Not Tested

---

## TC-CEM-004: Modal Does NOT Open After Resize
**Preconditions:**
- User is logged in
- ProductivityQuest task visible in calendar

**Steps:**
1. Hover over event to reveal resize handles
2. Drag bottom resize handle to change duration
3. Release mouse button
4. Observe behavior

**Expected Result:**
- Event height changes instantly (optimistic UI)
- Toast notification appears immediately
- Modal does NOT open
- `hasResized` flag prevents modal from triggering

**Status:** ⬜ Not Tested

---

## TC-CEM-005: Reschedule Button - ProductivityQuest Event
**Preconditions:**
- Calendar event modal open for ProductivityQuest event

**Steps:**
1. Click "Reschedule" button in modal
2. Observe reschedule modal opens

**Expected Result:**
- Reschedule modal opens
- Shows event title
- Shows message: "Drag the event in the calendar view to reschedule it, or click below to view the task details page for more options."
- Shows "Go to Task Details" button
- Shows "Close" button

**Status:** ⬜ Not Tested

---

## TC-CEM-006: Reschedule Button - Google Calendar Event
**Preconditions:**
- Calendar event modal open for Google Calendar event

**Steps:**
1. Click "Reschedule" button in modal
2. Observe reschedule modal opens

**Expected Result:**
- Reschedule modal opens
- Shows event title
- Shows message: "This is a Google Calendar event. You can drag it in the calendar view to reschedule, or use Google Calendar directly for more options."
- Shows "Open in Google Calendar" button
- Shows "Close" button

**Status:** ⬜ Not Tested

---

## TC-CEM-007: Delete Button Opens Menu
**Preconditions:**
- Calendar event modal open

**Steps:**
1. Click "Delete" button in modal
2. Observe delete menu appears

**Expected Result:**
- Delete options menu expands below buttons
- Shows header: "Choose delete option:"
- Menu has dark background with red border
- Options displayed depend on event source

**Status:** ⬜ Not Tested

---

## TC-CEM-008: Delete Menu - ProductivityQuest Event (Two-Way Sync ON)
**Preconditions:**
- Calendar event modal open for ProductivityQuest event
- Google Calendar Two-Way Sync enabled in settings
- Delete menu opened

**Steps:**
1. Observe delete options in menu

**Expected Result:**
- Shows 2 delete options:
  1. "App & Google Calendar" - enabled, clickable
  2. "App Only" - enabled, clickable
- First option shows no warning text
- Second option shows: "Keeps in Google Calendar"

**Status:** ⬜ Not Tested

---

## TC-CEM-009: Delete Menu - ProductivityQuest Event (Two-Way Sync OFF)
**Preconditions:**
- Calendar event modal open for ProductivityQuest event
- Google Calendar Two-Way Sync disabled (Import Only or Export Only)
- Delete menu opened

**Steps:**
1. Observe delete options in menu

**Expected Result:**
- Shows 2 delete options:
  1. "App & Google Calendar" - greyed out, disabled
  2. "App Only" - enabled, clickable
- First option shows warning: "Enable Two-Way Sync to use this"
- First option is not clickable

**Status:** ⬜ Not Tested

---

## TC-CEM-010: Delete Menu - Google Calendar Event (Two-Way Sync ON)
**Preconditions:**
- Calendar event modal open for Google Calendar event
- Google Calendar Two-Way Sync enabled
- Delete menu opened

**Steps:**
1. Observe delete options in menu

**Expected Result:**
- Shows 1 delete option: "Delete from Google Calendar"
- Option is enabled and clickable
- Shows text: "Opens Google Calendar to delete"
- Shows info note: "Google Calendar event - delete via Google Calendar"

**Status:** ⬜ Not Tested

---

## TC-CEM-011: Delete Menu - Google Calendar Event (Two-Way Sync OFF)
**Preconditions:**
- Calendar event modal open for Google Calendar event
- Google Calendar Two-Way Sync disabled
- Delete menu opened

**Steps:**
1. Observe delete options in menu

**Expected Result:**
- Shows 1 delete option: "Delete from Google Calendar"
- Option is greyed out and disabled
- Shows warning: "Enable Two-Way Sync to use this"
- Shows info note: "Google Calendar event - delete via Google Calendar"

**Status:** ⬜ Not Tested

---

## TC-CEM-012: Execute Delete - App Only
**Preconditions:**
- Calendar event modal open for ProductivityQuest event
- Delete menu opened

**Steps:**
1. Click "App Only" delete option
2. Observe behavior

**Expected Result:**
- Modal closes immediately
- Event disappears from calendar view
- Event removed from app task list
- Event remains in Google Calendar (if synced)
- No error messages

**Status:** ⬜ Not Tested

---

## TC-CEM-013: Execute Delete - App & Google Calendar
**Preconditions:**
- Calendar event modal open for ProductivityQuest event
- Two-Way Sync enabled
- Delete menu opened

**Steps:**
1. Click "App & Google Calendar" option
2. Observe behavior

**Expected Result:**
- Modal closes immediately
- Event disappears from calendar view
- Event removed from app task list
- Event deleted from Google Calendar
- Backend DELETE request includes `deleteFromGoogle: true`

**Status:** ⬜ Not Tested

---

## TC-CEM-014: Execute Delete - Google Calendar Event
**Preconditions:**
- Calendar event modal open for Google Calendar event
- Two-Way Sync enabled
- Delete menu opened

**Steps:**
1. Click "Delete from Google Calendar" option
2. Observe behavior

**Expected Result:**
- New browser tab opens Google Calendar edit page for the event
- Toast notification: "Delete in Google Calendar - Please delete this event in Google Calendar. It will sync automatically."
- Modal closes
- Event remains in app calendar until next sync

**Status:** ⬜ Not Tested

---

## TC-CEM-015: Button Sizing and Layout
**Preconditions:**
- Calendar event modal open

**Steps:**
1. Observe button layout and sizing
2. Check on desktop viewport
3. Check on mobile viewport

**Expected Result:**
- All buttons use `size="sm"` for compact height
- All button text uses `text-xs` (12px)
- Icons are `w-3 h-3` (12px)
- Buttons wrap to multiple rows if needed (flex-wrap)
- Button text is concise:
  - "Reschedule" (not "Reschedule Event")
  - "Delete" (not "Delete Event")
  - "Open in Google" (not "Open in Google Calendar")
  - "View Details" (not "View Task Details")
- All buttons visible without overflow

**Status:** ⬜ Not Tested

---

## TC-CEM-016: Optimistic UI - Drag Update Success
**Preconditions:**
- ProductivityQuest event in calendar
- Backend is responding normally

**Steps:**
1. Drag event to new time slot
2. Release mouse
3. Observe UI behavior
4. Wait for backend response

**Expected Result:**
- Event moves to new position INSTANTLY (before backend response)
- Toast appears INSTANTLY: "Event Rescheduled - Updated to [time] ([duration] min)"
- Backend request sent in background
- Calendar data refetches after backend confirms
- No visual "snap" or repositioning
- No delay between release and visual update

**Status:** ⬜ Not Tested

---

## TC-CEM-017: Optimistic UI - Drag Update Failure
**Preconditions:**
- ProductivityQuest event in calendar
- Backend is offline or returning errors

**Steps:**
1. Drag event to new time slot
2. Release mouse
3. Observe initial UI behavior
4. Wait for backend response failure

**Expected Result:**
- Event moves to new position instantly (optimistic)
- Toast appears: "Event Rescheduled"
- Backend request fails
- Event reverts to ORIGINAL position
- Error toast appears: "Update Failed - Failed to save changes. Reverting..."
- User can try again

**Status:** ⬜ Not Tested

---

## TC-CEM-018: Close Button Functionality
**Preconditions:**
- Calendar event modal open

**Steps:**
1. Click "Close" button in modal

**Expected Result:**
- Modal closes immediately
- Calendar view remains unchanged
- No side effects

**Status:** ⬜ Not Tested

---

## TC-CEM-019: Click Outside Modal to Close
**Preconditions:**
- Calendar event modal open

**Steps:**
1. Click on dark overlay outside modal

**Expected Result:**
- Modal closes immediately
- Calendar view remains unchanged

**Status:** ⬜ Not Tested

---

## TC-CEM-020: Modal Button States After Delete Menu Open
**Preconditions:**
- Calendar event modal open
- Delete menu expanded

**Steps:**
1. Observe all button states

**Expected Result:**
- "Reschedule" button remains enabled
- "Delete" button remains enabled (can toggle menu)
- "Close" button remains enabled
- Other action buttons remain enabled

**Status:** ⬜ Not Tested

---

## Edge Cases

### TC-CEM-E01: Rapid Click After Drag
**Steps:**
1. Drag event and release
2. Immediately click the event again (within 100ms)

**Expected Result:**
- Modal does NOT open on first click (hasDragged still true)
- Modal opens on subsequent clicks after 100ms delay

**Status:** ⬜ Not Tested

---

### TC-CEM-E02: Delete Button While Offline
**Steps:**
1. Disconnect from internet
2. Open event modal
3. Click Delete > App Only

**Expected Result:**
- Optimistic delete occurs
- Event disappears immediately
- Backend request queued/fails
- Error handling shows appropriate message

**Status:** ⬜ Not Tested

---

### TC-CEM-E03: Multiple Events Dragged Sequentially
**Steps:**
1. Drag Event A to new position
2. Immediately drag Event B to new position
3. Immediately drag Event C to new position

**Expected Result:**
- Each event moves instantly with optimistic UI
- Each shows toast notification
- All backend requests complete successfully
- No modal opens for any event
- No conflicts or race conditions

**Status:** ⬜ Not Tested

---

## Notes
- Optimistic UI provides instant feedback (no waiting for backend)
- `hasDragged` and `hasResized` flags prevent modal from opening after drag operations
- 100ms delay before resetting drag flags ensures click handlers see the flags
- Delete functionality respects Two-Way Sync setting
- Google Calendar events can only be deleted in Google Calendar
- All button text is compact (12px) to fit in modal without overflow

## Related Files
- `/client/src/pages/calendar.tsx` - Calendar event modal implementation
- `/server/routes.ts` - Backend task update and delete endpoints

## Dependencies
- Google Calendar Two-Way Sync setting
- TanStack Query for optimistic updates
- Toast notifications

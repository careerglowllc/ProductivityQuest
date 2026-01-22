# Task Filter Persistence Test Cases

## Overview
Test cases for the task filter persistence feature that saves the user's selected filter (All Tasks, Due Today, High Reward, etc.) in localStorage and restores it when they return to the Tasks page.

## Test Date
November 19, 2025

---

## FILTER PERSISTENCE - BASIC FUNCTIONALITY

### TC-FILTER-001: Default Filter on First Visit
**Preconditions:**
- User is logged in
- No previous filter preference stored in localStorage
- Navigate to Tasks page for first time

**Steps:**
1. Open browser DevTools → Application → Local Storage
2. Verify no `tasksFilter` key exists
3. Navigate to Tasks page (`/tasks` or `/`)

**Expected Result:**
- "All Tasks" filter is selected by default
- Filter button shows active state (default variant)
- All tasks are displayed
- localStorage still has no `tasksFilter` key (not saved until user changes filter)

**Status:** ⬜ Not Tested

---

### TC-FILTER-002: Save Filter Selection - Due Today
**Preconditions:**
- User is on Tasks page
- Currently on "All Tasks" filter

**Steps:**
1. Click "Due Today" filter button
2. Observe task list updates
3. Open DevTools → Application → Local Storage
4. Check `tasksFilter` key value

**Expected Result:**
- "Due Today" button shows active state
- Only tasks due today are displayed
- localStorage contains: `tasksFilter: "due-today"`
- Filter persists immediately without page refresh

**Status:** ⬜ Not Tested

---

### TC-FILTER-003: Restore Filter After Page Refresh
**Preconditions:**
- User has selected "Due Today" filter
- localStorage contains `tasksFilter: "due-today"`

**Steps:**
1. Refresh the page (F5 or Cmd+R)
2. Wait for page to load
3. Observe which filter is active

**Expected Result:**
- Page loads with "Due Today" filter already active
- Only tasks due today are displayed
- No flash of "All Tasks" before switching
- Filter state restored before first render

**Status:** ⬜ Not Tested

---

### TC-FILTER-004: Restore Filter After Navigation Away and Back
**Preconditions:**
- User has selected "High Reward" filter
- localStorage contains `tasksFilter: "high-reward"`

**Steps:**
1. Navigate to Skills page (click Skills in nav)
2. Wait 2 seconds
3. Navigate back to Tasks page (click Quests in nav)
4. Observe filter state

**Expected Result:**
- "High Reward" filter is still active
- High reward tasks are displayed
- Filter preference survived navigation
- No reset to "All Tasks"

**Status:** ⬜ Not Tested

---

### TC-FILTER-005: Update Filter Selection - High Priority
**Preconditions:**
- User is on Tasks page with "Due Today" filter active
- localStorage contains `tasksFilter: "due-today"`

**Steps:**
1. Click "High Priority" filter button
2. Check localStorage `tasksFilter` value

**Expected Result:**
- "High Priority" button becomes active
- "Due Today" button becomes inactive
- Only high priority tasks displayed
- localStorage updated to: `tasksFilter: "high-priority"`

**Status:** ⬜ Not Tested

---

### TC-FILTER-006: Filter Persists Across Browser Sessions
**Preconditions:**
- User has selected "Quick Tasks" filter
- localStorage contains `tasksFilter: "quick-tasks"`

**Steps:**
1. Close the browser completely
2. Reopen browser
3. Navigate to ProductivityQuest Tasks page
4. Observe filter state

**Expected Result:**
- "Quick Tasks" filter is active on page load
- Quick tasks (≤30 min) are displayed
- Filter preference survived browser restart
- localStorage persisted across sessions

**Status:** ⬜ Not Tested

---

## FILTER PERSISTENCE - ALL FILTER TYPES

### TC-FILTER-007: Routines Filter Persistence
**Preconditions:**
- User is on Tasks page

**Steps:**
1. Click "Routines" filter button
2. Refresh page
3. Verify filter state

**Expected Result:**
- "Routines" filter persists after refresh
- localStorage: `tasksFilter: "routines"`
- Only recurring tasks displayed

**Status:** ⬜ Not Tested

---

### TC-FILTER-008: Business Filter Persistence (Apple)
**Preconditions:**
- User is on Tasks page
- Business filter dropdown exists

**Steps:**
1. Click Business filter dropdown
2. Select "🍎 Apple"
3. Navigate to Dashboard
4. Return to Tasks page

**Expected Result:**
- Apple filter still active
- localStorage: `tasksFilter: "business-apple"`
- Only Apple business tasks displayed

**Status:** ⬜ Not Tested

---

### TC-FILTER-009: Multiple Filter Changes in Sequence
**Preconditions:**
- User is on Tasks page with "All Tasks"

**Steps:**
1. Click "Due Today" → verify localStorage
2. Click "High Reward" → verify localStorage
3. Click "Quick Tasks" → verify localStorage
4. Refresh page

**Expected Result:**
- Each click updates localStorage immediately
- Final localStorage value: `tasksFilter: "quick-tasks"`
- After refresh, "Quick Tasks" filter is active
- Only most recent filter is saved

**Status:** ⬜ Not Tested

---

### TC-FILTER-010: Return to All Tasks Filter
**Preconditions:**
- User has "High Priority" filter active
- localStorage: `tasksFilter: "high-priority"`

**Steps:**
1. Click "All Tasks" button
2. Check localStorage value
3. Refresh page

**Expected Result:**
- "All Tasks" filter becomes active
- localStorage updated to: `tasksFilter: "all"`
- All active tasks displayed
- After refresh, "All Tasks" still active

**Status:** ⬜ Not Tested

---

## EDGE CASES & ERROR HANDLING

### TC-EDGE-001: Invalid Filter in localStorage
**Preconditions:**
- User is logged out or in DevTools

**Steps:**
1. Open DevTools → Application → Local Storage
2. Manually set `tasksFilter: "invalid-filter-name"`
3. Navigate to Tasks page
4. Observe filter state

**Expected Result:**
- App ignores invalid filter value
- "All Tasks" filter is selected (fallback)
- No errors in console
- Invalid value is overwritten when user selects a valid filter

**Status:** ⬜ Not Tested

---

### TC-EDGE-002: localStorage Disabled/Blocked
**Preconditions:**
- Browser in private/incognito mode OR
- localStorage disabled in browser settings

**Steps:**
1. Disable localStorage (incognito or browser settings)
2. Navigate to Tasks page
3. Select "Due Today" filter
4. Refresh page

**Expected Result:**
- App functions normally
- Filter can be selected
- After refresh, filter resets to "All Tasks" (graceful degradation)
- No JavaScript errors or crashes

**Status:** ⬜ Not Tested

---

### TC-EDGE-003: Filter Persistence with Empty Task List
**Preconditions:**
- User has no tasks
- Navigate to Tasks page

**Steps:**
1. Select "Due Today" filter
2. Verify localStorage saves
3. Refresh page
4. Observe filter state

**Expected Result:**
- "Due Today" filter persists even with 0 tasks
- Empty state message shows: "No tasks due today"
- Filter button remains active
- localStorage contains correct filter value

**Status:** ⬜ Not Tested

---

### TC-EDGE-004: Filter Persistence After Task Completion
**Preconditions:**
- User has "Due Today" filter active
- At least one task due today exists

**Steps:**
1. Complete the last task in filtered view
2. Observe filter state
3. Refresh page

**Expected Result:**
- "Due Today" filter remains active
- Empty state shows (no tasks due today)
- Filter does NOT reset to "All Tasks"
- localStorage still contains: `tasksFilter: "due-today"`

**Status:** ⬜ Not Tested

---

### TC-EDGE-005: Filter Persistence with Search Query
**Preconditions:**
- User has "High Reward" filter active
- Search bar is visible

**Steps:**
1. Type "meeting" in search bar
2. Navigate to Skills page
3. Return to Tasks page

**Expected Result:**
- "High Reward" filter is restored
- Search query is cleared (not persisted)
- Only high reward tasks shown
- Search box is empty

**Status:** ⬜ Not Tested

---

## INTEGRATION TESTS

### TC-INT-001: Filter Persistence with Task Creation
**Preconditions:**
- User has "Due Today" filter active

**Steps:**
1. Click "New Event" to create task
2. Create task with today's due date
3. Close add task modal
4. Observe filter state

**Expected Result:**
- "Due Today" filter still active
- New task appears in filtered list
- Filter did not reset during task creation

**Status:** ⬜ Not Tested

---

### TC-INT-002: Filter Persistence with Bulk Operations
**Preconditions:**
- User has "Quick Tasks" filter active
- Multiple quick tasks exist

**Steps:**
1. Select all visible tasks
2. Click delete/complete on selected tasks
3. Refresh page

**Expected Result:**
- "Quick Tasks" filter persists
- Updated task list reflects changes
- Filter state unaffected by bulk operations

**Status:** ⬜ Not Tested

---

### TC-INT-003: Filter Persistence Across Multiple Tabs
**Preconditions:**
- User has Tasks page open in Tab 1

**Steps:**
1. In Tab 1: Select "High Priority" filter
2. Open Tasks page in new Tab 2
3. Observe filter in Tab 2
4. In Tab 2: Change to "Due Today"
5. Refresh Tab 1

**Expected Result:**
- Tab 2 loads with "High Priority" (localStorage read)
- Tab 1 still shows "High Priority" until refresh
- After Tab 1 refresh, shows "Due Today" (latest localStorage value)
- Tabs share localStorage state

**Status:** ⬜ Not Tested

---

## MOBILE SPECIFIC TESTS

### TC-MOBILE-001: Filter Persistence on Mobile Browser
**Preconditions:**
- Access site on mobile device or mobile viewport
- Navigate to Tasks page

**Steps:**
1. Select "Due Today" filter
2. Navigate to another page
3. Return to Tasks page
4. Close browser app completely
5. Reopen browser and navigate to Tasks

**Expected Result:**
- Filter persists across navigation on mobile
- Filter persists after closing/reopening mobile browser
- Mobile localStorage works same as desktop

**Status:** ⬜ Not Tested

---

### TC-MOBILE-002: Filter Persistence in Mobile App (Capacitor)
**Preconditions:**
- Running ProductivityQuest as iOS/Android app
- Navigate to Tasks page in app

**Steps:**
1. Select "High Reward" filter
2. Navigate to Skills page
3. Force close the app
4. Reopen app
5. Navigate to Tasks page

**Expected Result:**
- Filter persists in native app
- localStorage (or native storage) preserves filter
- "High Reward" filter restored after app relaunch

**Status:** ⬜ Not Tested

---

## PERFORMANCE TESTS

### TC-PERF-001: No Render Flicker on Page Load
**Preconditions:**
- User has "Due Today" filter saved
- Navigate to Tasks page

**Steps:**
1. Open Network throttling (DevTools)
2. Set to "Fast 3G" to simulate slower load
3. Navigate to Tasks page
4. Observe filter rendering

**Expected Result:**
- No visual flash of "All Tasks" before "Due Today"
- Filter initialized before first paint
- Smooth, single-render experience
- No layout shift from filter change

**Status:** ⬜ Not Tested

---

### TC-PERF-002: localStorage Write Performance
**Preconditions:**
- User is on Tasks page

**Steps:**
1. Open Performance monitor in DevTools
2. Click through all filters rapidly (10 clicks in 5 seconds)
3. Check localStorage write operations
4. Verify no performance degradation

**Expected Result:**
- Each filter change writes to localStorage instantly
- No lag or blocking from localStorage writes
- No performance warnings in console
- App remains responsive

**Status:** ⬜ Not Tested

---

## NOTES
- Filter persistence uses localStorage key: `tasksFilter`
- Valid filter values: `"all"`, `"due-today"`, `"high-reward"`, `"quick-tasks"`, `"high-priority"`, `"routines"`, `"business-apple"`, `"business-general"`, `"business-mw"`
- Filter is validated on load to prevent invalid values
- Falls back to `"all"` if invalid or missing
- Similar implementation to calendar view persistence

## RELATED FILES
- `/client/src/pages/home.tsx` - Tasks page with filter logic
- Similar pattern to `/client/src/pages/calendar.tsx` view persistence

## DEPENDENCIES
- Browser localStorage API
- React useState with initializer function
- React useEffect for persistence

# Dashboard Calendar Widget - Test Cases

## Overview
Test cases for the mini Today Calendar widget displayed on the Dashboard page.

## Test Cases

### TC-CAL-WIDGET-001: Widget Display on Dashboard
**Priority:** High  
**Prerequisites:** User logged in, on Dashboard page

**Steps:**
1. Navigate to `/dashboard`
2. Locate the Today's Schedule widget in the right column
3. Observe widget content

**Expected Result:**
- Widget displays with blue border (border-blue-600/30)
- Title shows "Today's Schedule"
- Date displays in format: "Weekday, Month Day" (e.g., "Monday, November 17")
- "Full Calendar" button visible in header
- Widget positioned above "Today's Top Priorities" card

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-CAL-WIDGET-002: Time Slots Display
**Priority:** High  
**Prerequisites:** User logged in, viewing Dashboard

**Steps:**
1. Navigate to Dashboard
2. Examine the calendar widget time slots

**Expected Result:**
- Time slots show from 6 AM to 11 PM (18 hours total)
- Each slot labeled with hour (e.g., "6 AM", "12 PM", "5 PM")
- Time labels right-aligned in 60px column
- Event area takes up remaining width
- Minimum height of 40px per time slot

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-CAL-WIDGET-003: Current Time Indicator
**Priority:** High  
**Prerequisites:** User logged in, current time between 6 AM - 11 PM

**Steps:**
1. Navigate to Dashboard during daytime hours
2. Locate current hour time slot
3. Observe time indicator

**Expected Result:**
- Red glowing horizontal line appears at current time
- Small red dot (1.5px) on left side of line
- Line positioned at correct minute percentage through hour
- Shadow effect visible (shadow-red-500/50)
- Indicator only shows in current hour slot

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-CAL-WIDGET-004: Google Calendar Events Display
**Priority:** High  
**Prerequisites:** User has Google Calendar connected with events today

**Steps:**
1. Ensure Google Calendar is synced
2. Have events scheduled for today
3. Navigate to Dashboard
4. Check calendar widget

**Expected Result:**
- Google Calendar events appear in correct time slots
- Events show with their original calendar colors
- Event title displayed (11px font, truncated if long)
- Calendar name shown below title (9px font, 70% opacity)
- Events have colored background and border

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-CAL-WIDGET-005: ProductivityQuest Tasks Display
**Priority:** High  
**Prerequisites:** User has tasks with due dates set for today

**Steps:**
1. Create tasks with today's due date and specific times
2. Navigate to Dashboard
3. Check calendar widget

**Expected Result:**
- PQ tasks appear in time slots based on due time
- Default purple background if no custom color
- Task title and description visible
- Tasks clickable (future enhancement)

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-CAL-WIDGET-006: Scrollable Widget
**Priority:** Medium  
**Prerequisites:** User logged in, viewing Dashboard

**Steps:**
1. Navigate to Dashboard
2. Observe calendar widget height
3. Try scrolling within the widget

**Expected Result:**
- Widget has max-height of 300px
- Content is scrollable if overflow
- Scroll works independently from page scroll
- Smooth scrolling behavior

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-CAL-WIDGET-007: Full Calendar Button
**Priority:** High  
**Prerequisites:** User logged in, on Dashboard

**Steps:**
1. Navigate to Dashboard
2. Click "Full Calendar" button in widget header

**Expected Result:**
- User navigates to `/calendar` page
- Calendar page opens in current view (month/day/week)
- Navigation is instant

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-CAL-WIDGET-008: Empty State - No Events
**Priority:** Medium  
**Prerequisites:** User has no events or tasks for today

**Steps:**
1. Ensure no events scheduled for today
2. Navigate to Dashboard
3. View calendar widget

**Expected Result:**
- All time slots visible but empty
- Time labels still shown
- No error messages
- Widget maintains structure

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-CAL-WIDGET-009: Multiple Events Same Hour
**Priority:** Medium  
**Prerequisites:** Multiple events scheduled in same hour

**Steps:**
1. Create 2-3 events in the same hour slot
2. Navigate to Dashboard
3. Check calendar widget

**Expected Result:**
- All events displayed in the same time slot
- Events stacked vertically
- Each event has small margin (mb-1)
- Time slot expands to fit all events

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-CAL-WIDGET-010: Calendar Color Preservation
**Priority:** High  
**Prerequisites:** Google Calendar events with different calendar colors

**Steps:**
1. Have events from different Google Calendars (different colors)
2. Navigate to Dashboard
3. Check event colors in widget

**Expected Result:**
- Events display with original calendar colors
- Colors match Google Calendar
- Background color, border color, and text color applied
- Colors consistent with full calendar view

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-CAL-WIDGET-011: Responsive Layout
**Priority:** Medium  
**Prerequisites:** User logged in

**Steps:**
1. View Dashboard on different screen sizes:
   - Desktop (1920px)
   - Laptop (1366px)
   - Tablet (768px)
   - Mobile (375px)

**Expected Result:**
- Widget adapts to screen size
- On mobile: Widget takes full width, appears below skills
- Time labels remain readable
- Events don't overflow

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-CAL-WIDGET-012: Real-time Updates
**Priority:** Low  
**Prerequisites:** User on Dashboard, events being added

**Steps:**
1. Keep Dashboard open
2. Add new event in Google Calendar for today
3. Wait for sync/refresh

**Expected Result:**
- New events appear after page refresh
- Widget fetches latest calendar data
- No stale data shown

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Edge Cases

### TC-CAL-WIDGET-EDGE-001: Past Events Today
**Steps:**
1. Have events earlier today (already passed)
2. View Dashboard

**Expected Result:**
- Past events still displayed
- No special styling for past events
- Current time indicator shows progression

---

### TC-CAL-WIDGET-EDGE-002: All-Day Events
**Steps:**
1. Create all-day event in Google Calendar
2. View Dashboard

**Expected Result:**
- All-day events appear in first time slot (6 AM) OR
- All-day events shown separately at top

---

### TC-CAL-WIDGET-EDGE-003: Event Spanning Multiple Hours
**Steps:**
1. Create 3-hour event (e.g., 2 PM - 5 PM)
2. View Dashboard

**Expected Result:**
- Event appears in starting hour slot
- Visual indication of duration (if implemented)

---

### TC-CAL-WIDGET-EDGE-004: Very Long Event Titles
**Steps:**
1. Create event with very long title (50+ characters)
2. View Dashboard widget

**Expected Result:**
- Title truncated with ellipsis
- No layout breaking
- Readable at 11px font size

---

## Performance Tests

### TC-CAL-WIDGET-PERF-001: Many Events
**Steps:**
1. Have 20+ events scheduled for today
2. Navigate to Dashboard

**Expected Result:**
- Widget loads within 2 seconds
- Scrolling is smooth
- No UI lag

---

### TC-CAL-WIDGET-PERF-002: No Calendar Connection
**Steps:**
1. User without Google Calendar connected
2. Navigate to Dashboard

**Expected Result:**
- Widget still displays
- Shows only PQ tasks
- No error state
- "Connect Calendar" prompt (if implemented)

---

## Integration Tests

### TC-CAL-WIDGET-INT-001: Sync with Full Calendar
**Steps:**
1. View event in Dashboard widget
2. Navigate to full Calendar page
3. Find same event

**Expected Result:**
- Event appears in both places
- Same color, title, time
- Data consistency verified

---

### TC-CAL-WIDGET-INT-002: Query Caching
**Steps:**
1. Navigate to Dashboard
2. Navigate to Calendar page
3. Return to Dashboard

**Expected Result:**
- Calendar data cached by TanStack Query
- Fast subsequent loads
- Proper cache invalidation

---

## API Integration

**Endpoint Used:** `GET /api/google-calendar/events`

**Expected Response:**
```json
[
  {
    "id": "google-123",
    "title": "Team Meeting",
    "start": "2025-11-17T14:00:00Z",
    "end": "2025-11-17T15:00:00Z",
    "description": "Weekly sync",
    "source": "google",
    "calendarColor": "#4285F4",
    "calendarName": "Work Calendar"
  }
]
```

## Notes
- Widget uses TanStack Query with key `["/api/google-calendar/events"]`
- Filters events by today's date client-side
- Time indicator recalculates on component mount
- Styling matches main calendar page for consistency

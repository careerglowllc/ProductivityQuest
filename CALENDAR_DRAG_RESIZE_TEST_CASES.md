# Calendar Drag & Resize Test Cases

## Feature: Calendar Event Duration Updates via Drag/Resize

### Test Case 1: Resize Event from Bottom Handle
**Preconditions:**
- User is logged in
- Calendar view is set to "Day" view
- At least one ProductivityQuest task exists with a due date

**Steps:**
1. Navigate to Calendar page
2. Switch to Day view
3. Locate a task event in the calendar
4. Hover over the bottom edge of the event
5. Click and drag the bottom resize handle downward
6. Release the mouse

**Expected Results:**
- ✅ Resize handle appears on hover (2px height, white/30 opacity)
- ✅ Event expands visually as you drag
- ✅ Event snaps to 5-minute intervals
- ✅ Minimum duration is 5 minutes
- ✅ After release, event maintains new size
- ✅ Success: No snap-back to original size
- ✅ Event visually spans across correct hours

**Verification:**
- Open task detail modal
- Verify duration field shows updated value
- Refresh page and verify event maintains new size

---

### Test Case 2: Resize Event from Top Handle
**Preconditions:**
- User is logged in
- Calendar Day view active
- Task event visible

**Steps:**
1. Hover over top edge of event
2. Click and drag top resize handle upward
3. Release

**Expected Results:**
- ✅ Event start time moves earlier
- ✅ Event end time stays the same
- ✅ Duration increases accordingly
- ✅ Visual height increases
- ✅ Event spans correct time range

---

### Test Case 3: Drag Event to New Time
**Preconditions:**
- Task event exists in calendar

**Steps:**
1. Click and drag event (not on resize handles)
2. Move event to different time slot
3. Release

**Expected Results:**
- ✅ Event moves vertically with cursor
- ✅ Snaps to 5-minute intervals
- ✅ Duration remains the same (height unchanged)
- ✅ Start and end times both shift by same amount
- ✅ Event position updates immediately after release

---

### Test Case 4: Database Persistence
**Preconditions:**
- Event has been resized or moved

**Steps:**
1. Resize or move an event
2. Wait for update to complete
3. Refresh the page
4. Navigate away and return to calendar

**Expected Results:**
- ✅ Event maintains new time/duration after refresh
- ✅ Task detail modal shows correct duration
- ✅ Other views (Tasks page) show updated duration
- ✅ Google Calendar syncs new time (if enabled)

---

### Test Case 5: Visual Update Without Refresh
**Preconditions:**
- Calendar Day view active

**Steps:**
1. Resize an event to 2 hours duration
2. Observe without refreshing

**Expected Results:**
- ✅ Event visual height = 120px (2 hours × 60px/hour)
- ✅ Event spans from start hour to end hour
- ✅ No flicker or snap-back
- ✅ Smooth visual transition
- ✅ Time labels show correct start/end times

---

### Test Case 6: Multiple Events Don't Overlap
**Preconditions:**
- Multiple events in same day

**Steps:**
1. Resize event to overlap with another event's time
2. Observe positioning

**Expected Results:**
- ✅ Events remain visible (no z-index issues)
- ✅ Both events render correctly
- ✅ User can interact with both events

---

### Test Case 7: Google Calendar Events Cannot Be Edited
**Preconditions:**
- Google Calendar connected
- External calendar event visible

**Steps:**
1. Attempt to drag Google Calendar event
2. Attempt to resize Google Calendar event

**Expected Results:**
- ✅ No resize handles appear on hover
- ✅ Cursor shows 'cursor-pointer' not 'cursor-move'
- ✅ Event cannot be dragged
- ✅ Click opens event detail (read-only)

---

### Test Case 8: Keyboard Cancel (Escape)
**Preconditions:**
- Event is being dragged or resized

**Steps:**
1. Start dragging/resizing event
2. Press Escape key (or move mouse outside calendar)

**Expected Results:**
- ✅ Drag/resize operation cancels
- ✅ Event returns to original position/size
- ✅ No API call is made

---

### Test Case 9: Edge Cases - Minimum Duration
**Steps:**
1. Attempt to resize event to less than 5 minutes

**Expected Results:**
- ✅ Event enforces 5-minute minimum
- ✅ Cannot shrink below minimum

---

### Test Case 10: Cross-Hour Spanning
**Preconditions:**
- Event starts at 1:30 PM

**Steps:**
1. Resize event to end at 3:45 PM
2. Observe visual rendering

**Expected Results:**
- ✅ Event spans from 1:30 PM to 3:45 PM visually
- ✅ Event overlaps 1 PM, 2 PM, and 3 PM hour blocks
- ✅ Height = 135px (2 hours 15 min = 2.25 × 60px)
- ✅ Top position = 90px (1 hour + 30 min = 1.5 × 60px)

---

## Performance Requirements
- ✅ Drag/resize should feel smooth (60fps)
- ✅ API update completes within 1 second
- ✅ Query refetch completes within 500ms
- ✅ No visual jank or layout shift

## Browser Compatibility
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari

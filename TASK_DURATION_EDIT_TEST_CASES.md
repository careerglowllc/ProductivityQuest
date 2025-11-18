# Task Duration Inline Editing Test Cases

## Feature: Edit Task Duration in Detail Modal

### Test Case 1: Open Edit Mode
**Preconditions:**
- User is logged in
- Task detail modal is open for any task

**Steps:**
1. Locate "Duration" field in modal
2. Click the Edit (✏️) button next to duration value

**Expected Results:**
- ✅ Edit button appears next to duration display
- ✅ Duration text switches to input field
- ✅ Input contains current duration value
- ✅ Save (✓) and Cancel (✗) buttons appear
- ✅ Input field is auto-focused
- ✅ Cursor is at end of input value

---

### Test Case 2: Save Duration via Button
**Preconditions:**
- Duration edit mode is active
- Initial duration: 30 minutes

**Steps:**
1. Change input value to "45"
2. Click Save (✓) button

**Expected Results:**
- ✅ Input switches back to display mode
- ✅ Duration shows "45 minutes"
- ✅ Success toast appears: "⏱️ Duration Updated"
- ✅ Edit button reappears
- ✅ API PATCH request sent to `/api/tasks/:id`
- ✅ Request body includes `{ duration: 45 }`

---

### Test Case 3: Save Duration via Enter Key
**Preconditions:**
- Duration edit mode active

**Steps:**
1. Type new duration value: "60"
2. Press Enter key

**Expected Results:**
- ✅ Saves immediately (same as clicking Save button)
- ✅ Edit mode closes
- ✅ Success toast appears
- ✅ Duration updates to "60 minutes"

---

### Test Case 4: Cancel via Cancel Button
**Preconditions:**
- Duration edit mode active
- Original duration: 30 minutes

**Steps:**
1. Change input to "90"
2. Click Cancel (✗) button

**Expected Results:**
- ✅ Edit mode closes
- ✅ Duration reverts to "30 minutes"
- ✅ No API call is made
- ✅ No toast notification
- ✅ Input value is reset to original

---

### Test Case 5: Cancel via Escape Key
**Preconditions:**
- Duration edit mode active

**Steps:**
1. Change input value
2. Press Escape key

**Expected Results:**
- ✅ Edit mode closes immediately
- ✅ Changes are discarded
- ✅ Duration shows original value
- ✅ No API call

---

### Test Case 6: Validation - Negative Numbers
**Steps:**
1. Enter edit mode
2. Type "-10"
3. Click Save or press Enter

**Expected Results:**
- ✅ Error toast appears: "Invalid Duration"
- ✅ Description: "Duration must be a positive number."
- ✅ Edit mode stays open
- ✅ No API call is made
- ✅ Duration not updated

---

### Test Case 7: Validation - Zero
**Steps:**
1. Enter "0" as duration
2. Click Save

**Expected Results:**
- ✅ Error toast: "Invalid Duration"
- ✅ Edit mode remains open
- ✅ No update occurs

---

### Test Case 8: Validation - Non-Numeric Input
**Steps:**
1. Enter "abc" or "30 minutes" (text)
2. Click Save

**Expected Results:**
- ✅ Error toast appears
- ✅ NaN check prevents update
- ✅ Edit mode stays open

---

### Test Case 9: Validation - Decimal Numbers
**Steps:**
1. Enter "30.5"
2. Save

**Expected Results:**
- ✅ Input accepts decimal
- ✅ `parseInt()` converts to 30
- ✅ Duration saves as 30 minutes (integer)
- ✅ Success toast appears

---

### Test Case 10: Calendar Sync After Update
**Preconditions:**
- Calendar view is open in another tab/window
- Task has a due date and appears in calendar

**Steps:**
1. In task modal, change duration from 30 to 90 minutes
2. Save
3. Switch to calendar view

**Expected Results:**
- ✅ Calendar event height updates automatically
- ✅ Event now spans 1.5 hours (90px height)
- ✅ No refresh required
- ✅ Query invalidation triggers refetch

---

### Test Case 11: Google Calendar Sync
**Preconditions:**
- Google Calendar integration enabled
- Task is synced to Google Calendar

**Steps:**
1. Edit task duration from 30 to 60 minutes
2. Save
3. Check Google Calendar

**Expected Results:**
- ✅ Google Calendar event updates
- ✅ Event duration changes to 60 minutes
- ✅ Calendar invalidation includes Google Calendar query

---

### Test Case 12: Multiple Edits in Sequence
**Steps:**
1. Edit duration to 45 → Save
2. Immediately edit to 60 → Save
3. Edit to 30 → Cancel
4. Edit to 75 → Save

**Expected Results:**
- ✅ Each save updates correctly
- ✅ Cancelled edit doesn't affect value
- ✅ Final duration is 75 minutes
- ✅ Three API calls made (not four)

---

### Test Case 13: Large Duration Values
**Steps:**
1. Enter "480" (8 hours)
2. Save

**Expected Results:**
- ✅ Value is accepted
- ✅ Duration shows "480 minutes"
- ✅ Calendar event spans 8 hours visually
- ✅ No overflow or display issues

---

### Test Case 14: UI Consistency with Due Date Edit
**Preconditions:**
- Task modal open

**Steps:**
1. Compare Duration edit UI with Due Date edit UI
2. Test both edit flows

**Expected Results:**
- ✅ Both have Edit (✏️) button in same position
- ✅ Same button styling and hover states
- ✅ Consistent spacing and alignment
- ✅ Same toast notification pattern
- ✅ Similar UX flow

---

### Test Case 15: Concurrent Edits (Race Condition)
**Preconditions:**
- Slow network or throttled API

**Steps:**
1. Edit duration to 45, click Save
2. While API call is pending, edit again to 60
3. Save again quickly

**Expected Results:**
- ✅ First mutation completes
- ✅ Second mutation processes
- ✅ Final value is 60 minutes
- ✅ No lost updates
- ✅ Both invalidations occur

---

### Test Case 16: Offline Behavior
**Preconditions:**
- Network disconnected

**Steps:**
1. Edit duration
2. Click Save

**Expected Results:**
- ✅ Error toast appears: "Failed to update duration"
- ✅ Edit mode stays open
- ✅ User can try again or cancel

---

### Test Case 17: Gold Value Recalculation
**Preconditions:**
- Task with Medium importance, 30 min duration, 15 gold

**Steps:**
1. Change duration to 60 minutes
2. Save

**Expected Results:**
- ⚠️ Gold value should recalculate on backend
- ✅ New gold value reflects in modal after refresh
- 📝 **Note**: Auto-recalculation may require backend logic

---

### Test Case 18: Task List Refresh
**Preconditions:**
- Tasks page open
- Task modal open over tasks page

**Steps:**
1. Edit duration in modal
2. Save
3. Close modal

**Expected Results:**
- ✅ Task card on Tasks page shows updated duration
- ✅ "30 min" label updates to new value
- ✅ No page refresh required

---

### Test Case 19: Accessibility - Keyboard Navigation
**Steps:**
1. Tab to Edit button
2. Press Enter to activate
3. Type new duration
4. Tab to Save button
5. Press Enter

**Expected Results:**
- ✅ Full keyboard navigation works
- ✅ Focus indicators visible
- ✅ Enter/Escape shortcuts work as expected

---

### Test Case 20: Mobile Touch Interaction
**Preconditions:**
- Mobile device or responsive mode

**Steps:**
1. Tap Edit button
2. Use on-screen keyboard
3. Tap Save

**Expected Results:**
- ✅ Edit button is large enough to tap easily
- ✅ Input field expands for mobile keyboard
- ✅ Save/Cancel buttons are touch-friendly
- ✅ No layout shifts

---

## Edge Cases

### EC1: Empty Input
**Steps:**
1. Clear input field completely
2. Click Save

**Expected Results:**
- ✅ NaN validation catches it
- ✅ Error toast appears
- ✅ Edit mode stays open

---

### EC2: Very Large Numbers
**Steps:**
1. Enter "999999"
2. Save

**Expected Results:**
- ✅ Value is accepted
- ✅ Calendar event may clip or scroll
- ✅ No JavaScript errors

---

### EC3: Special Characters
**Steps:**
1. Enter "30!" or "30-45"
2. Save

**Expected Results:**
- ✅ parseInt extracts valid number (30)
- ✅ Or shows validation error

---

## Implementation Verification

### Code Checklist:
- ✅ Input type="number"
- ✅ min="1" attribute set
- ✅ onKeyDown handles Enter and Escape
- ✅ Mutation invalidates '/api/tasks' query
- ✅ Mutation invalidates '/api/google-calendar/events' query
- ✅ State resets on cancel
- ✅ Input auto-focuses on edit mode

### API Verification:
```bash
# Verify PATCH endpoint
curl -X PATCH http://localhost:5000/api/tasks/123 \
  -H "Content-Type: application/json" \
  -d '{"duration": 60}'
```

## Performance
- ✅ Edit mode toggles instantly (<100ms)
- ✅ API call completes <1s
- ✅ UI updates without full page refresh
- ✅ Smooth transition between modes

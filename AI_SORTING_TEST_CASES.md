# AI Sorting System Test Cases

## Feature: AI-Powered Calendar Task Sorting

---

## SORTING ENDPOINT TEST CASES

### TC-SORT-001: Basic Sort Request
**Preconditions:**
- User authenticated with tasks on target date
- OpenAI API key configured

**Steps:**
1. Send `POST /api/ml/sort-tasks` with `{ date: "2026-02-24", timezoneOffset: 480 }`
2. Observe response

**Expected Result:**
- Response contains `success: true`
- `sortedSchedule` is an array of `{ taskId, startTime, endTime }`
- `originalSchedule` matches task positions before sort
- `taskMetadata` includes all task details
- `preferences` includes startHour, endHour, breakDuration

**Status:** ⬜ Not Tested

---

### TC-SORT-002: Sort Schedules After Current Time (Today)
**Preconditions:**
- Current time is 2:00 PM
- Tasks exist for today, some scheduled before 2:00 PM

**Steps:**
1. Trigger sort for today's date
2. Check sorted schedule times

**Expected Result:**
- All sorted tasks have startTime after 2:00 PM
- No task scheduled in past hours
- Tasks respect priority ordering after current time

**Status:** ⬜ Not Tested

---

### TC-SORT-003: Sort Avoids Google Calendar Blocked Slots
**Preconditions:**
- Google Calendar connected
- Google Calendar has event: 3:00 PM - 4:00 PM "Meeting"
- PQ tasks to sort

**Steps:**
1. Trigger sort
2. Check if any PQ task overlaps 3:00 PM - 4:00 PM

**Expected Result:**
- No PQ task scheduled during 3:00 PM - 4:00 PM
- Tasks scheduled around the blocked slot
- Google Calendar event appears in blocked slots list in logs

**Status:** ⬜ Not Tested

---

### TC-SORT-004: Sort With Specific Task IDs
**Preconditions:**
- User has tasks with IDs 10, 20, 30

**Steps:**
1. Send `POST /api/ml/sort-tasks` with `{ date: "2026-02-24", taskIds: [10, 20], timezoneOffset: 480 }`
2. Check response

**Expected Result:**
- Only tasks 10 and 20 in sortedSchedule
- Task 30 not included
- Both tasks scheduled correctly

**Status:** ⬜ Not Tested

---

### TC-SORT-005: Sort With No Tasks on Date
**Preconditions:**
- No tasks exist for the target date

**Steps:**
1. Send sort request for a date with no tasks

**Expected Result:**
- Response: `{ success: true, sortedSchedule: [], originalSchedule: [] }`
- No error thrown

**Status:** ⬜ Not Tested

---

### TC-SORT-006: Sort Respects Working Hours
**Preconditions:**
- User preferences: startHour=9, endHour=17
- Multiple tasks totaling 6 hours

**Steps:**
1. Trigger sort
2. Check all task times

**Expected Result:**
- All tasks scheduled between 9:00 AM and 5:00 PM
- No tasks outside working hours
- Tasks respect break duration between them

**Status:** ⬜ Not Tested

---

### TC-SORT-007: Fallback Sort When OpenAI Unavailable
**Preconditions:**
- OpenAI API key not set or API returns error

**Steps:**
1. Trigger sort with invalid/missing API key

**Expected Result:**
- Sort still succeeds (fallback)
- Tasks sorted by priority: Pareto > High > Med-High > Medium > Med-Low > Low
- Tasks scheduled sequentially from current time
- Console shows fallback warning

**Status:** ⬜ Not Tested

---

### TC-SORT-008: Sort With Timezone Offset
**Preconditions:**
- User in PST (timezoneOffset: 480)
- Tasks at 9:00 AM PST (17:00 UTC)

**Steps:**
1. Sort with `timezoneOffset: 480`
2. Verify local times make sense

**Expected Result:**
- Tasks sorted in user's local time context
- Start times correspond to local hours, not UTC
- 9:00 AM PST displays correctly

**Status:** ⬜ Not Tested

---

### TC-SORT-009: Priority-Based Ordering
**Preconditions:**
- Tasks: "Low Priority" (Low), "High Priority" (High), "Pareto Task" (Pareto)

**Steps:**
1. Sort tasks
2. Check order

**Expected Result:**
- Pareto task scheduled first
- High priority task second
- Low priority task last
- Default AI behavior respects priority ordering

**Status:** ⬜ Not Tested

---

## FEEDBACK ENDPOINT TEST CASES

### TC-FB-001: Submit Verbal Feedback
**Preconditions:**
- Sort completed for today

**Steps:**
1. Send `POST /api/ml/feedback` with:
   ```json
   { "feedbackType": "verbal", "feedbackReason": "Schedule tasks after current time", "date": "2026-02-24" }
   ```

**Expected Result:**
- Response: `{ success: true, message: "Feedback saved! AI will use this for future sorting." }`
- Feedback saved in `ml_sorting_feedback` table
- No schedule applied (verbal only saves)

**Status:** ⬜ Not Tested

---

### TC-FB-002: Verbal Feedback Affects Next Sort
**Preconditions:**
- User previously submitted verbal feedback: "Always put exercise tasks first"
- User has "Weightlifting" task on today's date

**Steps:**
1. Trigger sort
2. Check if AI prompt includes user rule
3. Verify "Weightlifting" appears early in schedule

**Expected Result:**
- Server logs show user rule in prompt
- AI considers the verbal feedback
- Exercise task prioritized per user's instruction

**Status:** ⬜ Not Tested

---

### TC-FB-003: Submit Approved Feedback
**Preconditions:**
- Sort completed, user happy with result

**Steps:**
1. Send `POST /api/ml/feedback` with `feedbackType: "approved"` and full schedule data

**Expected Result:**
- Feedback saved to DB
- `learnFromFeedback()` called to update preferences
- ML sorted schedule applied to actual task times
- Google Calendar events updated (if connected)
- `totalApproved` counter incremented

**Status:** ⬜ Not Tested

---

### TC-FB-004: Submit Corrected Feedback
**Preconditions:**
- Sort completed, user manually reordered tasks

**Steps:**
1. Send `POST /api/ml/feedback` with:
   - `feedbackType: "corrected"`
   - `mlSortedSchedule` (original AI order)
   - `userCorrectedSchedule` (user's preferred order)

**Expected Result:**
- Feedback saved with both schedules
- `learnFromFeedback()` adjusts preferences based on correction
- User's corrected schedule applied to tasks
- Google Calendar synced with corrected times

**Status:** ⬜ Not Tested

---

### TC-FB-005: Corrected Feedback Without Schedule Returns Error
**Preconditions:**
- None

**Steps:**
1. Send `POST /api/ml/feedback` with `feedbackType: "corrected"` but no `userCorrectedSchedule`

**Expected Result:**
- Response: 400 status
- Error: "User corrected schedule is required for corrections"

**Status:** ⬜ Not Tested

---

### TC-FB-006: Invalid Feedback Type Returns Error
**Preconditions:**
- None

**Steps:**
1. Send `POST /api/ml/feedback` with `feedbackType: "invalid"`

**Expected Result:**
- Response: 400 status
- Error: "Valid feedback type (approved/corrected/verbal) is required"

**Status:** ⬜ Not Tested

---

### TC-FB-007: Feedback History Limit (40 Entries)
**Preconditions:**
- User has submitted 50+ feedback entries

**Steps:**
1. Trigger sort
2. Check how many feedback entries are retrieved

**Expected Result:**
- Only last 40 entries retrieved (ordered by createdAt desc)
- Most recent feedback takes priority
- Older feedback beyond 40 is ignored

**Status:** ⬜ Not Tested

---

### TC-FB-008: Duplicate Rules Deduplicated
**Preconditions:**
- User submitted same verbal feedback 3 times: "Put high priority tasks first"

**Steps:**
1. Trigger sort
2. Check extracted rules

**Expected Result:**
- Rule appears only once in AI prompt
- Deduplication uses case-insensitive normalization
- No wasted prompt tokens on repeated rules

**Status:** ⬜ Not Tested

---

### TC-FB-009: Max 10 Unique Rules in Prompt
**Preconditions:**
- User has submitted 15+ unique verbal feedback entries

**Steps:**
1. Trigger sort
2. Check rules in AI prompt

**Expected Result:**
- Only 10 most recent unique rules included
- Oldest rules dropped
- Prompt stays within token limits

**Status:** ⬜ Not Tested

---

## APPLY SORT TEST CASES

### TC-APPLY-001: Apply Sorted Schedule Updates Tasks
**Preconditions:**
- Sort completed with sortedSchedule

**Steps:**
1. Send `POST /api/ml/apply-sort` with sortedSchedule
2. Check task scheduledTime values

**Expected Result:**
- Each task's `scheduledTime` updated to match sortedSchedule startTime
- `updatedCount` matches number of tasks
- Tasks appear at new positions in calendar

**Status:** ⬜ Not Tested

---

### TC-APPLY-002: Apply Sort Syncs to Google Calendar
**Preconditions:**
- Google Calendar connected
- Tasks have linked Google Calendar events

**Steps:**
1. Apply sorted schedule
2. Check Google Calendar

**Expected Result:**
- Google Calendar events updated with new times
- `googleCalendarUpdated` count > 0
- Events visible at new times in Google Calendar

**Status:** ⬜ Not Tested

---

### TC-APPLY-003: Apply Sort With Invalid Schedule
**Preconditions:**
- None

**Steps:**
1. Send `POST /api/ml/apply-sort` with `sortedSchedule: null`

**Expected Result:**
- Response: 400 status
- Error: "Sorted schedule is required"

**Status:** ⬜ Not Tested

---

## PREFERENCES TEST CASES

### TC-PREF-001: Get Default Preferences
**Preconditions:**
- User has never sorted before (no saved preferences)

**Steps:**
1. Send `GET /api/ml/preferences`

**Expected Result:**
- Returns DEFAULT_PREFERENCES:
  - `preferredStartHour: 8`
  - `preferredEndHour: 22`
  - `breakDuration: 0`
  - `highPriorityTimePreference: "morning"`

**Status:** ⬜ Not Tested

---

### TC-PREF-002: Preferences Update After Feedback
**Preconditions:**
- User submits approved/corrected feedback

**Steps:**
1. Get preferences before feedback
2. Submit approved feedback
3. Get preferences after feedback

**Expected Result:**
- `totalApproved` incremented
- Priority weights may have adjusted
- Preferences persisted to DB

**Status:** ⬜ Not Tested

---

## FRONTEND MODAL TEST CASES

### TC-MODAL-001: Feedback Modal Shows Three Options
**Preconditions:**
- Sort completed, modal triggered

**Steps:**
1. Open feedback modal
2. Observe available options

**Expected Result:**
- "Looks Good!" button (approve)
- "Adjust Order" button (correct)
- "Give Specific Feedback" button (verbal)

**Status:** ⬜ Not Tested

---

### TC-MODAL-002: Verbal Feedback Text Input
**Preconditions:**
- Feedback modal open

**Steps:**
1. Click "Give Specific Feedback"
2. Type instruction in text area
3. Submit

**Expected Result:**
- Text area accepts free-form input
- Submit sends `feedbackType: 'verbal'` with reason text
- Success toast shows confirmation
- Modal closes

**Status:** ⬜ Not Tested

---

### TC-MODAL-003: Correction Mode Drag Reorder
**Preconditions:**
- Feedback modal open with sorted tasks

**Steps:**
1. Click "Adjust Order"
2. Drag tasks to reorder
3. Submit correction

**Expected Result:**
- Tasks draggable to reorder
- New order sent as `userCorrectedSchedule`
- Schedule applied with corrected times
- Success toast confirmation

**Status:** ⬜ Not Tested

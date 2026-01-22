# Notion Sync & Calendar Orphan Cleanup Test Cases

## Notion Sync Update Tests

### NSU-001: Basic Update on Re-import
**Priority:** Critical  
**Preconditions:** User has Notion integration configured

**Steps:**
1. Create a task in Notion with title "Test Task" and due date "Jan 22, 2026"
2. Run Notion import in ProductivityQuest
3. Verify task appears with correct due date
4. In Notion, change the due date to "Jul 11, 2027"
5. Run Notion import again

**Expected Results:**
- No duplicate task created
- Existing task's due date updated to Jul 11, 2027
- Toast shows "Updated 1 existing tasks from Notion"
- Task appears on Jul 11, 2027 in calendar (not Jan 22, 2026)

---

### NSU-002: Update Title on Re-import
**Priority:** High  
**Preconditions:** User has Notion integration configured

**Steps:**
1. Create a task in Notion with title "Original Title"
2. Run Notion import
3. In Notion, change the title to "Updated Title"
4. Run Notion import again

**Expected Results:**
- Task title updated to "Updated Title"
- No duplicate task created
- notionId remains the same

---

### NSU-003: Update Multiple Fields
**Priority:** High  
**Preconditions:** User has Notion integration configured

**Steps:**
1. Create a task in Notion with:
   - Title: "Multi-field Test"
   - Due: Jan 22, 2026
   - Importance: Low
   - Duration: 30 min
2. Run Notion import
3. In Notion, update:
   - Due: Feb 15, 2026
   - Importance: High
   - Duration: 60 min
4. Run Notion import again

**Expected Results:**
- All fields updated correctly
- Gold value recalculated based on new importance/duration
- Single task exists (no duplicates)

---

### NSU-004: Mixed New and Updated Tasks
**Priority:** High  
**Preconditions:** User has existing tasks from previous Notion import

**Steps:**
1. Have 5 existing tasks from Notion
2. Update 2 tasks in Notion
3. Add 3 new tasks in Notion
4. Run Notion import

**Expected Results:**
- Toast shows "Imported 3 new tasks and updated 2 existing tasks from Notion"
- 2 existing tasks updated with new data
- 3 new tasks created
- Total task count increased by 3

---

### NSU-005: Completed Task Not Re-imported
**Priority:** Medium  
**Preconditions:** Task exists in both Notion and ProductivityQuest

**Steps:**
1. Import a task from Notion
2. Mark the task as "Done" in Notion (Kanban Stage = Done)
3. Run Notion import again

**Expected Results:**
- Completed task is skipped (not updated or duplicated)
- Task remains in recycling bin if previously completed

---

### NSU-006: Preserve Local Google Event ID
**Priority:** Medium  
**Preconditions:** Task synced to Google Calendar

**Steps:**
1. Import task from Notion
2. Add task to Google Calendar (googleEventId stored)
3. Update task details in Notion
4. Run Notion import

**Expected Results:**
- Task updated with Notion changes
- googleEventId preserved (not overwritten to null)
- Google Calendar event still linked

---

## Calendar Orphan Cleanup Tests

### COC-001: Basic Orphan Detection and Removal
**Priority:** Critical  
**Preconditions:** User has Google Calendar integration configured

**Steps:**
1. Create and schedule a task to calendar
2. Verify Google Calendar event created with "ProductivityQuest Task ID: XXXX" in description
3. Click "Remove from Calendar" on the task
4. Refresh the calendar page

**Expected Results:**
- Event immediately disappears from app calendar
- Event deleted from Google Calendar
- Task still exists in Quests list (just unscheduled)

---

### COC-002: Orphan with Missing googleEventId
**Priority:** High  
**Preconditions:** Google Calendar event exists but googleEventId not stored in task

**Steps:**
1. Schedule a task to calendar
2. Manually clear the googleEventId in database (simulate missing link)
3. Unschedule the task
4. Refresh calendar page

**Expected Results:**
- Orphaned event detected by Task ID in description
- Event hidden from calendar view
- Event deleted from Google Calendar
- Log shows: "Found orphaned Google event for unscheduled PQ Task ID XXXX"

---

### COC-003: Clear All from Calendar
**Priority:** High  
**Preconditions:** Multiple tasks scheduled to calendar

**Steps:**
1. Schedule 5 tasks to calendar
2. Click "Clear ALL from Calendar"
3. Refresh calendar page

**Expected Results:**
- All 5 events removed from app calendar
- All 5 events deleted from Google Calendar
- All 5 tasks still exist in Quests (unscheduled)

---

### COC-004: Non-PQ Google Calendar Events Preserved
**Priority:** High  
**Preconditions:** User has personal events in Google Calendar

**Steps:**
1. Create a personal event in Google Calendar (not through ProductivityQuest)
2. Open the calendar page in ProductivityQuest

**Expected Results:**
- Personal event appears on the calendar
- Event is NOT deleted or modified
- Event shows as "Google Calendar" source

---

### COC-005: Event on Non-Primary Calendar
**Priority:** Medium  
**Preconditions:** User has multiple Google Calendars configured

**Steps:**
1. Configure sync to use a secondary calendar
2. Schedule a task (event created on secondary calendar)
3. Unschedule the task
4. Refresh calendar

**Expected Results:**
- Event deleted from the CORRECT calendar (secondary, not primary)
- calendarId used for deletion matches where event was created

---

### COC-006: Orphan Cleanup on Notion Date Change
**Priority:** Critical  
**Preconditions:** Task synced from Notion and scheduled to Google Calendar

**Steps:**
1. Import task from Notion (due Jan 22, 2026)
2. Add task to calendar (Google event created for Jan 22)
3. In Notion, change due date to Jul 11, 2027
4. Run Notion import
5. Refresh calendar

**Expected Results:**
- Task updated with new date (Jul 11, 2027)
- Old Google Calendar event (Jan 22) deleted
- If task is rescheduled, new event created for Jul 11

---

### COC-007: Bulk Unschedule via Quests Page
**Priority:** Medium  
**Preconditions:** Multiple tasks scheduled and selected in Quests page

**Steps:**
1. Schedule 3 tasks to calendar
2. Select all 3 tasks in Quests page
3. Click "Remove from Calendar"
4. Refresh calendar page

**Expected Results:**
- All 3 events removed from calendar
- All 3 Google Calendar events deleted
- Toast shows "3 tasks removed from calendar"

---

## Regression Prevention Tests

### REG-001: No Duplicate Tasks After Multiple Imports
**Priority:** Critical  

**Steps:**
1. Import from Notion (10 tasks)
2. Import from Notion again (same 10 tasks, no changes)
3. Import from Notion a third time

**Expected Results:**
- Still only 10 tasks in database
- No duplicates created
- Toast shows "No changes detected from Notion" or similar

---

### REG-002: Calendar Shows Correct Events After Multiple Operations
**Priority:** High  

**Steps:**
1. Schedule 5 tasks to calendar
2. Unschedule 2 tasks
3. Schedule 1 new task
4. Refresh calendar

**Expected Results:**
- Calendar shows exactly 4 events (5 - 2 + 1)
- No orphaned events visible
- Google Calendar also shows 4 events

---

### REG-003: Database Consistency After Sync Operations
**Priority:** High  

**Steps:**
1. Import 5 tasks from Notion
2. Schedule all to calendar
3. Update 2 tasks in Notion
4. Run Notion import
5. Unschedule 1 task
6. Query database for all tasks

**Expected Results:**
- 5 tasks total (no duplicates)
- 2 tasks have updated data from Notion
- 4 tasks have scheduledTime set
- 1 task has scheduledTime = null
- All tasks have correct notionId

---

## Error Handling Tests

### ERR-001: Google Calendar Delete Failure
**Priority:** Medium  

**Steps:**
1. Schedule a task to calendar
2. Revoke Google Calendar permissions
3. Unschedule the task

**Expected Results:**
- Task unscheduled locally (scheduledTime = null)
- Error logged but not shown to user
- On re-authorization, orphan cleanup removes event

---

### ERR-002: Notion API Failure During Import
**Priority:** Medium  

**Steps:**
1. Start Notion import
2. Simulate Notion API failure mid-import

**Expected Results:**
- Error message shown to user
- Partial import not corrupted
- Tasks imported before failure are saved

---

## Performance Tests

### PERF-001: Large Notion Import
**Priority:** Low  

**Steps:**
1. Have 500+ tasks in Notion database
2. Run Notion import
3. Measure time and check for timeouts

**Expected Results:**
- Import completes within reasonable time (< 60 seconds)
- No timeout errors
- All tasks imported/updated correctly

---

### PERF-002: Calendar with Many Events
**Priority:** Low  

**Steps:**
1. Have 100+ events on a single day
2. Open calendar day view

**Expected Results:**
- Calendar loads within 3 seconds
- All events visible and interactive
- No UI freezing

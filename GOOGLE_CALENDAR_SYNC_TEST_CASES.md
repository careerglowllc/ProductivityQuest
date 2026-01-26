# Google Calendar Sync - Test Cases

## Prerequisites
- ProductivityQuest account
- Google Cloud Project with Calendar API enabled
- OAuth 2.0 credentials (Client ID & Secret)
- Test Google Calendar account

---

## 1. Connection & Authentication Tests

### TC-GC-001: Initial Connection - Enter Credentials
**Steps:**
1. Navigate to Settings → Google Calendar Integration
2. Verify status shows "Google Calendar is not connected"
3. Click "Connect" button
4. Enter valid Client ID
5. Enter valid Client Secret
6. Click "Save Credentials"

**Expected Result:**
- ✅ Credentials saved successfully
- ✅ Status changes to "Credentials saved - authorization required to complete setup"
- ✅ "Authorize Google Account" button appears
- ✅ Toast notification confirms save

---

### TC-GC-002: OAuth Authorization Flow
**Steps:**
1. After saving credentials, click "Authorize Google Account"
2. Complete Google sign-in
3. Grant calendar permissions
4. Wait for redirect back to app

**Expected Result:**
- ✅ Redirected to Google OAuth consent screen
- ✅ Shows "ProductivityQuest wants to access your Google Account"
- ✅ After approval, redirected back to settings page
- ✅ Status shows "Google Calendar is fully connected and ready to sync"
- ✅ Authorization prompt no longer shown

---

### TC-GC-003: Invalid Credentials
**Steps:**
1. Click "Connect"
2. Enter invalid/malformed Client ID
3. Enter invalid Client Secret
4. Attempt to authorize

**Expected Result:**
- ✅ Error message displayed
- ✅ User prompted to check credentials
- ✅ No tokens stored

---

### TC-GC-004: Disconnect Google Calendar
**Steps:**
1. With connected Google Calendar
2. Click "Disconnect" button
3. Confirm action

**Expected Result:**
- ✅ All credentials cleared (Client ID, Secret, tokens)
- ✅ Status changes to "Google Calendar is not connected"
- ✅ "Connect" button appears
- ✅ Sync controls hidden or disabled
- ✅ Toast confirms disconnection

---

### TC-GC-005: Re-connect After Disconnect
**Steps:**
1. Disconnect Google Calendar
2. Click "Connect" again
3. Enter new credentials
4. Complete authorization

**Expected Result:**
- ✅ Fresh connection established
- ✅ New tokens stored
- ✅ Previous connection data cleared

---

## 2. Sync Configuration Tests

### TC-GC-010: Enable Automatic Sync
**Steps:**
1. With connected Google Calendar
2. Toggle "Enable Automatic Sync" ON

**Expected Result:**
- ✅ Toggle switches to enabled state
- ✅ Sync direction options appear
- ✅ Setting persists after page refresh

---

### TC-GC-011: Change Sync Direction
**Steps:**
1. Enable Automatic Sync
2. Select "Import Only"
3. Change to "Export Only"
4. Change to "Two-Way Sync"

**Expected Result:**
- ✅ Each selection highlights correctly
- ✅ Description text updates for each option
- ✅ Setting persists after page refresh

---

### TC-GC-012: Enable Instant Calendar Sync
**Steps:**
1. Enable Automatic Sync first
2. Toggle "Instant Calendar Sync" ON

**Expected Result:**
- ✅ Toggle enabled
- ✅ Setting saved
- ✅ New tasks will auto-sync

---

### TC-GC-013: Instant Sync Disabled When Auto-Sync Off
**Steps:**
1. Disable "Enable Automatic Sync"
2. Observe "Instant Calendar Sync" toggle

**Expected Result:**
- ✅ Instant Calendar Sync toggle is disabled
- ✅ Cannot enable without Auto-Sync on

---

## 3. Manual Sync Tests

### TC-GC-020: Sync Now - With Tasks Due Today
**Steps:**
1. Create 3 tasks with due dates for today
2. Select all tasks using "Select All" or individual checkboxes
3. Click "Sync Now" button

**Expected Result:**
- ✅ Loading spinner shown during sync
- ✅ Toast shows "X tasks synced to your Google Calendar"
- ✅ Tasks appear in Google Calendar
- ✅ Events have correct titles, times, and durations

---

### TC-GC-021: Sync Now - No Tasks Selected
**Steps:**
1. Ensure no tasks are selected
2. Click "Sync Now" button

**Expected Result:**
- ✅ Message indicates no tasks to sync
- ✅ No errors thrown

---

### TC-GC-022: Sync Now - Tasks Without Due Dates
**Steps:**
1. Create tasks without due dates
2. Attempt to sync

**Expected Result:**
- ✅ Tasks without due dates are skipped
- ✅ Only tasks with due dates are synced
- ✅ Clear feedback about which tasks were synced

---

### TC-GC-023: Re-sync Existing Events
**Steps:**
1. Sync a task to Google Calendar
2. Edit the task title in ProductivityQuest
3. Sync again

**Expected Result:**
- ✅ Existing calendar event is updated
- ✅ No duplicate events created
- ✅ Changes reflected in Google Calendar

---

## 4. Instant Sync Tests

### TC-GC-030: New Task Auto-Syncs to Calendar
**Steps:**
1. Enable Instant Calendar Sync
2. Create new task with:
   - Title: "Test Instant Sync"
   - Due date: Today
   - Duration: 30 minutes
   - Importance: High
3. Save the task

**Expected Result:**
- ✅ Task created in ProductivityQuest
- ✅ Event automatically created in Google Calendar
- ✅ Event has red color (High priority)
- ✅ Event time matches scheduled time

---

### TC-GC-031: Instant Sync Disabled - No Auto-Sync
**Steps:**
1. Disable Instant Calendar Sync
2. Create new task with due date
3. Check Google Calendar

**Expected Result:**
- ✅ Task created in ProductivityQuest
- ✅ No automatic event in Google Calendar
- ✅ Manual "Sync Now" required

---

## 5. Priority Color Tests

### TC-GC-040: High Priority - Red Color
**Steps:**
1. Create task with Importance: High
2. Sync to Google Calendar
3. View in Google Calendar

**Expected Result:**
- ✅ Event shows with red/tomato color

---

### TC-GC-041: Med-High Priority - Orange Color
**Steps:**
1. Create task with Importance: Med-High
2. Sync to Google Calendar

**Expected Result:**
- ✅ Event shows with orange/tangerine color

---

### TC-GC-042: Medium Priority - Yellow Color
**Steps:**
1. Create task with Importance: Medium
2. Sync to Google Calendar

**Expected Result:**
- ✅ Event shows with yellow/banana color

---

### TC-GC-043: Med-Low Priority - Blue Color
**Steps:**
1. Create task with Importance: Med-Low
2. Sync to Google Calendar

**Expected Result:**
- ✅ Event shows with blue/peacock color

---

### TC-GC-044: Low Priority - Green Color
**Steps:**
1. Create task with Importance: Low
2. Sync to Google Calendar

**Expected Result:**
- ✅ Event shows with green/sage color

---

## 6. Error Handling Tests

### TC-GC-050: Expired Token - Auto Refresh
**Steps:**
1. Connect Google Calendar
2. Wait for access token to expire (1 hour) or manually expire
3. Attempt to sync

**Expected Result:**
- ✅ Token automatically refreshed
- ✅ Sync completes successfully
- ✅ No user intervention required

---

### TC-GC-051: Invalid Refresh Token
**Steps:**
1. Revoke app access in Google Account settings
2. Attempt to sync in ProductivityQuest

**Expected Result:**
- ✅ Error message displayed
- ✅ Prompts user to re-authorize
- ✅ "Authorize Google Account" button shown

---

### TC-GC-052: Network Error During Sync
**Steps:**
1. Disable network connection
2. Click "Sync Now"

**Expected Result:**
- ✅ Error toast displayed
- ✅ Sync fails gracefully
- ✅ No partial data corruption

---

### TC-GC-053: Google Calendar API Rate Limit
**Steps:**
1. Attempt to sync many tasks rapidly

**Expected Result:**
- ✅ Rate limiting handled
- ✅ Appropriate error message
- ✅ Partial sync results reported

---

## 7. UI State Tests

### TC-GC-060: Status Bar - Not Connected
**Steps:**
1. Ensure Google Calendar is not connected
2. View status bar

**Expected Result:**
- ✅ Yellow alert: "Google Calendar is not connected"
- ✅ "Connect" button visible
- ✅ No Disconnect button

---

### TC-GC-061: Status Bar - Credentials Saved, Not Authorized
**Steps:**
1. Save credentials but don't authorize
2. View status bar

**Expected Result:**
- ✅ Yellow alert: "Credentials saved - authorization required to complete setup"
- ✅ "Authorize Google Account" button in Sync Controls
- ✅ "Disconnect" button visible

---

### TC-GC-062: Status Bar - Fully Connected
**Steps:**
1. Complete full connection (credentials + authorization)
2. View status bar

**Expected Result:**
- ✅ Green alert: "Google Calendar is fully connected and ready to sync"
- ✅ No authorization prompt in Sync Controls
- ✅ "Disconnect" button visible

---

### TC-GC-063: Loading States
**Steps:**
1. Observe UI during various operations:
   - Saving credentials
   - Authorizing
   - Disconnecting
   - Syncing

**Expected Result:**
- ✅ Loading spinners shown
- ✅ Buttons disabled during operations
- ✅ Clear feedback when complete

---

## 8. Data Persistence Tests

### TC-GC-070: Settings Persist After Logout/Login
**Steps:**
1. Configure Google Calendar settings
2. Logout
3. Login again
4. Check settings

**Expected Result:**
- ✅ All settings preserved
- ✅ Connection status unchanged
- ✅ Tokens still valid

---

### TC-GC-071: Settings Persist After Page Refresh
**Steps:**
1. Configure settings
2. Refresh the page
3. Check settings

**Expected Result:**
- ✅ All settings preserved
- ✅ Toggles in correct state
- ✅ Status bar shows correct state

---

## 9. Calendar Page Integration Tests

### TC-GC-080: Calendar View Shows Google Events
**Steps:**
1. With connected Google Calendar
2. Navigate to Calendar page
3. View current month

**Expected Result:**
- ✅ Google Calendar events displayed
- ✅ ProductivityQuest tasks displayed
- ✅ Events distinguishable (different styling)

---

### TC-GC-081: Sync Button on Tasks Page
**Steps:**
1. Navigate to Quests page
2. Select tasks due today
3. Click "Sync to Calendar" button

**Expected Result:**
- ✅ Selected tasks sync to Google Calendar
- ✅ Success message displayed
- ✅ Count of synced tasks shown

---

## 10. Edge Cases

### TC-GC-090: Very Long Task Title
**Steps:**
1. Create task with very long title (200+ characters)
2. Sync to Google Calendar

**Expected Result:**
- ✅ Event created successfully
- ✅ Title truncated appropriately if needed
- ✅ No errors

---

### TC-GC-091: Special Characters in Task Title
**Steps:**
1. Create task with special characters: `Test <>&"'` 
2. Sync to Google Calendar

**Expected Result:**
- ✅ Characters properly escaped
- ✅ Event displays correctly

---

### TC-GC-092: Task with Past Due Date
**Steps:**
1. Create task with due date in the past
2. Sync to Google Calendar

**Expected Result:**
- ✅ Event created for past date
- ✅ No errors thrown

---

### TC-GC-093: Multiple Users Same Calendar
**Steps:**
1. Two ProductivityQuest users connect same Google Calendar
2. Each syncs their tasks

**Expected Result:**
- ✅ Both users can sync
- ✅ Events from both users appear
- ✅ No interference between users

---

## 9. Timezone Handling Tests (v1.5)

### TC-GC-100: Export Task with PST Timezone
**Preconditions:**
- User timezone set to `America/Los_Angeles` (PST)
- Task created with `scheduledTime` of 9:00 AM PST (17:00 UTC)

**Steps:**
1. Create task scheduled for 9:00 AM today
2. Sync task to Google Calendar
3. Open Google Calendar and check event time

**Expected Result:**
- ✅ Event displays at 9:00 AM in Google Calendar
- ✅ Time matches original task time exactly
- ✅ No 8-hour shift occurs

---

### TC-GC-101: Export Task with EST Timezone  
**Preconditions:**
- User timezone set to `America/New_York` (EST)
- Task created with `scheduledTime` of 9:00 AM EST (14:00 UTC)

**Steps:**
1. Create task scheduled for 9:00 AM today
2. Sync task to Google Calendar
3. Open Google Calendar (set to EST)

**Expected Result:**
- ✅ Event displays at 9:00 AM EST
- ✅ Time matches original task time
- ✅ Correct conversion from UTC storage

---

### TC-GC-102: Import from Notion Preserves Time
**Preconditions:**
- Notion task with due date `2026-01-26T09:00:00.000-08:00` (9 AM PST)

**Steps:**
1. Import task from Notion
2. Check task's `dueDate` in ProductivityQuest
3. Sync to Google Calendar
4. Verify event time in Google Calendar

**Expected Result:**
- ✅ Task shows due at 9:00 AM in ProductivityQuest calendar
- ✅ Google Calendar event shows 9:00 AM
- ✅ No timezone shift during Notion → PQ → GCal flow

---

### TC-GC-103: Round-Trip Sync Stability
**Preconditions:**
- Task synced to Google Calendar
- Two-way sync enabled

**Steps:**
1. Create task at 9:00 AM, sync to Google Calendar
2. Wait 1 minute, trigger import from Google Calendar
3. Check task time hasn't changed
4. Repeat steps 2-3 three more times

**Expected Result:**
- ✅ Task time remains 9:00 AM after all syncs
- ✅ No gradual time drift
- ✅ Import doesn't trigger spurious updates (threshold: >5 min difference required)

---

### TC-GC-104: Move Event in Google Calendar
**Preconditions:**
- Task exists in ProductivityQuest at 9:00 AM
- Event synced to Google Calendar
- Two-way sync enabled

**Steps:**
1. Open Google Calendar
2. Drag event from 9:00 AM to 2:00 PM
3. Return to ProductivityQuest
4. Trigger calendar sync (import)
5. Check task's scheduled time

**Expected Result:**
- ✅ Task time updated to 2:00 PM
- ✅ Task appears at 2:00 PM on ProductivityQuest calendar
- ✅ Due date also updated to 2:00 PM

---

### TC-GC-105: Timezone Change Mid-Session
**Steps:**
1. Create task at 9:00 AM with timezone PST
2. Sync to Google Calendar (shows 9 AM PST)
3. Change user timezone to EST in settings
4. Create new task at 9:00 AM
5. Sync new task to Google Calendar

**Expected Result:**
- ✅ Original task still shows at 9:00 AM PST (in calendar)
- ✅ New task shows at 9:00 AM EST (12:00 PM PST equivalent)
- ✅ User's timezone preference respected for new tasks

---

### TC-GC-106: Date-Only Notion Task (No Time)
**Preconditions:**
- Notion task with date-only due: `2026-01-26` (no time component)

**Steps:**
1. Import task from Notion
2. Check how time is assigned in ProductivityQuest
3. Sync to Google Calendar

**Expected Result:**
- ✅ Task assigned default time of 12:00 PM (noon) local
- ✅ Google Calendar event created at noon
- ✅ No timezone-related errors

---

### TC-GC-107: DST Transition - Spring Forward
**Preconditions:**
- User in timezone with DST (e.g., PST/PDT)
- Task scheduled for 2:30 AM on DST transition day

**Steps:**
1. Create task at 2:30 AM on March 9, 2026 (DST spring forward)
2. Sync to Google Calendar
3. Verify event exists and time is handled

**Expected Result:**
- ✅ Event created without errors
- ✅ Time displayed correctly (may jump to 3:00 AM per DST rules)
- ✅ No crash or data corruption

---

### TC-GC-108: Small Time Difference Ignored
**Preconditions:**
- Task at 9:00:00 AM synced to Google Calendar

**Steps:**
1. Manually edit Google Calendar event to 9:02:00 AM (2-minute difference)
2. Trigger import from Google Calendar
3. Check if task was updated

**Expected Result:**
- ✅ Task NOT updated (under 5-minute threshold)
- ✅ Task remains at 9:00 AM
- ✅ Prevents unnecessary updates from minor discrepancies

---

### TC-GC-109: Large Time Difference Updates Task
**Preconditions:**
- Task at 9:00 AM synced to Google Calendar

**Steps:**
1. Manually edit Google Calendar event to 9:10:00 AM (10-minute difference)
2. Trigger import from Google Calendar
3. Check if task was updated

**Expected Result:**
- ✅ Task UPDATED to 9:10 AM (over 5-minute threshold)
- ✅ Change logged in console
- ✅ Task appears at new time in calendar

---

## Test Environment Checklist

- [ ] Fresh user account created
- [ ] Google Cloud project ready
- [ ] OAuth credentials available
- [ ] Test calendar empty
- [ ] Network connection stable
- [ ] Console open for error monitoring
- [ ] Database access for verification
- [ ] User timezone verified in settings

---

## Test Execution Log Template

| Test ID | Date | Tester | Result | Notes |
|---------|------|--------|--------|-------|
| TC-GC-001 | | | ⬜ Pass / ⬜ Fail | |
| TC-GC-002 | | | ⬜ Pass / ⬜ Fail | |
| TC-GC-003 | | | ⬜ Pass / ⬜ Fail | |
| TC-GC-100 | | | ⬜ Pass / ⬜ Fail | Timezone - PST Export |
| TC-GC-101 | | | ⬜ Pass / ⬜ Fail | Timezone - EST Export |
| TC-GC-102 | | | ⬜ Pass / ⬜ Fail | Timezone - Notion Import |
| TC-GC-103 | | | ⬜ Pass / ⬜ Fail | Timezone - Round-trip |
| TC-GC-104 | | | ⬜ Pass / ⬜ Fail | Timezone - GCal Move |
| TC-GC-105 | | | ⬜ Pass / ⬜ Fail | Timezone - User Change |
| TC-GC-106 | | | ⬜ Pass / ⬜ Fail | Timezone - Date Only |
| TC-GC-107 | | | ⬜ Pass / ⬜ Fail | Timezone - DST |
| TC-GC-108 | | | ⬜ Pass / ⬜ Fail | Timezone - Small Diff |
| TC-GC-109 | | | ⬜ Pass / ⬜ Fail | Timezone - Large Diff |
| ... | | | | |


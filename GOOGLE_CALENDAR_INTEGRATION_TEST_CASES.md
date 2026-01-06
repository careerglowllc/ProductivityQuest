# Google Calendar Integration - Test Cases

**Feature:** Google Calendar OAuth Integration & Task Sync  
**Last Updated:** January 2026  
**Total Test Cases:** 24  
**Integration Type:** Per-user OAuth 2.0 with database credential storage

---

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [OAuth Setup Tests (5)](#oauth-setup-tests)
3. [Calendar Display Tests (5)](#calendar-display-tests)
4. [Task Sync Tests (4)](#task-sync-tests)
5. [Error Handling Tests (4)](#error-handling-tests)
6. [Clear All Events Tests (6)](#clear-all-events-tests)

---

## Feature Overview

### Architecture
- **Per-User Credentials:** Each user stores their own Google OAuth credentials in database
- **Database Storage:** Client ID, Client Secret, Access Token, Refresh Token stored in `users` table
- **OAuth Flow:** Authorization code grant with refresh token capability
- **Sync Directions:** Import, Export, or Both (user-configurable)

### Database Schema
```typescript
// Users table additions
googleCalendarClientId: text (nullable)
googleCalendarClientSecret: text (nullable)
googleCalendarRefreshToken: text (nullable)
googleCalendarAccessToken: text (nullable)
googleCalendarTokenExpiry: timestamp (nullable)
googleCalendarSyncEnabled: boolean (default: false)
googleCalendarSyncDirection: text (default: 'both')
googleCalendarLastSync: timestamp (nullable)

// Tasks table addition
googleEventId: text (nullable) // Links task to Google Calendar event
```

### User Journey
1. Navigate to Google Calendar Integration page
2. Follow setup guide to create OAuth credentials in Google Cloud Console
3. Paste Client ID and Client Secret
4. Authorize access (OAuth flow)
5. Configure sync settings (direction, enable/disable)
6. View tasks on Calendar page
7. Manual or automatic sync

---

## OAuth Setup Tests

### TC-GC-001: Access Setup Page
**Objective:** Verify Google Calendar setup page is accessible  
**Steps:**
1. Log in to ProductivityQuest
2. Navigate to `/google-calendar-integration`

**Expected Result:**
- ✅ Page loads without errors
- ✅ 4-step setup guide displayed
- ✅ Input fields for Client ID and Client Secret visible
- ✅ "Save & Authorize" button present
- ✅ Links to Google Cloud Console included

---

### TC-GC-002: Save OAuth Credentials
**Objective:** Verify credentials are saved to database  
**Input:**
- Client ID: `123456789-abc.apps.googleusercontent.com`
- Client Secret: `GOCSPX-abcdefghijklmnop`
- Action: Click "Save & Authorize"

**Expected Result:**
- ✅ POST request to `/api/google-calendar/save-credentials`
- ✅ Credentials saved to database (encrypted if possible)
- ✅ Success toast: "Credentials saved successfully"
- ✅ Database query shows non-null values:
```sql
SELECT googleCalendarClientId, googleCalendarClientSecret 
FROM users WHERE id = [user_id];
```

---

### TC-GC-003: OAuth Authorization Flow
**Objective:** Verify OAuth consent screen and token exchange  
**Steps:**
1. Enter valid credentials
2. Click "Save & Authorize"
3. Redirected to Google consent screen
4. Grant permissions
5. Redirected back to app

**Expected Result:**
- ✅ Redirect to Google OAuth URL with correct parameters
- ✅ Scope includes `calendar.readonly` or `calendar.events`
- ✅ User grants permission
- ✅ Authorization code returned to callback
- ✅ Token exchange successful
- ✅ Access token and refresh token saved to database
- ✅ `googleCalendarTokenExpiry` set correctly (usually +3600 seconds)

---

### TC-GC-004: Token Refresh
**Objective:** Verify expired tokens are refreshed automatically  
**Preconditions:**
- User has existing refresh token
- Access token is expired (tokenExpiry < now)

**Steps:**
1. Make API call requiring Google Calendar access
2. Backend detects expired token
3. Backend uses refresh token to get new access token

**Expected Result:**
- ✅ Refresh token request sent to Google
- ✅ New access token received
- ✅ Database updated with new token and expiry
- ✅ Original API call succeeds
- ✅ No user interaction required

---

### TC-GC-005: Disconnect Google Calendar
**Objective:** Verify user can disconnect their calendar  
**Steps:**
1. Navigate to Google Calendar settings
2. Click "Disconnect" or "Remove Integration"
3. Confirm action

**Expected Result:**
- ✅ All Google Calendar fields set to null in database
- ✅ `googleCalendarSyncEnabled` = false
- ✅ Success toast: "Google Calendar disconnected"
- ✅ Calendar page shows "Not Connected" state
- ✅ Tasks with `googleEventId` remain but lose sync link

---

## Calendar Display Tests

### TC-GC-D01: Calendar Page Access
**Objective:** Verify calendar page is accessible from navigation  
**Steps:**
1. Log in
2. Click calendar icon in top navigation bar

**Expected Result:**
- ✅ Navigate to `/calendar` route
- ✅ Page loads without errors
- ✅ Month view calendar displayed

---

### TC-GC-D02: Display Tasks on Calendar (Connected)
**Objective:** Verify tasks appear on correct dates when calendar is connected  
**Preconditions:**
- Google Calendar connected
- User has tasks with due dates

**Steps:**
1. Navigate to Calendar page
2. View current month

**Expected Result:**
- ✅ Calendar grid shows 7-day weeks
- ✅ Tasks appear on correct due date cells
- ✅ Up to 3 tasks shown per day
- ✅ "+N more" indicator if >3 tasks
- ✅ Task titles truncated with ellipsis
- ✅ Hover shows full title in tooltip
- ✅ Color coding:
  - Red: High/Pareto importance
  - Purple: Normal importance
  - Gray: Completed tasks (strikethrough)

---

### TC-GC-D03: Display Tasks on Calendar (Not Connected)
**Objective:** Verify calendar shows setup prompt when not connected  
**Preconditions:**
- Google Calendar NOT connected

**Steps:**
1. Navigate to Calendar page

**Expected Result:**
- ✅ Calendar grid still visible
- ✅ "Not Connected" message displayed
- ✅ Link to setup page: "Set up Google Calendar integration"
- ✅ Tasks still displayed (from database, not Google)
- ✅ No API errors in console

---

### TC-GC-D04: Month Navigation
**Objective:** Verify calendar navigation works correctly  
**Steps:**
1. Navigate to Calendar page
2. Click "Previous Month" button
3. Click "Next Month" button twice
4. Click "Today" button

**Expected Result:**
- ✅ "Previous Month" shows previous month's tasks
- ✅ "Next Month" advances calendar forward
- ✅ Month/year header updates correctly
- ✅ "Today" button returns to current month
- ✅ API fetches correct month's tasks: `/api/google-calendar/events?year=2024&month=11`

---

### TC-GC-D05: Empty Calendar Display
**Objective:** Verify calendar handles months with no tasks  
**Preconditions:**
- User has no tasks in selected month

**Steps:**
1. Navigate to a future month with no tasks

**Expected Result:**
- ✅ Calendar grid displays correctly
- ✅ All date cells empty (no tasks)
- ✅ No errors in console
- ✅ Message: "No tasks this month" (optional)

---

## Task Sync Tests

### TC-GC-S01: Fetch Monthly Tasks
**Objective:** Verify API returns correct tasks for specified month  
**Steps:**
1. Send GET request: `/api/google-calendar/events?year=2024&month=11`

**Expected Result:**
- ✅ Response structure:
```json
{
  "success": true,
  "events": [
    {
      "id": 123,
      "title": "Task title",
      "start": "2024-11-17T10:00:00Z",
      "end": "2024-11-17T11:00:00Z",
      "description": "Task description",
      "completed": false,
      "importance": "high",
      "goldValue": 25,
      "campaign": "Work",
      "skillTags": ["coding", "productivity"]
    }
  ],
  "month": 11,
  "year": 2024
}
```
- ✅ Only tasks with due dates in November 2024 returned
- ✅ Tasks sorted by due date ascending

---

### TC-GC-S02: Manual Sync Trigger
**Objective:** Verify manual sync button works  
**Steps:**
1. Navigate to Google Calendar Integration page
2. Click "Sync Now" button

**Expected Result:**
- ✅ POST request to `/api/google-calendar/sync-manual`
- ✅ Loading spinner appears
- ✅ Success toast: "Sync completed successfully"
- ✅ `googleCalendarLastSync` timestamp updated in database
- ✅ New tasks imported (if sync direction = import/both)
- ✅ Tasks exported to Google Calendar (if sync direction = export/both)

---

### TC-GC-S03: Sync Direction - Import Only
**Objective:** Verify import-only mode brings tasks from Google to app  
**Preconditions:**
- Sync direction set to "import"
- Google Calendar has events

**Steps:**
1. Trigger manual sync
2. Check app tasks

**Expected Result:**
- ✅ Google Calendar events imported as tasks
- ✅ `googleEventId` field populated with Google event ID
- ✅ Due date matches event start time
- ✅ Title matches event summary
- ✅ App tasks NOT exported to Google (one-way only)

---

### TC-GC-S04: Sync Direction - Export Only
**Objective:** Verify export-only mode pushes tasks to Google Calendar  
**Preconditions:**
- Sync direction set to "export"
- App has tasks without `googleEventId`

**Steps:**
1. Trigger manual sync
2. Check Google Calendar

**Expected Result:**
- ✅ App tasks appear as events in Google Calendar
- ✅ `googleEventId` saved in app database
- ✅ Event summary = task title
- ✅ Event start time = task due date
- ✅ Google Calendar events NOT imported (one-way only)

---

## Error Handling Tests

### TC-GC-E01: Invalid Credentials
**Objective:** Verify graceful handling of incorrect OAuth credentials  
**Input:**
- Client ID: `invalid_client_id`
- Client Secret: `invalid_secret`

**Steps:**
1. Enter invalid credentials
2. Click "Save & Authorize"

**Expected Result:**
- ✅ Google OAuth returns error
- ✅ Error toast: "Invalid credentials. Please check your Client ID and Secret."
- ✅ User remains on setup page
- ✅ No crash or white screen

---

### TC-GC-E02: Expired Refresh Token
**Objective:** Verify handling when refresh token is revoked  
**Preconditions:**
- User revokes access in Google Account settings

**Steps:**
1. Attempt to sync or view calendar
2. Backend tries to refresh token
3. Google returns 401 Unauthorized

**Expected Result:**
- ✅ Error toast: "Google Calendar access expired. Please reconnect."
- ✅ Calendar connection status set to false
- ✅ Redirect to setup page (optional)
- ✅ User prompted to re-authorize

---

### TC-GC-E03: Network Timeout
**Objective:** Verify handling of Google API timeout  
**Steps:**
1. Trigger sync while Google API is slow/unresponsive
2. Wait for timeout

**Expected Result:**
- ✅ Request times out after reasonable duration (e.g., 30s)
- ✅ Error toast: "Sync failed. Please try again later."
- ✅ App remains functional
- ✅ User can retry

---

### TC-GC-E04: Calendar API Disabled
**Objective:** Verify error when Google Calendar API not enabled  
**Preconditions:**
- User's Google Cloud project has Calendar API disabled

**Steps:**
1. Attempt to authorize or sync
2. Google returns "API not enabled" error

**Expected Result:**
- ✅ Error toast: "Google Calendar API is not enabled. Please enable it in Google Cloud Console."
- ✅ Link to enable API in error message
- ✅ Setup guide highlights step to enable API

---

## Integration Notes

### API Endpoints

```typescript
// Save OAuth credentials
POST /api/google-calendar/save-credentials
Body: { clientId: string, clientSecret: string }

// OAuth callback (Google redirects here)
GET /api/google-calendar/callback
Query: { code: string }

// Get events for calendar display
GET /api/google-calendar/events
Query: { year: number, month: number }

// Manual sync trigger
POST /api/google-calendar/sync-manual

// Update sync settings
POST /api/google-calendar/settings
Body: { syncEnabled: boolean, syncDirection: string }
```

### Security Considerations
- [ ] Client Secret stored securely (consider encryption)
- [ ] Access tokens encrypted at rest
- [ ] HTTPS required for OAuth callbacks
- [ ] CSRF protection on OAuth flow
- [ ] Token refresh happens server-side only
- [ ] User can only access their own calendar data

### Performance Considerations
- [ ] Token refresh cached (avoid repeated calls)
- [ ] Calendar events paginated (100 per request max)
- [ ] Month queries use indexed date filtering
- [ ] Sync operations run async (don't block UI)

---

## Clear All Events Tests

### TC-GC-CA01: Clear All Button Visible
**Objective:** Verify Clear All Synced Events button appears on integration page  
**Preconditions:**
- User logged in
- Google Calendar connected and sync enabled

**Steps:**
1. Navigate to `/google-calendar-integration`
2. Scroll to Sync Controls section

**Expected Result:**
- ✅ Orange "Clear All Synced Events" button visible
- ✅ Button appears below "Sync Now" button
- ✅ Button disabled if sync not enabled
- ✅ Trash icon displayed on button

---

### TC-GC-CA02: Confirmation Dialog
**Objective:** Verify confirmation dialog appears before clearing  
**Steps:**
1. Click "Clear All Synced Events" button
2. Observe dialog

**Expected Result:**
- ✅ Browser confirmation dialog appears
- ✅ Message warns about permanent deletion
- ✅ User must click OK to proceed
- ✅ Cancel aborts the operation

---

### TC-GC-CA03: Successful Clear All
**Objective:** Verify all synced events are deleted and references cleared  
**Preconditions:**
- 10+ tasks synced to Google Calendar (have googleEventId)

**Steps:**
1. Click "Clear All Synced Events"
2. Confirm in dialog
3. Wait for operation to complete

**Expected Result:**
- ✅ Loading spinner appears during operation
- ✅ POST request to `/api/google-calendar/clear-all`
- ✅ Response contains:
```json
{
  "success": true,
  "deletedFromGoogle": 10,
  "failedToDelete": 0,
  "clearedFromTasks": 10,
  "message": "Cleared 10 task references. Deleted 10 events from Google Calendar."
}
```
- ✅ Toast: "Calendar Cleared! Deleted X events from Google Calendar, cleared Y task references."
- ✅ Tasks in database have `googleEventId = null`
- ✅ Events no longer appear in Google Calendar
- ✅ Tasks still exist in ProductivityQuest Quests page

---

### TC-GC-CA04: Clear All with Some Failures
**Objective:** Verify partial success handling when some deletes fail  
**Preconditions:**
- Some events already deleted manually from Google Calendar

**Steps:**
1. Manually delete 2 events from Google Calendar
2. Click "Clear All Synced Events" in app
3. Confirm

**Expected Result:**
- ✅ Operation completes without error
- ✅ Response shows mixed results:
```json
{
  "deletedFromGoogle": 8,
  "failedToDelete": 2,
  "clearedFromTasks": 10
}
```
- ✅ All task references cleared (even failed deletes)
- ✅ Toast shows both counts
- ✅ Tasks can be re-synced after clearing

---

### TC-GC-CA05: Clear All Without Google Auth
**Objective:** Verify behavior when Google Calendar is disconnected  
**Preconditions:**
- User has tasks with `googleEventId` but no valid auth tokens

**Steps:**
1. Disconnect Google Calendar (or let tokens expire)
2. Click "Clear All Synced Events"
3. Confirm

**Expected Result:**
- ✅ Task references still cleared in database
- ✅ Delete from Google Calendar skipped (no valid auth)
- ✅ Response shows:
```json
{
  "deletedFromGoogle": 0,
  "failedToDelete": 10,
  "clearedFromTasks": 10
}
```
- ✅ No error thrown
- ✅ Toast indicates references cleared

---

### TC-GC-CA06: Re-sync After Clear All
**Objective:** Verify tasks can be synced again after clearing  
**Preconditions:**
- Clear All executed successfully
- Tasks still exist in ProductivityQuest

**Steps:**
1. Execute Clear All
2. Navigate to Calendar page
3. Select tasks to sync
4. Click "Sync Now"

**Expected Result:**
- ✅ New Google Calendar events created
- ✅ Tasks receive new `googleEventId` values
- ✅ Events appear in Google Calendar with correct times
- ✅ No duplicate events (old ones were deleted)

---

## Test Execution Checklist

- [ ] OAuth setup flow completes successfully
- [ ] Credentials saved to database
- [ ] Token refresh works automatically
- [ ] Calendar displays tasks correctly
- [ ] Month navigation functional
- [ ] Tasks color-coded properly
- [ ] Manual sync works
- [ ] Import/export directions respected
- [ ] Error handling graceful
- [ ] Network failures don't crash app
- [ ] Security: credentials encrypted
- [ ] Performance: <2s page load
- [ ] Mobile responsive (calendar grid adapts)
- [ ] Clear All button visible when sync enabled
- [ ] Clear All confirmation dialog works
- [ ] Clear All deletes events from Google Calendar
- [ ] Clear All clears task googleEventId references
- [ ] Re-sync works after Clear All

---

**Status:** Ready for Testing  
**Priority:** High  
**Dependencies:** OAuth 2.0, Google Calendar API, database migration

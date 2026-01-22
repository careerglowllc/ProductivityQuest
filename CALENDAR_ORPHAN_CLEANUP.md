# Calendar Orphaned Event Cleanup

## Overview

This feature automatically detects and removes "orphaned" Google Calendar events - events that were created by ProductivityQuest but whose corresponding task has been unscheduled.

## The Problem

**Before the fix:**
1. User schedules a task → Google Calendar event created with "ProductivityQuest Task ID: XXXX" in description
2. User removes the task from calendar (unschedule) → `scheduledTime` set to `null` in database
3. BUT the Google Calendar event might remain if:
   - The `googleEventId` wasn't stored in the task (missing link)
   - The delete request to Google Calendar failed silently
   - The event was on a different calendar than expected

**Result:** Ghost events appearing on the calendar that couldn't be removed through normal means.

## The Solution

The calendar events endpoint (`GET /api/google-calendar/events`) now:

1. **Identifies orphaned events** by checking if a Google Calendar event's description contains "ProductivityQuest Task ID: XXXX"
2. **Looks up the task** in the database by that ID
3. **If the task exists but is unscheduled** (`scheduledTime = null`):
   - **Hides** the event from the calendar view (immediate)
   - **Deletes** the event from Google Calendar (background cleanup)

### Detection Logic

```
For each Google Calendar event:
  1. Check if event.id matches any task's googleEventId → Skip (shown as PQ task)
  2. Extract "ProductivityQuest Task ID: XXXX" from description
  3. If task exists AND scheduledTime is null → ORPHANED → Delete & Skip
  4. If task exists AND scheduledTime is set → Skip (duplicate)
  5. Otherwise → Show as Google Calendar event
```

## How It Works

### Event Description Format

ProductivityQuest events include identification in the description:
```
🎯 ProductivityQuest Task ID: 4384
🏅 Gold Reward: 90
⚡ Importance: Low
```

This allows the system to identify which Google Calendar events belong to which tasks, even if the `googleEventId` link is broken.

### Automatic Cleanup

When an orphaned event is detected:
1. It's immediately hidden from the calendar view (user sees it disappear on refresh)
2. A delete request is sent to Google Calendar API in the background
3. Success/failure is logged for debugging

## Files Modified

- `server/routes.ts` - Updated `GET /api/google-calendar/events` endpoint
- Added orphan detection logic
- Added automatic deletion of orphaned events

## Key Code Changes

```typescript
// Create a set of ALL task IDs to detect orphans
const allTaskIds = new Set<number>();
for (const task of tasks) {
  allTaskIds.add(task.id);
}

// Check for orphaned events
const taskIdMatch = description.match(/ProductivityQuest Task ID:\s*(\d+)/);
if (taskIdMatch) {
  const taskId = parseInt(taskIdMatch[1], 10);
  const task = tasks.find(t => t.id === taskId);
  
  if (task && !task.scheduledTime) {
    // This is an orphaned event - delete it
    await googleCalendar.deleteEvent(user, gEvent.id, gEvent.calendarId);
    continue; // Don't show in UI
  }
}
```

## Testing

### Test Case 1: Basic Orphan Cleanup
1. Schedule a task to calendar (creates Google Calendar event)
2. Note the Google Calendar event ID
3. Unschedule the task (remove from calendar)
4. Refresh the calendar page
5. **Expected:** Event should disappear from both app calendar AND Google Calendar

### Test Case 2: Missing googleEventId Link
1. Create a task and schedule it
2. Manually remove the `googleEventId` from the database (simulating missing link)
3. The task's `scheduledTime` should still be set
4. Unschedule the task
5. Refresh calendar
6. **Expected:** Orphaned Google Calendar event should be detected by Task ID in description and deleted

### Test Case 3: Event on Non-Primary Calendar
1. Configure sync to use a non-primary calendar
2. Schedule a task
3. Unschedule the task
4. Refresh calendar
5. **Expected:** Event should be deleted from the correct calendar (using calendarId from event)

## Logging

The feature includes debug logging:
- `📅 [CALENDAR] Found orphaned Google event for unscheduled PQ Task ID XXXX`
- `✅ [CALENDAR] Deleted orphaned Google Calendar event XXXX`
- `⚠️ [CALENDAR] Failed to delete orphaned event: [error message]`

## Related Features

- **Notion Sync Update Fix** - Ensures tasks are updated (not duplicated) when Notion data changes
- **Unschedule Endpoint** - Sets `scheduledTime: null` and attempts to delete Google Calendar event

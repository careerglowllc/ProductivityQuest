# Notion Sync Update Fix

## Overview

This fix addresses an issue where Notion imports would create duplicate tasks instead of updating existing ones when task data changed in Notion.

## The Problem

**Before the fix:**
1. User imports tasks from Notion → Tasks created in ProductivityQuest database
2. User changes a task's due date in Notion (e.g., from Jan 22, 2026 to Jul 11, 2027)
3. User runs Notion import again → **NEW duplicate task created** with old data, OR existing task skipped entirely
4. The old task with the wrong date would still appear on the calendar

**Root cause:** The import logic had two modes:
- `includeDuplicates = true`: Create ALL tasks as new (causing duplicates)
- `includeDuplicates = false`: Skip tasks with existing `notionId` (no updates)

Neither mode actually **updated** existing tasks with new data from Notion.

## The Solution

The Notion import endpoint (`POST /api/notion/import`) now:

1. **Always fetches existing tasks** from the database
2. **Maps tasks by `notionId`** for quick lookup
3. **When a task with matching `notionId` exists** → **UPDATES** it with new data from Notion
4. **When no matching `notionId` exists** → Creates a new task

### Updated Fields on Sync

When an existing task is updated, the following fields are synced from Notion:
- `title`
- `description`
- `details`
- `duration`
- `goldValue`
- `dueDate`
- `scheduledTime` (updated to match new due date)
- `importance`
- `kanbanStage`
- `recurType`
- `businessWorkFilter`
- `campaign`
- `googleEventId` (preserved if not in Notion)
- `apple`, `smartPrep`, `delegationTask`, `velin` flags

---

## Timezone Handling (v1.5 - Jan 2026)

### How Notion Dates Are Parsed

Notion returns dates in ISO 8601 format with timezone offset:
```
2026-01-26T09:00:00.000-08:00  (9 AM Pacific Time)
```

**Parsing Logic (server/notion.ts):**

1. **Date with time** (has `T` in string):
   ```typescript
   // Full datetime - JavaScript parses ISO 8601 correctly
   dueDate = new Date(dueDateRaw);  // Automatically converts to UTC
   ```

2. **Date only** (just `YYYY-MM-DD`):
   ```typescript
   // Date only - parse as local noon to avoid day boundary issues
   const [year, month, day] = dueDateRaw.split('-').map(Number);
   dueDate = new Date(year, month - 1, day, 12, 0, 0);
   ```

### Date Flow: Notion → ProductivityQuest → Google Calendar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOTION DATABASE                                    │
│  Task: "Morning Meeting"                                                    │
│  Due: 2026-01-26T09:00:00.000-08:00 (displayed as Jan 26, 9:00 AM PST)     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Import
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTIVITYQUEST DATABASE                           │
│  dueDate: 2026-01-26T17:00:00.000Z (stored as UTC)                        │
│  scheduledTime: 2026-01-26T17:00:00.000Z                                   │
│  (9 AM PST = 5 PM UTC)                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Sync to Calendar
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GOOGLE CALENDAR                                    │
│  Event: "Morning Meeting"                                                   │
│  Start: 2026-01-26T17:00:00.000Z with timeZone: America/Los_Angeles       │
│  (Displayed as 9:00 AM PST in Google Calendar)                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Points

1. **UTC Storage**: All dates stored in database as UTC timestamps
2. **Timezone Parameter**: Google Calendar API receives UTC time + user's timezone
3. **Correct Display**: Google Calendar converts UTC to local for display
4. **No Manual Offset**: Never manually add/subtract timezone offsets

---

## API Response Changes

The import endpoint now returns additional information:

```json
{
  "success": true,
  "count": 5,           // Number of NEW tasks created
  "updatedCount": 12,   // Number of EXISTING tasks updated
  "importedTaskIds": [1, 2, 3, 4, 5],
  "updatedTaskIds": [10, 11, 12, 13, ...]
}
```

## UI Changes

The toast notification now shows both counts:
- "Imported 5 new tasks and updated 12 existing tasks from Notion"
- "Updated 12 existing tasks from Notion" (if no new tasks)
- "No changes detected from Notion" (if nothing changed)

## Files Modified

- `server/routes.ts` - Updated `POST /api/notion/import` endpoint
- `server/notion.ts` - Timezone-aware date parsing
- `server/google-calendar.ts` - Fixed timezone handling for export/import
- `client/src/pages/home.tsx` - Updated toast message to show updated count

## Testing

### Basic Update Flow
1. Create a task in Notion with a specific due date
2. Import from Notion → Task appears in ProductivityQuest
3. Change the due date in Notion
4. Import from Notion again → Task should be **updated** (not duplicated)
5. Verify the calendar shows the task on the NEW date, not the old date

### Timezone Verification
1. In Notion, create task with time: "Jan 26, 2026 at 9:00 AM" (your local time)
2. Import to ProductivityQuest
3. Check ProductivityQuest calendar - task should show at 9:00 AM
4. Sync to Google Calendar
5. Check Google Calendar - event should show at 9:00 AM
6. **All three should show the same time!**

## Related Issues

This fix also works in conjunction with:
- **Calendar Orphan Cleanup**: Ensures old Google Calendar events are cleaned up when tasks are rescheduled
- **Google Calendar Timezone Fix (v1.5)**: Ensures correct time handling when syncing to Google Calendar

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial fix - update existing tasks instead of duplicating |
| 1.1 | Jan 2026 | Fixed timezone handling - dates now correctly preserved across Notion/PQ/GCal |


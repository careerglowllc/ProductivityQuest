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
- `client/src/pages/home.tsx` - Updated toast message to show updated count

## Testing

1. Create a task in Notion with a specific due date
2. Import from Notion → Task appears in ProductivityQuest
3. Change the due date in Notion
4. Import from Notion again → Task should be **updated** (not duplicated)
5. Verify the calendar shows the task on the NEW date, not the old date

## Related Issues

This fix also works in conjunction with the Calendar Orphan Cleanup feature to ensure that when tasks are rescheduled, the old Google Calendar events are properly cleaned up.

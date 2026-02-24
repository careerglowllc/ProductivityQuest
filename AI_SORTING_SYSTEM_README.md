# AI-Powered Calendar Task Sorting System

## Overview

ProductivityQuest uses an **OpenAI-powered sorting system** to intelligently schedule calendar tasks. Unlike a basic priority-weighted sorter, this system reads each user's past verbal feedback to build personalized sorting rules per account.

## Architecture

### Files

| File | Purpose |
|------|---------|
| `server/ai-sort-service.ts` | Core AI sorting logic — builds OpenAI prompt, calls GPT, parses response |
| `server/ml-sorting.ts` | Legacy ML sorting (still used for `learnFromFeedback`, `mergePreferences`, `DEFAULT_PREFERENCES`) |
| `server/routes.ts` | API endpoints: `/api/ml/sort-tasks`, `/api/ml/apply-sort`, `/api/ml/feedback` |
| `server/storage.ts` | Database methods: `getMlSortingFeedback`, `saveMlSortingFeedback`, `getMlSortingPreferences`, `upsertMlSortingPreferences` |
| `shared/schema.ts` | Database tables: `mlSortingFeedback`, `mlSortingPreferences` |
| `client/src/components/ml-sort-feedback-modal.tsx` | Frontend UI: feedback modal with 3 modes (approve, correct, verbal) |

### Database Tables

**`ml_sorting_feedback`** — Stores all user feedback for AI context:
- `userId` (string) — User who submitted feedback
- `date` (timestamp) — Date the sort was for
- `originalSchedule` (jsonb) — Task schedule before sorting
- `mlSortedSchedule` (jsonb) — AI-generated sorted schedule
- `userCorrectedSchedule` (jsonb, nullable) — User's manual reorder (for 'corrected' type)
- `feedbackType` (text) — One of: `'approved'`, `'corrected'`, `'verbal'`
- `feedbackReason` (text, nullable) — Free-text reason/rule from user
- `taskMetadata` (jsonb, nullable) — Task details (id, title, priority, duration)
- `createdAt` (timestamp) — When feedback was submitted

**`ml_sorting_preferences`** — Stores learned user preferences:
- `userId` (string, unique) — User
- `preferredStartHour` / `preferredEndHour` — Working hours (default 8–22)
- `priorityWeights` (jsonb) — Weights for each priority level
- `breakDuration` (integer) — Minutes between tasks (default 0)
- `highPriorityTimePreference` (text) — 'morning', 'afternoon', or 'none'
- `totalApproved` / `totalCorrected` — Counters for feedback types

## How Sorting Works

### 1. User Triggers Sort
Frontend calls `POST /api/ml/sort-tasks` with:
```json
{
  "date": "2026-02-24",
  "taskIds": [1, 2, 3],        // optional — if omitted, all tasks for date
  "timezoneOffset": 480         // minutes (e.g., PST = 480 = UTC-8)
}
```

### 2. Backend Gathers Context
The endpoint (`server/routes.ts`) does:
1. **Fetches tasks** — Filters all user tasks to those on the target date
2. **Fetches preferences** — Gets user's `mlSortingPreferences` (or defaults)
3. **Fetches blocked slots** — Gets Google Calendar events for the day (non-PQ events become blocked time slots that the AI must avoid)
4. **Fetches feedback history** — Retrieves last **40 feedback entries** via `storage.getMlSortingFeedback(userId, 40)`

### 3. AI Builds Prompt
`sortTasksAI()` in `server/ai-sort-service.ts`:

1. **Extracts user rules** from feedback history — all `feedbackReason` strings from past feedback (verbal, corrections, etc.) are deduplicated and included as personalized rules
2. **Builds prompt** containing:
   - Current time (for "schedule after now" on today)
   - Working hours from preferences
   - Break duration between tasks
   - All blocked Google Calendar slots with times
   - User's personal sorting rules (up to 10 unique rules)
   - Task list with: ID, title, priority, duration, current time
3. **Calls OpenAI** (`gpt-4o-mini`, temperature 0.3) with system message for JSON-only output

### 4. AI Returns Schedule
The AI responds with a JSON array:
```json
[
  {"taskId": 1, "startHour": 14, "startMinute": 0},
  {"taskId": 2, "startHour": 15, "startMinute": 30}
]
```

This is converted to full ISO timestamps accounting for timezone offset.

### 5. Fallback
If OpenAI fails or no API key is set, `fallbackSort()` runs:
- Sorts by priority (Pareto > High > Med-High > Medium > Med-Low > Low)
- Schedules sequentially from current time (today) or start hour (future)
- Skips blocked slots
- Adds break duration between tasks

### 6. Response to Frontend
```json
{
  "success": true,
  "originalSchedule": [...],
  "sortedSchedule": [...],
  "taskMetadata": [...],
  "preferences": { "startHour": 8, "endHour": 22, ... }
}
```

## How Feedback Works

### Three Feedback Types

| Type | Trigger | What's Saved | What Happens |
|------|---------|-------------|--------------|
| `approved` | User clicks thumbs-up | Schedule + reason | `learnFromFeedback()` adjusts preferences; sorted schedule is applied to tasks |
| `corrected` | User reorders tasks manually | Both schedules + user's order | `learnFromFeedback()` adjusts preferences; user's corrected schedule is applied |
| `verbal` | User types free-text instruction | Reason text only | Saved to DB — AI reads it on next sort as a personalized rule |

### Verbal Feedback Flow (Per-Account Learning)
1. User opens feedback modal → clicks "Give Specific Feedback"
2. Types instruction, e.g., *"Always schedule tasks after the current time"*
3. Frontend sends `POST /api/ml/feedback` with `feedbackType: 'verbal'` and `feedbackReason: "Always schedule tasks after the current time"`
4. Backend saves to `ml_sorting_feedback` table and returns success
5. **On next sort**: `getMlSortingFeedback(userId, 40)` retrieves this feedback → `extractUserRules()` extracts the reason text → it's injected into the AI prompt under "User's Personal Sorting Preferences"

### Approved/Corrected Feedback Flow
1. Feedback saved to DB (same as verbal)
2. `learnFromFeedback()` in `ml-sorting.ts` analyzes:
   - Keyword detection (e.g., "morning" → shift `highPriorityTimePreference`)
   - Statistical analysis of user corrections (timing patterns, priority adjustments)
3. Updated preferences saved to `mlSortingPreferences`
4. The approved/corrected schedule is applied to actual task times + synced to Google Calendar

## Key Constants

| Constant | Value | Location |
|----------|-------|----------|
| Feedback history limit | 40 entries | `routes.ts` + `storage.ts` |
| Unique rules limit | 10 rules | `ai-sort-service.ts` (`extractUserRules`) |
| OpenAI model | `gpt-4o-mini` | `ai-sort-service.ts` |
| Temperature | 0.3 | `ai-sort-service.ts` |
| Max tokens | 1000 | `ai-sort-service.ts` |
| Default start hour | 8 (8 AM) | `ml-sorting.ts` (`DEFAULT_PREFERENCES`) |
| Default end hour | 22 (10 PM) | `ml-sorting.ts` (`DEFAULT_PREFERENCES`) |
| Default break duration | 0 minutes | `ml-sorting.ts` (`DEFAULT_PREFERENCES`) |

## API Endpoints

### `POST /api/ml/sort-tasks`
Sorts tasks for a given date using AI.
- **Auth**: Required (session-based)
- **Body**: `{ date: string, taskIds?: number[], timezoneOffset: number }`
- **Response**: `{ success, originalSchedule, sortedSchedule, taskMetadata, preferences }`

### `POST /api/ml/apply-sort`
Applies a sorted schedule to actual task records + Google Calendar.
- **Auth**: Required
- **Body**: `{ sortedSchedule: Array<{taskId, startTime, endTime}> }`
- **Response**: `{ success, message, updatedCount, googleCalendarUpdated, googleCalendarFailed }`

### `POST /api/ml/feedback`
Submits user feedback on a sort result.
- **Auth**: Required
- **Body**: `{ date, originalSchedule, mlSortedSchedule, userCorrectedSchedule?, feedbackType, feedbackReason?, taskMetadata? }`
- **Response**: `{ success, message, preferencesUpdated?, newPreferences? }`

### `GET /api/ml/preferences`
Returns user's current sorting preferences.
- **Auth**: Required
- **Response**: User's `mlSortingPreferences` or `DEFAULT_PREFERENCES`

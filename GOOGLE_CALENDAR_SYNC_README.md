# Google Calendar Sync Feature

## Overview

ProductivityQuest integrates with Google Calendar to sync your quests/tasks as calendar events. This allows you to see your tasks on your Google Calendar and manage your time effectively.

## Features

### 1. **Per-User OAuth Credentials**
Each user can connect their own Google Calendar using their own Google Cloud OAuth credentials. This provides:
- Complete control over your calendar data
- No shared API quotas
- Enhanced privacy and security

### 2. **Two-Way Sync Options**
- **Import Only**: Import event time changes from Google Calendar to update task times
- **Export Only**: Export ProductivityQuest tasks to Google Calendar
- **Two-Way Sync**: Sync in both directions automatically

### 3. **Smart Time Handling**
- Uses `scheduledTime` if set, otherwise falls back to `dueDate`
- Updates existing calendar events instead of creating duplicates
- Imports time changes from Google Calendar back to tasks
- Duration is calculated and synced properly

### 4. **Instant Calendar Sync**
When enabled, new quests are automatically added to your Google Calendar immediately upon creation.

### 5. **Priority-Based Color Coding**
Tasks synced to Google Calendar are color-coded based on their importance:
- 🔴 **High** - Red (#DC2626)
- 🟠 **Med-High** - Orange (#F97316)
- 🟡 **Medium** - Yellow (#EAB308)
- 🔵 **Med-Low** - Blue (#3B82F6)
- 🟢 **Low** - Green (#22C55E)

---

## Setup Guide

### Step 1: Create Google Cloud OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URI: `https://productivityquest.onrender.com/api/google-calendar/callback`
   - (For local dev: `http://localhost:5000/api/google-calendar/callback`)
5. Copy your **Client ID** and **Client Secret**

### Step 2: Configure OAuth Consent Screen

1. Go to "OAuth consent screen" in Google Cloud Console
2. Select "External" user type
3. Fill in app information:
   - App name: "ProductivityQuest"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.events`
5. Add test users (while in testing mode):
   - Add your own email address

### Step 3: Connect in ProductivityQuest

1. Go to **Settings** → **Google Calendar Integration**
2. Click **Connect** button
3. Enter your Client ID and Client Secret
4. Click **Save Credentials**
5. Click **Authorize Google Account**
6. Complete the Google OAuth flow
7. Enable **Automatic Sync** toggle
8. Optionally enable **Instant Calendar Sync**

---

## How It Works

### Connection Flow
```
User enters credentials → Save to DB → Generate Auth URL → 
Google OAuth → Callback with code → Exchange for tokens → 
Store tokens → Ready to sync
```

### Export Sync Flow (Tasks → Google Calendar)
```
User clicks "Sync Now" or creates task with Instant Sync →
Filter tasks with due dates → For each task:
  → Check if already synced (has googleEventId)
  → If new: Create calendar event with proper time
  → If existing: Update calendar event time/title
  → Apply priority-based color
  → Store event ID back on task in database
```

### Import Sync Flow (Google Calendar → Tasks)
```
User triggers import → Fetch events from Google Calendar →
For each event with linked task:
  → Check if event time changed
  → Update task scheduledTime/dueDate
  → Save changes to database
```

### Time Handling
- **Event Start Time**: Uses `scheduledTime` if set, otherwise `dueDate`
- **Event End Time**: Start time + task duration (default: 1 hour)
- **Time Zone**: Uses user's local timezone
- **Updates**: Changes in either system sync to the other

### Token Refresh
- Access tokens expire after 1 hour
- Refresh tokens are used to get new access tokens automatically
- If refresh fails, user must re-authorize

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/google-calendar/authorize-url` | GET | Generate OAuth authorization URL |
| `/api/google-calendar/callback` | GET | Handle OAuth callback and store tokens |
| `/api/google-calendar/disconnect` | POST | Clear all credentials and tokens |
| `/api/google-calendar/events` | GET | Fetch events from Google Calendar |
| `/api/calendar/sync` | POST | Sync selected tasks to Google Calendar |
| `/api/user/settings/instant-sync` | GET/PUT | Get/Set instant sync setting |

---

## Database Schema

### Users Table (Google Calendar fields)
```sql
google_calendar_client_id      TEXT     -- User's OAuth Client ID
google_calendar_client_secret  TEXT     -- User's OAuth Client Secret
google_calendar_access_token   TEXT     -- OAuth access token
google_calendar_refresh_token  TEXT     -- OAuth refresh token
google_calendar_token_expiry   TIMESTAMP -- Token expiration time
google_calendar_sync_enabled   BOOLEAN  -- Is sync enabled
google_calendar_sync_direction TEXT     -- 'import', 'export', or 'both'
google_calendar_instant_sync   BOOLEAN  -- Auto-add new tasks to calendar
google_calendar_last_sync      TIMESTAMP -- Last sync timestamp
```

### Tasks Table (Google Calendar fields)
```sql
google_event_id    TEXT -- Google Calendar event ID
google_calendar_id TEXT -- Calendar ID (usually 'primary')
calendar_color     TEXT -- Hex color for calendar event
scheduled_time     TIMESTAMP -- Scheduled start time
```

---

## Troubleshooting

### "Insufficient authentication scopes" Error
- **Cause**: OAuth was authorized with read-only permissions
- **Fix**: Disconnect and reconnect to re-authorize with correct scopes

### "Failed to create calendar event" 
- **Cause**: Token expired or invalid
- **Fix**: Click "Authorize Google Account" to get new tokens

### Tasks not appearing in Google Calendar
- **Check**: Is "Enable Automatic Sync" turned on?
- **Check**: Does the task have a due date?
- **Check**: Click "Sync Now" to manually trigger sync

### Disconnect not working
- **Cause**: Old cached data
- **Fix**: Disconnect clears all credentials and tokens, refresh the page

### Colors not showing correctly
- **Note**: Google Calendar has limited color options
- Colors are mapped to closest available Google Calendar color

---

## Environment Variables

### Production (Render)
```
APP_URL=https://productivityquest.onrender.com
GOOGLE_CALENDAR_REDIRECT_URI=https://productivityquest.onrender.com/api/google-calendar/callback
```

### Local Development
```
APP_URL=http://localhost:5000
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:5000/api/google-calendar/callback
```

---

## Security Considerations

1. **Per-user credentials**: Each user's OAuth credentials are stored separately
2. **Token encryption**: Consider encrypting tokens at rest in production
3. **Scope limitation**: Only `calendar.events` scope is requested (not full calendar access)
4. **Token refresh**: Automatic token refresh prevents credential exposure
5. **Disconnect cleanup**: All credentials are cleared on disconnect

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial Google Calendar integration |
| 1.1 | Dec 2025 | Added per-user OAuth credentials |
| 1.2 | Dec 2025 | Added Instant Calendar Sync feature |
| 1.3 | Dec 2025 | Fixed OAuth scopes for write access |
| 1.4 | Dec 2025 | Added priority-based color coding |
| 1.5 | Jan 2026 | Fixed timezone handling in calendar sync - events now created with correct times |

---

## Timezone Handling (v1.5)

### How Dates Flow Through the System

```
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────────┐
│     NOTION      │────▶│  PRODUCTIVITYQUEST   │────▶│   GOOGLE CALENDAR     │
│                 │     │      DATABASE        │     │                       │
│ "2026-01-26     │     │ Stored as UTC:       │     │ Event displayed in    │
│  T09:00-08:00"  │     │ 2026-01-26T17:00:00Z │     │ user's local timezone │
│ (9 AM PST)      │     │                      │     │ (9 AM PST)            │
└─────────────────┘     └──────────────────────┘     └───────────────────────┘
```

### Export to Google Calendar (Tasks → Google Calendar)

When creating/updating events in Google Calendar:

1. **Task's `scheduledTime`** is stored in database as UTC timestamp
2. **Export sends full ISO string** with UTC timezone: `2026-01-26T17:00:00.000Z`
3. **Google Calendar API** receives the time with the `timeZone` parameter set to user's timezone
4. **Google interprets correctly**: The UTC time is converted to display in user's local timezone

**Code (server/google-calendar.ts):**
```typescript
const eventData = {
  start: {
    dateTime: startTime.toISOString(), // Full ISO string with 'Z' (UTC)
    timeZone: user.timezone || 'America/Los_Angeles',
  },
  // ...
};
```

### Import from Google Calendar (Google Calendar → Tasks)

When reading events from Google Calendar:

1. **Google returns datetime with timezone offset**: `2026-01-26T09:00:00-08:00`
2. **JavaScript `new Date()` parses correctly**: Converts to UTC internally
3. **Stored in database as UTC**: Ready for consistent handling
4. **Only updates if time differs by >5 minutes**: Prevents spurious updates from timezone rounding

### Important: User Timezone Setting

The user's timezone is stored in the `users` table and used for:
- Creating Google Calendar events with correct local time display
- Parsing Notion dates that include timezone offsets

**Default timezone**: `America/Los_Angeles` (Pacific Time)

Users can update their timezone in Settings → Timezone.

---

## Bug Fixes History

### v1.5 - Timezone Shift Bug (Jan 2026)

**Problem:** Events were being created 8 hours off (for PST users)

**Root Cause:** The `formatDateTimeLocal()` function was stripping the `Z` from UTC timestamps:
```typescript
// BROKEN - caused 8-hour shift
date.toISOString().replace('Z', '')  // "2026-01-26T17:00:00.000"
// Google interpreted this as 5PM in PST = 1AM UTC next day!
```

**Solution:** Send full ISO strings to Google Calendar API:
```typescript
// FIXED - preserves timezone info
date.toISOString()  // "2026-01-26T17:00:00.000Z"
// Google correctly interprets as UTC
```

**Additional Fix:** Increased import threshold to 5+ minutes to prevent cascading updates from minor timezone differences.


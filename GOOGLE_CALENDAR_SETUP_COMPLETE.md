# Google Calendar Integration - Complete Setup Guide

## Overview

ProductivityQuest integrates with Google Calendar to provide a unified view of your tasks and calendar events. This integration uses OAuth 2.0 for secure per-user authentication and supports multiple calendars with color preservation.

## Key Features

✅ **OAuth 2.0 Authentication** - Secure per-user credentials  
✅ **Multi-Calendar Support** - Fetches from all your Google Calendars (Personal, Work, Time Rigid, etc.)  
✅ **4 View Modes** - Day, 3-Day, Week, and Month views  
✅ **Calendar Color Preservation** - Events display with their original Google Calendar colors  
✅ **Custom Colors** - Customize ProductivityQuest task colors in calendar  
✅ **Smart Separation** - Google events visible in calendar only, PQ tasks in both  
✅ **Duration-Based Display** - Tasks show as time blocks based on duration field  

---

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it "ProductivityQuest Calendar Integration" (or your choice)

### Step 2: Enable Google Calendar API

1. In your project, navigate to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click "Enable"

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure OAuth consent screen if prompted:
   - User Type: External
   - App name: ProductivityQuest
   - Support email: your email
   - Authorized domains: productivityquest.onrender.com
   - Scopes: Add `.../auth/calendar.readonly`
4. Create OAuth Client ID:
   - Application type: Web application
   - Name: ProductivityQuest Web Client
   - Authorized redirect URIs:
     - `https://productivityquest.onrender.com/api/google-calendar/callback`
     - (For local dev: `http://localhost:5000/api/google-calendar/callback`)
5. Click "Create"
6. **Save your Client ID and Client Secret**

### Step 4: Add Test User (Required for Development)

Since the app is not verified by Google, you need to add your Google account as a test user:

1. Go to "APIs & Services" > "OAuth consent screen"
2. Scroll to "Test users" section
3. Click "Add Users"
4. Enter your Google email (e.g., alexbaer321@gmail.com)
5. Click "Save"

**Note:** Only test users can authorize the app until it's verified by Google.

### Step 5: Configure ProductivityQuest

1. Log into ProductivityQuest
2. Navigate to "Google Calendar Integration" page
3. Enter your OAuth Client ID
4. Enter your OAuth Client Secret  
5. Click "Save Credentials"
6. Click "Authorize Google Account"
7. Complete the Google OAuth flow
8. You'll be redirected back with success message

### Step 6: Environment Variables (Production)

Ensure this environment variable is set in Render.com:

```bash
GOOGLE_CALENDAR_REDIRECT_URI=https://productivityquest.onrender.com/api/google-calendar/callback
```

---

## How It Works

### Calendar Display Behavior

**Google Calendar Events:**
- ✅ Visible in calendar view (all 4 modes)
- ❌ NOT added to tasks/quests list
- ✅ Display with original calendar colors
- ✅ Show calendar name (e.g., "Personal", "Time Rigid")
- ❌ Cannot be edited or completed

**ProductivityQuest Tasks:**
- ✅ Visible in calendar view
- ✅ Present in tasks/quests list
- ✅ Positioned on due date
- ✅ Time block based on duration
- ✅ Customizable colors
- ✅ Can be completed for gold/XP

### Data Flow

```
Google Calendar API
        ↓
Fetch Events (read-only)
        ↓
Display in Calendar View
(NOT added to tasks list)

ProductivityQuest Tasks
        ↓
Created by user
        ↓
Visible in BOTH:
- Tasks List
- Calendar View
```

---

## Troubleshooting

### Issue: "App not verified" error
**Solution:** Add your Google account as a test user (Step 4)

### Issue: Blank calendar after authorization
**Solution:** Check that access token was saved. Re-authorize if needed.

### Issue: Events from only one calendar showing
**Solution:** Integration now fetches ALL calendars automatically. Refresh the page.

### Issue: Token expired
**Solution:** Re-authorize via "Authorize Google Account" button

### Issue: Wrong redirect URI error
**Solution:** Verify redirect URI matches exactly in both Google Console and environment variables

---

## API Endpoints

### OAuth Flow
- `GET /api/google-calendar/authorize-url` - Generate OAuth URL
- `GET /api/google-calendar/callback` - Handle OAuth callback

### Calendar Data
- `GET /api/google-calendar/calendars` - List all user calendars
- `GET /api/google-calendar/events?year=2025&month=10` - Get events for month
- `POST /api/google-calendar/sync` - Verify connection (no longer imports events)

### Task Management
- `PATCH /api/tasks/:id/color` - Update task calendar color

---

## Security & Privacy

- **OAuth 2.0** - Industry-standard secure authentication
- **Per-User Credentials** - Each user uses their own Google OAuth app
- **Read-Only Access** - Calendar scope is `.../auth/calendar.readonly`
- **Token Refresh** - Automatic refresh token handling
- **Secure Storage** - Tokens encrypted in database

---

## Future Enhancements

- [ ] Two-way sync (export PQ tasks to Google Calendar)
- [ ] Calendar selection UI (show/hide specific calendars)
- [ ] Event detail modal with edit capabilities
- [ ] Drag-and-drop rescheduling
- [ ] Calendar event creation from PQ interface

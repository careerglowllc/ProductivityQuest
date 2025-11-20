# Timezone Settings Feature

## Overview
The Timezone Settings feature allows users to set their preferred timezone for viewing calendar events and scheduling tasks. This ensures all time-related information is displayed in the user's local timezone, improving accuracy and usability.

## Feature Location
**Navigation Path:**  
Settings → Calendar Settings → Timezone

## Supported Timezones

### United States
- **Eastern Time (ET)** - UTC-5/-4 (America/New_York)
- **Central Time (CT)** - UTC-6/-5 (America/Chicago)
- **Mountain Time (MT)** - UTC-7/-6 (America/Denver)
- **Arizona Time (MST)** - UTC-7 (America/Phoenix) - No DST
- **Pacific Time (PT)** - UTC-8/-7 (America/Los_Angeles)
- **Alaska Time (AKT)** - UTC-9/-8 (America/Anchorage)
- **Hawaii Time (HST)** - UTC-10 (Pacific/Honolulu) - No DST

### Asia
- **China Standard Time (CST)** - UTC+8 (Asia/Shanghai)
- **Vietnam Time (ICT)** - UTC+7 (Asia/Ho_Chi_Minh)

## How It Works

### 1. Setting Your Timezone
1. Navigate to **Settings** from the main menu
2. Click **Calendar Settings**
3. Click **Timezone**
4. Select your preferred timezone from the list
5. Click **Save Timezone**

### 2. Viewing Current Time
Each timezone option displays:
- **Timezone Name**: Full descriptive name (e.g., "Eastern Time (ET)")
- **UTC Offset**: Time difference from UTC (e.g., "UTC-5/-4")
- **Current Time**: Real-time clock in that timezone

### 3. Calendar Integration
Once a timezone is selected:
- All calendar events display in your selected timezone
- Tasks without specific times default to **12 PM (noon)** in your timezone
- Google Calendar events are converted to your timezone automatically
- Time conversions are handled automatically

## Technical Details

### Database Schema
**Table:** `users`  
**Field:** `timezone` (TEXT)  
**Default:** 'America/New_York'

### API Endpoints

#### Get User Settings (includes timezone)
```
GET /api/user/settings
```
**Response:**
```json
{
  "timezone": "America/Los_Angeles",
  "googleCalendarSyncEnabled": true,
  ...other settings
}
```

#### Get Timezone Settings
```
GET /api/settings
```
**Response:**
```json
{
  "timezone": "America/Los_Angeles"
}
```

#### Update Timezone
```
POST /api/settings/timezone
Content-Type: application/json

{
  "timezone": "America/Chicago"
}
```
**Response:**
```json
{
  "message": "Timezone updated successfully",
  "timezone": "America/Chicago"
}
```

### Frontend Components

#### Settings Calendar Page
**Path:** `/settings/calendar`  
**Component:** `settings-calendar.tsx`  
**Purpose:** Hub for calendar-related settings including timezone

#### Timezone Settings Page
**Path:** `/settings/timezone`  
**Component:** `settings-timezone.tsx`  
**Purpose:** Timezone selection interface

### State Management
- Timezone preference stored in user database record
- Retrieved with user settings via React Query
- Cached for performance
- Invalidated on update

## User Experience Features

### Visual Feedback
- **Selected timezone** highlighted with purple background
- **Checkmark icon** appears next to current selection
- **Save button** only appears when timezone changes
- **Success toast** notification on save

### Information Display
- Current timezone shown at top with live clock
- Each option shows current time for that timezone
- UTC offset clearly displayed
- Info card explains how timezone affects features

### Mobile Responsive
- Fully responsive design
- Touch-optimized selection
- Scrollable timezone list
- Readable on all screen sizes

## Implementation Details

### Timezone Handling
```typescript
// Timezones are stored using IANA timezone identifiers
const TIMEZONES = [
  { 
    value: "America/New_York", 
    label: "Eastern Time (ET)", 
    offset: "UTC-5/-4" 
  },
  // ... more timezones
];
```

### Default Time for Tasks
When a task has a due date but no scheduled time:
```typescript
startTime = new Date(task.dueDate);
startTime.setHours(12, 0, 0, 0); // Defaults to noon
```

### Google Calendar Sync
Google Calendar events maintain their original timezone information and are converted to the user's preferred timezone for display.

## Use Cases

### Use Case 1: Remote Worker
**Scenario:** User works remotely and travels frequently  
**Solution:** Change timezone to match current location  
**Benefit:** Calendar events always show in local time

### Use Case 2: International Team
**Scenario:** User collaborates with team in different timezone  
**Solution:** Set timezone to match meeting location  
**Benefit:** See all meetings in relevant timezone

### Use Case 3: Task Scheduling
**Scenario:** User creates tasks throughout the day  
**Solution:** Tasks default to noon in selected timezone  
**Benefit:** Consistent, predictable scheduling

## Migration
A database migration adds the `timezone` column:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
```

**Migration File:** `migrations/add_timezone_to_users.sql`

## Future Enhancements

### Planned Features
- [ ] Auto-detect timezone from browser
- [ ] More international timezones (Europe, Africa, South America, Oceania)
- [ ] Timezone-aware task reminders
- [ ] Display multiple timezones simultaneously
- [ ] Timezone conversion helper tool

### Potential Improvements
- Remember last selected timezone across devices
- Show sunrise/sunset times for each timezone
- Business hours indicator
- Time zone abbreviation display toggle

## Testing
See `TIMEZONE_SETTINGS_TEST_CASES.md` for comprehensive test cases.
See `DATABASE_MIGRATION_TEST_CASES.md` for database migration testing.

## Database Migration

### Automatic Migration (Production)
The timezone column is automatically added to the users table via startup migrations. This happens on every server startup, ensuring production databases stay synchronized.

**Migration Code:**
```typescript
// server/migrations.ts
await sql`
  ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York'
`;
```

**Benefits:**
- ✅ Runs automatically on deployment
- ✅ Idempotent (safe to run multiple times)
- ✅ Zero manual intervention required
- ✅ Default value for existing users

**See Also:** `TIMEZONE_MIGRATION_FIX.md` for detailed migration incident report and resolution.

## Troubleshooting

### Issue: Timezone not saving
**Solution:** Check browser console for errors, verify authentication, check network tab for API response

### Issue: Wrong time displayed
**Solution:** Verify timezone selection, check system clock, ensure daylight saving time is handled

### Issue: Google Calendar events show wrong time
**Solution:** Re-sync Google Calendar, verify timezone is set correctly in both systems

## Related Features
- **Calendar Page** (`/calendar`) - Displays events in selected timezone
- **Google Calendar Integration** (`/settings/google-calendar`) - Syncs with timezone awareness
- **Task Scheduling** - Uses timezone for default times

## Dependencies
- **Database:** PostgreSQL with timezone support
- **Frontend:** React, TanStack Query
- **Backend:** Express.js, Node.js
- **Timezone Library:** Native JavaScript `Intl.DateTimeFormat`

## Browser Compatibility
- Chrome 24+
- Firefox 29+
- Safari 10+
- Edge 12+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility
- **Keyboard Navigation:** Full keyboard support with Tab/Enter
- **Screen Readers:** ARIA labels on all interactive elements
- **Visual Contrast:** WCAG AA compliant color contrast
- **Focus Indicators:** Clear focus states for keyboard navigation

## Version History
- **v1.0.1** - November 19, 2025
  - ✅ Production migration fix deployed
  - ✅ Automatic startup migrations implemented
  - ✅ Enhanced error logging for debugging
  - ✅ Comprehensive test documentation added
  
- **v1.0.0** - Initial release with US and select Asia timezones
  - 7 US timezones
  - 2 Asia timezones
  - Basic timezone selection and persistence

## Related Documentation
- `TIMEZONE_MIGRATION_FIX.md` - Production fix incident report (November 19, 2025)
- `DATABASE_MIGRATION_TEST_CASES.md` - Migration testing documentation
- `TIMEZONE_SETTINGS_TEST_CASES.md` - User-facing feature tests
- `README.md` - Database Migrations section

## Support
For issues or questions about the timezone feature:
1. Check console for error messages
2. Verify network connectivity
3. Review test cases documentation
4. Check browser compatibility

---

**Last Updated:** November 19, 2025  
**Feature Status:** ✅ Active  
**Documentation Version:** 1.0.0

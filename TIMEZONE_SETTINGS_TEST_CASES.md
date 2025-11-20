# Timezone Settings Test Cases

## Test Case 1: Access Timezone Settings
**Description:** Verify user can navigate to timezone settings  
**Steps:**
1. Log in to the application
2. Navigate to Settings page
3. Click on "Calendar Settings"
4. Click on "Timezone"

**Expected Result:**
- User should see the Timezone Settings page
- Page displays current timezone
- Shows current time in the selected timezone
- Lists all available timezone options

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 2: View Current Timezone
**Description:** Verify current timezone is displayed correctly  
**Steps:**
1. Navigate to Timezone Settings page
2. Observe the "Current Timezone" card

**Expected Result:**
- Current timezone name is displayed (e.g., "Eastern Time (ET)")
- Current time is shown in that timezone
- Time updates in real-time

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 3: Select Different Timezone - US Timezones
**Description:** Verify user can select and save US timezone  
**Steps:**
1. Navigate to Timezone Settings page
2. Click on a different US timezone (e.g., "Pacific Time (PT)")
3. Verify checkmark appears next to selected timezone
4. Click "Save Timezone" button

**Expected Result:**
- Selected timezone is highlighted
- Checkmark appears next to selection
- Save button appears when timezone changes
- Success toast notification appears
- Current timezone updates to new selection

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 4: Select Asia Timezone
**Description:** Verify user can select Asia timezone  
**Steps:**
1. Navigate to Timezone Settings page
2. Select "China Standard Time (CST)" or "Vietnam Time (ICT)"
3. Click "Save Timezone"

**Expected Result:**
- Asia timezone is selectable
- Current time displayed for that timezone is correct
- Timezone saves successfully
- Calendar events display in new timezone

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 5: Timezone Persistence
**Description:** Verify timezone setting persists across sessions  
**Steps:**
1. Select a timezone and save
2. Navigate away from timezone settings
3. Log out
4. Log back in
5. Navigate to Timezone Settings

**Expected Result:**
- Previously selected timezone is still selected
- User preference is maintained

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 6: Calendar Respects Timezone
**Description:** Verify calendar events display in selected timezone  
**Steps:**
1. Set timezone to "Eastern Time (ET)"
2. Create a task with due date
3. Navigate to Calendar page
4. Note the default time (should be 12 PM ET)
5. Change timezone to "Pacific Time (PT)"
6. View same task in calendar

**Expected Result:**
- Task appears at 12 PM in Eastern Time when ET is selected
- When timezone changes to PT, events adjust accordingly
- Default task time is 12 PM (noon) in selected timezone

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 7: Timezone Display Information
**Description:** Verify timezone information is accurate  
**Steps:**
1. Navigate to Timezone Settings
2. Review each timezone option

**Expected Result:**
- Each timezone shows:
  - Full timezone name
  - UTC offset (e.g., "UTC-5/-4" for Eastern)
  - Current time in that timezone
- All information is accurate

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 8: Cancel Timezone Change
**Description:** Verify user can navigate away without saving  
**Steps:**
1. Navigate to Timezone Settings
2. Select a different timezone (don't save)
3. Click "Back to Calendar Settings"

**Expected Result:**
- User navigates back without saving
- Original timezone remains selected
- No error occurs

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 9: All US Timezones Available
**Description:** Verify all US timezones are present  
**Steps:**
1. Navigate to Timezone Settings
2. Review the list of timezones

**Expected Result:**
- All US timezones are available:
  - Eastern Time (ET) - UTC-5/-4
  - Central Time (CT) - UTC-6/-5
  - Mountain Time (MT) - UTC-7/-6
  - Arizona Time (MST) - UTC-7
  - Pacific Time (PT) - UTC-8/-7
  - Alaska Time (AKT) - UTC-9/-8
  - Hawaii Time (HST) - UTC-10

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 10: Asia Timezones Available
**Description:** Verify Asia timezones are present  
**Steps:**
1. Navigate to Timezone Settings
2. Review the list of timezones

**Expected Result:**
- Asia timezones are available:
  - China Standard Time (CST) - UTC+8
  - Vietnam Time (ICT) - UTC+7

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 11: Info Card Display
**Description:** Verify informational content is helpful  
**Steps:**
1. Navigate to Timezone Settings
2. Scroll to bottom of page
3. Read "About Timezone Settings" card

**Expected Result:**
- Info card explains:
  - Calendar events display in selected timezone
  - Tasks default to 12 PM (noon)
  - Google Calendar sync respects timezone

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 12: Mobile Responsiveness
**Description:** Verify timezone settings work on mobile  
**Steps:**
1. Access app on mobile device or resize browser
2. Navigate to Timezone Settings

**Expected Result:**
- Page is fully responsive
- All timezones are accessible
- Buttons and interactions work properly
- Text is readable

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 13: Google Calendar Integration with Timezone
**Description:** Verify Google Calendar events sync with correct timezone  
**Steps:**
1. Set timezone to specific value
2. Sync Google Calendar
3. View events in calendar

**Expected Result:**
- Google Calendar events display in selected timezone
- Time conversions are accurate
- No duplicate or missing events

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Edge Cases

### EC1: Rapid Timezone Changes
**Description:** Change timezone multiple times rapidly  
**Expected Result:** Each change is handled properly, no errors

### EC2: Invalid Timezone (Backend)
**Description:** Attempt to send invalid timezone to API  
**Expected Result:** Server validates and rejects invalid timezones

### EC3: Network Error During Save
**Description:** Disconnect network while saving timezone  
**Expected Result:** Error message displayed, original timezone retained

---

## Performance Tests

### PT1: Timezone List Load Time
**Description:** Measure time to load timezone settings page  
**Expected Result:** Page loads in < 1 second

### PT2: Timezone Save Response Time
**Description:** Measure API response time for timezone update  
**Expected Result:** Response within 500ms

---

## Accessibility Tests

### A1: Keyboard Navigation
**Description:** Navigate timezone settings using only keyboard  
**Expected Result:** All interactive elements accessible via keyboard

### A2: Screen Reader Support
**Description:** Use screen reader to navigate page  
**Expected Result:** All content readable and navigable

---

## Notes
- Test with different time zones to verify daylight saving time handling
- Verify timezone affects all calendar-related features consistently
- Check that timezone preference is included in user settings export

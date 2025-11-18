# Google Calendar Integration - Test Cases

## 1. OAuth Authorization Flow

### Test Case 1.1: Initial Authorization
**Steps:**
1. Navigate to Google Calendar Integration page
2. Enter Google OAuth Client ID and Secret
3. Click "Authorize Google Account"
4. Complete Google OAuth consent screen
5. Redirect back to app

**Expected Result:**
- ✅ User redirected to Google OAuth page
- ✅ After authorization, redirected back with success message
- ✅ Access token and refresh token saved to database
- ✅ Integration status shows "Active and configured"

### Test Case 1.2: Test User Bypass
**Steps:**
1. Use test user email: alexbaer321@gmail.com
2. Complete OAuth flow

**Expected Result:**
- ✅ No "app not verified" warning
- ✅ OAuth completes successfully

---

## 2. Calendar View - Multiple Views

### Test Case 2.1: Month View
**Steps:**
1. Navigate to Calendar page
2. Select "Month" view
3. Verify events display

**Expected Result:**
- ✅ Grid shows 7 columns (days of week)
- ✅ Current day highlighted
- ✅ Events show in correct date cells
- ✅ Up to 3 events per day visible
- ✅ "+X more" indicator for additional events

### Test Case 2.2: Day View
**Steps:**
1. Navigate to Calendar page
2. Select "Day" view
3. Scroll through time slots

**Expected Result:**
- ✅ Shows 24 hour time slots
- ✅ Events positioned in correct time slots
- ✅ Event details visible (title, description)
- ✅ Scrollable interface
- ✅ **Auto-scrolls to current time on load**
- ✅ **Current time slot visible without manual scrolling**

### Test Case 2.2b: Day View Auto-Scroll
**Steps:**
1. Navigate to Calendar page at 2:00 PM
2. Select "Day" view
3. Observe initial scroll position

**Expected Result:**
- ✅ View automatically scrolls to around 1:00 PM - 3:00 PM range
- ✅ Current hour (2:00 PM) is visible on screen
- ✅ Some context visible above current time
- ✅ Smooth scroll animation
- ✅ Does NOT start at 12:00 AM

### Test Case 2.3: 3-Day View
**Steps:**
1. Navigate to Calendar page
2. Select "3 Days" view

**Expected Result:**
- ✅ Shows 3 consecutive days
- ✅ Each day has 24 hour time slots
- ✅ Events positioned correctly per day/time
- ✅ Compact event display

### Test Case 2.4: Week View
**Steps:**
1. Navigate to Calendar page
2. Select "Week" view

**Expected Result:**
- ✅ Shows 7 days (Sunday-Saturday)
- ✅ Current day highlighted with purple border
- ✅ All time slots visible
- ✅ Events in correct day/time positions

---

## 3. Navigation Controls

### Test Case 3.1: Previous/Next in Month View
**Steps:**
1. In Month view, click "Next"
2. Click "Previous"

**Expected Result:**
- ✅ Next advances by 1 month
- ✅ Previous goes back 1 month
- ✅ Events reload for new month

### Test Case 3.2: Previous/Next in Day View
**Steps:**
1. In Day view, click "Next"
2. Click "Previous"

**Expected Result:**
- ✅ Next advances by 1 day
- ✅ Previous goes back 1 day

### Test Case 3.3: Previous/Next in Week View
**Steps:**
1. In Week view, click "Next"
2. Click "Previous"

**Expected Result:**
- ✅ Next advances by 7 days
- ✅ Previous goes back 7 days

### Test Case 3.4: Today Button
**Steps:**
1. Navigate to any future/past date
2. Click "Today"

**Expected Result:**
- ✅ Returns to current date
- ✅ Works in all views (Day, 3-Day, Week, Month)

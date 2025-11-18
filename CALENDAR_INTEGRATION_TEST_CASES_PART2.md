# Google Calendar Integration - Test Cases (Part 2)

## 4. Multi-Calendar Support

### Test Case 4.1: Fetch All Calendars
**Steps:**
1. Have multiple Google Calendars (e.g., "Personal", "Time Rigid")
2. Navigate to Calendar page
3. Verify events from all calendars display

**Expected Result:**
- ✅ Events from "Personal" calendar visible
- ✅ Events from "Time Rigid" calendar visible
- ✅ Events from all other calendars visible
- ✅ Each event shows calendar name in tooltip

### Test Case 4.2: Calendar List Endpoint
**Steps:**
1. Call `/api/google-calendar/calendars`
2. Check response

**Expected Result:**
- ✅ Returns array of all user calendars
- ✅ Each calendar has: id, summary, description, colors
- ✅ Primary calendar flagged

---

## 5. Calendar Colors

### Test Case 5.1: Google Calendar Color Import
**Steps:**
1. Create events in different Google Calendars with different colors
2. View in ProductivityQuest calendar

**Expected Result:**
- ✅ Events display with original Google Calendar colors
- ✅ "Time Rigid" events use Time Rigid calendar color
- ✅ "Personal" events use Personal calendar color
- ✅ Colors preserved in all views (Day, 3-Day, Week, Month)

### Test Case 5.2: Custom Color Picker
**Steps:**
1. Click on a ProductivityQuest task in calendar
2. Color picker modal opens
3. Select a new color
4. Close modal

**Expected Result:**
- ✅ Modal shows current task details
- ✅ 12 color options displayed
- ✅ Current color highlighted
- ✅ Clicking color updates immediately
- ✅ Color persists after page reload

### Test Case 5.3: Color Picker - Google Events
**Steps:**
1. Click on a Google Calendar event (not a PQ task)

**Expected Result:**
- ✅ Color picker does NOT open for Google Calendar events
- ✅ Only ProductivityQuest tasks can be recolored

---

## 6. Tasks vs Calendar Events Separation

### Test Case 6.1: Tasks List Independence
**Steps:**
1. Navigate to Tasks/Quests page
2. Check task count
3. Navigate to Calendar page
4. Count visible events

**Expected Result:**
- ✅ Tasks list ONLY shows ProductivityQuest tasks
- ✅ Google Calendar events NOT in tasks list
- ✅ Calendar view shows BOTH PQ tasks AND Google events
- ✅ Counts differ appropriately

### Test Case 6.2: Sync Does Not Create Tasks
**Steps:**
1. Note current task count
2. Go to Google Calendar Integration page
3. Click "Sync Now"
4. Check task count again

**Expected Result:**
- ✅ Task count unchanged
- ✅ No new tasks created from Google Calendar events
- ✅ Success message confirms calendar connected
- ✅ Events visible in calendar view only

### Test Case 6.3: ProductivityQuest Tasks in Calendar
**Steps:**
1. Create a new task with due date and duration
2. Navigate to Calendar page
3. Find the task on its due date

**Expected Result:**
- ✅ Task appears in calendar on correct date
- ✅ Task duration determines time block length
- ✅ Task shows with appropriate color (importance or custom)
- ✅ Task is clickable for color customization

---

## 7. Task Duration Display

### Test Case 7.1: Task Time Block Calculation
**Steps:**
1. Create task with 60 minute duration, due today at 2:00 PM
2. View in Day view

**Expected Result:**
- ✅ Task appears at 2:00 PM slot
- ✅ Task block extends to 3:00 PM
- ✅ End time = start time + duration

### Test Case 7.2: Multiple Tasks Same Day
**Steps:**
1. Create 3 tasks with different due times same day
2. View in Day view

**Expected Result:**
- ✅ All tasks visible in correct time slots
- ✅ No overlap issues
- ✅ Each task has proper duration block

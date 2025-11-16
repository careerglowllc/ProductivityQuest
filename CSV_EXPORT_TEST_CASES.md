# CSV Export Test Cases

## Test Suite: CSV Export Functionality

### Test Case 1: Basic CSV Export
**Objective:** Verify that the CSV export button downloads a file with all tasks

**Preconditions:**
- User is logged in
- User has at least 5 tasks in their quest list
- Tasks have various fields populated (title, description, due dates, etc.)

**Steps:**
1. Navigate to home page
2. Locate the "Export as CSV" button (emerald/green colored)
3. Click the "Export as CSV" button
4. Wait for the file to download

**Expected Results:**
- A toast notification appears: "Exporting to CSV..." followed by "✓ Export Started"
- A CSV file is downloaded named `productivity-quest-tasks-YYYY-MM-DD.csv`
- The file opens successfully in Excel/Google Sheets/Numbers
- The file contains a header row with all column names
- All tasks are present in the CSV file
- Task count in CSV matches task count in the app

**Status:** ⏳ Pending Manual Testing

---

### Test Case 2: CSV Field Validation
**Objective:** Verify that all task fields are correctly exported to CSV

**Preconditions:**
- User has tasks with diverse data:
  - Tasks with special characters in titles (quotes, commas, newlines)
  - Tasks with long descriptions
  - Tasks with skill tags
  - Completed and incomplete tasks
  - Tasks with various importance levels
  - Tasks with different campaigns and filters

**Steps:**
1. Create or ensure tasks exist with the following:
   - Title with commas: "Buy milk, eggs, and bread"
   - Title with quotes: 'Read "Atomic Habits" chapter 5'
   - Description with newlines
   - Multiple skill tags: ["Craftsman", "Physical", "Mindset"]
   - Completed task with completion date
   - Task with Apple, SmartPrep, Delegation, or Velin flags
2. Click "Export as CSV"
3. Open the downloaded CSV file
4. Verify each field's data integrity

**Expected Results:**
- CSV contains these columns in order:
  - ID, Title, Description, Details, Duration (min), Gold Value
  - Importance, Kanban Stage, Recurrence, Campaign, Business/Work Filter
  - Due Date, Completed, Completed At, Created At, Skill Tags
  - Apple, Smart Prep, Delegation, Velin
- Special characters are properly escaped (commas in quotes, quotes doubled)
- Dates are in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- Boolean fields show "Yes" or "No"
- Skill tags are semicolon-separated: "Craftsman; Physical; Mindset"
- Null/empty fields are represented as empty strings
- No data corruption or truncation

**Status:** ⏳ Pending Manual Testing

---

### Test Case 3: CSV Export with Empty Task List
**Objective:** Verify behavior when exporting with no tasks

**Preconditions:**
- User is logged in
- User has 0 tasks (either new user or all tasks recycled)

**Steps:**
1. Navigate to home page with no tasks
2. Click "Export as CSV" button
3. Open the downloaded file

**Expected Results:**
- Export button is clickable even with 0 tasks
- CSV file is downloaded
- CSV contains only the header row (no data rows)
- File is valid CSV format

**Status:** ⏳ Pending Manual Testing

---

### Test Case 4: CSV Export with Large Dataset
**Objective:** Verify performance with large number of tasks

**Preconditions:**
- User has 100+ tasks in their list

**Steps:**
1. Navigate to home page
2. Click "Export as CSV"
3. Monitor download time and file size
4. Open the CSV file

**Expected Results:**
- Export completes within 5 seconds for 100 tasks
- CSV file downloads successfully
- All 100+ tasks are present in the file
- File opens without performance issues in spreadsheet applications
- No timeout or memory errors

**Status:** ⏳ Pending Manual Testing

---

### Test Case 5: CSV Re-Import Compatibility
**Objective:** Verify that exported CSV can be imported into other systems

**Preconditions:**
- User has exported a CSV file with at least 10 tasks

**Steps:**
1. Export tasks to CSV
2. Open the CSV in Microsoft Excel
3. Verify data displays correctly
4. Open the CSV in Google Sheets
5. Verify data displays correctly
6. Open the CSV in a text editor
7. Verify CSV formatting is standards-compliant

**Expected Results:**
- CSV opens correctly in Excel without import warnings
- CSV opens correctly in Google Sheets
- All columns are properly separated
- Special characters display correctly
- Date columns are recognized as dates
- No encoding issues (UTF-8 encoding is respected)

**Status:** ⏳ Pending Manual Testing

---

### Test Case 6: CSV Export Error Handling
**Objective:** Verify error handling when export fails

**Preconditions:**
- User is logged in

**Steps:**
1. Disconnect from the internet (simulate network failure)
2. Click "Export as CSV"
3. Reconnect to internet
4. Log out and try to access the export endpoint directly

**Expected Results:**
- Network failure shows appropriate error toast
- Unauthenticated access to `/api/tasks/export/csv` returns 401
- Error messages are user-friendly
- Application remains stable after errors

**Status:** ⏳ Pending Manual Testing

---

### Test Case 7: CSV Column Content Verification
**Objective:** Deep verification of specific column data

**Test Data:**
Create a task with these exact properties:
- Title: "Test Task, with \"quotes\" and newlines"
- Description: "Multi\nline\ndescription"
- Duration: 45 minutes
- Gold Value: 150 (calculated)
- Importance: Pareto
- Kanban Stage: In Progress
- Recurrence: 2x week
- Campaign: Main
- Business/Work Filter: Apple
- Due Date: 2025-12-25T15:00:00.000Z
- Completed: Yes
- Skill Tags: ["Craftsman", "Artist"]
- Apple: Yes
- Smart Prep: No
- Delegation: No
- Velin: No

**Steps:**
1. Create the task with exact properties above
2. Export to CSV
3. Open in text editor and locate the task row
4. Verify each field value

**Expected CSV Row Format:**
```
<id>,"Test Task, with ""quotes"" and newlines","Multi
line
description","",45,150,Pareto,In Progress,2x week,Main,Apple,2025-12-25T15:00:00.000Z,Yes,<timestamp>,<timestamp>,"Craftsman; Artist",Yes,No,No,No
```

**Expected Results:**
- Commas in title are properly quoted
- Quotes are doubled inside quoted fields
- Newlines are preserved within quoted fields
- Booleans are "Yes"/"No"
- Dates are ISO format
- Skill tags use semicolon separator
- No field bleed or misalignment

**Status:** ⏳ Pending Manual Testing

---

## Test Summary

**Total Test Cases:** 7
**Passed:** 0
**Failed:** 0
**Pending:** 7

**Priority:** High - User data export is a critical feature

**Notes:**
- CSV export uses UTF-8 encoding
- File naming convention: `productivity-quest-tasks-YYYY-MM-DD.csv`
- Export is a GET request to `/api/tasks/export/csv`
- Export includes all non-recycled tasks for the authenticated user

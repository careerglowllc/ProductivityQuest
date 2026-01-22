# AddTaskModal Test Cases - Comprehensive Testing Guide

**Feature:** Task Creation Modal with Form Validation  
**Last Updated:** December 2024  
**Total Test Cases:** 60

---

## Table of Contents
1. [Backend API Tests (20)](#backend-api-tests)
2. [Frontend UI Tests (20)](#frontend-ui-tests)
3. [Form Validation Tests (10)](#form-validation-tests)
4. [Integration Tests (5)](#integration-tests)
5. [Edge Cases (5)](#edge-cases)

---

## Backend API Tests

### TC-AT-001: Create Task - All Required Fields
**Objective:** Verify task creation with only required fields  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request to `/api/tasks`
2. Include only required fields:
   ```json
   {
     "title": "Test Quest",
     "description": "Test description",
     "duration": 30,
     "goldValue": 10,
     "completed": false
   }
   ```

**Expected Result:**
- Status: 200 OK
- Response contains created task with ID
- Task has default values for optional fields
- Task belongs to authenticated user

**Curl Command:**
```bash
curl -X POST http://localhost:5001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{
    "title": "Test Quest",
    "description": "Test description",
    "duration": 30,
    "goldValue": 10,
    "completed": false
  }'
```

---

### TC-AT-002: Create Task - All Fields
**Objective:** Verify task creation with all available fields  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request to `/api/tasks`
2. Include all fields:
   ```json
   {
     "title": "Complete Project Documentation",
     "description": "Write comprehensive docs",
     "details": "Include API references, examples, and deployment guide",
     "duration": 120,
     "goldValue": 50,
     "dueDate": "2024-12-31T23:59:59.000Z",
     "importance": "High",
     "kanbanStage": "In Progress",
     "recurType": "⏳One-time",
     "lifeDomain": "Purpose",
     "businessWorkFilter": "Apple",
     "apple": true,
     "smartPrep": true,
     "delegationTask": false,
     "velin": false,
     "completed": false
   }
   ```

**Expected Result:**
- Status: 200 OK
- Response contains task with all specified fields
- Date properly formatted
- Booleans correctly set

---

### TC-AT-003: Create Task - Missing Title
**Objective:** Verify validation error when title is missing  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request without title field
2. Check error response

**Expected Result:**
- Status: 400 Bad Request
- Error message indicates title is required
- No task created in database

---

### TC-AT-004: Create Task - Missing Description
**Objective:** Verify validation error when description is missing  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request without description field
2. Check error response

**Expected Result:**
- Status: 400 Bad Request
- Error message indicates description is required
- No task created in database

---

### TC-AT-005: Create Task - Invalid Duration (Negative)
**Objective:** Verify validation for negative duration  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with `"duration": -30`
2. Check error response

**Expected Result:**
- Status: 400 Bad Request
- Error message indicates invalid duration
- No task created

---

### TC-AT-006: Create Task - Invalid Duration (Zero)
**Objective:** Verify validation for zero duration  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with `"duration": 0`
2. Check error response

**Expected Result:**
- Status: 400 Bad Request
- Duration must be positive

---

### TC-AT-007: Create Task - Invalid Gold Value (Negative)
**Objective:** Verify validation for negative gold value  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with `"goldValue": -10`
2. Check error response

**Expected Result:**
- Status: 400 Bad Request
- Gold value must be non-negative

---

### TC-AT-008: Create Task - Invalid Duration (String)
**Objective:** Verify type validation for duration  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with `"duration": "thirty"`
2. Check error response

**Expected Result:**
- Status: 400 Bad Request
- Error indicates duration must be a number

---

### TC-AT-009: Create Task - Invalid Gold Value (String)
**Objective:** Verify type validation for gold value  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with `"goldValue": "ten"`
2. Check error response

**Expected Result:**
- Status: 400 Bad Request
- Error indicates gold value must be a number

---

### TC-AT-010: Create Task - Invalid Date Format
**Objective:** Verify date validation  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with `"dueDate": "invalid-date"`
2. Check error response

**Expected Result:**
- Status: 400 Bad Request
- Error indicates invalid date format

---

### TC-AT-011: Create Task - Past Due Date
**Objective:** Verify system accepts past due dates (user might want to track overdue tasks)  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with past date: `"dueDate": "2020-01-01T00:00:00.000Z"`
2. Check response

**Expected Result:**
- Status: 200 OK
- Task created successfully with past due date
- No warnings (business logic decision)

---

### TC-AT-012: Create Task - Very Long Title (200 chars)
**Objective:** Verify title length limit  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with 200-character title
2. Check response

**Expected Result:**
- Status: 200 OK
- Full title stored and returned

---

### TC-AT-013: Create Task - Title Over Limit (201 chars)
**Objective:** Verify title length validation  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with 201-character title
2. Check error response

**Expected Result:**
- Status: 400 Bad Request (if backend validation exists)
- OR: Frontend should prevent submission

---

### TC-AT-014: Create Task - Very Long Description (500 chars)
**Objective:** Verify description length limit  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with 500-character description
2. Check response

**Expected Result:**
- Status: 200 OK
- Full description stored and returned

---

### TC-AT-015: Create Task - Details Over Limit (2001 chars)
**Objective:** Verify details length validation  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with 2001-character details field
2. Check error response

**Expected Result:**
- Status: 400 Bad Request (if backend validation exists)
- OR: Frontend should prevent submission

---

### TC-AT-016: Create Task - All Checkboxes True
**Objective:** Verify multiple boolean filters work together  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with all checkboxes set to true:
   ```json
   {
     "apple": true,
     "smartPrep": true,
     "delegationTask": true,
     "velin": true
   }
   ```

**Expected Result:**
- Status: 200 OK
- All boolean filters correctly stored

---

### TC-AT-017: Create Task - All Checkboxes False
**Objective:** Verify default false state for boolean filters  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request with all checkboxes set to false (or omitted)
2. Check response

**Expected Result:**
- Status: 200 OK
- All boolean filters stored as false

---

### TC-AT-018: Create Task - Unauthenticated
**Objective:** Verify authentication requirement  
**Prerequisites:** User NOT authenticated  
**Steps:**
1. Send POST request without session cookie
2. Check error response

**Expected Result:**
- Status: 401 Unauthorized
- Error message indicates authentication required
- No task created

---

### TC-AT-019: Create Task - Verify Task Appears in List
**Objective:** Verify created task is retrievable  
**Prerequisites:** User authenticated  
**Steps:**
1. Send POST request to create task
2. Send GET request to `/api/tasks`
3. Search for created task in response

**Expected Result:**
- New task appears in task list
- All fields match creation request

---

### TC-AT-020: Create Task - Verify Task Count Increment
**Objective:** Verify task statistics update  
**Prerequisites:** User authenticated  
**Steps:**
1. Get initial task count from `/api/stats`
2. Create new task
3. Get updated task count

**Expected Result:**
- Task count increments by 1
- Statistics properly updated

---

## Frontend UI Tests

### TC-AT-021: Modal Renders - All Fields Visible
**Objective:** Verify all form fields render correctly  
**Prerequisites:** User logged in, on tasks page  
**Steps:**
1. Click "Add Quest" button
2. Verify modal opens
3. Check all fields are visible:
   - Title input
   - Description input
   - Details textarea
   - Duration input
   - Gold Value input
   - Due Date picker
   - Importance dropdown
   - Kanban Stage dropdown
   - Recurrence dropdown
   - Life Domain dropdown
   - Business/Work Filter dropdown
   - Apple checkbox
   - Smart Prep checkbox
   - Delegation checkbox
   - Velin checkbox
   - Create button
   - Cancel button

**Expected Result:**
- Modal opens smoothly
- All 15+ fields visible and accessible
- Medieval/RPG styling applied

---

### TC-AT-022: Modal - Default Values
**Objective:** Verify default field values  
**Prerequisites:** User logged in  
**Steps:**
1. Open AddTaskModal
2. Check default values for each field

**Expected Result:**
- Title: Empty
- Description: Empty
- Details: Empty
- Duration: 30
- Gold Value: 10
- Due Date: Not set
- Importance: "Medium"
- Kanban Stage: "To Do"
- Recurrence: "⏳One-time"
- Life Domain: "General"
- Business Filter: "General"
- All checkboxes: Unchecked

---

### TC-AT-023: Character Counter - Title
**Objective:** Verify title character counter works  
**Prerequisites:** Modal open  
**Steps:**
1. Type in title field
2. Observe character counter

**Expected Result:**
- Counter shows "X/200 characters"
- Updates in real-time as user types
- Turns red/warning when near limit (optional)

---

### TC-AT-024: Character Counter - Description
**Objective:** Verify description character counter works  
**Prerequisites:** Modal open  
**Steps:**
1. Type in description field
2. Observe character counter

**Expected Result:**
- Counter shows "X/500 characters"
- Updates in real-time

---

### TC-AT-025: Character Counter - Details
**Objective:** Verify details character counter works  
**Prerequisites:** Modal open  
**Steps:**
1. Type in details textarea
2. Observe character counter

**Expected Result:**
- Counter shows "X/2000 characters"
- Updates in real-time

---

### TC-AT-026: Character Limit Enforcement - Title
**Objective:** Verify title cannot exceed 200 characters  
**Prerequisites:** Modal open  
**Steps:**
1. Try to type 201 characters in title field
2. Check if input is blocked

**Expected Result:**
- Input blocked at 200 characters
- User cannot type beyond limit

---

### TC-AT-027: Character Limit Enforcement - Description
**Objective:** Verify description cannot exceed 500 characters  
**Prerequisites:** Modal open  
**Steps:**
1. Try to type 501 characters in description
2. Check if input is blocked

**Expected Result:**
- Input blocked at 500 characters

---

### TC-AT-028: Character Limit Enforcement - Details
**Objective:** Verify details cannot exceed 2000 characters  
**Prerequisites:** Modal open  
**Steps:**
1. Try to type 2001 characters in details
2. Check if input is blocked

**Expected Result:**
- Input blocked at 2000 characters

---

### TC-AT-029: Date Picker - Opens and Closes
**Objective:** Verify date picker functionality  
**Prerequisites:** Modal open  
**Steps:**
1. Click "Pick a date" button
2. Verify calendar opens
3. Click outside or ESC
4. Verify calendar closes

**Expected Result:**
- Calendar popover opens smoothly
- Shows current month
- Can navigate between months
- Closes properly

---

### TC-AT-030: Date Picker - Select Date
**Objective:** Verify date selection works  
**Prerequisites:** Modal open  
**Steps:**
1. Open date picker
2. Click on a future date
3. Verify date appears in button

**Expected Result:**
- Selected date displays in readable format (e.g., "December 25, 2024")
- Calendar closes after selection
- Date is stored in form state

---

### TC-AT-031: Dropdown - Importance Options
**Objective:** Verify importance dropdown shows all options  
**Prerequisites:** Modal open  
**Steps:**
1. Click importance dropdown
2. Verify all options visible

**Expected Result:**
- Shows: Pareto, High, Med-High, Medium, Med-Low, Low
- Each has appropriate icon/emoji
- Can select any option

---

### TC-AT-032: Dropdown - Kanban Stage Options
**Objective:** Verify kanban stage dropdown  
**Prerequisites:** Modal open  
**Steps:**
1. Click kanban stage dropdown
2. Check options

**Expected Result:**
- Shows: To Do, In Progress, Review, Done
- Default: "To Do"

---

### TC-AT-033: Dropdown - Life Domain Options
**Objective:** Verify life domain dropdown  
**Prerequisites:** Modal open  
**Steps:**
1. Click life domain dropdown
2. Check options

**Expected Result:**
- Shows: General, Relationships, Finance, Purpose, Physical, Adventure, Power, Mental
- Default: "General"

---

### TC-AT-034: Dropdown - Business Filter Options
**Objective:** Verify business filter dropdown  
**Prerequisites:** Modal open  
**Steps:**
1. Click business filter dropdown
2. Check options

**Expected Result:**
- Shows: General, Apple, Vi, SP, Vel, CG
- Default: "General"

---

### TC-AT-035: Checkboxes - Toggle States
**Objective:** Verify all checkboxes can be toggled  
**Prerequisites:** Modal open  
**Steps:**
1. Click each checkbox (Apple, Smart Prep, Delegation, Velin)
2. Verify checked state
3. Click again to uncheck
4. Verify unchecked state

**Expected Result:**
- All checkboxes toggleable
- Visual feedback on check/uncheck
- State persists while modal open

---

### TC-AT-036: Cancel Button - Clears Form
**Objective:** Verify cancel resets form  
**Prerequisites:** Modal open with data entered  
**Steps:**
1. Fill in several fields
2. Click "Cancel" button
3. Reopen modal
4. Check all fields

**Expected Result:**
- Modal closes on cancel
- All fields reset to defaults when reopened
- No data persists

---

### TC-AT-037: Create Button - Loading State
**Objective:** Verify loading indicator during creation  
**Prerequisites:** Modal open with valid data  
**Steps:**
1. Fill required fields
2. Click "Create Quest"
3. Observe button state during API call

**Expected Result:**
- Button shows "Creating..." text
- Spinner icon appears
- Button disabled during request
- Prevents double submission

---

### TC-AT-038: Toast Notification - Success
**Objective:** Verify success toast appears  
**Prerequisites:** Modal open  
**Steps:**
1. Fill required fields
2. Submit form
3. Wait for API response

**Expected Result:**
- Success toast appears: "✓ Quest Created!"
- Description: "Your new quest has been added to the list."
- Toast auto-dismisses after 3-5 seconds

---

### TC-AT-039: Toast Notification - Error
**Objective:** Verify error toast appears on failure  
**Prerequisites:** Modal open, backend returning error  
**Steps:**
1. Trigger error condition (e.g., server down)
2. Submit form
3. Observe error handling

**Expected Result:**
- Error toast appears: "Error Creating Quest"
- Description shows error message
- Modal remains open
- Form data preserved

---

### TC-AT-040: Modal Close - Automatic After Success
**Objective:** Verify modal closes after successful creation  
**Prerequisites:** Modal open  
**Steps:**
1. Create task successfully
2. Observe modal behavior

**Expected Result:**
- Modal closes automatically
- Form resets
- Task list refreshes
- New task visible in list

---

## Form Validation Tests

### TC-AT-041: Validation - Empty Title
**Objective:** Verify title required validation  
**Prerequisites:** Modal open  
**Steps:**
1. Leave title empty
2. Fill other required fields
3. Click "Create Quest"

**Expected Result:**
- Toast appears: "Title Required"
- Description: "Please enter a quest title."
- Form not submitted
- Modal stays open

---

### TC-AT-042: Validation - Empty Description
**Objective:** Verify description required validation  
**Prerequisites:** Modal open  
**Steps:**
1. Fill title
2. Leave description empty
3. Click "Create Quest"

**Expected Result:**
- Toast appears: "Description Required"
- Description: "Please enter a quest description."
- Form not submitted

---

### TC-AT-043: Validation - Whitespace Only Title
**Objective:** Verify whitespace-only title rejected  
**Prerequisites:** Modal open  
**Steps:**
1. Enter only spaces in title: "    "
2. Fill other fields
3. Submit

**Expected Result:**
- Validation error: "Title Required"
- Whitespace trimmed before validation

---

### TC-AT-044: Validation - Whitespace Only Description
**Objective:** Verify whitespace-only description rejected  
**Prerequisites:** Modal open  
**Steps:**
1. Fill title
2. Enter only spaces in description: "    "
3. Submit

**Expected Result:**
- Validation error: "Description Required"
- Whitespace trimmed

---

### TC-AT-045: Validation - Invalid Duration (Non-Numeric)
**Objective:** Verify duration number validation  
**Prerequisites:** Modal open  
**Steps:**
1. Try to enter "abc" in duration field
2. Observe behavior

**Expected Result:**
- Input field only accepts numbers (type="number")
- Non-numeric characters rejected
- OR: Show validation error on submit

---

### TC-AT-046: Validation - Zero Duration
**Objective:** Verify duration must be positive  
**Prerequisites:** Modal open  
**Steps:**
1. Set duration to 0
2. Fill other required fields
3. Submit

**Expected Result:**
- Toast appears: "Invalid Duration"
- Description: "Duration must be a positive number."
- Form not submitted

---

### TC-AT-047: Validation - Negative Duration
**Objective:** Verify negative duration rejected  
**Prerequisites:** Modal open  
**Steps:**
1. Try to set duration to -30
2. Observe behavior

**Expected Result:**
- Input field has min="1" attribute preventing negative
- OR: Validation error on submit

---

### TC-AT-048: Validation - Negative Gold Value
**Objective:** Verify negative gold rejected  
**Prerequisites:** Modal open  
**Steps:**
1. Try to set gold value to -10
2. Observe behavior

**Expected Result:**
- Input field has min="0" attribute
- OR: Validation error: "Invalid Gold Value"

---

### TC-AT-049: Validation - All Fields Valid
**Objective:** Verify successful submission with all valid data  
**Prerequisites:** Modal open  
**Steps:**
1. Fill all fields with valid data:
   - Title: "Complete Testing"
   - Description: "Write comprehensive tests"
   - Details: "Include all edge cases"
   - Duration: 60
   - Gold: 25
   - Due Date: Tomorrow
   - Importance: High
   - All other fields with valid selections
2. Submit

**Expected Result:**
- No validation errors
- Task created successfully
- Modal closes
- Task appears in list

---

### TC-AT-050: Validation - Minimum Valid Form
**Objective:** Verify submission with only required fields  
**Prerequisites:** Modal open  
**Steps:**
1. Fill only required fields:
   - Title: "Minimal Quest"
   - Description: "Just the basics"
   - Keep default duration and gold
2. Leave all optional fields as defaults
3. Submit

**Expected Result:**
- Task created successfully
- Optional fields use default values
- No validation errors

---

## Integration Tests

### TC-AT-051: Integration - Create and View
**Objective:** Verify created task appears immediately in task list  
**Prerequisites:** User on tasks page  
**Steps:**
1. Note current task count
2. Open AddTaskModal
3. Create new task: "Integration Test Quest"
4. Wait for modal to close
5. Check task list

**Expected Result:**
- New task appears at top of list (or in appropriate filter)
- Task count increments
- Task has all specified properties
- No page refresh needed

---

### TC-AT-052: Integration - Multiple Consecutive Creates
**Objective:** Verify multiple tasks can be created in sequence  
**Prerequisites:** User on tasks page  
**Steps:**
1. Create first task
2. Immediately open modal again
3. Create second task
4. Repeat for third task
5. Verify all three tasks appear

**Expected Result:**
- All three tasks created successfully
- Each has unique ID
- All appear in task list
- No interference between creations

---

### TC-AT-053: Integration - Create with All Filters
**Objective:** Verify task respects all filter selections  
**Prerequisites:** User on tasks page  
**Steps:**
1. Create task with:
   - Importance: "Pareto"
   - Life Domain: "Purpose"
   - Business Filter: "Apple"
   - Apple checkbox: Checked
2. Use filter "apple" on task page
3. Verify task appears

**Expected Result:**
- Task visible when "Apple" filter active
- Task has correct importance badge
- All metadata correctly displayed

---

### TC-AT-054: Integration - Create and Stats Update
**Objective:** Verify user stats update after creation  
**Prerequisites:** User on tasks page  
**Steps:**
1. Note current total tasks in stats
2. Create new task
3. Check stats display

**Expected Result:**
- Total tasks count increments
- Stats refresh automatically
- No manual refresh needed

---

### TC-AT-055: Integration - Create and Complete
**Objective:** Verify newly created task can be completed immediately  
**Prerequisites:** User on tasks page  
**Steps:**
1. Create new task
2. Find task in list
3. Mark as complete
4. Verify completion

**Expected Result:**
- Newly created task completable
- Gold awarded correctly
- Task removed from active list (or marked complete)
- Completion animation plays

---

## Edge Cases

### TC-AT-056: Edge Case - Very Large Duration
**Objective:** Verify system handles large duration values  
**Prerequisites:** Modal open  
**Steps:**
1. Enter duration: 10000 (minutes = ~7 days)
2. Create task
3. Verify handling

**Expected Result:**
- Task created successfully
- Duration stored correctly
- No overflow errors
- Displayed correctly in UI

---

### TC-AT-057: Edge Case - Special Characters in Title
**Objective:** Verify special characters handled properly  
**Prerequisites:** Modal open  
**Steps:**
1. Enter title with special chars: "Quest: <Complete> & Test! @#$%"
2. Submit task

**Expected Result:**
- Task created successfully
- Special characters preserved
- No XSS vulnerabilities
- Displays correctly in list

---

### TC-AT-058: Edge Case - Unicode/Emoji in Fields
**Objective:** Verify Unicode support  
**Prerequisites:** Modal open  
**Steps:**
1. Enter title: "🎯 Complete Quest 中文 Español"
2. Description: "Testing émojis 🚀✨"
3. Submit

**Expected Result:**
- All Unicode characters preserved
- Emoji display correctly
- Character count accurate
- No encoding issues

---

### TC-AT-059: Edge Case - Rapid Click Create Button
**Objective:** Verify no duplicate tasks on rapid clicks  
**Prerequisites:** Modal open with valid data  
**Steps:**
1. Fill form
2. Rapidly click "Create Quest" button multiple times
3. Check task list

**Expected Result:**
- Only ONE task created
- Button disabled after first click
- Subsequent clicks ignored
- No duplicate tasks

---

### TC-AT-060: Edge Case - Network Timeout
**Objective:** Verify graceful handling of network timeout  
**Prerequisites:** Modal open, simulate slow network  
**Steps:**
1. Fill form with valid data
2. Throttle network to very slow speed
3. Submit form
4. Observe behavior during long wait

**Expected Result:**
- Loading indicator shows
- Button stays disabled
- Eventually times out OR completes
- Error message if timeout
- Form data preserved for retry

---

## Test Execution Summary

### Passing Criteria
- **Backend Tests:** 18/20 passing (90%)
- **Frontend Tests:** 18/20 passing (90%)
- **Validation Tests:** 9/10 passing (90%)
- **Integration Tests:** 5/5 passing (100%)
- **Edge Cases:** 4/5 passing (80%)

### Priority Levels
- **P0 (Critical):** TC-AT-001, TC-AT-003, TC-AT-004, TC-AT-021, TC-AT-041, TC-AT-042, TC-AT-051
- **P1 (High):** All validation tests, all backend API tests
- **P2 (Medium):** UI tests, character counters
- **P3 (Low):** Edge cases, special characters

### Test Environment
- **Browser:** Chrome 120+, Firefox 120+, Safari 17+
- **Screen Sizes:** Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- **Backend:** Node.js + PostgreSQL
- **API Endpoint:** `POST /api/tasks`

---

## Notes
- Tests assume session-based authentication
- Character limits enforced at frontend (HTML maxLength)
- Backend validation should mirror frontend rules
- All date handling uses ISO 8601 format
- Gold values and duration must be integers

---

**End of Test Cases**

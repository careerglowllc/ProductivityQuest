# Task Management Test Cases

## Feature: Select All / Deselect All Tasks

### Test Case 1: Select All Tasks in Active View
**Steps:**
1. Navigate to Quests page with multiple active tasks
2. Click "Select All" button
**Expected Result:**
- All visible tasks in current view should be selected (checkboxes checked)
- Button text shows count: "Select All (X)"
- Delete Selected button becomes visible

### Test Case 2: Deselect All Tasks
**Steps:**
1. Have multiple tasks selected
2. Click "Deselect All" button
**Expected Result:**
- All checkboxes become unchecked
- Button text shows "Deselect All (0)"
- Delete Selected button disappears

### Test Case 3: Select All with Filters Applied
**Steps:**
1. Apply "Health" skill filter
2. Click "Select All"
**Expected Result:**
- Only filtered tasks (Health) should be selected
- Count should match filtered tasks count
- Non-filtered tasks should remain unselected

### Test Case 4: Select All in Due Today View
**Steps:**
1. Switch to "Due Today" filter
2. Click "Select All"
**Expected Result:**
- Only tasks due today should be selected
- Count matches tasks in Due Today view

### Test Case 5: Select All in High Reward View
**Steps:**
1. Switch to "High Reward" filter (tasks with ≥50 gold)
2. Click "Select All"
**Expected Result:**
- Only high reward tasks should be selected
- Tasks ordered by highest gold value first

---

## Feature: Delete Selected (Bulk Delete to Recycling Bin)

### Test Case 6: Delete Single Selected Task
**Steps:**
1. Select one task via checkbox
2. Click "Delete Selected" button
**Expected Result:**
- Task moves to recycling bin immediately
- No gold or XP awarded
- Task count updates
- Selection cleared

### Test Case 7: Delete Multiple Tasks
**Steps:**
1. Select 5 tasks
2. Click "Delete Selected" button
**Expected Result:**
- All 5 tasks move to recycling bin
- No rewards given for any task
- Active tasks list updates
- Success message appears

### Test Case 8: Delete Selected with No Tasks Selected
**Steps:**
1. Ensure no tasks are selected
2. Observe Delete Selected button
**Expected Result:**
- Delete Selected button should not be visible
- Or button should be disabled if visible

### Test Case 9: Delete All Tasks in a Skill Category
**Steps:**
1. Filter by "Craftsman" skill
2. Select All
3. Delete Selected
**Expected Result:**
- All Craftsman tasks move to recycling bin
- Craftsman filter now shows empty state
- Other skill categories unaffected

### Test Case 10: Delete Tasks Then Undo via Recycling Bin
**Steps:**
1. Select and delete 3 tasks
2. Navigate to Recycling Bin
3. Restore the 3 tasks
**Expected Result:**
- Tasks reappear in active list
- All task data preserved (title, description, skills, gold, due date)
- Selection state cleared

---

## Feature: Recycling Bin

### Test Case 11: Access Recycling Bin
**Steps:**
1. Click user dropdown menu (top right)
2. Click "Recycling Bin" option
**Expected Result:**
- Navigate to /recycling-bin route
- See list of deleted/completed tasks
- Tabs for "All", "Completed", "Deleted" visible

### Test Case 12: View Completed Tasks in Recycling Bin
**Steps:**
1. Open Recycling Bin
2. Click "Completed" tab
**Expected Result:**
- Only shows tasks marked as completed
- Shows completion date
- Shows gold/XP earned (if any)

### Test Case 13: View Deleted Tasks in Recycling Bin
**Steps:**
1. Open Recycling Bin
2. Click "Deleted" tab
**Expected Result:**
- Only shows tasks that were deleted (not completed)
- No gold/XP values shown
- Deletion timestamp visible

### Test Case 14: Search in Recycling Bin
**Steps:**
1. Open Recycling Bin with 10+ recycled tasks
2. Type "workout" in search bar
**Expected Result:**
- Filters tasks in real-time as you type
- Searches title, description, and skill tags
- Shows only matching tasks
- Case-insensitive search

### Test Case 15: Clear Search in Recycling Bin
**Steps:**
1. Enter search term to filter tasks
2. Click X icon in search bar
**Expected Result:**
- Search input clears
- All recycled tasks display again
- Filter count updates

### Test Case 16: Batch Restore Tasks
**Steps:**
1. In Recycling Bin, select 5 tasks via checkboxes
2. Click "Restore Selected" button
**Expected Result:**
- Loading toast appears
- All 5 tasks removed from recycling bin
- Tasks appear back in active Quests page
- Success toast notification

### Test Case 17: Permanent Delete Single Task
**Steps:**
1. In Recycling Bin, select 1 task
2. Click "Delete Forever" button
**Expected Result:**
- Confirmation prompt appears (optional)
- Task permanently deleted from database
- Cannot be recovered
- Success message

### Test Case 18: Permanent Delete Large Batch (100+ tasks)
**Steps:**
1. Have 100+ tasks in recycling bin
2. Select all tasks
3. Click "Delete Forever"
**Expected Result:**
- Loading toast appears with "Deleting Tasks..." message
- Message states "You can navigate away - we'll notify you when done"
- User can navigate to other pages during deletion
- Success toast appears when complete (even on different page)
- Single optimized SQL query used (not 100 individual queries)

### Test Case 19: Recycling Bin Button Visibility
**Steps:**
1. Open Recycling Bin
2. Observe Restore and Delete Forever buttons
**Expected Result:**
- Buttons have dark background (bg-green-900/60, bg-red-900/60)
- Text is clearly visible
- Hover states work properly
- Icons visible

### Test Case 20: Search + Select All in Recycling Bin
**Steps:**
1. Search for "health" tasks in recycling bin
2. Click Select All
**Expected Result:**
- Only filtered search results should be selected
- Non-matching tasks remain unselected

---

## Feature: High Reward Filter Sorting

### Test Case 21: High Reward Filter Shows Correct Tasks
**Steps:**
1. Navigate to Quests page
2. Click "High Reward" filter button
**Expected Result:**
- Only tasks with goldValue >= 50 are shown
- Tasks sorted by gold value (highest first)
- Highest gold task appears at top of list

### Test Case 22: High Reward Sort Order
**Steps:**
1. Create tasks with gold values: 100, 75, 50, 150, 60
2. Apply High Reward filter
**Expected Result:**
- Tasks appear in order: 150, 100, 75, 60, 50
- Descending order by gold value

### Test Case 23: High Reward with No Qualifying Tasks
**Steps:**
1. Ensure all active tasks have gold < 50
2. Apply High Reward filter
**Expected Result:**
- Empty state shown
- Message like "No high reward tasks found"
- Other filters still accessible

---

## Feature: Toast Notifications (Dark Theme)

### Test Case 24: Success Toast Styling
**Steps:**
1. Complete any task
2. Observe success toast notification
**Expected Result:**
- Background: dark slate (bg-slate-800/95)
- Border: yellow accent (border-yellow-600/30)
- Text: light yellow (text-yellow-100)
- Backdrop blur effect visible
- Shadow for depth

### Test Case 25: Error Toast Styling
**Steps:**
1. Trigger an error (e.g., try to create task with empty title)
2. Observe error toast
**Expected Result:**
- Background: darker slate (bg-slate-900/95)
- Border: red accent (border-red-600/40)
- Text: light red (text-red-100)
- Matches dark theme

### Test Case 26: Loading Toast (Infinite Duration)
**Steps:**
1. Delete 100+ tasks permanently
2. Observe loading toast
**Expected Result:**
- Toast appears with "Deleting Tasks..." message
- Duration set to Infinity (doesn't auto-dismiss)
- Allows navigation to other pages
- Stays visible until operation completes

### Test Case 27: Toast Close Button
**Steps:**
1. Trigger any toast notification
2. Hover over toast
3. Click X button
**Expected Result:**
- Close button becomes visible on hover
- Yellow tint (text-yellow-200/60)
- Clicking dismisses toast immediately

---

## Feature: Notion Details Import

### Test Case 28: Import Task with Details Field
**Steps:**
1. In Notion, create task with populated "Details" field
2. Import from Notion integration
3. View imported task in app
4. Open task detail modal
**Expected Result:**
- Details field populated in modal
- Exact text from Notion Details column
- Formatting preserved

### Test Case 29: Import Task Without Details
**Steps:**
1. Import Notion task with empty Details field
2. View task in app
**Expected Result:**
- Details field appears but is empty
- No error or "undefined" text
- Other fields imported correctly

### Test Case 30: Bulk Import with Mixed Details
**Steps:**
1. Import 10 tasks from Notion
2. 5 have Details, 5 are empty
**Expected Result:**
- All 10 tasks import successfully
- Details preserved for 5 tasks
- Empty details handled gracefully for other 5

---

## Performance & Edge Cases

### Test Case 31: Select All with 500+ Tasks
**Steps:**
1. Have 500+ active tasks
2. Click Select All
**Expected Result:**
- All tasks selected within 2 seconds
- No UI lag or freeze
- Count displays correctly

### Test Case 32: Delete 500+ Tasks Performance
**Steps:**
1. Select all 500+ tasks
2. Click Delete Selected
**Expected Result:**
- Batch operation uses single SQL query with IN clause
- Completes in under 10 seconds
- Loading feedback provided

### Test Case 33: Recycling Bin with 1000+ Items
**Steps:**
1. Have 1000+ items in recycling bin
2. Open recycling bin page
**Expected Result:**
- Page loads within reasonable time
- Search functionality works smoothly
- Can scroll through list without lag

### Test Case 34: Search Real-time Performance
**Steps:**
1. In recycling bin with 200+ tasks
2. Type search query character by character
**Expected Result:**
- Filter updates in real-time as you type
- No noticeable lag
- Smooth typing experience

### Test Case 35: Mixed Operations Workflow
**Steps:**
1. Select 10 tasks
2. Delete them
3. Navigate to Recycling Bin
4. Search for specific task
5. Restore 3 tasks
6. Delete 2 forever
7. Navigate back to Quests
**Expected Result:**
- All operations work seamlessly
- Data stays consistent
- No errors or crashes
- Correct counts throughout

---

## Summary

**Total Test Cases: 35**

**Coverage:**
- Select All/Deselect All: 5 test cases
- Delete Selected: 5 test cases  
- Recycling Bin: 10 test cases
- High Reward Filter: 3 test cases
- Toast Notifications: 4 test cases
- Notion Details Import: 3 test cases
- Performance & Edge Cases: 5 test cases

**Key Testing Areas:**
- ✅ Bulk operations (select, delete, restore)
- ✅ Search and filtering
- ✅ Performance with large datasets
- ✅ UI feedback and loading states
- ✅ Data persistence
- ✅ Cross-page consistency
- ✅ Theme consistency

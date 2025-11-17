# Grid View Test Cases

## Overview
This document contains test cases for the Grid View feature on the Quests page, which allows users to view tasks in a 4-column grid layout with smart batching based on sort criteria.

---

## 1. View Toggle Functionality

### Test Case 1.1: Toggle to Grid View
**Description:** User can switch from list view to grid view  
**Steps:**
1. Navigate to Quests page (default list view)
2. Click the "Grid" button next to the Sort button
**Expected Result:**
- View changes to grid layout
- Tasks display in 4-column grid (desktop)
- Button changes to show "List" with List icon

### Test Case 1.2: Toggle Back to List View
**Description:** User can switch from grid view back to list view  
**Steps:**
1. Navigate to Quests page in grid view
2. Click the "List" button
**Expected Result:**
- View changes back to list layout
- Tasks display vertically
- Button changes to show "Grid" with LayoutGrid icon

### Test Case 1.3: View State Persistence
**Description:** View preference persists during session  
**Steps:**
1. Switch to grid view
2. Navigate to another page
3. Return to Quests page
**Expected Result:**
- View resets to list (default state on page reload)

---

## 2. Grid Layout Responsiveness

### Test Case 2.1: Desktop Grid Layout
**Description:** Grid displays 4 columns on desktop  
**Steps:**
1. View Quests page in grid mode on desktop (≥1024px width)
**Expected Result:**
- Tasks display in 4 columns
- Columns are evenly spaced
- Task cards maintain proper sizing

### Test Case 2.2: Tablet Grid Layout
**Description:** Grid displays 2 columns on tablet  
**Steps:**
1. View Quests page in grid mode on tablet (768px-1023px width)
**Expected Result:**
- Tasks display in 2 columns
- Columns are evenly spaced
- Task cards remain readable

### Test Case 2.3: Mobile Grid Layout
**Description:** Grid displays 1 column on mobile  
**Steps:**
1. View Quests page in grid mode on mobile (<768px width)
**Expected Result:**
- Tasks display in single column
- Layout matches list view appearance
- All task information visible

---

## 3. Batching by Priority (Due Date Sort)

### Test Case 3.1: Pareto Priority Batch
**Description:** Tasks with Pareto priority are batched together  
**Steps:**
1. Sort tasks by "Due Date"
2. Switch to grid view
3. Locate Pareto Priority batch
**Expected Result:**
- "Pareto Priority" header displayed with AlertTriangle icon
- All Pareto importance tasks grouped together
- Task count shown in batch header

### Test Case 3.2: High Priority Batch
**Description:** Tasks with High priority are batched together  
**Steps:**
1. Sort tasks by "Due Date"
2. Switch to grid view
3. Locate High Priority batch
**Expected Result:**
- "High Priority" header displayed
- All High importance tasks grouped together
- Batch appears after Pareto (if any)

### Test Case 3.3: Medium Priority Batches
**Description:** Med-High, Medium, and Med-Low tasks are batched separately  
**Steps:**
1. Sort tasks by "Due Date"
2. Switch to grid view
3. Check for Med-High, Medium, Med-Low batches
**Expected Result:**
- Each priority level has its own batch
- Batches appear in priority order
- Task counts accurate for each batch

### Test Case 3.4: Low Priority Batch
**Description:** Low priority tasks are batched together  
**Steps:**
1. Sort tasks by "Due Date"
2. Switch to grid view
3. Locate Low Priority batch
**Expected Result:**
- "Low Priority" header displayed
- All Low importance tasks grouped together
- Batch appears at or near bottom

### Test Case 3.5: No Priority Batch
**Description:** Tasks without priority are batched as "None Priority"  
**Steps:**
1. Sort tasks by "Due Date"
2. Switch to grid view
3. Locate None Priority batch
**Expected Result:**
- "None Priority" header displayed
- All tasks without importance value grouped together
- Batch appears last

### Test Case 3.6: Empty Priority Batches Hidden
**Description:** Priority batches with no tasks are not displayed  
**Steps:**
1. Ensure some priority levels have no tasks
2. Sort by "Due Date" and switch to grid view
**Expected Result:**
- Only batches with tasks are shown
- No empty batch headers displayed

---

## 4. Batching by Due Date (Importance Sort)

### Test Case 4.1: Due Today Batch
**Description:** Tasks due today are batched together  
**Steps:**
1. Sort tasks by "Importance"
2. Switch to grid view
3. Locate "Due Today" batch
**Expected Result:**
- "Due Today" header displayed with CalendarDays icon
- All tasks due on current date grouped together
- Task count shown in batch header

### Test Case 4.2: Due This Week Batch
**Description:** Tasks due within current week are batched  
**Steps:**
1. Sort tasks by "Importance"
2. Switch to grid view
3. Locate "Due This Week" batch
**Expected Result:**
- "Due This Week" header displayed
- Tasks due between tomorrow and end of week grouped together
- Excludes tasks due today

### Test Case 4.3: Due This Month Batch
**Description:** Tasks due within current month are batched  
**Steps:**
1. Sort tasks by "Importance"
2. Switch to grid view
3. Locate "Due This Month" batch
**Expected Result:**
- "Due This Month" header displayed
- Tasks due after this week but within month grouped together
- Excludes tasks due this week or today

### Test Case 4.4: Due This Year Batch
**Description:** Tasks due within current year are batched  
**Steps:**
1. Sort tasks by "Importance"
2. Switch to grid view
3. Locate "Due This Year" batch
**Expected Result:**
- "Due This Year" header displayed
- Tasks due after this month but within year grouped together
- Excludes earlier timeframe tasks

### Test Case 4.5: No Due Date Batch
**Description:** Tasks without due dates are batched separately  
**Steps:**
1. Sort tasks by "Importance"
2. Switch to grid view
3. Locate "No Due Date" batch
**Expected Result:**
- "No Due Date" header displayed
- All tasks without dueDate value grouped together
- Batch appears last

### Test Case 4.6: Empty Date Batches Hidden
**Description:** Date batches with no tasks are not displayed  
**Steps:**
1. Ensure some timeframes have no tasks
2. Sort by "Importance" and switch to grid view
**Expected Result:**
- Only batches with tasks are shown
- No empty batch headers displayed

---

## 5. Batch Header Display

### Test Case 5.1: Batch Header Styling
**Description:** Batch headers have proper styling and visibility  
**Steps:**
1. View grid layout with multiple batches
**Expected Result:**
- Headers use large serif font
- Text is yellow-100 color
- Icon displayed before title
- Task count in parentheses after title

### Test Case 5.2: Priority Sort Icon
**Description:** AlertTriangle icon shown for priority batches  
**Steps:**
1. Sort by "Due Date" and view grid
**Expected Result:**
- AlertTriangle icon appears before batch titles
- Icon is yellow-400 color

### Test Case 5.3: Date Sort Icon
**Description:** CalendarDays icon shown for date batches  
**Steps:**
1. Sort by "Importance" and view grid
**Expected Result:**
- CalendarDays icon appears before batch titles
- Icon is yellow-400 color

### Test Case 5.4: Task Count Display
**Description:** Batch headers show accurate task counts  
**Steps:**
1. View grid layout with multiple batches
2. Count tasks manually in each batch
**Expected Result:**
- Count in header matches actual number of tasks
- Count updates when tasks are completed/added

---

## 6. Task Card Interaction in Grid View

### Test Case 6.1: Task Selection in Grid
**Description:** Tasks can be selected in grid view  
**Steps:**
1. Switch to grid view
2. Click checkbox on a task card
**Expected Result:**
- Task checkbox toggles
- Task added to selected tasks count
- Bulk actions bar appears

### Test Case 6.2: Multiple Task Selection
**Description:** Multiple tasks can be selected across batches  
**Steps:**
1. Switch to grid view
2. Select tasks from different batches
**Expected Result:**
- All selected tasks show checkmarks
- Selected count is accurate
- Bulk actions available for all selected

### Test Case 6.3: Task Details from Grid
**Description:** Task detail modal opens from grid view  
**Steps:**
1. Switch to grid view
2. Click "Details" button on a task card
**Expected Result:**
- Task detail modal opens
- All task information displayed correctly
- Can edit/complete task from modal

### Test Case 6.4: Complete Task in Grid
**Description:** Tasks can be completed directly from grid view  
**Steps:**
1. Switch to grid view
2. Complete a task using the complete button
**Expected Result:**
- Completion animation plays
- Task removed from grid
- XP/gold rewards processed
- Batch count updates

---

## 7. Filter and Search Compatibility

### Test Case 7.1: Filter in Grid View
**Description:** Filters work correctly in grid view  
**Steps:**
1. Switch to grid view
2. Apply different filters (Due Today, High Reward, etc.)
**Expected Result:**
- Only filtered tasks shown in grid
- Batches reorganize based on filtered tasks
- Empty batches hidden

### Test Case 7.2: Search in Grid View
**Description:** Search works correctly in grid view  
**Steps:**
1. Switch to grid view
2. Enter search query
**Expected Result:**
- Only matching tasks shown in grid
- Batches update to show search results
- "No tasks found" message if no matches

### Test Case 7.3: Sort Change in Grid View
**Description:** Changing sort reorganizes batches  
**Steps:**
1. View grid sorted by "Due Date"
2. Change sort to "Importance"
**Expected Result:**
- Batches immediately reorganize
- Priority batches change to date batches
- All tasks remain visible

---

## 8. Performance and Edge Cases

### Test Case 8.1: Large Number of Tasks
**Description:** Grid handles 100+ tasks efficiently  
**Steps:**
1. View grid with 100+ tasks
**Expected Result:**
- Grid loads smoothly
- No performance lag
- All batches render correctly

### Test Case 8.2: Single Task Batches
**Description:** Batches with only one task display correctly  
**Steps:**
1. Create scenario with single-task batches
2. View in grid
**Expected Result:**
- Single task displays in batch
- Count shows "(1)"
- Layout not broken

### Test Case 8.3: Empty Task List
**Description:** Grid view handles no tasks gracefully  
**Steps:**
1. Filter to show no tasks
2. View in grid mode
**Expected Result:**
- "No tasks match your filter" message shown
- No broken batch headers
- Can switch back to list view

### Test Case 8.4: All Tasks in One Batch
**Description:** Grid handles scenario where all tasks in one batch  
**Steps:**
1. Create scenario with all tasks same priority/date
2. View in grid
**Expected Result:**
- Single batch header shown
- All tasks displayed in 4-column grid
- Layout remains clean

---

## 9. Integration Tests

### Test Case 9.1: Bulk Actions from Grid
**Description:** Bulk actions work correctly in grid view  
**Steps:**
1. Select multiple tasks in grid view
2. Use "Complete Selected" bulk action
**Expected Result:**
- All selected tasks completed
- Removed from grid
- Batch counts update
- Rewards calculated correctly

### Test Case 9.2: Categorize from Grid
**Description:** Task categorization works in grid view  
**Steps:**
1. Select tasks in grid view
2. Click "Categorize Skill"
**Expected Result:**
- Categorization modal opens
- Selected tasks processed
- Skill tags updated
- Tasks remain in appropriate batches

### Test Case 9.3: View Toggle with Selections
**Description:** Task selections persist when toggling views  
**Steps:**
1. Select tasks in list view
2. Switch to grid view
3. Switch back to list view
**Expected Result:**
- Selected tasks remain selected across view changes
- Bulk actions remain available
- Selection count accurate

---

## 10. Accessibility

### Test Case 10.1: Keyboard Navigation
**Description:** Grid view is keyboard accessible  
**Steps:**
1. Use Tab key to navigate through grid
**Expected Result:**
- Can tab through all task cards
- View toggle button is reachable
- Focus indicators visible

### Test Case 10.2: Screen Reader Support
**Description:** Grid view announces properly to screen readers  
**Steps:**
1. Use screen reader to navigate grid view
**Expected Result:**
- Batch headers announced
- Task counts announced
- View toggle state announced

---

## Summary
- **Total Test Cases:** 48
- **Categories:** 10
- **Critical Path:** View toggle, batching logic, responsiveness
- **Priority:** High (core feature for task organization)

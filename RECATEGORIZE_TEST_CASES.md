# Recategorize Feature - Test Cases

**Feature:** Sequential Task Skill Recategorization  
**Last Updated:** November 2024  
**Total Test Cases:** 25

---

## Table of Contents
1. [UI Tests (8)](#ui-tests)
2. [Functionality Tests (10)](#functionality-tests)
3. [Edge Cases (5)](#edge-cases)
4. [Integration Tests (2)](#integration-tests)

---

## UI Tests

### TC-RC-001: Recategorize Button Visibility
**Objective:** Verify Recategorize button appears when tasks are selected  
**Prerequisites:** User logged in, on tasks page  
**Steps:**
1. Navigate to tasks page
2. Verify no tasks are selected
3. Click checkbox on one task
4. Observe bulk actions bar

**Expected Result:**
- Bulk actions bar appears with "1 task selected"
- "Recategorize" button is visible
- Button has yellow theme (border-yellow-500/40)
- Button is enabled

---

### TC-RC-002: Recategorize Button with Multiple Tasks
**Objective:** Verify button works with multiple task selection  
**Prerequisites:** User logged in, multiple tasks exist  
**Steps:**
1. Select 3 tasks using checkboxes
2. Observe bulk actions bar

**Expected Result:**
- Bar shows "3 tasks selected"
- Recategorize button visible and enabled
- Button positioned next to "Categorize Skill" button

---

### TC-RC-003: Recategorize Button Disabled State
**Objective:** Verify button is disabled when no tasks selected  
**Prerequisites:** User logged in  
**Steps:**
1. Navigate to tasks page
2. Ensure no tasks are selected
3. Check if bulk actions bar is visible

**Expected Result:**
- Bulk actions bar hidden when no tasks selected
- OR if visible, Recategorize button should be disabled

---

### TC-RC-004: Task Counter Display - Single Task
**Objective:** Verify counter doesn't show for single task  
**Prerequisites:** User logged in  
**Steps:**
1. Select 1 task
2. Click "Recategorize" button
3. Observe modal header

**Expected Result:**
- Modal opens
- Header shows "Adjust Skill Tags"
- No "Task X of Y" counter visible (only shows for 2+ tasks)

---

### TC-RC-005: Task Counter Display - Multiple Tasks
**Objective:** Verify task counter shows correctly for multiple tasks  
**Prerequisites:** User logged in  
**Steps:**
1. Select 3 tasks
2. Click "Recategorize" button
3. Observe modal header

**Expected Result:**
- Modal opens
- Header shows "Adjust Skill Tags" on left
- "Task 1 of 3" displayed on right in yellow-400/80 color
- Counter positioned in header, right-aligned

---

### TC-RC-006: Task Counter Updates on Next
**Objective:** Verify counter increments when moving to next task  
**Prerequisites:** 3 tasks selected and modal open  
**Steps:**
1. Select 3 tasks and open Recategorize modal
2. Verify shows "Task 1 of 3"
3. Click "Confirm" or "Next" button
4. Observe counter

**Expected Result:**
- Counter updates to "Task 2 of 3"
- Task title changes to second task
- Counter continues incrementing: "Task 3 of 3"

---

### TC-RC-007: Button Icon and Text
**Objective:** Verify button styling and content  
**Prerequisites:** At least 1 task selected  
**Steps:**
1. Select a task
2. Observe Recategorize button

**Expected Result:**
- Button shows Tag icon (🏷️)
- Text reads "Recategorize"
- Yellow border and text theme
- Hover effect changes background to yellow-600/20

---

### TC-RC-008: Modal Styling Consistency
**Objective:** Verify modal matches existing design  
**Prerequisites:** User logged in  
**Steps:**
1. Select tasks and click Recategorize
2. Compare with Categorize Skill modal (from AI categorization)

**Expected Result:**
- Same modal design (dark gradient background)
- Same header style
- Same skill selection interface
- Only difference: task counter in header

---

## Functionality Tests

### TC-RC-009: Single Task Recategorization
**Objective:** Verify recategorizing a single task works  
**Prerequisites:** User logged in, 1 task exists  
**Steps:**
1. Select 1 task
2. Click "Recategorize" button
3. Modal opens with current skill tags selected
4. Change skill selections
5. Click "Confirm"

**Expected Result:**
- Modal closes
- Task list refreshes
- Task shows updated skill tags
- Toast notification: "✓ Skills Updated"
- Selection cleared

---

### TC-RC-010: Multiple Tasks Sequential Processing
**Objective:** Verify all selected tasks are processed sequentially  
**Prerequisites:** 3 tasks exist  
**Steps:**
1. Select 3 tasks: Task A, Task B, Task C
2. Click "Recategorize"
3. Modal shows "Task 1 of 3" with Task A
4. Adjust skills for Task A, click "Confirm"
5. Modal shows "Task 2 of 3" with Task B
6. Adjust skills for Task B, click "Confirm"
7. Modal shows "Task 3 of 3" with Task C
8. Adjust skills for Task C, click "Confirm"

**Expected Result:**
- Each task processed in order
- Counter increments correctly
- Modal closes after last task
- All 3 tasks updated with new skills
- Toast shows success message

---

### TC-RC-011: Queue Clears After Completion
**Objective:** Verify queue is emptied after processing all tasks  
**Prerequisites:** Multiple tasks selected  
**Steps:**
1. Select 3 tasks
2. Click Recategorize
3. Process all 3 tasks by clicking Confirm
4. Reopen modal by selecting new tasks

**Expected Result:**
- After completing all 3 tasks, queue is empty
- New recategorization starts fresh
- No tasks from previous session appear

---

### TC-RC-012: Cancel Clears Queue
**Objective:** Verify canceling clears remaining tasks  
**Prerequisites:** 3 tasks selected  
**Steps:**
1. Select 3 tasks
2. Click Recategorize
3. On "Task 1 of 3", click "Cancel"

**Expected Result:**
- Modal closes immediately
- Tasks 2 and 3 are NOT processed
- Queue is cleared
- No skills updated

---

### TC-RC-013: Close Button Clears Queue
**Objective:** Verify X button clears queue  
**Prerequisites:** Multiple tasks in queue  
**Steps:**
1. Select 3 tasks
2. Click Recategorize
3. On "Task 2 of 3", click X button in modal corner

**Expected Result:**
- Modal closes
- Remaining tasks (Task 3) not processed
- Queue cleared
- Only Task 1 and 2 processed (if confirmed)

---

### TC-RC-014: Selection Clears After Opening Modal
**Objective:** Verify task selection is cleared when recategorize starts  
**Prerequisites:** Tasks selected  
**Steps:**
1. Select 3 tasks (checkboxes checked)
2. Click "Recategorize"
3. Observe task cards

**Expected Result:**
- Modal opens
- All task checkboxes are unchecked
- Bulk actions bar disappears
- Can select new tasks while modal is open (background)

---

### TC-RC-015: Skill Changes Persist
**Objective:** Verify adjusted skills are saved to database  
**Prerequisites:** User logged in  
**Steps:**
1. Note current skills on a task: ["Craftsman", "Scholar"]
2. Select task, click Recategorize
3. Change to: ["Artist", "Mindset"]
4. Click Confirm
5. Refresh page
6. Check task skills

**Expected Result:**
- Skills persist after page refresh
- Task shows ["Artist", "Mindset"]
- Changes saved to database

---

### TC-RC-016: Previous/Next Navigation
**Objective:** Verify can navigate between tasks in queue  
**Prerequisites:** 3 tasks in queue  
**Steps:**
1. Select 3 tasks, open Recategorize
2. On Task 1, verify "Previous" disabled
3. Click "Next" → moves to Task 2
4. Click "Previous" → back to Task 1
5. Click "Next" twice → Task 3
6. Verify "Next" disabled on last task

**Expected Result:**
- Can navigate forward and backward
- Previous disabled on first task
- Next disabled on last task
- Counter updates correctly

---

### TC-RC-017: Mixed Task Types
**Objective:** Verify works with tasks of different types  
**Prerequisites:** Tasks with different properties  
**Steps:**
1. Select tasks with:
   - Task A: No current skills
   - Task B: 2 skills assigned
   - Task C: 5 skills assigned
2. Click Recategorize
3. Process each task

**Expected Result:**
- All task types handled correctly
- Empty skills show no selections
- Existing skills pre-selected
- All can be modified

---

### TC-RC-018: Task Refresh After Update
**Objective:** Verify task list refreshes after recategorization  
**Prerequisites:** Task visible in list  
**Steps:**
1. Task shows badges: "Craftsman" "Scholar"
2. Select task, recategorize to "Artist"
3. Complete recategorization
4. Observe task in list (without page refresh)

**Expected Result:**
- Task list automatically refreshes
- Task now shows "Artist" badge
- Old badges removed
- No manual refresh needed

---

## Edge Cases

### TC-RC-019: Recategorize Same Task Twice
**Objective:** Verify can recategorize a task multiple times  
**Prerequisites:** 1 task exists  
**Steps:**
1. Select task, recategorize to ["Artist"]
2. Wait for completion
3. Select same task again
4. Recategorize to ["Craftsman"]

**Expected Result:**
- Second recategorization works
- Latest skills applied
- No conflicts or errors

---

### TC-RC-020: Maximum Tasks Selection
**Objective:** Verify system handles large task selection  
**Prerequisites:** 50+ tasks exist  
**Steps:**
1. Select all 50 tasks
2. Click Recategorize
3. Observe modal

**Expected Result:**
- Modal shows "Task 1 of 50"
- Can process all tasks sequentially
- No performance issues
- Counter counts to 50

---

### TC-RC-021: Network Error During Recategorization
**Objective:** Verify error handling on network failure  
**Prerequisites:** Dev tools open, can simulate network failure  
**Steps:**
1. Select 3 tasks, start recategorization
2. On Task 2, block network
3. Try to confirm changes

**Expected Result:**
- Error toast appears: "Failed to update skills"
- Modal remains open
- Can retry or cancel
- Queue preserved

---

### TC-RC-022: Rapid Button Clicks
**Objective:** Verify no duplicate processing on rapid clicks  
**Prerequisites:** Tasks selected  
**Steps:**
1. Select 3 tasks
2. Rapidly click "Recategorize" button 5 times quickly

**Expected Result:**
- Modal opens only once
- Only 3 tasks in queue (not 15)
- Button disabled during processing
- No duplicate task entries

---

### TC-RC-023: Delete Task While in Queue
**Objective:** Verify handling if queued task is deleted  
**Prerequisites:** 3 tasks selected  
**Steps:**
1. Select 3 tasks, open Recategorize
2. Process Task 1
3. In another tab/window, delete Task 2
4. Try to proceed to Task 2 in modal

**Expected Result:**
- Gracefully handles missing task
- Shows error or skips to Task 3
- No crash or broken state
- Queue continues with remaining tasks

---

## Integration Tests

### TC-RC-024: Recategorize + AI Categorize
**Objective:** Verify both categorization methods work together  
**Prerequisites:** Tasks exist  
**Steps:**
1. Select 3 tasks
2. Click "Categorize Skill" (AI)
3. Wait for AI processing
4. In toast, click "Adjust Skills"
5. Process tasks with adjustment modal
6. Later, select 2 different tasks
7. Click "Recategorize" (manual)
8. Process those tasks

**Expected Result:**
- Both methods work independently
- No conflicts between AI and manual
- Each uses same modal interface
- Skills updated correctly in both cases

---

### TC-RC-025: Recategorize + Complete Task
**Objective:** Verify recategorization works with task completion  
**Prerequisites:** Tasks with skills  
**Steps:**
1. Select task with skills ["Craftsman"]
2. Recategorize to ["Artist", "Physical"]
3. Complete modal
4. Select same task
5. Click "Complete Selected"
6. Observe skill XP gains

**Expected Result:**
- Task shows updated skills before completion
- On completion, XP awarded to Artist and Physical
- NOT awarded to Craftsman
- Skills properly updated before completion

---

## Test Execution Summary

### Passing Criteria
- **UI Tests:** 8/8 passing (100%)
- **Functionality Tests:** 10/10 passing (100%)
- **Edge Cases:** 4/5 passing (80%)
- **Integration Tests:** 2/2 passing (100%)

### Priority Levels
- **P0 (Critical):** TC-RC-009, TC-RC-010, TC-RC-012, TC-RC-017
- **P1 (High):** All UI tests, TC-RC-011, TC-RC-013, TC-RC-018
- **P2 (Medium):** Navigation tests, edge cases
- **P3 (Low):** TC-RC-020 (max selection), TC-RC-022 (rapid clicks)

### Test Environment
- **Browser:** Chrome 120+, Firefox 120+, Safari 17+
- **Screen Sizes:** Desktop (1920x1080), Mobile (375x667)
- **Backend:** Node.js + PostgreSQL
- **API Endpoint:** Uses existing `/api/tasks/categorize-feedback`

---

## Notes
- Recategorize button uses same modal as AI Categorize feature
- Both features share `SkillAdjustmentModal` component
- Queue state managed in `home.tsx` with `recategorizeQueue`
- Modal shows counter only when 2+ tasks in queue
- Selection automatically cleared when recategorize starts

---

**End of Test Cases**

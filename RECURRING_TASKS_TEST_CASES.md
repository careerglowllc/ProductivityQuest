# Recurring Tasks - Test Cases

**Feature:** Automatic Task Rescheduling for Routine Tasks  
**Last Updated:** November 2024  
**Total Test Cases:** 20  
**Logic:** Completed routine tasks reschedule to next due date instead of being marked complete

---

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [Recurrence Types](#recurrence-types)
3. [Basic Rescheduling Tests (11)](#basic-rescheduling-tests)
4. [Edge Cases (5)](#edge-cases)
5. [UI/UX Tests (4)](#uiux-tests)

---

## Feature Overview

### Behavior
When a task with a `recurType` is completed:
- **Gold and XP are awarded** normally
- **Task remains active** (not marked as completed)
- **Due date updates** to next occurrence based on recurrence pattern
- **Task stays in active list** (does not move to recycling bin)

### Non-Recurring Tasks
When a task without `recurType` is completed:
- Gold and XP are awarded
- Task is marked as completed
- Task moves to recycling bin
- Task removed from active list

---

## Recurrence Types

| Recur Type | Description | Calculation |
|------------|-------------|-------------|
| `daily` | Every day | +1 day |
| `every other day` | Every 2 days | +2 days |
| `2x week` | Twice per week | +3 days |
| `3x week` | Three times per week | +2 days |
| `weekly` | Once per week | +7 days |
| `2x month` | Twice per month | +15 days |
| `monthly` | Once per month | +1 month |
| `every 2 months` | Bi-monthly | +2 months |
| `quarterly` | Every 3 months | +3 months |
| `every 6 months` | Semi-annually | +6 months |
| `yearly` | Annually | +1 year |

---

## Basic Rescheduling Tests

### TC-RT-001: Daily Recurrence
**Objective:** Verify daily task reschedules correctly  
**Input:**
- Task: "Morning meditation"
- Recur Type: `daily`
- Current Due Date: 2024-11-17
- Action: Complete task

**Expected Result:**
- ✅ Gold awarded based on duration/importance
- ✅ XP awarded to linked skills
- ✅ Task remains active (completed = false)
- ✅ New due date: 2024-11-18 (current + 1 day)
- ✅ Task visible in active tasks list
- ✅ Task NOT in recycling bin

**Validation:**
```sql
SELECT id, title, dueDate, completed, recurType 
FROM tasks 
WHERE id = [task_id];
-- Expected: dueDate = '2024-11-18', completed = false
```

---

### TC-RT-002: Weekly Recurrence
**Objective:** Verify weekly task reschedules correctly  
**Input:**
- Task: "Team meeting"
- Recur Type: `weekly`
- Current Due Date: 2024-11-17
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2024-11-24 (current + 7 days)
- ✅ Task remains active
- ✅ Gold/XP awarded

**Validation:**
- Due date should be exactly 7 days later
- Same day of week maintained

---

### TC-RT-003: Monthly Recurrence
**Objective:** Verify monthly task reschedules correctly  
**Input:**
- Task: "Review finances"
- Recur Type: `monthly`
- Current Due Date: 2024-11-17
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2024-12-17 (current + 1 month)
- ✅ Task remains active
- ✅ Same day of month preserved

**Validation:**
- Month should increment by 1
- Day of month should match (17th → 17th)

---

### TC-RT-004: Every Other Day Recurrence
**Objective:** Verify every-other-day pattern  
**Input:**
- Task: "Exercise routine"
- Recur Type: `every other day`
- Current Due Date: 2024-11-17
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2024-11-19 (current + 2 days)
- ✅ Task remains active

---

### TC-RT-005: 2x Week Recurrence
**Objective:** Verify twice-weekly pattern  
**Input:**
- Task: "Gym session"
- Recur Type: `2x week`
- Current Due Date: 2024-11-17 (Sunday)
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2024-11-20 (Wednesday, +3 days)
- ✅ Maintains ~3.5 day spacing for bi-weekly tasks

---

### TC-RT-006: 3x Week Recurrence
**Objective:** Verify three-times-weekly pattern  
**Input:**
- Task: "Client check-ins"
- Recur Type: `3x week`
- Current Due Date: 2024-11-17
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2024-11-19 (+2 days)
- ✅ Maintains ~2.3 day spacing

---

### TC-RT-007: 2x Month Recurrence
**Objective:** Verify twice-monthly pattern  
**Input:**
- Task: "Payroll processing"
- Recur Type: `2x month`
- Current Due Date: 2024-11-01
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2024-11-16 (+15 days)
- ✅ Maintains bi-monthly spacing

---

### TC-RT-008: Every 2 Months Recurrence
**Objective:** Verify bi-monthly pattern  
**Input:**
- Task: "Dentist appointment"
- Recur Type: `every 2 months`
- Current Due Date: 2024-11-17
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2025-01-17 (+2 months)
- ✅ Day of month preserved

---

### TC-RT-009: Quarterly Recurrence
**Objective:** Verify quarterly pattern  
**Input:**
- Task: "Quarterly business review"
- Recur Type: `quarterly`
- Current Due Date: 2024-11-17
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2025-02-17 (+3 months)
- ✅ Maintains quarterly schedule

---

### TC-RT-010: Every 6 Months Recurrence
**Objective:** Verify semi-annual pattern  
**Input:**
- Task: "Car maintenance"
- Recur Type: `every 6 months`
- Current Due Date: 2024-11-17
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2025-05-17 (+6 months)
- ✅ Day of month preserved

---

### TC-RT-011: Yearly Recurrence
**Objective:** Verify annual pattern  
**Input:**
- Task: "Birthday celebration"
- Recur Type: `yearly`
- Current Due Date: 2024-11-17
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2025-11-17 (+1 year)
- ✅ Month and day preserved

---

## Edge Cases

### TC-RT-E01: Month Boundary (Daily)
**Objective:** Ensure daily recurrence works across month boundaries  
**Input:**
- Task: "Daily review"
- Recur Type: `daily`
- Current Due Date: 2024-11-30
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2024-12-01 (crosses month boundary)
- ✅ No errors or unexpected behavior

---

### TC-RT-E02: Year Boundary (Daily)
**Objective:** Ensure recurrence works across year boundaries  
**Input:**
- Task: "Daily standup"
- Recur Type: `daily`
- Current Due Date: 2024-12-31
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2025-01-01 (crosses year boundary)
- ✅ Correct year increment

---

### TC-RT-E03: Leap Year Handling (Monthly)
**Objective:** Ensure monthly recurrence handles February correctly  
**Input:**
- Task: "Monthly report"
- Recur Type: `monthly`
- Current Due Date: 2024-01-31
- Action: Complete task

**Expected Result:**
- ✅ New due date: 2024-02-29 (leap year, adjusts to last day)
- ✅ No crash or invalid date

---

### TC-RT-E04: Multiple Completions in Sequence
**Objective:** Verify repeated completions work correctly  
**Input:**
- Task: "Daily task"
- Recur Type: `daily`
- Actions: Complete 5 times in a row

**Expected Result:**
- ✅ Completion 1: Due date = original + 1 day
- ✅ Completion 2: Due date = original + 2 days
- ✅ Completion 3: Due date = original + 3 days
- ✅ Completion 4: Due date = original + 4 days
- ✅ Completion 5: Due date = original + 5 days
- ✅ Gold/XP awarded each time

---

### TC-RT-E05: Task with No Due Date
**Objective:** Handle recurring task without initial due date  
**Input:**
- Task: "Flexible routine"
- Recur Type: `daily`
- Due Date: null
- Action: Complete task

**Expected Result:**
- ✅ New due date: tomorrow (Date.now() + 1 day)
- ✅ OR: Remains null if business logic dictates
- ✅ No crash or error

**Validation:**
Check implementation - should tasks without due dates get auto-assigned next occurrence?

---

## UI/UX Tests

### TC-RT-UI01: Task Remains in Active List
**Objective:** Verify UI updates correctly after recurring task completion  
**Steps:**
1. Navigate to Tasks page
2. Complete a recurring task (e.g., daily routine)
3. Observe task list

**Expected Result:**
- ✅ Task still visible in active tasks
- ✅ Due date updated in task card
- ✅ Gold balance increased (shown in header)
- ✅ Success toast: "Task completed! +X gold. Next due: [date]"

---

### TC-RT-UI02: Completion Animation Shows
**Objective:** Verify visual feedback for recurring task completion  
**Steps:**
1. Complete a recurring task
2. Observe animation

**Expected Result:**
- ✅ Completion animation plays (stars/confetti)
- ✅ Gold counter animates increase
- ✅ Task card briefly highlights before updating

---

### TC-RT-UI03: Recycling Bin Excludes Recurring Tasks
**Objective:** Ensure recurring tasks never appear in recycling bin  
**Steps:**
1. Complete multiple recurring tasks
2. Navigate to Recycling Bin page
3. Search for recurring tasks

**Expected Result:**
- ✅ Recurring tasks NOT in recycling bin
- ✅ Only one-time completed tasks appear
- ✅ Deleted recurring tasks CAN appear (if manually deleted)

---

### TC-RT-UI04: Due Date Badge Updates
**Objective:** Verify due date badges reflect new dates  
**Steps:**
1. Create daily task due today
2. Complete the task
3. Check task card due date badge

**Expected Result:**
- ✅ Badge changes from "Today" to "Tomorrow"
- ✅ Color updates (red → yellow if overdue → upcoming)
- ✅ Task sorted correctly in list

---

## Implementation Notes

### Backend Logic (server/storage.ts)
```typescript
async completeTask(userId: number, taskId: number): Promise<void> {
  const task = await this.getTask(userId, taskId);
  
  if (task.recurType) {
    // RECURRING TASK PATH
    // 1. Award gold and XP
    await this.awardGoldAndXP(userId, task);
    
    // 2. Calculate next due date
    const nextDueDate = this.calculateNextDueDate(task.dueDate, task.recurType);
    
    // 3. Update task with new due date (keep active)
    await db.update(tasks)
      .set({ dueDate: nextDueDate })
      .where(eq(tasks.id, taskId));
      
  } else {
    // ONE-TIME TASK PATH
    // 1. Award gold and XP
    await this.awardGoldAndXP(userId, task);
    
    // 2. Mark completed and recycle
    await db.update(tasks)
      .set({ completed: true, completedAt: new Date() })
      .where(eq(tasks.id, taskId));
  }
}

private calculateNextDueDate(currentDate: Date, recurType: string): Date {
  const next = new Date(currentDate);
  
  switch (recurType) {
    case 'daily': 
      next.setDate(next.getDate() + 1); 
      break;
    case 'every other day': 
      next.setDate(next.getDate() + 2); 
      break;
    case '2x week': 
      next.setDate(next.getDate() + 3); 
      break;
    case '3x week': 
      next.setDate(next.getDate() + 2); 
      break;
    case 'weekly': 
      next.setDate(next.getDate() + 7); 
      break;
    case '2x month': 
      next.setDate(next.getDate() + 15); 
      break;
    case 'monthly': 
      next.setMonth(next.getMonth() + 1); 
      break;
    case 'every 2 months': 
      next.setMonth(next.getMonth() + 2); 
      break;
    case 'quarterly': 
      next.setMonth(next.getMonth() + 3); 
      break;
    case 'every 6 months': 
      next.setMonth(next.getMonth() + 6); 
      break;
    case 'yearly': 
      next.setFullYear(next.getFullYear() + 1); 
      break;
  }
  
  return next;
}
```

### Frontend Considerations
- Update toast messages to differentiate recurring vs one-time completions
- Consider adding visual indicator (♻️ or 🔁) for recurring tasks in task cards
- Calendar view should show future occurrences (optional enhancement)

---

## Test Execution Checklist

- [ ] All 11 recurrence types reschedule correctly
- [ ] Gold and XP awarded on each completion
- [ ] Tasks remain active (not completed)
- [ ] Month/year boundaries handled properly
- [ ] Multiple sequential completions work
- [ ] UI shows updated due dates
- [ ] Recycling bin excludes recurring tasks
- [ ] Toast notifications accurate
- [ ] No database errors or crashes
- [ ] Works across all task importance levels

---

**Status:** Ready for Implementation Testing  
**Priority:** High (Core feature)  
**Dependencies:** Task completion logic, date utilities, gold/XP calculation

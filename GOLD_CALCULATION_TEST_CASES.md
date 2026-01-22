# Gold Calculation Formula - Test Cases

**Feature:** Modular Gold Value Calculation System  
**Last Updated:** November 2024  
**Total Test Cases:** 25  
**Formula:** `Gold = Base × TimeWeight × (1 + PriorityBonus)`

---

## Table of Contents
1. [Formula Components](#formula-components)
2. [Basic Calculation Tests (8)](#basic-calculation-tests)
3. [Edge Cases (6)](#edge-cases)
4. [UI Integration Tests (5)](#ui-integration-tests)
5. [Validation Tests (6)](#validation-tests)

---

## Formula Components

### Constants
- **GOLD_BASE:** 10 (configurable)
- **TIME_DIVISOR:** 20 (configurable)
- **PRIORITY_BONUSES:**
  - Low: 0% (1.00)
  - Med-Low: 3% (1.03)
  - Medium: 5% (1.05)
  - Med-High: 7% (1.07)
  - High: 10% (1.10)
  - Pareto: 15% (1.15)

### Calculation Steps
1. **Base Value:** 10 (starting point)
2. **Time Weight:** duration / 20 (scales with time investment)
3. **Priority Multiplier:** 1 + bonus percentage
4. **Final Gold:** Base × TimeWeight × PriorityMultiplier

---

## Basic Calculation Tests

### TC-GC-001: Minimum Values (Low Priority, Short Duration)
**Objective:** Verify minimum gold calculation  
**Input:**
- Duration: 10 minutes
- Importance: Low

**Calculation:**
```
TimeWeight = 10 / 20 = 0.5
PriorityMultiplier = 1 + 0% = 1.00
Gold = 10 × 0.5 × 1.00 = 5
```

**Expected Result:** 5 gold  
**Actual Result:** ___  
**Status:** ☐ Pass ☐ Fail

---

### TC-GC-002: Standard Task (Medium Priority, 30 Minutes)
**Objective:** Verify typical task calculation  
**Input:**
- Duration: 30 minutes
- Importance: Medium

**Calculation:**
```
TimeWeight = 30 / 20 = 1.5
PriorityMultiplier = 1 + 5% = 1.05
Gold = 10 × 1.5 × 1.05 = 15.75 → 16 (rounded)
```

**Expected Result:** 16 gold  
**Actual Result:** ___  
**Status:** ☐ Pass ☐ Fail

---

### TC-GC-003: High Priority Task (60 Minutes)
**Objective:** Verify high priority bonus applied  
**Input:**
- Duration: 60 minutes
- Importance: High

**Calculation:**
```
TimeWeight = 60 / 20 = 3.0
PriorityMultiplier = 1 + 10% = 1.10
Gold = 10 × 3.0 × 1.10 = 33
```

**Expected Result:** 33 gold  
**Actual Result:** ___  
**Status:** ☐ Pass ☐ Fail

---

### TC-GC-004: Pareto Task (Long Duration)
**Objective:** Verify maximum priority bonus  
**Input:**
- Duration: 120 minutes
- Importance: Pareto

**Calculation:**
```
TimeWeight = 120 / 20 = 6.0
PriorityMultiplier = 1 + 15% = 1.15
Gold = 10 × 6.0 × 1.15 = 69
```

**Expected Result:** 69 gold  
**Actual Result:** ___  
**Status:** ☐ Pass ☐ Fail

---

### TC-GC-005: Med-Low Priority (45 Minutes)
**Objective:** Verify Med-Low priority tier  
**Input:**
- Duration: 45 minutes
- Importance: Med-Low

**Calculation:**
```
TimeWeight = 45 / 20 = 2.25
PriorityMultiplier = 1 + 3% = 1.03
Gold = 10 × 2.25 × 1.03 = 23.175 → 23 (rounded)
```

**Expected Result:** 23 gold  
**Actual Result:** ___  
**Status:** ☐ Pass ☐ Fail

---

### TC-GC-006: Med-High Priority (90 Minutes)
**Objective:** Verify Med-High priority tier  
**Input:**
- Duration: 90 minutes
- Importance: Med-High

**Calculation:**
```
TimeWeight = 90 / 20 = 4.5
PriorityMultiplier = 1 + 7% = 1.07
Gold = 10 × 4.5 × 1.07 = 48.15 → 48 (rounded)
```

**Expected Result:** 48 gold  
**Actual Result:** ___  
**Status:** ☐ Pass ☐ Fail

---

### TC-GC-007: Quick High-Value Task
**Objective:** Verify short duration + high priority  
**Input:**
- Duration: 15 minutes
- Importance: Pareto

**Calculation:**
```
TimeWeight = 15 / 20 = 0.75
PriorityMultiplier = 1 + 15% = 1.15
Gold = 10 × 0.75 × 1.15 = 8.625 → 9 (rounded)
```

**Expected Result:** 9 gold  
**Actual Result:** ___  
**Status:** ☐ Pass ☐ Fail

---

### TC-GC-008: Long Low-Priority Task
**Objective:** Verify long duration + low priority  
**Input:**
- Duration: 180 minutes
- Importance: Low

**Calculation:**
```
TimeWeight = 180 / 20 = 9.0
PriorityMultiplier = 1 + 0% = 1.00
Gold = 10 × 9.0 × 1.00 = 90
```

**Expected Result:** 90 gold  
**Actual Result:** ___  
**Status:** ☐ Pass ☐ Fail

---

## Edge Cases

### TC-GC-009: Zero Minutes
**Objective:** Verify minimum duration handling  
**Input:**
- Duration: 0 minutes
- Importance: Medium

**Calculation:**
```
TimeWeight = 0 / 20 = 0
PriorityMultiplier = 1.05
Gold = 10 × 0 × 1.05 = 0
```

**Expected Result:** 0 gold (or 1 gold minimum)  
**Note:** System may enforce minimum gold value  
**Status:** ☐ Pass ☐ Fail

---

### TC-GC-010: Very Large Duration
**Objective:** Verify calculation with extreme values  
**Input:**
- Duration: 1000 minutes (16.67 hours)
- Importance: High

**Calculation:**
```
TimeWeight = 1000 / 20 = 50.0
PriorityMultiplier = 1.10
Gold = 10 × 50.0 × 1.10 = 550
```

**Expected Result:** 550 gold  
**Note:** No maximum cap enforced  
**Status:** ☐ Pass ☐ Fail

---

### TC-GC-011: Fractional Minutes (Non-Standard)
**Objective:** Verify system handles decimal durations  
**Input:**
- Duration: 7.5 minutes
- Importance: Medium

**Calculation:**
```
TimeWeight = 7.5 / 20 = 0.375
PriorityMultiplier = 1.05
Gold = 10 × 0.375 × 1.05 = 3.9375 → 4 (rounded)
```

**Expected Result:** 4 gold  
**Status:** ☐ Pass ☐ Fail

---

### TC-GC-012: Rounding Consistency
**Objective:** Verify rounding is consistent  
**Input:**
- Duration: 33 minutes
- Importance: Medium

**Calculation:**
```
TimeWeight = 33 / 20 = 1.65
PriorityMultiplier = 1.05
Gold = 10 × 1.65 × 1.05 = 17.325 → 17 (rounded down)
```

**Expected Result:** 17 gold  
**Note:** Should use Math.round() for consistency  
**Status:** ☐ Pass ☐ Fail

---

### TC-GC-013: Invalid Priority Value
**Objective:** Verify system handles missing/invalid importance  
**Input:**
- Duration: 30 minutes
- Importance: null or undefined

**Expected Result:**
- Defaults to "Medium" (5% bonus) OR
- Defaults to 0% bonus
- No system crash

**Status:** ☐ Pass ☐ Fail

---

### TC-GC-014: Negative Duration
**Objective:** Verify system rejects invalid input  
**Input:**
- Duration: -30 minutes
- Importance: Medium

**Expected Result:**
- Validation error OR
- Treated as 0 minutes
- No negative gold values

**Status:** ☐ Pass ☐ Fail

---

## UI Integration Tests

### TC-GC-015: Auto-Calculate in AddTaskModal
**Objective:** Verify gold auto-calculates in UI  
**Steps:**
1. Open AddTaskModal
2. Set duration: 60 minutes
3. Set importance: High
4. Observe gold value field

**Expected Result:**
- Gold field displays: 33
- Field is read-only
- Shows "(Auto-calculated)" label
- Updates immediately when duration/importance changes

**Status:** ☐ Pass ☐ Fail

---

### TC-GC-016: Gold Updates on Duration Change
**Objective:** Verify real-time gold updates  
**Steps:**
1. Open AddTaskModal
2. Set duration: 30 min, importance: Medium (16 gold)
3. Change duration to 60 minutes
4. Observe gold value

**Expected Result:**
- Gold changes from 16 → 33 (if High) or 32 (if Medium)
- Update is instant (< 100ms)
- No lag or flicker

**Status:** ☐ Pass ☐ Fail

---

### TC-GC-017: Gold Updates on Importance Change
**Objective:** Verify real-time gold updates on priority  
**Steps:**
1. Open AddTaskModal
2. Set duration: 60 min, importance: Low (30 gold)
3. Change importance to Pareto
4. Observe gold value

**Expected Result:**
- Gold changes from 30 → 69
- Update is instant
- Calculation correct

**Status:** ☐ Pass ☐ Fail

---

### TC-GC-018: Gold Displayed in Task Card
**Objective:** Verify gold shown after task creation  
**Steps:**
1. Create task: 30 min, Medium importance
2. View task in task list
3. Check gold value displayed

**Expected Result:**
- Task card shows: "16 🪙"
- Gold icon/emoji visible
- Value matches calculation

**Status:** ☐ Pass ☐ Fail

---

### TC-GC-019: Gold Consistency (Client vs Server)
**Objective:** Verify client and server calculate identically  
**Steps:**
1. Create task in UI (note gold value shown)
2. Submit task to server
3. Fetch task from database
4. Compare gold values

**Expected Result:**
- Client preview matches server-saved value
- No discrepancies
- Both use same formula/constants

**Status:** ☐ Pass ☐ Fail

---

## Validation Tests

### TC-GC-020: Gold Award on Task Completion
**Objective:** Verify correct gold awarded when task completed  
**Steps:**
1. Create task: 60 min, High (33 gold)
2. Complete task
3. Check user's total gold balance

**Expected Result:**
- User balance increases by exactly 33 gold
- Gold matches task's calculated value
- Transaction logged correctly

**Status:** ☐ Pass ☐ Fail

---

### TC-GC-021: Bulk Task Gold Calculation
**Objective:** Verify formula consistency across multiple tasks  
**Steps:**
1. Create 10 tasks with varying duration/importance
2. Note expected gold for each
3. Create all tasks
4. Verify each task's gold value

**Expected Result:**
- All 10 tasks have correct gold values
- No calculation errors
- Formula applied consistently

**Status:** ☐ Pass ☐ Fail

---

### TC-GC-022: Gold Value Immutability
**Objective:** Verify gold doesn't change after task creation  
**Steps:**
1. Create task: 30 min, Medium (16 gold)
2. Save task
3. Edit task duration to 60 min
4. Check gold value

**Expected Result:**
- Gold remains 16 (original value)
- OR gold recalculates to 33 (if designed to update)
- Behavior is consistent and documented

**Status:** ☐ Pass ☐ Fail

---

### TC-GC-023: Formula Explanation Accuracy
**Objective:** Verify explainGoldCalculation() output  
**Steps:**
1. Call explainGoldCalculation(60, "High")
2. Review explanation text

**Expected Result:**
```
Base: 10
Time Weight: 60 ÷ 20 = 3.00
Priority Bonus: High (+10%)
Formula: 10 × 3.00 × 1.10 = 33 gold
```

**Status:** ☐ Pass ☐ Fail

---

### TC-GC-024: Configuration Parameter Changes
**Objective:** Verify formula adjusts when constants change  
**Steps:**
1. Change GOLD_BASE from 10 → 15
2. Create task: 30 min, Medium
3. Check gold value

**Expected Result:**
- Old formula: 10 × 1.5 × 1.05 = 16
- New formula: 15 × 1.5 × 1.05 = 24 (rounded)
- System uses new constant

**Status:** ☐ Pass ☐ Fail

---

### TC-GC-025: Priority Tier Boundaries
**Objective:** Verify all 6 priority tiers work correctly  
**Steps:**
1. Create 6 tasks with same duration (40 min) but different priorities:
   - Low: 10 × 2 × 1.00 = 20
   - Med-Low: 10 × 2 × 1.03 = 21 (rounded)
   - Medium: 10 × 2 × 1.05 = 21
   - Med-High: 10 × 2 × 1.07 = 21
   - High: 10 × 2 × 1.10 = 22
   - Pareto: 10 × 2 × 1.15 = 23

**Expected Results:**
- Low: 20 gold
- Med-Low: 21 gold
- Medium: 21 gold
- Med-High: 21 gold
- High: 22 gold
- Pareto: 23 gold

**Note:** Small differences due to bonuses on 40-min base  
**Status:** ☐ Pass ☐ Fail

---

## Test Execution Summary

### Passing Criteria
- **Basic Calculations:** 8/8 passing (100%)
- **Edge Cases:** 6/6 passing (100%)
- **UI Integration:** 5/5 passing (100%)
- **Validation:** 6/6 passing (100%)

### Priority Levels
- **P0 (Critical):** TC-GC-001 to TC-GC-008, TC-GC-015, TC-GC-019, TC-GC-020
- **P1 (High):** TC-GC-016, TC-GC-017, TC-GC-021, TC-GC-025
- **P2 (Medium):** TC-GC-009, TC-GC-012, TC-GC-018, TC-GC-023
- **P3 (Low):** TC-GC-010, TC-GC-011, TC-GC-014, TC-GC-022

### Formula Reference Examples

| Duration | Priority | Time Weight | Multiplier | Gold |
|----------|----------|-------------|------------|------|
| 10 min   | Low      | 0.5         | 1.00       | 5    |
| 20 min   | Med-Low  | 1.0         | 1.03       | 10   |
| 30 min   | Medium   | 1.5         | 1.05       | 16   |
| 60 min   | Med-High | 3.0         | 1.07       | 32   |
| 60 min   | High     | 3.0         | 1.10       | 33   |
| 120 min  | Pareto   | 6.0         | 1.15       | 69   |
| 180 min  | High     | 9.0         | 1.10       | 99   |

---

## Test Environment
- **Frontend:** React with real-time calculation
- **Backend:** Node.js with goldCalculation.ts module
- **Formula Location:**
  - Server: `/server/goldCalculation.ts`
  - Client: `/client/src/lib/goldCalculation.ts`
- **Database:** PostgreSQL stores calculated gold value

---

## Notes
- Gold is auto-calculated, not user-editable
- Formula is modular - easy to adjust constants
- Both client and server use identical formula
- Rounding uses Math.round() for consistency
- Formula designed for balance and fairness
- Higher priority = small bonus (3-15%)
- Time investment = primary factor

---

**End of Test Cases**

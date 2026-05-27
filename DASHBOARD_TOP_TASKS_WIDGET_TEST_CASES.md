# Dashboard "Top Priority Tasks" Widget — Test Cases

## TZ-1: Date Display — No Timezone Shift

**Setup:** Task has `dueDate = "2026-05-29T00:00:00.000Z"`. Browser timezone = US Pacific (UTC-7).

**Expected:** Widget displays **5/29/2026** (or local equivalent).

**Must NOT display:** 5/28/2026.

**Root cause if failing:** `new Date(dueDate)` converts to local time before `toLocaleDateString()` is called. Fix: extract UTC year/month/day and construct local midnight Date — `new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())`.

---

## TZ-2: Date Display — UTC+N Timezone

**Setup:** Task has `dueDate = "2026-05-29T00:00:00.000Z"`. Browser timezone = UTC+9 (Japan).

**Expected:** Widget displays **5/29/2026**.

**Must NOT display:** 5/30/2026 (UTC+9 would shift forward without the UTC-extraction fix).

---

## TZ-3: Tier Assignment Uses Correct Day Count

**Setup:** Today (local) = May 27. Task `dueDate = "2026-05-29T00:00:00.000Z"` (May 29 UTC). Timezone = UTC-7.

**Expected:** `getDaysUntilDue()` returns **2** (days from May 27 to May 29).

**Must NOT return:** 1 (which would happen if the date is shifted to May 28 before diffing).

**Impact:** With the wrong value of 1, the task gets placed in Tier 2 correctly but if the date were May 28 UTC in a UTC-7 zone it would be treated as Tier 1 (overdue) incorrectly.

---

## RANK-1: Tier Priority — High Overdue Beats High Future

**Setup:**
- Task A: `dueDate` = 3 days from now, importance = High → Tier 2
- Task B: `dueDate` = today, importance = High → Tier 1

**Expected:** Task B appears before Task A in the widget.

---

## RANK-2: Tier Priority — Closer Date Beats Same Tier

**Setup:**
- Task A: `dueDate` = 3 days from now, importance = High → Tier 2
- Task B: `dueDate` = 1 day from now, importance = High → Tier 2

**Expected:** Task B appears before Task A (closer due date wins within a tier).

---

## RANK-3: Importance Tiebreak Within Tier

**Setup:**
- Task A: `dueDate` = 2 days from now, importance = High → Tier 2
- Task B: `dueDate` = 2 days from now, importance = Med-High → Tier 3

**Expected:** Task A (Tier 2) appears before Task B (Tier 3).

---

## RANK-4: Widget Shows At Most 4 Tasks

**Setup:** 10 incomplete High-priority tasks all due today.

**Expected:** Exactly 4 tasks rendered in the widget.

---

## RANK-5: Completed Tasks Excluded

**Setup:** Task has `completed = true`, `dueDate` = today, importance = High.

**Expected:** Task does NOT appear in widget.

---

## RANK-6: Tasks Without Due Date Fall to Tier 6

**Setup:**
- Task A: no `dueDate`, importance = High → Tier 6
- Task B: `dueDate` = 5 days from now, importance = Med-High → Tier 5

**Expected:** Task B appears before Task A.

---

## UI-1: Date Display Format Consistency

**Setup:** Any task with a valid `dueDate`.

**Expected:** Date shown in widget matches the date displayed on the task card in the Quests page (both use UTC calendar extraction).

---

## UI-2: No Date When dueDate Is Null

**Setup:** Task with `dueDate = null`.

**Expected:** Calendar icon + date string is NOT rendered for that task row.

---

## TITLE-1: Widget Title Accuracy

**Expected:** Widget heading reads **"Top Priority Tasks"** (not "Today's Top Priorities"), since it surfaces tasks due within the next 7 days, not only today.

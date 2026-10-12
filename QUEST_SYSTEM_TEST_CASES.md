# Quest System Test Cases — Types, Start/Due Dates, Smart Focus, Reminders

**Feature:** Quest types (Reminder / Deadline / General to-do), start dates, Smart Focus, Reminders strip, CSV and recurring behaviour  
**Documentation:** [QUEST_SYSTEM_README.md](QUEST_SYSTEM_README.md)  
**Last Updated:** October 2026  
**Total Test Cases:** 69

Automated coverage runs with `npm run test:unit`. Cases marked **[auto]** have unit tests; the rest are manual or API checks. Dates below assume today is **Mon 12 Oct 2026** (adjust as needed).

---

## Table of Contents
1. [Quest Types and Creation (9)](#a-quest-types-and-creation)
2. [Editing in the Detail View (9)](#b-editing-in-the-detail-view)
3. [API Validation (9)](#c-api-validation)
4. [Smart Focus (15)](#d-smart-focus)
5. [Reminders Strip (7)](#e-reminders-strip)
6. [Other Filters and Surfaces (8)](#f-other-filters-and-surfaces)
7. [Recurring Quests (2)](#g-recurring-quests)
8. [CSV and Export (7)](#h-csv-and-export)
9. [Data and Compatibility (3)](#i-data-and-compatibility)
10. [Automated Coverage Map](#automated-coverage-map)

---

## A. Quest Types and Creation

### TC-QS-001: Type chooser appears first
**Steps:** Quests page > Add Quest.  
**Expected:** Dialog shows "What kind of quest is this?" with three buttons in order: Reminder, Deadline, General to-do. No form fields are visible yet. **[auto]**

### TC-QS-002: Choosing a type opens the form
**Steps:** Click Deadline.  
**Expected:** Form appears with a "Deadline" badge and a **Change type** link; Change type returns to the chooser.

### TC-QS-003: Deadline requires a due date on create
**Steps:** Choose Deadline, enter a title, leave Due Date empty, submit.  
**Expected:** Due Date shows a red asterisk and "Pick a date (required)". Submit is rejected with a "Due Date Required" toast; no quest is created. **[auto: rules]**

### TC-QS-004: Reminder can be created with no dates
**Steps:** Choose Reminder, enter a title, leave both dates empty, submit.  
**Expected:** Quest is created. Due Date shows "Optional" and has no asterisk.

### TC-QS-005: General to-do can be created with no dates
**Steps:** Choose General to-do, title only, submit.  
**Expected:** Quest is created with no due date and no start date.

### TC-QS-006: Start date shortcuts
**Steps:** In the form click **Today**, **Tomorrow**, **Next week** in turn.  
**Expected:** Start Date shows today, tomorrow, and today + 7 days. Helper text reads "Start working on this from here. Leave blank to make it available now."

### TC-QS-007: Start after due is rejected on create
**Steps:** Start Date 20 Oct, Due Date 15 Oct, submit.  
**Expected:** "Check Your Dates" toast: "The start date can't be after the due date." Nothing is created. **[auto]**

### TC-QS-008: Optional dates can be cleared in the form
**Steps:** Set a Start Date and a Due Date on a General to-do, click **Clear** beside each.  
**Expected:** Both return to "Optional". For a Deadline the Due Date has no Clear button.

### TC-QS-009: Quests with no stored type are general
**Steps:** Open an older quest (created before types) or one imported without a type.  
**Expected:** Detail view highlights **General to-do**; cards show the general icon. **[auto]**

---

## B. Editing in the Detail View

### TC-QS-010: Three-button row shows the current type
**Steps:** Open any quest.  
**Expected:** Quest Type is one row of three buttons; exactly the current type is highlighted. **[auto]**

### TC-QS-011: Switch General to Reminder
**Steps:** Click Reminder.  
**Expected:** Saves immediately, toast "Quest Type Updated", button highlight moves. Clicking the highlighted button again does nothing. **[auto]**

### TC-QS-012: Switch to Deadline without a due date is blocked
**Steps:** On a quest with no due date click Deadline.  
**Expected:** "Set a due date first" toast; type does not change; no request is sent.

### TC-QS-013: Switch to Deadline with a due date works
**Steps:** Set a due date, then click Deadline.  
**Expected:** Type changes; Due Date card now shows a red asterisk.

### TC-QS-014: Clear due date on a non-deadline
**Steps:** On a General to-do with a due date open the Due Date editor, click **Clear due date**.  
**Expected:** Due Date reads "No due date"; toast "Due Date Cleared".

### TC-QS-015: A deadline's due date can't be cleared
**Steps:** On a Deadline open the Due Date editor.  
**Expected:** No "Clear due date" option appears. (Server also rejects it: see TC-QS-025.)

### TC-QS-016: Edit and clear the start date
**Steps:** Use the Start Date pencil to pick a date, then **Clear start date**.  
**Expected:** Card shows the date, then "Available now".

### TC-QS-017: Server messages are shown
**Steps:** On a quest due 15 Oct, set Start Date to 20 Oct.  
**Expected:** Error toast: "The start date can't be after the due date." The date is unchanged.

### TC-QS-018: Moving only the due date before the start pulls the start back
**Steps:** Quest with start 14 Oct and due 20 Oct. Change Due Date to 12 Oct.  
**Expected:** Update succeeds; Start Date becomes 12 Oct. **[auto]**

---

## C. API Validation

Use a logged-in session cookie. Replace `ID` with a quest id.

### TC-QS-019: Deadline without a due date is rejected
```bash
curl -X POST http://localhost:5001/api/tasks -H "Content-Type: application/json" -H "Cookie: connect.sid=SESSION" \
  -d '{"title":"No date","duration":30,"goldValue":10,"questType":"deadline"}'
```
**Expected:** `400` with `{"error":"A deadline quest needs a due date.","code":"INVALID_QUEST_DATES"}`. **[auto]**

### TC-QS-020: Reminder with no dates is accepted
Same request with `"questType":"reminder"`.  
**Expected:** `200`, task returned with `questType: "reminder"`, `dueDate: null`, `startDate: null`. **[auto]**

### TC-QS-021: Start after due is rejected
Body with `"startDate":"2026-10-20T00:00:00.000Z","dueDate":"2026-10-15T00:00:00.000Z"`.  
**Expected:** `400`, error "The start date can't be after the due date.", code `INVALID_QUEST_DATES`. **[auto]**

### TC-QS-022: Invalid type is rejected
Body with `"questType":"urgent"`.  
**Expected:** `400 Invalid task data`. **[auto]**

### TC-QS-023: Unrelated edits to an old quest are never blocked
`PATCH /api/tasks/ID` with `{"importance":"High"}` on a quest that is a Deadline with no due date (legacy data).  
**Expected:** `200`. **[auto]**

### TC-QS-024: Switching to Deadline without a due date is rejected
`PATCH` `{"questType":"deadline"}` on a quest with no due date.  
**Expected:** `400`, "A deadline quest needs a due date." **[auto]**

### TC-QS-025: Clearing a deadline's due date is rejected
`PATCH` `{"dueDate":null}` on a Deadline.  
**Expected:** `400`, "A deadline quest needs a due date." **[auto]**

### TC-QS-026: Due date moved before the start adjusts the start
`PATCH` `{"dueDate":"2026-10-12T00:00:00.000Z"}` on a quest with start 14 Oct.  
**Expected:** `200`; returned `startDate` equals the new due date. **[auto]**

### TC-QS-027: Start date can be cleared
`PATCH` `{"startDate":null}`.  
**Expected:** `200`; `startDate: null`. **[auto]**

---

## D. Smart Focus

Seed quests (all open, type General unless stated) for these cases:

| Name | Due | Start | Importance |
|------|-----|-------|------------|
| A overdue | 10 Oct | | Low |
| B due today | 12 Oct | | Medium |
| C starts today | 30 Oct | 12 Oct | Low |
| D high, due tomorrow | 13 Oct | | High |
| E medium, due tomorrow | 13 Oct | | Medium |
| F high, due in 8 days | 20 Oct | | Pareto |
| G undated | | | High |
| H starts in 2 days | 30 Oct | 14 Oct | Pareto |
| I reminder, due today | 12 Oct | | High (type Reminder) |

### TC-QS-028: Smart Focus is the default
**Steps:** Clear `tasksFilter-v2` from localStorage, reload Quests.  
**Expected:** The **Smart Focus** chip is selected.

### TC-QS-029: Overdue and due today are Urgent
**Expected:** A and B appear under **Urgent**, A first (nearest/oldest due date). **[auto]**

### TC-QS-030: Start reached is Starting today
**Expected:** C appears under **Starting today**. **[auto]**

### TC-QS-031: High priority due within a week is Coming up
**Expected:** D appears under **Coming up**. **[auto]**

### TC-QS-032: Medium priority due tomorrow is excluded
**Expected:** E is not in Smart Focus but is in **All**. **[auto]**

### TC-QS-033: Due beyond 7 days is excluded
**Expected:** F (due in 8 days) is not in Smart Focus, even at Pareto. **[auto]**

### TC-QS-034: Undated quests are excluded
**Expected:** G is not in Smart Focus. **[auto]**

### TC-QS-035: Future start is excluded
**Expected:** H is not in Smart Focus, even at Pareto; it is in **Upcoming**. **[auto]**

### TC-QS-036: Reminders are excluded
**Expected:** I is not in any Smart Focus group (it is in the Reminders strip). **[auto]**

### TC-QS-037: Cap of 10 with a footer
**Steps:** Create 15 quests due today.  
**Expected:** Exactly 10 are shown; footer reads "Showing the top 10 of 15. The rest are in the Today filter." Chip count is 10. **[auto: cap]**

### TC-QS-038: The cap trims the least pressing first
**Steps:** 8 due today, 4 starting today, 4 high-priority due tomorrow.  
**Expected:** 8 Urgent + 2 Starting today shown; no Coming up. **[auto]**

### TC-QS-039: All clear empty state
**Steps:** Complete or change dates so nothing qualifies.  
**Expected:** "All clear for today" with the Upcoming/All hint; Smart Focus does not fall back to listing other quests. **[auto: empty result]**

### TC-QS-040: Chip count equals what is shown
**Expected:** The Smart Focus chip number equals the number of quest cards under it (never more than 10).

### TC-QS-041: Search applies inside Smart Focus
**Steps:** Type part of B's title.  
**Expected:** Only matching quests that qualify appear; "No quests match that search" if none.

### TC-QS-042: Order within groups
**Expected:** Urgent: nearest due first, ties by importance. Starting today: earliest start first, ties by importance. Coming up: nearest due first. **[auto]**

---

## E. Reminders Strip

### TC-QS-043: Strip appears only in Smart Focus
**Steps:** With open reminders, view Smart Focus, then switch to All.  
**Expected:** The "Reminders" bar sits above the list in Smart Focus and is absent in All (reminders are listed as normal quests there).

### TC-QS-044: One click collapses and expands
**Steps:** Click the Reminders bar twice; reload.  
**Expected:** First click hides the titles (chevron turns right); second click shows them. The last state survives a reload (`remindersOpen`).

### TC-QS-045: Hidden when there are no reminders
**Expected:** With no open reminders, no strip is rendered.

### TC-QS-046: Clicking a reminder opens its detail view
**Expected:** The quest detail dialog opens for that reminder.

### TC-QS-047: Strip order
**Steps:** Reminders: Low; High with no date; High due 14 Oct; Pareto.  
**Expected:** Pareto, High due 14 Oct, High no date, Low. **[auto]**

### TC-QS-048: Completed reminders are not shown
**Expected:** Completing a reminder removes it from the strip and the count.

### TC-QS-049: Search filters the strip
**Expected:** Typing a term shows only reminders whose title or description matches; the strip hides if none match.

---

## F. Other Filters and Surfaces

### TC-QS-050: Today chip
**Expected:** Shows overdue, due today, and quests whose start date has arrived (C appears; H does not). **[auto]**

### TC-QS-051: <3 Days chip is unchanged
**Expected:** Lists overdue and due within 3 days by due date only; start dates are ignored.

### TC-QS-052: Upcoming chip
**Expected:** Lists only quests with a start date still ahead, soonest first (H). Count matches. **[auto]**

### TC-QS-053: All shows everything open
**Expected:** Includes reminders, undated, medium/low, and future-start quests.

### TC-QS-054: Type menu sorting
**Steps:** Type > Deadline.  
**Expected:** Only deadlines, soonest due first, ties by importance. **[auto]**

### TC-QS-055: Quest card icon and Starts label
**Expected:** Each card shows its type icon. A quest starting 14 Oct shows "Starts Oct 14"; once the start date has arrived the label is gone. **[auto: icons]**

### TC-QS-056: Dashboard top tasks skip not-started quests
**Expected:** A quest starting in 5 days with a due date 20 days out is not eligible for the top tasks; a quest starting in 5 days but due in 2 days still is. **[auto: rule]**

### TC-QS-057: Today's momentum includes start-reached quests
**Expected:** A quest whose start date is today raises "today's total" in the momentum figure. **[auto: rule]**

---

## G. Recurring Quests

### TC-QS-058: Start date moves with the due date
**Steps:** Weekly recurring quest, start 5 Oct, due 12 Oct. Complete it.  
**Expected:** Due becomes 19 Oct and start becomes 12 Oct (lead time kept); never after the new due date. **[auto]**

### TC-QS-059: Recurring quest with no start date
**Expected:** After completion it still has no start date. **[auto]**

---

## H. CSV and Export

### TC-QS-060: Export has the new columns
**Steps:** Quests > File menu > Export as CSV.  
**Expected:** Header contains **Quest Type** right after *Business/Work Filter* and **Start Date** right before *Due Date*. Types are written as labels. **[auto]**

### TC-QS-061: Export includes completed quests
**Steps:** Export, count rows.  
**Expected:** Open and completed quests are present (Completed = Yes for finished ones); deleted quests are absent. **[auto: CSV rows]**

### TC-QS-062: Export All zip contains the quests file
**Steps:** Settings > Export All as CSV.  
**Expected:** `Tasks/tasks.csv` with open + completed quests; if a section fails the toast says so instead of reporting success.

### TC-QS-063: Importing an older CSV
**Steps:** Import a CSV without Quest Type or Start Date columns.  
**Expected:** All rows import as General to-do with no start date. **[auto]**

### TC-QS-064: Deadline row with no due date
**Steps:** Import a row with Quest Type "Deadline" and an empty Due Date.  
**Expected:** Imports as a General to-do. With a due date it stays a Deadline. **[auto]**

### TC-QS-065: Completed rows are skipped on import
**Steps:** Import a full export.  
**Expected:** Rows with Completed = Yes are not imported; the toast reports how many were skipped. **[auto]**

### TC-QS-066: Start after due on import
**Expected:** Start Date is dropped (row still imports); same-day is kept. **[auto]**

---

## I. Data and Compatibility

### TC-QS-067: Migration is additive and repeatable
**Steps:** Start the server twice.  
**Expected:** `quest_type` and `start_date` exist; no errors on the second start (`IF NOT EXISTS`); existing rows have `quest_type = 'general'` and `start_date` NULL.

### TC-QS-068: Notion sync ignores start dates
**Expected:** Importing from / exporting to Notion neither reads nor writes start dates and does not error.

### TC-QS-069: Existing quests are unchanged by the upgrade
**Steps:** Compare the **All** count before and after deploy.  
**Expected:** Identical. Existing quests with no start date behave as before in Today and <3 Days.

---

## Automated Coverage Map

| Area | Test file |
|------|-----------|
| Types, labels, parsing | `shared/quest-type.test.ts` |
| Smart Focus qualification, groups, order, cap, empty, reminders; Today list; Upcoming; date validation and edit rules | `shared/quest-schedule.test.ts` |
| CSV columns, import/export, completed rows, schema | `server/tasks-csv.test.ts` |
| Recurring due and start dates | `server/recurrence.test.ts` |
| Type chooser, icon, 3-button selector | `client/src/components/quest-type-chooser.test.tsx` |
| Docs match the code | `shared/quest-docs.test.ts` |

Run everything: `npm run test:unit`

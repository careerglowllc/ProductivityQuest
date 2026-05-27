# Dashboard "Top Priority Tasks" Widget — README

## Overview

The **Top Priority Tasks** widget on the Dashboard surfaces the 4 highest-priority incomplete tasks, ranked by urgency tier and importance score. It is **not** limited to tasks due only on today's date — it includes tasks due within the next 7 days so users always see actionable work even if nothing is due exactly today.

---

## Ranking Algorithm

Tasks are bucketed into 6 tiers (highest wins):

| Tier | Due date window | Importance required |
|------|----------------|---------------------|
| 1 | Today or overdue (≤ 0 days) | High |
| 2 | 1–3 days | High |
| 3 | 1–3 days | Med-High |
| 4 | 4–7 days | High |
| 5 | 4–7 days | Med-High |
| 6 | Everything else | Any |

Within each tier, tasks are sorted by **closest due date first**, then by **importance score** (descending).

The final result is the **top 4** tasks from the merged tier list.

---

## Timezone Handling (Critical)

Due dates are stored in the database as **midnight UTC ISO strings**, e.g. `2026-05-29T00:00:00.000Z`.

**Problem:** `new Date("2026-05-29T00:00:00.000Z")` in a UTC-7 timezone (US Pacific) returns a local `Date` of **May 28 at 5:00 PM**, so `setHours(0,0,0,0)` normalises it to **May 28 local midnight** — one day early.

**Solution (implemented):** Extract the UTC calendar date (year/month/day) and construct a local `Date` at midnight using those components:

```ts
const d = new Date(task.dueDate);
const dueLocal = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
```

This ensures a task stored as `2026-05-29T00:00:00.000Z` always shows **May 29** regardless of the browser's local timezone.

The same pattern is applied everywhere `dueDate` is displayed in the widget.

---

## Component Locations

| File | What to look for |
|------|-----------------|
| `client/src/pages/dashboard.tsx` | `getTopTasks()` function (~line 662) |
| `client/src/pages/dashboard.tsx` | Widget render — key `"tasks"` in the drag-card renderer |
| `client/src/pages/dashboard.tsx` | Mobile widget render (~line 1244) |

---

## DASHBOARD_TOP_TASKS_WIDGET_TEST_CASES.md

See the companion file for full test cases.

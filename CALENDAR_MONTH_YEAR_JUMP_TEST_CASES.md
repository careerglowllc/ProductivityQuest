# Calendar Month/Year Jump — Test Cases

> **Component:** `client/src/components/ui/calendar.tsx` (shared `Calendar`/`CalendarPicker`)
> **Used by:** Task reschedule popover (`client/src/pages/home.tsx`), Add Task due date picker (`client/src/components/add-task-modal.tsx`), and any other page using the shared `Calendar` component.
> **Last updated:** August 2026

## Feature Summary
Clicking (or double-clicking) the "Month Year" caption label at the top of any calendar
popup swaps it for a native `<input type="month">` field, letting the user type/select a
target month and year directly (e.g. jump to "2029-08") instead of clicking the prev/next
arrows dozens of times. Pressing **Enter** or blurring the field commits the jump and
navigates the calendar's displayed month; pressing **Escape** cancels and restores the label
without moving the calendar.

---

## 1. Opening the Month/Year Input

### TC-1.1: Single Click Opens Editor
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open the Reschedule calendar popover (select 1+ tasks → "Reschedule") | Caption shows current month/year, e.g. "August 2026", as a clickable label |
| 2 | Click once on the "August 2026" label | Label is replaced by a `<input type="month">` pre-filled with `2026-08`, focused automatically |

### TC-1.2: Double Click Also Opens Editor
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Double-click the month/year label | Same result as a single click — input appears, focused, pre-filled with the current displayed month |

### TC-1.3: Prev/Next Arrows Still Work When Not Editing
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Click the left (◀) or right (▶) nav arrows without entering edit mode | Calendar still steps one month back/forward as before; caption label updates to match |

---

## 2. Committing a Jump

### TC-2.1: Enter Key Commits and Navigates
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open the month/year input, change value to `2029-11` | Input shows `2029-11` |
| 2 | Press **Enter** | Calendar jumps to and displays November 2029; input reverts to the "November 2029" label |

### TC-2.2: Blur Commits and Navigates
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open the month/year input, change value to `2027-01` | Input shows `2027-01` |
| 2 | Click anywhere outside the input (blur) | Calendar jumps to January 2027; label reflects the new month |

### TC-2.3: Escape Cancels Without Navigating
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open the month/year input on "August 2026", change value to `2030-05` | Input shows `2030-05` |
| 2 | Press **Escape** | Editor closes without navigating; calendar still shows August 2026 |

### TC-2.4: Far-Future / Far-Past Jump
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Enter `2029-08` (3 years out) and commit | Calendar jumps directly to August 2029 in one step, no arrow-clicking needed |
| 2 | Enter `2020-01` (past date) and commit | Calendar jumps to January 2020 (no restriction on navigating to past months) |

### TC-2.5: Selecting a Day After Jumping
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Jump to a future month via the input, then click a day in the grid | `onSelect`/reschedule handler fires with the selected date in the jumped-to month, same as normal day selection |

---

## 3. Edge Cases

### TC-3.1: Invalid/Incomplete Input Value
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open the input, clear it entirely (empty string), blur or press Enter | No navigation occurs (input doesn't match `YYYY-MM`); calendar stays on the previously displayed month |
| 2 | Type a malformed value the browser's month input rejects | Native `<input type="month">` prevents an invalid value from being committed to `value` |

### TC-3.2: Works in Both Desktop Popover and Mobile Overlay
| # | Step | Expected Result |
|---|------|----------------|
| 1 | On desktop, open Reschedule popover, use month/year jump | Works as described above |
| 2 | On mobile (narrow viewport), open the Reschedule full-screen overlay, use month/year jump | Same behavior — input opens, commits, and navigates identically |

### TC-3.3: Works Across All Calendar Consumers
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open the due date picker in "Add Task" modal | Month/year jump works the same as in the reschedule popover, since both use the shared `Calendar` component |

### TC-3.4: No Interference With Existing Styling/Theme
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Toggle dark/light theme while the label is showing | Label and input both render with theme-appropriate colors (yellow tones in dark mode, gray/purple in light mode) |
| 2 | Editor is left open and the popover is closed/reopened | Reopening always starts back in label (non-editing) mode |

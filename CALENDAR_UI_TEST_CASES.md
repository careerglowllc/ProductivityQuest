# Calendar UI — Comprehensive Test Cases

> **Component:** `client/src/pages/calendar.tsx`
> **Last updated:** March 4, 2026

---

## 1. Page Load & Initialization

### TC-1.1: Default View Selection
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open calendar on **desktop** (first visit, no localStorage) | Week view (7 columns) is selected |
| 2 | Open calendar on **mobile** (first visit, no localStorage) | 3-Day view (3 columns) is selected |
| 3 | Switch to Day view, navigate away, return to calendar | Day view is restored (localStorage persistence) |
| 4 | Clear localStorage `calendarView` key, reload | Falls back to platform default |

### TC-1.2: Auto-Scroll to Current Time
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open calendar in Day/3-Day/Week view | Page smoothly scrolls so the current time red line is visible near top of viewport |
| 2 | Open calendar in Month view | No auto-scroll occurs |
| 3 | Switch from Month to Day view | Auto-scroll triggers after view change |
| 4 | Navigate to a different date, then back to today | Auto-scroll triggers each time the view+date key changes |
| 5 | Open calendar while data is still loading (slow network) | Scroll waits for loading to complete + 150ms delay, then scrolls to current time |
| 6 | Stay on same view+date, trigger data refetch | No re-scroll (deduped by `lastScrollKeyRef`) |

### TC-1.3: Loading State
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open calendar with slow network | Purple spinning loader appears in center |
| 2 | Data finishes loading | Loader disappears, time grid or month grid renders |

---

## 2. Navigation

### TC-2.1: Arrow Navigation
| # | Step | Expected Result |
|---|------|----------------|
| 1 | In Day view, tap right arrow | Advances by 1 day |
| 2 | In Day view, tap left arrow | Goes back by 1 day |
| 3 | In 3-Day view, tap right arrow | Advances by 3 days |
| 4 | In Week view, tap right arrow | Advances by 7 days |
| 5 | In Month view, tap right arrow | Advances by 1 month |
| 6 | In Month view, tap left arrow | Goes back by 1 month |

### TC-2.2: Today Button
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Navigate away from today | "Today" button appears |
| 2 | Tap "Today" button | Returns to current date; button disappears |
| 3 | View today's date | "Today" button is hidden |
| 4 | In Month view, viewing current month | "Today" button is hidden |

### TC-2.3: Swipe Navigation (Mobile)
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Swipe left (>60px horizontal, more horizontal than vertical) | Navigates forward |
| 2 | Swipe right (>60px) | Navigates backward |
| 3 | Swipe vertically | Scrolls the time grid, does NOT navigate |
| 4 | Short swipe (<60px) | Nothing happens |
| 5 | Swipe while dragging an event | Swipe is suppressed (no navigation during drag) |

### TC-2.4: Title Display
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Day view | Shows "Mon, Mar 3" format |
| 2 | 3-Day view (same month) | Shows "Mar 3–5, 2026" format |
| 3 | 3-Day view (cross-month) | Shows "Mar 30 – Apr 1" format |
| 4 | Week view | Shows date range format |
| 5 | Month view | Shows "March 2026" format |

---

## 3. View Modes

### TC-3.1: Day View
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Select Day view | Single column fills the width |
| 2 | Verify hour labels | Full labels on desktop ("9 AM"), compact on mobile ("9a") |
| 3 | Verify all 24 hours rendered | Grid shows 12 AM through 11 PM with hour lines |
| 4 | Verify current time indicator | Red dot + red line on today's column only |

### TC-3.2: 3-Day View
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Select 3-Day view | Three columns of equal width |
| 2 | Verify day headers | Short names on desktop ("Mon"), narrow on mobile with >3 cols ("M") |
| 3 | Verify today's header | Has purple bottom border highlight |
| 4 | Verify events from all 3 days are shown | Each column shows its own events |

### TC-3.3: Week View
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Select Week view | Seven columns, starting from Sunday |
| 2 | Columns are narrow but readable | Hour labels use compact format on mobile |
| 3 | Day headers show all 7 days | Today highlighted with purple |

### TC-3.4: Month View
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Select Month view | Grid shows 7-column calendar for the month |
| 2 | Event dots appear on days with events | Each day cell shows colored dots |
| 3 | Tap a day | Switches to Day view for that date |
| 4 | Current day is highlighted | Today has distinct visual styling |

### TC-3.5: View Persistence
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Switch to each view (day, 3day, week, month) | localStorage `calendarView` updated immediately |
| 2 | Navigate away from calendar, return | Previously selected view is restored |
| 3 | Hard refresh the page | View is restored from localStorage |

---

## 4. Event Display

### TC-4.1: Event Rendering
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Event at 9:00 AM for 1 hour | Positioned at `9 * 60 = 540px` from top, height = `60px` |
| 2 | Event with importance "High" | Shows red left border (`#ef4444`) |
| 3 | Completed event | Shows at 50% opacity with gray color |
| 4 | Google Calendar event | Uses `calendarColor` from Google |
| 5 | Event shorter than 30 min | Shows title only (time text hidden when height < 30px) |
| 6 | Very tall event (3+ hours) | Shows title, start–end time range, source badge |

### TC-4.2: Overlap Layout
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Two events overlapping at same time | Side-by-side, each gets 50% width |
| 2 | Three overlapping events | Each gets ~33% width, stacked in columns |
| 3 | Two events that DON'T overlap | Each gets 100% width, independent layout |
| 4 | One long event overlapping with two short sequential events | Long event in col 0, short events share col 1 |

### TC-4.3: Event Color System
| # | Step | Expected Result |
|---|------|----------------|
| 1 | PQ task with Pareto importance | Red left border, red-tinted background |
| 2 | PQ task with Medium importance | Yellow left border |
| 3 | PQ task with no importance | Purple left border (default) |
| 4 | Google Calendar event | Uses exact Google color |
| 5 | Completed event | Gray border and color, 50% opacity |

---

## 5. Mobile Touch Interactions — Tap & Action Bubble

### TC-5.1: Tap to Show Action Bubble
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Tap a PQ event on mobile | Speech bubble appears near tap position with "View" and "Adjust" buttons |
| 2 | Tap the same event again | Bubble dismisses (toggle behavior) |
| 3 | Tap a different event while bubble is showing | Bubble moves to new event |
| 4 | Tap empty space while bubble is showing | Bubble dismisses |
| 5 | Tap a Google Calendar event | Bubble appears with "View" only (no Adjust for read-only events) |

### TC-5.2: Bubble Positioning
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Tap event on left side of screen | Bubble appears to the RIGHT of tap point |
| 2 | Tap event on right side of screen | Bubble appears to the LEFT of tap point |
| 3 | Tap event near top of screen | Bubble is clamped within screen bounds (8px padding) |
| 4 | Tap event near bottom of screen | Bubble is clamped within screen bounds |

### TC-5.3: Bubble Actions
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Tap "View" in bubble | EventDetailSheet opens; bubble dismisses |
| 2 | Tap "Adjust" in bubble | Resize/adjust mode enters; bubble dismisses; resize banner appears |
| 3 | Tap "Adjust" for Google event | Adjust button not shown (Google events are read-only) |

---

## 6. Mobile Touch Interactions — Adjust/Resize Mode

### TC-6.1: Enter Adjust Mode
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Tap event → Tap "Adjust" | Event gets purple ring highlight + expanded resize handles |
| 2 | Observe resize handles | Two prominent purple bars (40px wide × 6px tall) appear at top/bottom |
| 3 | Handles extend outside event | Top handle extends 20px ABOVE event; bottom extends 20px BELOW |
| 4 | "Drag edges to resize" banner | Floating pill appears at top of screen with safe-area-inset padding |
| 5 | Banner has "Done" button | Purple "Done" button in the banner pill |

### TC-6.2: Resize from Bottom Handle
| # | Step | Expected Result |
|---|------|----------------|
| 1 | In adjust mode, drag bottom handle downward | Event visually grows taller in real-time |
| 2 | Release the drag | Duration increases; toast shows "Duration changed — Xh → Yh" |
| 3 | Verify snap | New duration snaps to nearest 5 minutes |
| 4 | Try to resize below 15 minutes | Clamped at 15-minute minimum (event won't shrink further) |
| 5 | Event spans correct time range after release | Start time unchanged, end time extended |

### TC-6.3: Resize from Top Handle
| # | Step | Expected Result |
|---|------|----------------|
| 1 | In adjust mode, drag top handle upward | Event start time moves earlier, event grows taller |
| 2 | Release the drag | Duration increases; toast shows "Duration changed" |
| 3 | Verify end time unchanged | End time stays the same, only start time shifted |
| 4 | Try to drag top past bottom | Clamped at 15-minute minimum from the end time |

### TC-6.4: Resize Overlapping Events
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Enter adjust mode for an event with overlapping events | Adjusting event on top (z-30); overlapping events dimmed |
| 2 | Touch on an overlapping event's area | Touch passes through (`pointerEvents: 'none'`) to the resize handles |
| 3 | Drag resize handle that's "behind" another event | Resize works correctly; overlapping event doesn't intercept |
| 4 | The resize event is found correctly | Uses `querySelector('[data-event-id]')` not `findEventId(target)` |

### TC-6.5: Move in Adjust Mode
| # | Step | Expected Result |
|---|------|----------------|
| 1 | In adjust mode, touch and HOLD the body of the event (not edges) | After 200ms, event enters move mode |
| 2 | Drag vertically while in move mode | Event follows finger vertically, snapping to 5-min grid |
| 3 | Event expands to full column width | Left becomes 0, width becomes full column (lift effect) |
| 4 | Event gets drag visual indicators | Shadow, opacity-90, slight scale-x |
| 5 | Release the drag | Event moves to new time; toast shows "Event set to X — Moved from Y" |
| 6 | Quick tap on body (< 200ms, no hold) | Action bubble appears (not a move) |

### TC-6.6: Exit Adjust Mode
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Tap "Done" in resize banner | Adjust mode exits; purple ring + handles disappear; banner dismissed |
| 2 | Tap empty space while in adjust mode | Adjust mode exits |
| 3 | Touch area far from the adjust event | Adjust mode exits (touch not near event bounds) |

### TC-6.7: Resize Zone Detection
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Touch OUTSIDE the event (above top edge, within 36px in adjust mode) | Triggers `resize-top` |
| 2 | Touch OUTSIDE the event (below bottom edge, within 36px in adjust mode) | Triggers `resize-bottom` |
| 3 | Touch INSIDE the event body (more than 4px from edge) | Triggers long-press for move mode |
| 4 | Touch right at the edge (within 4px inside) | Triggers resize (inside tolerance) |
| 5 | Touch far outside event (> 36px from edge) | Exits adjust mode |

---

## 7. Mobile Touch Interactions — Move Drag

### TC-7.1: Full-Width Lift Effect
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Long-press event in adjust mode → move drag activates | Event expands from its overlap column to full column width |
| 2 | In Day view (single column, no overlaps) | Event already full width; no visible change |
| 3 | In Day view with 2 overlapping events (event in right column) | Event expands from 50% width to 100% width |
| 4 | Event stays within day column bounds | Event NEVER goes off-screen left or right |
| 5 | Release the drag | Event returns to its layout-assigned column width and position |

### TC-7.2: Move Drag Mechanics
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Drag event up | Event start time moves earlier |
| 2 | Drag event down | Event start time moves later |
| 3 | Verify duration preserved | Height of event stays the same during move |
| 4 | Verify 5-minute snap | Event position jumps in 5-minute increments |
| 5 | Drag to top (midnight) | Start time clamped at 0 (12:00 AM) |
| 6 | Drag event with 1h duration to 11:30 PM | Start time clamped at 23:00 (1440 - 60 = 1380 minutes) |

### TC-7.3: Pre-Drag Cancel
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Start long-press, then move finger vertically > 15px before 200ms | Long-press cancelled, no drag started |
| 2 | Start long-press, wobble finger horizontally < any amount | Long-press NOT cancelled (horizontal wobble tolerated) |
| 3 | Start long-press, don't move for 200ms | Drag activates successfully |

---

## 8. Auto-Scroll During Drag

### TC-8.1: Auto-Scroll Trigger
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Drag event near bottom of viewport (within 60px of edge) | Calendar auto-scrolls downward |
| 2 | Drag event near top of viewport (within 60px of edge) | Calendar auto-scrolls upward |
| 3 | Move finger back to center of viewport | Auto-scroll stops immediately |
| 4 | Move finger to very edge of viewport | Scroll speed increases (quadratic acceleration) |

### TC-8.2: Auto-Scroll Speed
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Finger at 60px from edge (threshold boundary) | Minimal scroll speed (near 0) |
| 2 | Finger at 30px from edge | Moderate scroll speed |
| 3 | Finger at 0px (very edge) | Maximum scroll speed (12px/frame) |
| 4 | Scroll acceleration is smooth | Uses quadratic curve, not linear |

### TC-8.3: Position Sync During Auto-Scroll
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Hold finger still near bottom edge while auto-scroll runs | Event position updates each frame as viewport scrolls |
| 2 | Event tracks the correct time as scroll moves | Minute calculation accounts for scroll offset |
| 3 | Auto-scroll stops when reaching bottom of grid (11:59 PM) | No errors or UI glitches at boundary |
| 4 | Auto-scroll stops when reaching top of grid (12:00 AM) | No errors or UI glitches at boundary |

### TC-8.4: Auto-Scroll with Resize
| # | Step | Expected Result |
|---|------|----------------|
| 1 | In adjust mode, drag bottom resize handle toward bottom edge | Auto-scroll activates; event grows as viewport scrolls |
| 2 | In adjust mode, drag top resize handle toward top edge | Auto-scroll activates; event grows upward |
| 3 | Release during auto-scroll | Scroll stops, resize commits correctly |

### TC-8.5: Auto-Scroll Cleanup
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Lift finger during auto-scroll | requestAnimationFrame loop stops |
| 2 | Touch cancel event fires during auto-scroll | Loop stops, drag cancelled |
| 3 | No memory leaks | autoScrollRef.raf cleaned up in every exit path |

---

## 9. Desktop Mouse Interactions

### TC-9.1: Click to Open Detail
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Click a PQ event (no drag) | EventDetailSheet opens immediately |
| 2 | Click a Google Calendar event | EventDetailSheet opens (read-only view) |
| 3 | Click a standalone event | EventDetailSheet opens |

### TC-9.2: Desktop Drag to Move
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Click + drag event body > 15px | Move drag starts; cursor changes to "grabbing" |
| 2 | Move mouse up/down | Event follows cursor, snapping to 5-min grid |
| 3 | Click + drag < 15px, release | Treated as click, opens detail sheet |
| 4 | Drag Google Calendar event | Nothing happens (not draggable) |

### TC-9.3: Desktop Resize
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Click + drag top edge of event > 15px | Resize-top starts; cursor changes to "ns-resize" |
| 2 | Click + drag bottom edge of event > 15px | Resize-bottom starts; cursor changes to "ns-resize" |
| 3 | Drag to shrink below 15 minutes | Clamped at 15-minute minimum |
| 4 | Release after resize | Toast shows "Duration changed" with undo |

### TC-9.4: Desktop Double-Click
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Double-click empty space in time grid | NewEventModal opens with time set to clicked position |
| 2 | Double-click at 2:30 PM | Modal pre-fills time as 14:30 (snapped to 5 min) |
| 3 | Single click on empty space | Nothing happens (requires double-click / 350ms window) |

---

## 10. Undo System

### TC-10.1: Persistent Undo Button
| # | Step | Expected Result |
|---|------|----------------|
| 1 | No drag/resize performed yet | Undo button visible but dimmed gray, disabled |
| 2 | Move an event | Undo button turns yellow (active) |
| 3 | Wait any amount of time (no timeout) | Undo button stays yellow indefinitely |
| 4 | Click undo button | Event reverts; "Action undone" toast appears (1s); button returns to gray |
| 5 | Perform move, then perform resize | Undo button shows undo for the RESIZE (latest action replaces previous) |
| 6 | Click undo after it replaced the previous action | Only the latest action is undone |

### TC-10.2: Toast Undo Button
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Move an event | Toast appears: "Event set to X — Moved from Y" with Undo button |
| 2 | Resize an event | Toast appears: "Duration changed — Xh → Yh" with Undo button |
| 3 | Tap Undo in toast | Toast immediately dismissed → event reverts → "Action undone" confirmation (1s) |
| 4 | Toast auto-dismisses after 10s | Toast fades away; undo button in top bar still works |
| 5 | Double-tap Undo rapidly on iOS | Only one undo fires (fireOnce pattern prevents double execution) |

### TC-10.3: Undo After Move
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Move event from 9:00 AM to 2:00 PM, then undo | Event returns to 9:00 AM immediately |
| 2 | Verify API call | PATCH sent with original `scheduledTime` |
| 3 | Verify query cache | Optimistic update restores original position instantly |

### TC-10.4: Undo After Resize
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Resize event from 1h to 2h, then undo | Event returns to 1h duration |
| 2 | Verify API call | PATCH sent with original `scheduledTime` + `duration` |

### TC-10.5: Undo After Sort
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Sort 5 tasks, then undo | ALL 5 tasks revert to their original positions |
| 2 | Toast shows "Sorted 5 tasks" with Undo | Undo reverts the entire batch |
| 3 | Persistent undo button also works for sort undo | Clicking it reverts all sorted tasks |

---

## 11. Sort / Auto-Schedule

### TC-11.1: Basic Sort
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Have 3 PQ tasks (High, Medium, Low priority) on today | Tap sort button |
| 2 | Tasks reorder | High priority first, then Medium, then Low |
| 3 | Tasks placed after current time | First task starts at next 5-min slot after now (or 8 AM) |
| 4 | Tasks don't overlap each other | Each task starts after the previous one ends |

### TC-11.2: Fixed Event Avoidance
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Google Calendar event at 10:00–11:00 AM + 3 PQ tasks | Sort places PQ tasks around the Google event |
| 2 | Standalone event at 2:00–3:00 PM | PQ tasks skip that time slot |
| 3 | Completed PQ task at 9:00–10:00 AM | Sort does not move it; treats as fixed |

### TC-11.3: Evening Routine
| # | Step | Expected Result |
|---|------|----------------|
| 1 | PQ task titled "Evening Routine" exists | Sort pins it at 9:00 PM regardless of priority |
| 2 | Other tasks | Placed before 9:30 PM cutoff, avoiding the evening routine slot |

### TC-11.4: Edge Cases
| # | Step | Expected Result |
|---|------|----------------|
| 1 | No PQ tasks on the day | Toast: "Nothing to sort" |
| 2 | All time slots full (no room) | Toast: "No room"; tasks keep current times |
| 3 | Sort on future date (not today) | Start cursor is 8:00 AM (not current time) |

---

## 12. Event Creation

### TC-12.1: New Event Modal
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Click/tap "+" button | NewEventModal opens with current date, 9:00 AM default |
| 2 | Double-tap empty space at 2:30 PM | Modal opens with time pre-filled to 14:30 |
| 3 | Enter title, submit | Event created; appears in calendar immediately |
| 4 | Submit with empty title | Nothing happens (validation prevents) |
| 5 | Select duration (15m/30m/1h/1.5h/2h/3h) | Event created with selected duration |

### TC-12.2: Default Values
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Default color | Purple `#a855f7` |
| 2 | Default duration | 60 minutes |
| 3 | Title field | Auto-focused, Enter key submits |

---

## 13. Event Detail Sheet

### TC-13.1: PQ Task Detail
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open detail for PQ task | Shows title, time range, importance badge, campaign, skill tags, gold value |
| 2 | Delete/unschedule button visible | Can remove task from calendar |
| 3 | "Adjust" button on mobile | Opens resize mode from detail sheet |

### TC-13.2: Google Calendar Event Detail
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open detail for Google event | Shows title, time, calendar name |
| 2 | No delete or adjust buttons | Read-only |
| 3 | Shows Google calendar color | Border matches calendarColor |

### TC-13.3: Standalone Event Detail
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open detail for standalone event | Shows title, time range |
| 2 | Delete button visible | Can delete the standalone event |

---

## 14. Midnight-Crossing & Duration Safety

### TC-14.1: Midnight-Crossing Events
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Event spans 11:00 PM to 1:00 AM (crosses midnight) | `safeEndMinute()` correctly computes 25h = 1500 minutes |
| 2 | Enter adjust mode for midnight-crossing event | Duration is NOT zero; resize works correctly |
| 3 | Move a midnight-crossing event | Duration preserved, event doesn't collapse to 0 height |

### TC-14.2: Minimum Duration Enforcement
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Resize-bottom: drag to make event < 15 min | Clamped at 15 minutes minimum |
| 2 | Resize-top: drag to make event < 15 min | Clamped at 15 minutes minimum |
| 3 | Move event: very short event (15 min) | Stays at 15 minutes, cannot shrink |

---

## 15. Scroll & Touch Behavior

### TC-15.1: Scroll Lock During Adjust Mode
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Enter adjust mode | Scroll container gets `touchAction: 'none'` |
| 2 | Try to scroll by swiping normally | Page does NOT scroll (locked) |
| 3 | Auto-scroll still works during drag | `overflow: auto` preserved for programmatic scrolling |
| 4 | Exit adjust mode | `touchAction` cleared; normal scrolling restored |

### TC-15.2: Bottom Padding
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Scroll to bottom of calendar grid | Extra padding at bottom allows last hours to be visible |
| 2 | 11 PM events are fully visible | Not cut off by bottom edge |

---

## 16. Optimistic Updates & Data Persistence

### TC-16.1: Optimistic Visual Update
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Move an event | Event visually moves IMMEDIATELY (before server response) |
| 2 | Resize an event | Event visually resizes immediately |
| 3 | Server responds with success | No visual jump; event stays in position |
| 4 | Server responds with error | Event may snap back on next refetch (1.5s delayed) |

### TC-16.2: Delayed Invalidation
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Move event quickly twice in succession | Only the last invalidation fires (debounced) |
| 2 | Wait 1.5s after last mutation | Server refetch fires; calendar refreshes |
| 3 | During the 1.5s window | Optimistic state is visible (no flash) |

### TC-16.3: Cross-Page Persistence
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Move an event, navigate away, return | Event is at new position (server persisted) |
| 2 | Hard refresh after move | Event at new position |
| 3 | Resize, then check Tasks page | Duration updated on Tasks page too |

---

## 17. Google Calendar Events (Read-Only)

### TC-17.1: No Drag/Resize
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Try to drag a Google Calendar event on desktop | No drag starts (not draggable) |
| 2 | Tap Google event on mobile | Bubble shows "View" only (no Adjust) |
| 3 | No resize handles on Google events | Handles not rendered for non-draggable events |

### TC-17.2: View Only
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Click/tap Google event | Detail sheet opens |
| 2 | Detail sheet | Shows calendar name, time, title; no action buttons |

---

## 18. Cross-Month Data Loading

### TC-18.1: Adjacent Month Events
| # | Step | Expected Result |
|---|------|----------------|
| 1 | View last day of March in 3-Day view | Events from April 1 visible in the third column |
| 2 | View first day of a month in Week view | Events from previous month's last days visible |
| 3 | Month view | Only current month data loaded (prev/next disabled) |

### TC-18.2: Data Deduplication
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Event exists in both current and previous month queries | Only one instance shown (deduplicated by `id`) |

---

## 19. Responsive Layout

### TC-19.1: Desktop Layout
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open calendar on desktop | `min-h-screen` with `pt-24 pb-8 px-8` padding |
| 2 | Container | `max-w-7xl mx-auto` centered, `bg-gray-900/60` card |
| 3 | Hour labels | 56px width, full format ("9 AM") |

### TC-19.2: Mobile Layout
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open calendar on iOS | `fixed inset-0` with safe area insets |
| 2 | Bottom tab bar | Calendar sits above the 4rem bottom nav |
| 3 | Hour labels | 28px width (>3 cols) or 36px, compact format ("9a") |
| 4 | Resize banner | Respects safe-area-inset-top padding |

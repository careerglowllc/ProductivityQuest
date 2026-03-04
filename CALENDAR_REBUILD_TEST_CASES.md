# Calendar Rebuild — Test Cases

> **Component:** `client/src/pages/calendar.tsx`
> **Last updated:** March 3, 2026

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
| 4 | Navigate to a different date, then back to today | Auto-scroll triggers each time |
| 5 | Open calendar while data is still loading (slow network) | Scroll waits for loading to complete, then scrolls to current time |

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
| 4 | Week view | Shows date range |
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
| 1 | Select Month view | Full month grid (7 cols × N weeks) |
| 2 | Events appear as colored dots/text | Up to 2 shown on mobile, 4 on desktop |
| 3 | Overflow events | Shows "+N more" indicator |
| 4 | Tap a day cell | Switches to Day view for that date |
| 5 | Today's date | Shown as purple circle |
| 6 | Days from previous/next month | Cells appear dimmed/empty |

---

## 4. Event Display

### TC-4.1: Event Rendering
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Event from 9:00-10:00 | Positioned at 9×60=540px from top, height=60px |
| 2 | 15-minute event | Minimum visual height of 15px |
| 3 | Completed event | 50% opacity + line-through title + green checkmark icon |
| 4 | Event shows title | Truncated if too small |
| 5 | Event > 30px tall | Also shows time range |
| 6 | Event > 45px tall | Also shows end time |
| 7 | Event > 55px tall + Google source | Also shows calendar name |

### TC-4.2: Event Colors
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Google Calendar event with color | Uses Google's `calendarColor` |
| 2 | Completed PQ task | Gray (#6b7280) |
| 3 | Pareto/High importance task | Red (#ef4444) |
| 4 | Med-High importance | Orange (#f97316) |
| 5 | Medium importance | Yellow (#eab308) |
| 6 | Med-Low importance | Blue (#3b82f6) |
| 7 | Low importance | Green (#22c55e) |
| 8 | No importance / standalone | Purple (#a855f7) |

### TC-4.3: Overlapping Events
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Two events at the same time | Side by side, each taking 50% width |
| 2 | Three overlapping events | Each takes ~33% width |
| 3 | Partially overlapping events (A: 9-10, B: 9:30-10:30) | Both in separate columns |
| 4 | Non-overlapping events | Each takes full width |
| 5 | Event A ends exactly when B starts | They can share the same column |

### TC-4.4: Cross-Month Events
| # | Step | Expected Result |
|---|------|----------------|
| 1 | 3-Day view crossing month boundary (e.g., Mar 31 – Apr 2) | Events from both months appear correctly |
| 2 | Week view crossing month boundary | All 7 days show correct events |
| 3 | Verify no duplicate events | Deduplication by ID works correctly |

---

## 5. Event Interaction — Desktop

### TC-5.1: Click to View Detail
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Click a PQ task event | EventDetailSheet opens as centered modal |
| 2 | Click a Google Calendar event | EventDetailSheet opens (read-only) |
| 3 | Click a standalone event | EventDetailSheet opens with delete option |
| 4 | Click backdrop of detail sheet | Modal closes |

### TC-5.2: Drag to Move (Desktop)
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Click + hold middle of a PQ task, drag down | Event visually follows cursor, snaps to 5-min grid |
| 2 | Release after dragging | API call fires (`PATCH /api/tasks/:id`) with new `scheduledTime` |
| 3 | Event snaps back smoothly after mutation | Event re-renders at new position |
| 4 | Drag less than 8px and release | Treated as click → opens detail sheet (no drag) |
| 5 | Drag a Google Calendar event | Not possible — cursor shows "pointer", no drag initiated |
| 6 | During drag, cursor shows "grabbing" | Cursor changes to grabbing |
| 7 | Drag standalone event | Works same as PQ task, calls `PATCH /api/standalone-events/:id` |

### TC-5.3: Edge Resize (Desktop)
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Hover near top edge of draggable event | Subtle white resize handle visible |
| 2 | Click + drag top edge upward | Event start time moves earlier, duration increases |
| 3 | Click + drag top edge downward | Event start time moves later, duration decreases |
| 4 | Click + drag bottom edge downward | Event end time moves later, duration increases |
| 5 | Click + drag bottom edge upward | Event end time moves earlier, duration decreases |
| 6 | Try to resize below 15 minutes | Clamped — cannot go below MIN_DURATION |
| 7 | Try to resize past midnight (1440 min) | Clamped at 1440 |
| 8 | Cursor during resize | Shows `ns-resize` |
| 9 | Non-draggable event (Google) | No resize handles shown |

### TC-5.4: Double-Click to Create Event
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Double-click empty space at 2:00 PM | NewEventModal opens with date + time pre-filled to 2:00 PM |
| 2 | Single click empty space | Nothing happens (just increments tap counter) |
| 3 | Double-click within 350ms window | Recognized as double-click |
| 4 | Two clicks >350ms apart | Not recognized as double-click |

---

## 6. Event Interaction — Mobile (iOS)

### TC-6.1: Tap → Action Bubble
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Tap a PQ task event | Speech bubble appears near event with "View" and "Adjust" buttons |
| 2 | Tap a Google Calendar event | Speech bubble appears with only "View" button (no "Adjust") |
| 3 | Tap a standalone event | Speech bubble appears with "View" and "Adjust" buttons |
| 4 | Tap same event again | Action bubble dismisses (toggle behavior) |
| 5 | Tap a different event | Action bubble moves to new event |
| 6 | Tap empty space | Action bubble dismisses |

### TC-6.2: Speech Bubble Positioning
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Tap event on left half of screen | Bubble appears to the RIGHT of the tap point |
| 2 | Tap event on right half of screen | Bubble appears to the LEFT of the tap point |
| 3 | Tap event near top of screen | Bubble clamped so it doesn't go above screen |
| 4 | Tap event near bottom of screen | Bubble clamped so it doesn't go below screen |
| 5 | Bubble has arrow/tail | CSS triangle points toward the tapped event |
| 6 | Tap near screen edge | Bubble clamped with 8px padding from edges |

### TC-6.3: Action Bubble — View Button
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Tap "View" button in action bubble | EventDetailSheet opens as bottom sheet |
| 2 | Action bubble dismisses | Bubble disappears after View is tapped |
| 3 | Detail sheet shows correct event info | Title, time, source badge, etc. all correct |
| 4 | Tap outside detail sheet | Sheet closes |

### TC-6.4: Action Bubble — Adjust Button
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Tap "Adjust" button in action bubble | Event enters resize mode (purple ring highlight) |
| 2 | Action bubble dismisses | Bubble disappears after Adjust is tapped |
| 3 | Resize mode banner appears | "Drag edges to resize" banner at bottom of screen |
| 4 | Event shows prominent purple resize handles | Top and bottom handles are 32px wide, purple with shadow |
| 5 | Edge detection zone expands | From 10px to 24px for easier grabbing |
| 6 | Tap "Done" in banner | Exits resize mode, handles return to normal |

### TC-6.5: Mobile Resize (Edge Drag)
| # | Step | Expected Result |
|---|------|----------------|
| 1 | In resize mode, drag top handle upward | Event start time moves earlier, event grows taller |
| 2 | In resize mode, drag bottom handle downward | Event end time moves later, event grows taller |
| 3 | In resize mode, drag top handle downward | Event start time moves later, event shrinks |
| 4 | In resize mode, drag bottom handle upward | Event end time moves earlier, event shrinks |
| 5 | Try to resize below 15 minutes | Clamped at minimum duration |
| 6 | Release after resize | API mutation fires with new startTime/duration |
| 7 | In resize mode, tap middle of event | Shows action bubble again (not a resize) |
| 8 | Finger moves >8px vertically without being in resize mode | Touch cancelled, scroll allowed |

### TC-6.6: Touch vs Scroll Conflict
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Touch event and immediately scroll vertically (>8px) | Touch is cancelled, page scrolls normally |
| 2 | Touch event and hold still | After touchEnd, treated as tap |
| 3 | In resize mode, drag handle | `preventDefault` called, no page scroll during drag |
| 4 | Swipe horizontally on calendar | Date navigation works (not blocked by event touches) |

---

## 7. Event Detail Sheet

### TC-7.1: Content Display
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Open PQ task event detail | Shows title, time, "Quest" badge, importance badge |
| 2 | Open Google event detail | Shows title, time, "Google Calendar · CalendarName" badge |
| 3 | Open standalone event detail | Shows title, time, "Calendar Event" badge |
| 4 | Event with description | Description text shown |
| 5 | Event with skill tags | Yellow tag badges shown |
| 6 | Event with gold value | "🪙 X gold" shown |
| 7 | Event with campaign | "📋 CampaignName" shown |
| 8 | Completed event | Green "Completed" badge shown |

### TC-7.2: Actions
| # | Step | Expected Result |
|---|------|----------------|
| 1 | PQ task → "Remove from Calendar" button | Calls `POST /api/tasks/:id/unschedule`, removes from calendar |
| 2 | Standalone event → "Delete Event" button | Calls `DELETE /api/standalone-events/:id` |
| 3 | Google Calendar event | No delete button shown |
| 4 | After successful delete | Detail sheet closes, toast notification shown, calendar refreshes |

### TC-7.3: Sheet Behavior
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Desktop | Centered modal with rounded corners |
| 2 | Mobile | Bottom sheet with drag handle, rounded top corners |
| 3 | Tap X button | Sheet closes |
| 4 | Tap backdrop (outside sheet) | Sheet closes |
| 5 | Tap inside sheet | Sheet stays open (stopPropagation) |

---

## 8. New Event Creation

### TC-8.1: Opening the Modal
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Tap "+" button in top bar | NewEventModal opens with current date, 9:00 AM default |
| 2 | Double-tap empty space at 3:00 PM | Modal opens with date + 3:00 PM pre-filled |
| 3 | Double-tap on a specific date column | Correct date is pre-filled |

### TC-8.2: Form Fields
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Title field | Auto-focused, required for submission |
| 2 | Date picker | Shows pre-filled date, can be changed |
| 3 | Time picker | Shows pre-filled time (snapped to 5-min), can be changed |
| 4 | Duration dropdown | Options: 15m, 30m, 1h, 1.5h, 2h, 3h |
| 5 | Default duration | 60 minutes (1 hour) |

### TC-8.3: Submission
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Fill title and tap "Create" | Event created via `POST /api/standalone-events` |
| 2 | Press Enter in title field | Same as tapping Create |
| 3 | Leave title empty, tap Create | Nothing happens (button may be disabled) |
| 4 | Successful creation | Modal closes, "Event created" toast shown, calendar refreshes |
| 5 | Tap "Cancel" | Modal closes without creating |
| 6 | Tap backdrop | Modal closes without creating |

---

## 9. Google Calendar Integration

### TC-9.1: Event Display
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Google events appear on calendar | Displayed with Google's calendar color |
| 2 | Google event shows calendar name | Subtitle shows "Personal", "Work", etc. |
| 3 | Recurring Google event | Shows with `recurType` data |
| 4 | Google event is not draggable | No resize handles, no drag cursor |

### TC-9.2: Sync Status (Desktop)
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Desktop footer shows sync indicator | Green dot + "Google Calendar synced" |
| 2 | Last sync timestamp shown | "Last sync: [datetime]" |
| 3 | Mobile | Sync indicator not shown (space constraint) |

### TC-9.3: Settings Link
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Tap settings gear icon | Navigates to `/settings/google-calendar` |
| 2 | Desktop | Full-size button in top bar |
| 3 | Mobile | Compact icon button in top bar |

---

## 10. Edge Cases & Error Handling

### TC-10.1: Empty Calendar
| # | Step | Expected Result |
|---|------|----------------|
| 1 | No events for the current view | Empty time grid with hour lines, no errors |
| 2 | No events in Month view | Empty cells, today still highlighted |

### TC-10.2: Time Boundaries
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Drag event to start at 12:00 AM (minute 0) | Clamped at top, works correctly |
| 2 | Drag event end past 11:59 PM (minute 1440) | Clamped at 1440 |
| 3 | Resize to exactly 15 minutes | Works (minimum duration) |
| 4 | Attempt resize to <15 minutes | Clamped at 15 minutes |
| 5 | Event spanning midnight (if any) | Should display within the day it starts |

### TC-10.3: Rapid Interactions
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Quickly tap multiple different events | Action bubble follows most recent tap |
| 2 | Tap event, quickly tap View, then tap another event | Detail sheet opens for first event; second tap ignored while sheet is open |
| 3 | Start drag, quickly release | If <8px movement, treated as click |
| 4 | Multiple rapid swipes | Navigation responds to each valid swipe |

### TC-10.4: Concurrent Operations
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Drag event while another mutation is in progress | Should work (mutations are independent) |
| 2 | Navigate date while events are loading | New data loads for new date range |
| 3 | Switch view mode while dragging | Drag should be cancelled when view changes |

### TC-10.5: Data Refresh
| # | Step | Expected Result |
|---|------|----------------|
| 1 | After moving an event | Calendar data invalidated and refreshed |
| 2 | After creating an event | New event appears on calendar |
| 3 | After deleting an event | Event disappears from calendar |
| 4 | After unscheduling a task | Task disappears from calendar, task list updated |

---

## 11. Responsive Layout

### TC-11.1: Desktop Layout
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Screen > mobile breakpoint | Full layout with sidebar padding (pt-24, px-8) |
| 2 | Calendar in bg-gray-900/60 card | Rounded corners, purple border |
| 3 | Time labels | Full format ("9 AM"), 56px width |
| 4 | "New Event" button | Shows icon + text |

### TC-11.2: Mobile Layout (iOS)
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Mobile viewport | Fixed positioning, safe area insets respected |
| 2 | Bottom: 4rem + safe area for tab bar | Calendar doesn't overlap bottom navigation |
| 3 | Top: safe area inset | Calendar starts below status bar |
| 4 | Time labels | Compact ("9a"), 28-36px width |
| 5 | "New Event" button | Icon only (no text) |
| 6 | View switcher | Smaller padding, 11px font |

---

## 12. Performance

### TC-12.1: Rendering Performance
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Week view with 50+ events | Smooth scrolling, no jank |
| 2 | Drag an event in Week view | Only the dragged column re-renders (React.memo) |
| 3 | Switch between views rapidly | No UI freeze, smooth transitions |

### TC-12.2: Memory & Cleanup
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Navigate away from calendar page | Event listeners cleaned up (touchmove, touchend, touchcancel) |
| 2 | Mouse drag → navigate away mid-drag | Window listeners removed (mousemove, mouseup) |
| 3 | Timer cleanup on view change | Auto-scroll timer cancelled via cleanup function |

---

## 13. Accessibility & Polish

### TC-13.1: Visual Indicators
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Today's column header | Purple bottom border accent |
| 2 | Today's date in Month view | Purple circle background |
| 3 | Event being dragged | 90% opacity, slight horizontal scale, purple shadow, z-30 |
| 4 | Event in resize mode | Purple ring, expanded handles, brighter background |
| 5 | Hover on desktop event | Slight brightness increase |

### TC-13.2: Animations
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Action bubble appearance | Fade-in + zoom-in-95 animation (150ms) |
| 2 | Event drag visual | Smooth transition-all duration-150 |
| 3 | Auto-scroll | Smooth scroll behavior |

### TC-13.3: Toast Notifications
| # | Step | Expected Result |
|---|------|----------------|
| 1 | Create event | "Event created" toast |
| 2 | Delete standalone event | "Event deleted" toast |
| 3 | Unschedule PQ task | "Removed from calendar" toast |

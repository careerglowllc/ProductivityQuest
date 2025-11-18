# Calendar Drag & Drop Feature

## Overview
This feature enables users to drag and drop tasks in the calendar view to reschedule them, and resize events by dragging their edges to adjust duration. This matches the standard behavior found in Google Calendar and Apple Calendar.

## Features

### 1. **Drag to Move Events**
- Click and drag any ProductivityQuest task in the calendar to move it to a different time slot
- The task's `dueDate` property is automatically updated
- Changes sync back to Google Calendar if the task is synced
- Time slots snap to 5-minute intervals for precision

### 2. **Resize Events**
- Hover over the top or bottom edge of a task to reveal resize handles
- Drag the top edge to adjust the start time (keeping end time fixed)
- Drag the bottom edge to adjust the end time (keeping start time fixed)
- Minimum duration is 5 minutes
- Duration snaps to 5-minute intervals
- The task's `duration` property is automatically updated

### 3. **Visual Feedback**
- **Cursor Changes**: 
  - `cursor-move` when hovering over draggable tasks
  - `cursor-ns-resize` when hovering over resize handles
- **Opacity**: Dragging/resizing events become semi-transparent (50% opacity)
- **Resize Handles**: Top and bottom edges show white semi-transparent handles on hover
- **Time Display**: Events show their current time range while being dragged/resized

### 4. **Google Calendar Sync**
- When a task's time or duration is changed, the corresponding Google Calendar event is automatically updated
- Sync happens in the background via the `/api/tasks/:id` PATCH endpoint
- Uses the new `updateEvent()` method in GoogleCalendarService

## Implementation Details

### Frontend (`client/src/pages/calendar.tsx`)

#### State Management
```typescript
const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null);
const [resizeEdge, setResizeEdge] = useState<'top' | 'bottom' | null>(null);
const [dragStartY, setDragStartY] = useState<number>(0);
const [dragStartTime, setDragStartTime] = useState<Date | null>(null);
const [tempEventTime, setTempEventTime] = useState<{ start: Date; end: Date } | null>(null);
```

#### Key Functions

**`handleEventMouseDown(event, e, edge?)`**
- Initiates drag or resize operation
- Only works for ProductivityQuest tasks (`source === 'productivityquest'`)
- Stores initial mouse position and event time

**`handleMouseMove(e)`**
- Calculates time delta based on mouse movement
- 60px vertical movement = 1 hour
- Rounds to nearest 5-minute interval
- Updates `tempEventTime` to show preview

**`handleMouseUp()`**
- Sends PATCH request to `/api/tasks/:id` with new `dueDate` and `duration`
- Invalidates query cache to refresh calendar data
- Resets all drag/resize state

**`getEventDisplayTime(event)`**
- Returns temporary time during drag/resize
- Returns actual event time otherwise

#### Event Rendering
Each event in day/3-day/week views includes:
- Top resize handle (invisible until hover)
- Bottom resize handle (invisible until hover)
- Event body with drag handler
- Time display showing current/preview time

### Backend Updates

#### `server/google-calendar.ts`

**New Method: `updateEvent(task, user)`**
```typescript
async updateEvent(task: Task, user: User): Promise<any>
```
- Updates an existing Google Calendar event
- Only updates if task has `googleEventId` and `googleCalendarId`
- Syncs: title, description, start time, end time, color
- Handles authentication with user's Google credentials
- Returns null if event not found (may have been deleted)

#### `server/routes.ts`

**Enhanced PATCH `/api/tasks/:id`**
- After updating task in database, checks if `dueDate` or `duration` changed
- If task has Google Calendar sync enabled, calls `googleCalendar.updateEvent()`
- Silently fails Google Calendar sync errors to not break task updates

## User Experience

### What Users Can Do
✅ Drag ProductivityQuest tasks to reschedule them
✅ Resize tasks to adjust duration
✅ See live preview of new time while dragging
✅ Changes automatically sync to Google Calendar
✅ Works in Day, 3-Day, and Week views

### What's Protected
🔒 External Google Calendar events cannot be dragged/resized (read-only)
🔒 Minimum 5-minute duration enforced
🔒 Time snaps to 5-minute intervals for clean scheduling
🔒 Task updates fail gracefully if Google Calendar sync fails

## Views Supported

- ✅ **Day View**: Full drag and resize support
- ✅ **3-Day View**: Full drag and resize support  
- ✅ **Week View**: Full drag and resize support
- ❌ **Month View**: Not applicable (month view shows events in daily grid, not time slots)

## Technical Notes

### Time Calculation
- Each time slot in the calendar is 60px tall
- Vertical mouse movement is converted to minutes: `(deltaY / 60) * 60`
- Result is rounded to nearest 5 minutes: `Math.round(minutes / 5) * 5`
- This ensures clean, predictable time adjustments

### Event Identification
- ProductivityQuest tasks have event IDs in format: `task-{id}`
- External Google events have their original Google event IDs
- Only events with `source === 'productivityquest'` are draggable

### Google Calendar Sync
- Updates use the Google Calendar Events API `update` method
- Requires `googleEventId` and `googleCalendarId` stored on the task
- Falls back gracefully if event no longer exists in Google Calendar
- Uses user's OAuth credentials for API calls

## Future Enhancements

Potential improvements:
- [ ] Multi-day drag support (drag event to different day column)
- [ ] Undo/redo functionality for quick mistakes
- [ ] Batch update multiple events at once
- [ ] Conflict detection when dragging over other events
- [ ] Toast notifications for successful updates
- [ ] Optimistic UI updates before server confirmation
- [ ] Support for all-day event conversion

## Testing

To test the feature:
1. Go to Calendar page in Day, 3-Day, or Week view
2. Create a ProductivityQuest task with a due date
3. Click and drag the task up/down to move it
4. Hover over top/bottom edge and drag to resize
5. Verify the task's time updates in the UI
6. Check Google Calendar to confirm sync (if enabled)

## Browser Compatibility

Tested and working in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (touch events not yet supported)

## Known Limitations

- Touch/mobile drag support not yet implemented
- Cannot drag events across different days (same-day only)
- No visual conflict warnings if events overlap
- Google Calendar sync is one-way (calendar → task update only)

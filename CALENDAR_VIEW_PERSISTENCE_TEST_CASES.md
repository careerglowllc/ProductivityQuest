# Calendar View Persistence Test Cases

## Feature: Remember User's Last Calendar View Preference

### Test Case 1: Default View on First Visit
**Preconditions:**
- Fresh browser (clear localStorage)
- User is logged in
- First time visiting calendar

**Steps:**
1. Navigate to Calendar page for the first time
2. Observe which view loads

**Expected Results:**
- ✅ Calendar loads in "Month" view by default
- ✅ localStorage does not contain 'calendarView' key yet

---

### Test Case 2: Switch View and Persistence
**Preconditions:**
- User is on Calendar page

**Steps:**
1. Click "Day" view button
2. Observe calendar switches to Day view
3. Check localStorage in browser DevTools
4. Navigate to Dashboard or another page
5. Return to Calendar page

**Expected Results:**
- ✅ Calendar switches to Day view immediately
- ✅ localStorage['calendarView'] = 'day'
- ✅ Upon return, calendar loads in Day view (not Month)
- ✅ No flash of Month view before switching

---

### Test Case 3: All View Types Persist
**Preconditions:**
- Calendar page is open

**Steps:**
1. Switch to "Day" view → Navigate away → Return
2. Switch to "3 Days" view → Navigate away → Return
3. Switch to "Week" view → Navigate away → Return
4. Switch to "Month" view → Navigate away → Return

**Expected Results for Each:**
- ✅ "Day" view persists as 'day' in localStorage
- ✅ "3 Days" view persists as '3day' in localStorage
- ✅ "Week" view persists as 'week' in localStorage
- ✅ "Month" view persists as 'month' in localStorage
- ✅ Each view loads correctly on return

---

### Test Case 4: Persistence Across Browser Sessions
**Preconditions:**
- User has selected "Week" view

**Steps:**
1. Switch to Week view
2. Close browser completely
3. Reopen browser
4. Log in to ProductivityQuest
5. Navigate to Calendar

**Expected Results:**
- ✅ localStorage survives browser restart
- ✅ Calendar loads in Week view
- ✅ No need to re-select preference

---

### Test Case 5: Persistence Across Page Refreshes
**Preconditions:**
- Calendar in "3 Days" view

**Steps:**
1. Switch to 3 Days view
2. Press Ctrl+R / Cmd+R to refresh page
3. Press F5 to hard refresh
4. Click browser refresh button

**Expected Results:**
- ✅ All refresh methods maintain 3 Days view
- ✅ No flickering to default view

---

### Test Case 6: Invalid localStorage Value Handling
**Preconditions:**
- Browser DevTools open

**Steps:**
1. Open DevTools Console
2. Run: `localStorage.setItem('calendarView', 'invalid')`
3. Refresh Calendar page

**Expected Results:**
- ✅ Calendar falls back to "Month" view
- ✅ No errors in console
- ✅ View selection works normally

---

### Test Case 7: Multiple Browser Tabs
**Preconditions:**
- Two browser tabs open to ProductivityQuest

**Steps:**
1. Tab A: Switch to Day view
2. Tab B: Refresh or navigate to Calendar
3. Tab B: Switch to Week view
4. Tab A: Navigate away and back to Calendar

**Expected Results:**
- ✅ Tab B loads with Day view initially (from localStorage)
- ✅ After Tab B switches to Week, localStorage updates
- ✅ Tab A now loads Week view (latest preference)

---

### Test Case 8: User-Specific Preference (Different Users)
**Preconditions:**
- Multiple user accounts

**Steps:**
1. User A logs in, sets Calendar to Day view, logs out
2. User B logs in, sets Calendar to Week view, logs out
3. User A logs in again

**Expected Results:**
- ⚠️ Current implementation: localStorage is browser-wide, not user-specific
- ✅ Last user's preference applies (User A sees Week view)
- 📝 **Enhancement opportunity**: Store preference per user ID

---

### Test Case 9: Clear Browser Data
**Preconditions:**
- Calendar view preference saved

**Steps:**
1. Set calendar to Week view
2. Clear browser localStorage (via DevTools or browser settings)
3. Refresh page

**Expected Results:**
- ✅ Calendar resets to default "Month" view
- ✅ User can set preference again

---

### Test Case 10: Mobile Device Compatibility
**Preconditions:**
- Mobile browser (iOS Safari, Android Chrome)

**Steps:**
1. On mobile, switch to Day view
2. Close app/browser
3. Reopen

**Expected Results:**
- ✅ localStorage works on mobile browsers
- ✅ View preference persists
- ✅ Responsive UI maintains view selection

---

## Edge Cases

### EC1: Rapid View Switching
**Steps:**
1. Rapidly click: Day → Week → Month → 3 Days → Day (within 1 second)

**Expected Results:**
- ✅ Each click updates localStorage
- ✅ Final selection (Day) is persisted
- ✅ No race conditions or missed updates

---

### EC2: localStorage Full/Disabled
**Preconditions:**
- localStorage is full or disabled (privacy mode)

**Steps:**
1. Try to switch views

**Expected Results:**
- ✅ View switches in current session
- ✅ No errors thrown
- ✅ Graceful degradation (doesn't persist, but still works)

---

## Implementation Verification

### Code Review Checklist:
- ✅ `useState` initializer reads from localStorage
- ✅ `useEffect` hook saves to localStorage on view change
- ✅ Effect dependency array includes `[view]`
- ✅ localStorage key is 'calendarView'
- ✅ Valid values: 'day', '3day', 'week', 'month'
- ✅ Type validation before setting state

### DevTools Verification:
```javascript
// Check localStorage
localStorage.getItem('calendarView') // Should return: 'day' | '3day' | 'week' | 'month'

// Manual set
localStorage.setItem('calendarView', 'week')
// Refresh to verify it loads in Week view
```

---

## Performance
- ✅ localStorage read is synchronous and fast
- ✅ No API calls required
- ✅ No loading delay
- ✅ Instant view restoration

## Future Enhancements
- [ ] Store preference per user account (backend)
- [ ] Add preference to user settings page
- [ ] Sync preference across devices for same user
- [ ] Remember scroll position within view

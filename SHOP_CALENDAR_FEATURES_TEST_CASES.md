# Shop & Calendar New Features Test Cases

## Overview
Test cases for two new features:
1. **Shop Item Price Editing** - Edit shop item prices with inline UI
2. **Calendar Event Color Picker** - Change event colors (Apple Calendar style)

## Test Date
November 19, 2025

---

## SHOP ITEM PRICE EDITING

### TC-SHOP-001: Edit Icon Appears for Custom Items
**Preconditions:**
- User is logged in
- At least one custom (non-default) shop item exists

**Steps:**
1. Navigate to Shop page
2. Observe shop item cards

**Expected Result:**
- Custom items show small pencil icon next to price
- Default items (with "Default" badge) do NOT show edit icon
- Icon has yellow color (#text-yellow-400/60)
- Hover changes icon opacity

**Status:** ⬜ Not Tested

---

### TC-SHOP-002: Click Edit Icon Opens Inline Editor
**Preconditions:**
- Custom shop item visible

**Steps:**
1. Click pencil icon next to item price
2. Observe UI change

**Expected Result:**
- Price text replaced with input field
- Input shows current price value
- Input is auto-focused
- Green checkmark (✓) button appears
- Red X (✗) cancel button appears
- Card selection does NOT trigger

**Status:** ⬜ Not Tested

---

### TC-SHOP-003: Save New Price Successfully
**Preconditions:**
- Inline editor open for an item

**Steps:**
1. Change price in input field (e.g., from 15 to 25)
2. Click green checkmark button
3. Observe behavior

**Expected Result:**
- Toast: "Price Updated! - Shop item price changed successfully"
- Input closes and returns to display mode
- New price (25) now shown on card
- Backend PATCH request sent to `/api/shop/items/:id`
- Shop items refetched

**Status:** ⬜ Not Tested

---

### TC-SHOP-004: Cancel Price Edit
**Preconditions:**
- Inline editor open
- Price changed but not saved

**Steps:**
1. Modify price in input
2. Click red X button
3. Observe behavior

**Expected Result:**
- Input closes
- Original price restored (no change)
- No backend request sent
- No toast notification

**Status:** ⬜ Not Tested

---

### TC-SHOP-005: Validation - Empty Price
**Preconditions:**
- Inline editor open

**Steps:**
1. Clear price input field
2. Click save (✓) button

**Expected Result:**
- Toast error: "Invalid Price - Please enter a valid price greater than 0"
- Input remains open
- Price not updated

**Status:** ⬜ Not Tested

---

### TC-SHOP-006: Validation - Zero or Negative Price
**Preconditions:**
- Inline editor open

**Steps:**
1. Enter "0" or "-5" in price field
2. Click save button

**Expected Result:**
- Toast error: "Invalid Price"
- Input remains open
- Price not updated
- Original price unchanged

**Status:** ⬜ Not Tested

---

### TC-SHOP-007: Multiple Items - Only One Editable at Once
**Preconditions:**
- Multiple custom shop items visible

**Steps:**
1. Click edit icon on Item A
2. Without saving, click edit icon on Item B

**Expected Result:**
- Item A's editor closes (changes discarded)
- Item B's editor opens
- Only one item in edit mode at a time

**Status:** ⬜ Not Tested

---

### TC-SHOP-008: Edit Mode Stops Propagation
**Preconditions:**
- Item in edit mode

**Steps:**
1. Click anywhere in the edit area (input, buttons)
2. Observe card selection

**Expected Result:**
- Card does NOT get selected
- Click events don't propagate to card
- Selected item actions don't appear below

**Status:** ⬜ Not Tested

---

### TC-SHOP-009: Edit Icon NOT Visible for Default Items
**Preconditions:**
- Default shop item with "Default" badge exists

**Steps:**
1. Find an item with "Default" badge
2. Look for edit icon

**Expected Result:**
- No pencil icon visible
- Price is read-only
- Cannot edit default item prices

**Status:** ⬜ Not Tested

---

### TC-SHOP-010: Price Update Persists After Refresh
**Preconditions:**
- Item price successfully updated

**Steps:**
1. Update item price from 100 to 200
2. Refresh the page
3. Check item price

**Expected Result:**
- New price (200) persists
- Database updated correctly
- Price shows on page reload

**Status:** ⬜ Not Tested

---

## CALENDAR EVENT COLOR PICKER

### TC-CAL-001: Color Button Visible for ProductivityQuest Events
**Preconditions:**
- Calendar event modal open for ProductivityQuest event

**Steps:**
1. Click on ProductivityQuest event in calendar
2. Observe modal top-right corner

**Expected Result:**
- Circular color button visible (32px, w-8 h-8)
- Button shows current event color
- White border with low opacity (border-white/20)
- Position: absolute top-4 right-4

**Status:** ⬜ Not Tested

---

### TC-CAL-002: Color Button NOT Visible for Google Events
**Preconditions:**
- Calendar event modal open for Google Calendar event

**Steps:**
1. Click on Google Calendar event
2. Observe modal top-right corner

**Expected Result:**
- No color picker button visible
- Google Calendar events use their calendar color
- Color is read-only

**Status:** ⬜ Not Tested

---

### TC-CAL-003: Click Color Button Opens Dropdown
**Preconditions:**
- ProductivityQuest event modal open

**Steps:**
1. Click circular color button in top-right
2. Observe dropdown

**Expected Result:**
- Dropdown appears below button
- 12 color options in 4x3 grid
- Each color is 32px circle (w-8 h-8)
- Backdrop blur effect
- Dark background (bg-gray-800/95)
- Purple border

**Status:** ⬜ Not Tested

---

### TC-CAL-004: Color Options Display Correctly
**Preconditions:**
- Color picker dropdown open

**Steps:**
1. Observe all 12 color options

**Expected Result:**
- Colors in order:
  Row 1: Purple, Pink, Red, Orange
  Row 2: Yellow, Green, Teal, Cyan
  Row 3: Blue, Indigo, Violet, Fuchsia
- Current event color has white border
- Other colors have transparent border
- Hover shows scale effect (hover:scale-110)

**Status:** ⬜ Not Tested

---

### TC-CAL-005: Select New Color Updates Event
**Preconditions:**
- Event currently purple (#9333ea)
- Color picker open

**Steps:**
1. Click green color option (#22c55e)
2. Observe behavior

**Expected Result:**
- Toast: "Color Updated - Event color changed successfully"
- Modal header bar changes to green
- Color button shows green
- Dropdown closes
- Backend PATCH sent to `/api/tasks/:id`
- Calendar refetches and shows green event

**Status:** ⬜ Not Tested

---

### TC-CAL-006: Color Picker Closes on Outside Click
**Preconditions:**
- Color picker dropdown open

**Steps:**
1. Click anywhere outside dropdown
2. Observe behavior

**Expected Result:**
- Dropdown closes
- No color change
- Modal remains open

**Status:** ⬜ Not Tested

---

### TC-CAL-007: Color Picker Closes When Opening Delete Menu
**Preconditions:**
- Color picker dropdown open

**Steps:**
1. Click "Delete" button
2. Observe both dropdowns

**Expected Result:**
- Color picker closes
- Delete menu opens
- Only one dropdown visible at a time

**Status:** ⬜ Not Tested

---

### TC-CAL-008: Color Picker Closes When Clicking Reschedule
**Preconditions:**
- Color picker dropdown open

**Steps:**
1. Click "Reschedule" button
2. Observe behavior

**Expected Result:**
- Color picker closes
- Reschedule modal opens
- Clean UI transition

**Status:** ⬜ Not Tested

---

### TC-CAL-009: Color Change Persists in Calendar View
**Preconditions:**
- Event color changed from purple to blue

**Steps:**
1. Close modal
2. View event in calendar

**Expected Result:**
- Event displays with blue color
- Border color matches
- Background color matches
- Color persists across all calendar views (Day/3-Day/Week/Month)

**Status:** ⬜ Not Tested

---

### TC-CAL-010: Color Updates After Page Refresh
**Preconditions:**
- Event color changed and saved

**Steps:**
1. Change event to orange color
2. Refresh the page
3. Open same event modal

**Expected Result:**
- Color button shows orange
- Event in calendar is orange
- Database persisted the change
- Color loads correctly

**Status:** ⬜ Not Tested

---

## Edge Cases

### TC-EDGE-001: Edit Multiple Shop Items Sequentially
**Steps:**
1. Edit Item A price to 50
2. Save Item A
3. Immediately edit Item B price to 75
4. Save Item B

**Expected Result:**
- Both updates succeed
- No race conditions
- Both new prices persist

**Status:** ⬜ Not Tested

---

### TC-EDGE-002: Change Event Color While Dragging
**Steps:**
1. Start dragging event to new time
2. Try to open color picker

**Expected Result:**
- Cannot open modal during drag
- Color picker unavailable
- Drag operation completes normally

**Status:** ⬜ Not Tested

---

### TC-EDGE-003: Shop Price Edit During Purchase
**Steps:**
1. Start editing item price
2. Have another user/tab purchase the item
3. Save new price

**Expected Result:**
- Price update succeeds or shows error
- No data corruption
- Proper error handling

**Status:** ⬜ Not Tested

---

## Notes
- Shop edit feature only for custom items (not default/global items)
- Calendar color picker only for ProductivityQuest events (not Google Calendar events)
- Price validation: must be > 0
- Color changes update `calendarColor` field in tasks table
- Price changes update `cost` field in shop_items table

## Related Files
- `/client/src/pages/shop.tsx` - Shop item price editing
- `/client/src/pages/calendar.tsx` - Calendar event color picker

## Dependencies
- TanStack Query for mutations and refetching
- Toast notifications for user feedback
- Backend PATCH endpoints for updates

# Navigation Dropdown Menu - Test Cases

## Overview
Test cases for the Quests dropdown menu navigation system that includes Calendar and Campaigns links.

## Test Cases

### TC-NAV-001: Quests Dropdown - Hover to Open
**Priority:** High  
**Prerequisites:** User logged in, on any page

**Steps:**
1. Navigate to any page in the application
2. Locate the "Quests" button in the top navigation bar
3. Hover mouse over the "Quests" button

**Expected Result:**
- Dropdown menu appears immediately on hover
- Menu contains two items: "Calendar" and "Campaigns"
- Calendar item shows calendar icon (blue)
- Campaigns item shows crown icon (purple)
- Menu has dark background with yellow border

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-NAV-002: Quests Dropdown - Stay Open on Menu Hover
**Priority:** High  
**Prerequisites:** User logged in, Quests dropdown is open

**Steps:**
1. Hover over "Quests" button to open dropdown
2. Move mouse from button to dropdown menu
3. Hover over menu items

**Expected Result:**
- Dropdown remains open while hovering over the menu
- Menu items highlight on hover (slate-700 background)
- Cursor changes to pointer on menu items

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-NAV-003: Quests Dropdown - Close on Mouse Leave
**Priority:** Medium  
**Prerequisites:** User logged in, Quests dropdown is open

**Steps:**
1. Hover over "Quests" button to open dropdown
2. Move mouse away from both button and dropdown menu

**Expected Result:**
- Dropdown closes smoothly
- No lag or delay in closing

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-NAV-004: Calendar Link Navigation
**Priority:** High  
**Prerequisites:** User logged in, Quests dropdown is open

**Steps:**
1. Open Quests dropdown menu
2. Click on "Calendar" menu item

**Expected Result:**
- User navigates to `/calendar` page
- Calendar page loads with current month view
- Dropdown closes after navigation

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-NAV-005: Campaigns Link Navigation
**Priority:** High  
**Prerequisites:** User logged in, Quests dropdown is open

**Steps:**
1. Open Quests dropdown menu
2. Click on "Campaigns" menu item

**Expected Result:**
- User navigates to `/campaigns` page
- Campaigns page loads correctly
- Dropdown closes after navigation

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-NAV-006: Quests Button Highlight - Active State
**Priority:** Medium  
**Prerequisites:** User logged in

**Steps:**
1. Navigate to `/tasks` page
2. Observe Quests button styling

**Expected Result:**
- Quests button is highlighted (yellow gradient background)
- Border is visible (yellow-500/60)
- Text is bold

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-NAV-007: Quests Button Highlight - Calendar Page
**Priority:** Medium  
**Prerequisites:** User logged in

**Steps:**
1. Navigate to `/calendar` page
2. Observe Quests button styling

**Expected Result:**
- Quests button is highlighted (same as active state)
- Indicates user is in Quests-related section

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-NAV-008: Quests Button Highlight - Campaigns Page
**Priority:** Medium  
**Prerequisites:** User logged in

**Steps:**
1. Navigate to `/campaigns` page
2. Observe Quests button styling

**Expected Result:**
- Quests button is highlighted (same as active state)
- Indicates user is in Quests-related section

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-NAV-009: Chevron Icon Visibility
**Priority:** Low  
**Prerequisites:** User logged in

**Steps:**
1. Locate the "Quests" button in top navigation
2. Observe the button content

**Expected Result:**
- Small chevron down icon is visible next to "Quests" text
- Icon indicates dropdown availability
- Icon has 60% opacity

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-NAV-010: Calendar Removed from Main Navigation
**Priority:** High  
**Prerequisites:** User logged in

**Steps:**
1. Check top navigation bar
2. Look for standalone "Calendar" button

**Expected Result:**
- No standalone "Calendar" button in main navigation
- Only Dashboard, Quests, Skills, Item Shop visible
- Calendar only accessible via Quests dropdown

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-NAV-011: Mobile Navigation (Bottom Bar)
**Priority:** High  
**Prerequisites:** User logged in, viewing on mobile device

**Steps:**
1. Open app on mobile device or resize browser to mobile width
2. Check bottom navigation bar

**Expected Result:**
- Bottom navigation shows: Dashboard, Quests, Calendar, Skills, Item Shop
- No dropdown menu on mobile (direct links only)
- All icons visible and tappable

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Edge Cases

### TC-NAV-EDGE-001: Rapid Hover In/Out
**Steps:**
1. Rapidly move mouse in and out of Quests button

**Expected Result:**
- Dropdown opens and closes smoothly
- No flickering or stuck states

---

### TC-NAV-EDGE-002: Click Quests Button While Dropdown Open
**Steps:**
1. Hover to open dropdown
2. Click on the "Quests" button itself

**Expected Result:**
- Navigates to `/tasks` page
- Dropdown closes

---

### TC-NAV-EDGE-003: Keyboard Navigation
**Steps:**
1. Use Tab key to focus on Quests button
2. Press Enter or Space

**Expected Result:**
- Navigates to tasks page OR opens dropdown
- Accessible via keyboard

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Notes
- Dropdown uses `onMouseEnter` and `onMouseLeave` events
- State managed with `useState` for `questsMenuOpen`
- Icons from lucide-react library
- Styling uses Tailwind CSS utility classes

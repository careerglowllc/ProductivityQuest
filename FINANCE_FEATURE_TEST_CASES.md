# Finance Feature - Test Cases

## Overview
This document outlines comprehensive test cases for the Finance tracking feature in ProductivityQuest.

## Table of Contents
1. [API Endpoints Testing](#api-endpoints-testing)
2. [Security & Authorization](#security--authorization)
3. [Data Validation](#data-validation)
4. [UI/UX Testing](#uiux-testing)
5. [Dashboard Integration](#dashboard-integration)
6. [Mobile/iOS Testing](#mobileios-testing)
7. [Edge Cases](#edge-cases)
8. [Performance Testing](#performance-testing)

---

## API Endpoints Testing

### GET /api/finances

**Test Case 1.1: Fetch user's financial items**
- **Preconditions:** User is authenticated and has financial items
- **Steps:**
  1. Make GET request to `/api/finances`
  2. Verify response status is 200
  3. Verify response is an array of financial items
- **Expected Result:** Returns all financial items for the authenticated user
- **Status:** ✅ Pass / ❌ Fail

**Test Case 1.2: Empty financial items**
- **Preconditions:** User is authenticated but has no financial items
- **Steps:**
  1. Make GET request to `/api/finances`
  2. Verify response status is 200
  3. Verify response is an empty array
- **Expected Result:** Returns empty array `[]`
- **Status:** ✅ Pass / ❌ Fail

**Test Case 1.3: Unauthenticated request**
- **Preconditions:** User is not authenticated
- **Steps:**
  1. Make GET request to `/api/finances` without session
  2. Verify response status is 401 or redirects to login
- **Expected Result:** Request is rejected
- **Status:** ✅ Pass / ❌ Fail

### POST /api/finances

**Test Case 1.4: Create new financial item**
- **Preconditions:** User is authenticated
- **Steps:**
  1. POST to `/api/finances` with valid data:
     ```json
     {
       "item": "Netflix",
       "category": "Entertainment",
       "monthlyCost": 1599,
       "recurType": "Monthly"
     }
     ```
  2. Verify response status is 200
  3. Verify response contains the created item with an ID
- **Expected Result:** Item is created and returned
- **Status:** ✅ Pass / ❌ Fail

**Test Case 1.5: Missing required fields**
- **Preconditions:** User is authenticated
- **Steps:**
  1. POST to `/api/finances` with incomplete data (missing `category`)
  2. Verify response status is 400
  3. Verify error message indicates missing fields
- **Expected Result:** Returns 400 error with message "Missing required fields"
- **Status:** ✅ Pass / ❌ Fail

**Test Case 1.6: Invalid data types**
- **Preconditions:** User is authenticated
- **Steps:**
  1. POST to `/api/finances` with `monthlyCost` as string instead of number
  2. Verify response handles type conversion or returns error
- **Expected Result:** Request is validated properly
- **Status:** ✅ Pass / ❌ Fail

**Test Case 1.7: Negative monthly cost**
- **Preconditions:** User is authenticated
- **Steps:**
  1. POST to `/api/finances` with `monthlyCost: -1000`
  2. Verify system accepts (expenses can be represented as positive values)
- **Expected Result:** Item is created (business logic determines sign based on category)
- **Status:** ✅ Pass / ❌ Fail

### DELETE /api/finances/:id

**Test Case 1.8: Delete own financial item**
- **Preconditions:** User is authenticated and has a financial item with ID 123
- **Steps:**
  1. DELETE request to `/api/finances/123`
  2. Verify response status is 200
  3. Verify item is removed from database
  4. GET `/api/finances` to confirm deletion
- **Expected Result:** Item is deleted successfully
- **Status:** ✅ Pass / ❌ Fail

**Test Case 1.9: Delete another user's item (security)**
- **Preconditions:** User A is authenticated, User B has item ID 456
- **Steps:**
  1. User A attempts DELETE to `/api/finances/456`
  2. Verify request fails or silently succeeds without deleting User B's item
  3. Verify User B's item still exists
- **Expected Result:** User A cannot delete User B's items
- **Status:** ✅ Pass / ❌ Fail

**Test Case 1.10: Delete non-existent item**
- **Preconditions:** User is authenticated
- **Steps:**
  1. DELETE request to `/api/finances/999999` (non-existent ID)
  2. Verify response handles gracefully
- **Expected Result:** Returns success or 404, doesn't crash
- **Status:** ✅ Pass / ❌ Fail

**Test Case 1.11: Delete with invalid ID format**
- **Preconditions:** User is authenticated
- **Steps:**
  1. DELETE request to `/api/finances/abc` (non-numeric ID)
  2. Verify response status is 400
- **Expected Result:** Returns error for invalid item ID
- **Status:** ✅ Pass / ❌ Fail

---

## Security & Authorization

**Test Case 2.1: User isolation - GET requests**
- **Preconditions:** User A and User B both have financial items
- **Steps:**
  1. User A logs in and makes GET request
  2. Verify response only contains User A's items
  3. Verify User B's items are not visible
- **Expected Result:** Complete data isolation between users
- **Status:** ✅ Pass / ❌ Fail

**Test Case 2.2: User isolation - POST requests**
- **Preconditions:** User A is authenticated
- **Steps:**
  1. User A creates a financial item
  2. Verify item's userId matches User A
  3. User B logs in and fetches items
  4. Verify User A's item is not visible to User B
- **Expected Result:** Items are correctly scoped to creating user
- **Status:** ✅ Pass / ❌ Fail

**Test Case 2.3: Session validation**
- **Preconditions:** None
- **Steps:**
  1. Make requests without valid session cookie
  2. Verify all endpoints reject unauthorized requests
- **Expected Result:** 401 Unauthorized or redirect to login
- **Status:** ✅ Pass / ❌ Fail

**Test Case 2.4: SQL injection protection**
- **Preconditions:** User is authenticated
- **Steps:**
  1. Attempt to create item with SQL injection in `item` field:
     ```json
     {"item": "'; DROP TABLE financial_items; --", "category": "General", "monthlyCost": 100, "recurType": "Monthly"}
     ```
  2. Verify database is not affected
  3. Verify item is created with the literal string
- **Expected Result:** Drizzle ORM prevents SQL injection
- **Status:** ✅ Pass / ❌ Fail

---

## Data Validation

**Test Case 3.1: Category validation**
- **Preconditions:** User is authenticated
- **Steps:**
  1. Create item with valid category from CATEGORIES list
  2. Create item with invalid/custom category
  3. Verify both are accepted (no strict validation currently)
- **Expected Result:** System accepts any category string
- **Status:** ✅ Pass / ❌ Fail

**Test Case 3.2: Recur type validation**
- **Preconditions:** User is authenticated
- **Steps:**
  1. Test each valid recur type: "Monthly", "Yearly (Amortized)", "Biweekly (Summed Monthly)", "2x a Year"
  2. Verify all are accepted
- **Expected Result:** All standard recur types work
- **Status:** ✅ Pass / ❌ Fail

**Test Case 3.3: Monthly cost boundaries**
- **Preconditions:** User is authenticated
- **Steps:**
  1. Create item with monthlyCost: 0
  2. Create item with monthlyCost: 999999999 (very large)
  3. Create item with monthlyCost: 1 (minimum)
  4. Verify all are accepted
- **Expected Result:** System handles edge values for costs
- **Status:** ✅ Pass / ❌ Fail

**Test Case 3.4: Item name length**
- **Preconditions:** User is authenticated
- **Steps:**
  1. Create item with very long name (500+ characters)
  2. Create item with empty string name
  3. Verify validation behavior
- **Expected Result:** Long names are truncated or rejected, empty names rejected
- **Status:** ✅ Pass / ❌ Fail

**Test Case 3.5: Special characters in item name**
- **Preconditions:** User is authenticated
- **Steps:**
  1. Create item with name containing: `<script>alert('xss')</script>`
  2. Verify it's stored safely and rendered safely in UI
- **Expected Result:** XSS prevention is in place
- **Status:** ✅ Pass / ❌ Fail

**Test Case 3.6: Unicode characters**
- **Preconditions:** User is authenticated
- **Steps:**
  1. Create item with emoji: "🏠 Mortgage Payment"
  2. Create item with Chinese characters: "房租"
  3. Verify items are saved and displayed correctly
- **Expected Result:** Full Unicode support
- **Status:** ✅ Pass / ❌ Fail

---

## UI/UX Testing

### Web Finance Page (/finances)

**Test Case 4.1: Page loads with data**
- **Preconditions:** User has financial items
- **Steps:**
  1. Navigate to `/finances`
  2. Verify pie chart renders
  3. Verify summary cards show correct totals
  4. Verify table displays all items
- **Expected Result:** All components render correctly
- **Status:** ✅ Pass / ❌ Fail

**Test Case 4.2: Page loads empty state**
- **Preconditions:** User has no financial items
- **Steps:**
  1. Navigate to `/finances`
  2. Verify empty state message is shown
  3. Verify no errors in console
- **Expected Result:** Graceful empty state handling
- **Status:** ✅ Pass / ❌ Fail

**Test Case 4.3: Add item flow**
- **Preconditions:** User is on finances page
- **Steps:**
  1. Click "Add Item" button
  2. Fill in all fields
  3. Click submit
  4. Verify item appears in table immediately
  5. Verify pie chart updates
  6. Verify totals update
- **Expected Result:** Optimistic UI updates or immediate refresh
- **Status:** ✅ Pass / ❌ Fail

**Test Case 4.4: Delete item flow**
- **Preconditions:** User has at least one financial item
- **Steps:**
  1. Click delete button on an item
  2. Verify item is removed from table
  3. Verify pie chart updates
  4. Verify totals recalculate
- **Expected Result:** UI updates immediately
- **Status:** ✅ Pass / ❌ Fail

**Test Case 4.5: Currency formatting**
- **Preconditions:** User has items with various costs
- **Steps:**
  1. Verify costs display as: $X.XX format
  2. Verify large numbers format correctly (e.g., $1,234.56)
  3. Verify cents are always shown (2 decimal places)
- **Expected Result:** Consistent currency formatting
- **Status:** ✅ Pass / ❌ Fail

**Test Case 4.6: Pie chart colors**
- **Preconditions:** User has items in multiple categories
- **Steps:**
  1. Verify each category has distinct color
  2. Verify Income is green (#22C55E)
  3. Verify expense categories use defined colors
  4. Verify unknown categories get default color
- **Expected Result:** Visually distinct categories
- **Status:** ✅ Pass / ❌ Fail

**Test Case 4.7: Status messages**
- **Preconditions:** Create different financial scenarios
- **Steps:**
  1. Set expenses > income → Verify red warning
  2. Set expenses = income → Verify orange caution
  3. Set savings 51-60% → Verify green "good job"
  4. Set savings >60% → Verify green "excellent"
  5. Set savings <51% → Verify yellow "room for improvement"
- **Expected Result:** Correct status message for each scenario
- **Status:** ✅ Pass / ❌ Fail

**Test Case 4.8: Tab switching (Chart vs Table)**
- **Preconditions:** User is on finances page
- **Steps:**
  1. Click between Chart and Table tabs
  2. Verify content switches appropriately
  3. Verify no layout shifts or flashing
- **Expected Result:** Smooth tab transitions
- **Status:** ✅ Pass / ❌ Fail

**Test Case 4.9: Form validation feedback**
- **Preconditions:** User clicks "Add Item"
- **Steps:**
  1. Try to submit empty form
  2. Verify error toast appears
  3. Fill only some fields and submit
  4. Verify validation messages
- **Expected Result:** Clear validation feedback
- **Status:** ✅ Pass / ❌ Fail

**Test Case 4.10: Responsive design - Mobile**
- **Preconditions:** Access finances page on mobile viewport
- **Steps:**
  1. Verify summary cards stack vertically
  2. Verify pie chart is appropriately sized
  3. Verify table is scrollable or adapts
  4. Verify add item form is usable
- **Expected Result:** Fully functional on mobile
- **Status:** ✅ Pass / ❌ Fail

---

## Dashboard Integration

**Test Case 5.1: Finance widget displays on dashboard**
- **Preconditions:** User has financial data
- **Steps:**
  1. Navigate to `/dashboard`
  2. Verify 2x2 grid layout with: Skills, Schedule, Priorities, Finances
  3. Verify Finance widget shows pie chart
- **Expected Result:** Finance widget appears in bottom-right
- **Status:** ✅ Pass / ❌ Fail

**Test Case 5.2: Finance widget - empty state**
- **Preconditions:** User has no financial data
- **Steps:**
  1. Navigate to `/dashboard`
  2. Verify Finance widget shows empty state message
  3. Verify no console errors
- **Expected Result:** Shows "No financial data yet" message with dollar icon
- **Status:** ✅ Pass / ❌ Fail

**Test Case 5.3: Finance widget - View Details link**
- **Preconditions:** User is on dashboard
- **Steps:**
  1. Click "View Details" button in Finance widget
  2. Verify navigation to `/finances`
- **Expected Result:** Redirects to full finances page
- **Status:** ✅ Pass / ❌ Fail

**Test Case 5.4: Finance widget - calculations**
- **Preconditions:** User has income and expense items
- **Steps:**
  1. View Finance widget
  2. Verify Net Income calculation is correct
  3. Verify Savings Rate percentage is accurate
  4. Compare with full finance page calculations
- **Expected Result:** Dashboard widget matches full page calculations
- **Status:** ✅ Pass / ❌ Fail

**Test Case 5.5: Finance widget - pie chart responsiveness**
- **Preconditions:** User has financial data
- **Steps:**
  1. Resize browser window
  2. Verify pie chart scales appropriately
  3. Verify labels remain readable
- **Expected Result:** Chart adapts to container size
- **Status:** ✅ Pass / ❌ Fail

**Test Case 5.6: Dashboard grid layout - desktop**
- **Preconditions:** Desktop viewport (>768px)
- **Steps:**
  1. Navigate to dashboard
  2. Verify 2x2 grid (Skills, Schedule, Priorities, Finances)
  3. Verify all widgets have equal height
- **Expected Result:** Clean 2x2 grid on desktop
- **Status:** ✅ Pass / ❌ Fail

**Test Case 5.7: Dashboard grid layout - mobile**
- **Preconditions:** Mobile viewport (<768px)
- **Steps:**
  1. Navigate to dashboard
  2. Verify widgets stack vertically
  3. Verify Finance widget is included
- **Expected Result:** Vertical stacking on mobile
- **Status:** ✅ Pass / ❌ Fail

---

## Mobile/iOS Testing

### Settings - Finances Page (/settings/finances)

**Test Case 6.1: Access from settings menu**
- **Preconditions:** User is on iOS/mobile, viewing `/settings`
- **Steps:**
  1. Locate "Finances" option (should be first in list)
  2. Verify icon is dollar sign ($)
  3. Verify green color gradient
  4. Tap to navigate
- **Expected Result:** Navigates to `/settings/finances`
- **Status:** ✅ Pass / ❌ Fail

**Test Case 6.2: Settings finances page loads**
- **Preconditions:** User navigates to `/settings/finances`
- **Steps:**
  1. Verify page header with back button
  2. Verify summary cards (Income, Expenses, Net Income)
  3. Verify pie chart renders
  4. Verify item list displays
- **Expected Result:** All components visible and functional
- **Status:** ✅ Pass / ❌ Fail

**Test Case 6.3: Back button navigation**
- **Preconditions:** User is on `/settings/finances`
- **Steps:**
  1. Tap back button (ChevronLeft icon)
  2. Verify navigation back to `/settings`
- **Expected Result:** Returns to settings menu
- **Status:** ✅ Pass / ❌ Fail

**Test Case 6.4: Add item flow - mobile**
- **Preconditions:** User is on settings finances page
- **Steps:**
  1. Tap "Add Financial Item" button
  2. Verify form expands/displays
  3. Fill in all fields using mobile keyboard
  4. Tap "Add Item"
  5. Verify item appears in list
  6. Verify form closes
- **Expected Result:** Smooth mobile add item experience
- **Status:** ✅ Pass / ❌ Fail

**Test Case 6.5: Delete item - mobile**
- **Preconditions:** User has items on settings finances page
- **Steps:**
  1. Tap delete (trash icon) on an item
  2. Verify item is removed
  3. Verify totals update
  4. Verify pie chart updates
- **Expected Result:** Delete works on mobile
- **Status:** ✅ Pass / ❌ Fail

**Test Case 6.6: Compact layout - summary cards**
- **Preconditions:** Mobile viewport
- **Steps:**
  1. Verify Income and Expenses cards are side-by-side (2 columns)
  2. Verify Net Income card is full width below
  3. Verify text sizes are readable on mobile
- **Expected Result:** Optimized mobile layout
- **Status:** ✅ Pass / ❌ Fail

**Test Case 6.7: Item list scrolling**
- **Preconditions:** User has many items (20+)
- **Steps:**
  1. Scroll through item list
  2. Verify smooth scrolling
  3. Verify no layout issues
  4. Verify header remains fixed
- **Expected Result:** Scrollable list with good performance
- **Status:** ✅ Pass / ❌ Fail

**Test Case 6.8: Touch target sizes**
- **Preconditions:** Mobile device
- **Steps:**
  1. Verify all buttons are at least 44x44px
  2. Verify form inputs are easily tappable
  3. Verify delete buttons are accessible
- **Expected Result:** All interactive elements meet mobile accessibility standards
- **Status:** ✅ Pass / ❌ Fail

**Test Case 6.9: Keyboard handling**
- **Preconditions:** User is adding item on mobile
- **Steps:**
  1. Tap into "Item Name" field
  2. Verify keyboard appears
  3. Verify page scrolls to keep input visible
  4. Fill form and submit
  5. Verify keyboard dismisses
- **Expected Result:** Proper keyboard behavior
- **Status:** ✅ Pass / ❌ Fail

---

## Edge Cases

**Test Case 7.1: Zero income scenario**
- **Preconditions:** User has only expense items, no income
- **Steps:**
  1. View finances page
  2. Verify savings rate calculation doesn't divide by zero
  3. Verify appropriate message is shown
- **Expected Result:** No crashes, handles 0 income gracefully
- **Status:** ✅ Pass / ❌ Fail

**Test Case 7.2: Exactly break-even**
- **Preconditions:** Total income exactly equals total expenses
- **Steps:**
  1. View finances page
  2. Verify savings rate is 0%
  3. Verify orange warning message appears
- **Expected Result:** Correct status for break-even scenario
- **Status:** ✅ Pass / ❌ Fail

**Test Case 7.3: Very large amounts**
- **Preconditions:** User creates item with monthlyCost: 100000000 (1 million dollars in cents)
- **Steps:**
  1. Create item
  2. Verify number displays correctly
  3. Verify pie chart handles large values
  4. Verify calculations remain accurate
- **Expected Result:** System handles large financial values
- **Status:** ✅ Pass / ❌ Fail

**Test Case 7.4: Many items (100+)**
- **Preconditions:** User has 100+ financial items
- **Steps:**
  1. Load finances page
  2. Verify page loads in reasonable time (<3s)
  3. Verify table renders all items
  4. Verify pie chart isn't cluttered
  5. Verify scrolling performance
- **Expected Result:** Good performance with many items
- **Status:** ✅ Pass / ❌ Fail

**Test Case 7.5: Concurrent modifications**
- **Preconditions:** User has finances page open in two tabs
- **Steps:**
  1. Add item in Tab 1
  2. Delete item in Tab 2
  3. Refresh Tab 1
  4. Verify data is consistent
- **Expected Result:** No data corruption, last write wins
- **Status:** ✅ Pass / ❌ Fail

**Test Case 7.6: Network error during creation**
- **Preconditions:** Simulate network failure
- **Steps:**
  1. Disconnect network
  2. Try to add financial item
  3. Verify error toast appears
  4. Reconnect network
  5. Verify page still functional
- **Expected Result:** Graceful error handling
- **Status:** ✅ Pass / ❌ Fail

**Test Case 7.7: Network error during deletion**
- **Preconditions:** Simulate network failure
- **Steps:**
  1. Disconnect network
  2. Try to delete item
  3. Verify error message
  4. Verify item remains in list
  5. Reconnect and retry
- **Expected Result:** Failed deletion doesn't remove item from UI
- **Status:** ✅ Pass / ❌ Fail

**Test Case 7.8: Browser back/forward navigation**
- **Preconditions:** User navigates: dashboard → finances → settings
- **Steps:**
  1. Click browser back button
  2. Verify returns to finances
  3. Click back again
  4. Verify returns to dashboard
  5. Click forward
  6. Verify state is preserved
- **Expected Result:** Proper browser history handling
- **Status:** ✅ Pass / ❌ Fail

**Test Case 7.9: Session expiration**
- **Preconditions:** User is on finances page, session expires
- **Steps:**
  1. Wait for session to expire (or manually clear session)
  2. Try to add/delete item
  3. Verify redirect to login or error
  4. Log back in
  5. Verify finances page still works
- **Expected Result:** Proper session handling
- **Status:** ✅ Pass / ❌ Fail

**Test Case 7.10: Decimal precision**
- **Preconditions:** User creates items with precise costs
- **Steps:**
  1. Create item with $10.99 (entered as dollars, stored as 1099 cents)
  2. Create item with $0.01
  3. Verify totals calculate correctly to the penny
  4. Verify no floating point errors in display
- **Expected Result:** Accurate cent-level precision
- **Status:** ✅ Pass / ❌ Fail

---

## Performance Testing

**Test Case 8.1: Initial page load time**
- **Preconditions:** User has typical amount of data (20-50 items)
- **Steps:**
  1. Clear browser cache
  2. Navigate to `/finances`
  3. Measure time to interactive
- **Expected Result:** Page loads in <2 seconds
- **Status:** ✅ Pass / ❌ Fail

**Test Case 8.2: API response time**
- **Preconditions:** Database has data for user
- **Steps:**
  1. Measure GET `/api/finances` response time
  2. Measure POST `/api/finances` response time
  3. Measure DELETE `/api/finances/:id` response time
- **Expected Result:** All API calls complete in <500ms
- **Status:** ✅ Pass / ❌ Fail

**Test Case 8.3: Pie chart render performance**
- **Preconditions:** User has 10+ categories
- **Steps:**
  1. Measure time for pie chart to render
  2. Verify no frame drops
  3. Test with 20+ categories
- **Expected Result:** Smooth rendering, no lag
- **Status:** ✅ Pass / ❌ Fail

**Test Case 8.4: Table render with many items**
- **Preconditions:** User has 200+ items
- **Steps:**
  1. Navigate to table view
  2. Measure render time
  3. Test scrolling performance
- **Expected Result:** Renders in <1s, smooth scrolling
- **Status:** ✅ Pass / ❌ Fail

**Test Case 8.5: Memory usage**
- **Preconditions:** User has finances page open
- **Steps:**
  1. Monitor browser memory usage
  2. Add/delete items multiple times
  3. Switch tabs back and forth
  4. Check for memory leaks
- **Expected Result:** Stable memory usage, no leaks
- **Status:** ✅ Pass / ❌ Fail

---

## Integration Testing

**Test Case 9.1: CSV import accuracy**
- **Preconditions:** Have test CSV file
- **Steps:**
  1. Run import script with CSV
  2. Verify all valid rows imported
  3. Verify dollar amounts converted to cents correctly
  4. Verify categories preserved
  5. Verify recur types preserved
- **Expected Result:** All CSV data imported accurately
- **Status:** ✅ Pass / ❌ Fail

**Test Case 9.2: Database migration**
- **Preconditions:** Fresh database
- **Steps:**
  1. Run migration script
  2. Verify `financial_items` table created
  3. Verify all columns exist with correct types
  4. Verify indexes on userId and category
- **Expected Result:** Migration creates complete schema
- **Status:** ✅ Pass / ❌ Fail

**Test Case 9.3: Cross-browser compatibility**
- **Preconditions:** Test on Chrome, Firefox, Safari
- **Steps:**
  1. Test all finance features on each browser
  2. Verify pie chart renders correctly
  3. Verify forms work
  4. Verify responsive design
- **Expected Result:** Consistent experience across browsers
- **Status:** ✅ Pass / ❌ Fail

---

## Accessibility Testing

**Test Case 10.1: Keyboard navigation**
- **Preconditions:** User on finances page
- **Steps:**
  1. Tab through all interactive elements
  2. Verify focus indicators visible
  3. Verify can add/delete items using only keyboard
- **Expected Result:** Fully keyboard accessible
- **Status:** ✅ Pass / ❌ Fail

**Test Case 10.2: Screen reader compatibility**
- **Preconditions:** Enable screen reader (VoiceOver/NVDA)
- **Steps:**
  1. Navigate finances page
  2. Verify all content is announced
  3. Verify form labels are read
  4. Verify button purposes are clear
- **Expected Result:** All content accessible to screen readers
- **Status:** ✅ Pass / ❌ Fail

**Test Case 10.3: Color contrast**
- **Preconditions:** Use contrast checker tool
- **Steps:**
  1. Check all text against backgrounds
  2. Verify status messages meet WCAG AA standards
  3. Verify pie chart labels are readable
- **Expected Result:** All text meets WCAG 2.1 AA standards
- **Status:** ✅ Pass / ❌ Fail

**Test Case 10.4: Focus management**
- **Preconditions:** User adds/deletes items
- **Steps:**
  1. Add item, verify focus returns to appropriate element
  2. Delete item, verify focus handled gracefully
  3. Open/close forms, verify focus trapped properly
- **Expected Result:** Logical focus management
- **Status:** ✅ Pass / ❌ Fail

---

## Summary

**Total Test Cases:** 80+

**Priority Levels:**
- **P0 (Critical):** Security, data isolation, authentication - Test Cases 1.3, 1.9, 2.1, 2.2, 2.3, 2.4
- **P1 (High):** Core CRUD operations - Test Cases 1.1, 1.4, 1.8, 4.3, 4.4
- **P2 (Medium):** UI/UX, calculations - Test Cases 4.1, 4.5, 4.7, 5.4
- **P3 (Low):** Edge cases, performance - Test Cases 7.x, 8.x

**Testing Tools:**
- Manual testing for UI/UX
- Postman/Insomnia for API testing
- Browser DevTools for performance
- Jest/Vitest for unit tests (future)
- Playwright/Cypress for E2E tests (future)

**Next Steps:**
1. Execute P0 security tests immediately
2. Run P1 core functionality tests
3. Automate critical test cases
4. Add E2E test coverage for user flows
5. Performance benchmark and optimize


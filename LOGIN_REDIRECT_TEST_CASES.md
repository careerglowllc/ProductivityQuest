# Login Redirect Test Cases

## Test Case 1: Unauthenticated Access to Dashboard
**Description:** Verify unauthenticated user is redirected to login when accessing dashboard  
**Steps:**
1. Open browser in incognito/private mode (no session)
2. Navigate directly to `/dashboard`

**Expected Result:**
- User is automatically redirected to `/login` page
- No 404 error appears
- Login page displays correctly

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 2: Unauthenticated Access to Tasks
**Description:** Verify redirect when accessing tasks page  
**Steps:**
1. Ensure not logged in
2. Navigate directly to `/tasks`

**Expected Result:**
- User is redirected to `/login`
- No 404 error

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 3: Unauthenticated Access to Calendar
**Description:** Verify redirect when accessing calendar page  
**Steps:**
1. Ensure not logged in
2. Navigate directly to `/calendar`

**Expected Result:**
- User is redirected to `/login`
- No 404 error

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 4: Unauthenticated Access to Shop
**Description:** Verify redirect when accessing shop page  
**Steps:**
1. Ensure not logged in
2. Navigate directly to `/shop`

**Expected Result:**
- User is redirected to `/login`
- No 404 error

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 5: Unauthenticated Access to Skills
**Description:** Verify redirect when accessing skills page  
**Steps:**
1. Ensure not logged in
2. Navigate directly to `/skills`

**Expected Result:**
- User is redirected to `/login`
- No 404 error

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 6: Unauthenticated Access to Settings
**Description:** Verify redirect when accessing settings  
**Steps:**
1. Ensure not logged in
2. Navigate directly to `/settings`

**Expected Result:**
- User is redirected to `/login`
- No 404 error

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 7: Unauthenticated Access to Nested Settings Routes
**Description:** Verify redirect for nested settings routes  
**Steps:**
1. Ensure not logged in
2. Navigate to `/settings/calendar`
3. Navigate to `/settings/timezone`
4. Navigate to `/settings/google-calendar`

**Expected Result:**
- Each attempt redirects to `/login`
- No 404 errors

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 8: Unauthenticated Access to NPCs
**Description:** Verify redirect when accessing NPCs page  
**Steps:**
1. Ensure not logged in
2. Navigate directly to `/npcs`

**Expected Result:**
- User is redirected to `/login`

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 9: Unauthenticated Access to Campaigns
**Description:** Verify redirect when accessing campaigns page  
**Steps:**
1. Ensure not logged in
2. Navigate directly to `/campaigns`

**Expected Result:**
- User is redirected to `/login`

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 10: Unauthenticated Access to Recycling Bin
**Description:** Verify redirect when accessing recycling bin  
**Steps:**
1. Ensure not logged in
2. Navigate directly to `/recycling-bin`

**Expected Result:**
- User is redirected to `/login`

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 11: Login Page Access When Not Logged In
**Description:** Verify unauthenticated user can access login page  
**Steps:**
1. Ensure not logged in
2. Navigate to `/login`

**Expected Result:**
- Login page displays correctly
- No redirect occurs
- Form is functional

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 12: Register Page Access When Not Logged In
**Description:** Verify unauthenticated user can access register page  
**Steps:**
1. Ensure not logged in
2. Navigate to `/register`

**Expected Result:**
- Register page displays correctly
- No redirect occurs
- Form is functional

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 13: Landing Page Access When Not Logged In
**Description:** Verify unauthenticated user can access landing page  
**Steps:**
1. Ensure not logged in
2. Navigate to `/` (root)

**Expected Result:**
- Landing page displays correctly
- No redirect to login
- User can see marketing/info content

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 14: Successful Login Redirects to Dashboard
**Description:** Verify successful login redirects user to dashboard  
**Steps:**
1. Navigate to `/login`
2. Enter valid credentials
3. Click "Sign In"

**Expected Result:**
- User is authenticated
- Automatically redirected to `/dashboard`
- Session is established
- No manual navigation needed

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 15: Login with Username
**Description:** Verify user can login with username  
**Steps:**
1. Navigate to `/login`
2. Enter username (not email) in username field
3. Enter correct password
4. Submit form

**Expected Result:**
- Login succeeds
- User is redirected to dashboard
- Session is created

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 16: Login with Email
**Description:** Verify user can login with email  
**Steps:**
1. Navigate to `/login`
2. Enter email in username field
3. Enter correct password
4. Submit form

**Expected Result:**
- Login succeeds
- User is redirected to dashboard
- Session is created

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 17: Failed Login - Invalid Credentials
**Description:** Verify appropriate error for invalid credentials  
**Steps:**
1. Navigate to `/login`
2. Enter invalid username/password
3. Submit form

**Expected Result:**
- Error toast appears with "Invalid credentials" message
- User remains on login page
- Form is still functional
- No session is created

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 18: Failed Login - Missing Fields
**Description:** Verify validation for missing fields  
**Steps:**
1. Navigate to `/login`
2. Leave username or password empty
3. Try to submit

**Expected Result:**
- HTML5 validation prevents submission
- Required field indicators appear
- No API call is made

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 19: Login Button Loading State
**Description:** Verify button shows loading state during login  
**Steps:**
1. Navigate to `/login`
2. Enter credentials
3. Click "Sign In"
4. Observe button before response

**Expected Result:**
- Button text changes to "Signing in..."
- Button is disabled during request
- Button re-enables after response

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 20: Session Cookie Creation
**Description:** Verify session cookie is created on successful login  
**Steps:**
1. Open browser developer tools
2. Navigate to `/login`
3. Enter valid credentials and login
4. Check cookies in developer tools

**Expected Result:**
- Session cookie is created
- Cookie has proper attributes (HttpOnly, Secure in production)
- Cookie is sent with subsequent requests

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 21: Authenticated User Accessing Login Page
**Description:** Verify logged-in user accessing login page  
**Steps:**
1. Log in successfully
2. Manually navigate to `/login`

**Expected Result:**
- User can access login page
- (Optional) Could redirect to dashboard since already logged in
- No errors occur

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 22: Session Persistence Across Page Refreshes
**Description:** Verify session persists after page refresh  
**Steps:**
1. Log in successfully
2. Navigate to dashboard
3. Refresh the page

**Expected Result:**
- User remains logged in
- Dashboard loads correctly
- No redirect to login

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 23: Deep Link After Login
**Description:** Verify user can access deep-linked page after login  
**Steps:**
1. While logged out, try to access `/calendar`
2. Get redirected to `/login`
3. Log in successfully

**Expected Result:**
- User logs in successfully
- (Ideal) User is redirected to originally requested page (`/calendar`)
- (Acceptable) User is redirected to `/dashboard`

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 24: Network Error During Login
**Description:** Verify error handling for network issues  
**Steps:**
1. Navigate to `/login`
2. Disconnect network or block API
3. Try to login

**Expected Result:**
- Error toast appears: "Failed to connect to server"
- User remains on login page
- Form can be retried
- Button returns to normal state

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Test Case 25: Multiple Login Attempts
**Description:** Verify system handles multiple login attempts  
**Steps:**
1. Navigate to `/login`
2. Try logging in with wrong credentials 3-5 times
3. Try logging in with correct credentials

**Expected Result:**
- Each failed attempt shows error
- Successful login still works
- (Optional) Rate limiting if implemented

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Edge Cases

### EC1: Very Long Username/Password
**Description:** Test with extremely long input values  
**Expected Result:** System handles gracefully, shows appropriate error

### EC2: Special Characters in Credentials
**Description:** Test with special characters in username/password  
**Expected Result:** Special characters are properly handled and encoded

### EC3: SQL Injection Attempt
**Description:** Test with SQL injection patterns in login form  
**Expected Result:** Inputs are properly sanitized, no security vulnerability

### EC4: XSS Attempt
**Description:** Test with XSS patterns in login form  
**Expected Result:** Inputs are escaped, no script execution

---

## Security Tests

### S1: Password Not Visible in Network Tab
**Description:** Check that password is not exposed in network requests  
**Expected Result:** Password is sent securely, not visible in plain text in dev tools

### S2: Session Cookie Security
**Description:** Verify session cookie has proper security flags  
**Expected Result:** Cookie is HttpOnly, Secure (in production), SameSite

### S3: CSRF Protection
**Description:** Verify CSRF protection is in place  
**Expected Result:** Login requests include CSRF tokens or use proper headers

---

## Performance Tests

### PT1: Login Response Time
**Description:** Measure time from submit to redirect  
**Expected Result:** Login completes in < 2 seconds

### PT2: Page Load After Login
**Description:** Measure time to load dashboard after login  
**Expected Result:** Dashboard loads in < 3 seconds

---

## Accessibility Tests

### A1: Keyboard Navigation
**Description:** Complete login using only keyboard  
**Expected Result:** Tab navigation works, Enter submits form

### A2: Screen Reader Support
**Description:** Use screen reader to login  
**Expected Result:** All fields and buttons are properly labeled

### A3: Error Announcement
**Description:** Verify errors are announced to screen readers  
**Expected Result:** Error messages are in ARIA live regions

---

## Notes
- Test in different browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile devices (iOS, Android)
- Verify behavior in incognito/private mode
- Test with browser extensions disabled
- Check console for any JavaScript errors during login process

# Edit Skills Feature Test Cases

## Test Suite: Manual Skill Level and XP Adjustment

### Test Case 1: Basic Skill Icon Change
**Objective:** Verify that skill icons can be changed successfully

**Preconditions:**
- User is logged in
- User has at least one skill (default or custom)
- Navigate to Skills page

**Steps:**
1. Locate any skill card (e.g., "Craftsman" with Wrench icon)
2. Click the blue "Edit" button on the skill card
3. Verify the modal opens with title "Edit [Skill Name]"
4. Click a different icon from the grid (e.g., Hammer instead of Wrench)
5. Note that the selected icon has a purple border
6. Click "Update Skill" button

**Expected Results:**
- Edit modal opens successfully
- Current icon is highlighted with purple border
- Clicking new icon updates the selection (purple border moves)
- Modal shows: Icon grid, Level input, XP input
- "Update Skill" button becomes enabled
- Toast notification: "✓ Skill Updated!"
- Modal closes
- Skill card now shows the new icon (Hammer)
- Spider chart updates with new icon
- Change persists after page refresh

**Status:** ⏳ Pending Manual Testing

---

### Test Case 2: Manual Level Adjustment - Increase
**Objective:** Verify that skill level can be increased manually

**Preconditions:**
- User has a skill at Level 3 with 50/104 XP

**Steps:**
1. Click Edit button on the Level 3 skill
2. In the "Level" input field, change value from 3 to 10
3. Keep XP at current value (50)
4. Click "Update Skill"

**Expected Results:**
- Level input accepts the value 10
- Modal shows "Update Skill" button is enabled
- After clicking Update:
  - Toast: "✓ Skill Updated!"
  - Skill card shows "Level 10"
  - XP bar shows: 50 / [new maxXp for level 10]
  - Progress percentage updates accordingly
  - Spider chart reflects new level (larger radius for this skill)
  - Database is updated (verify by refresh)

**Status:** ⏳ Pending Manual Testing

---

### Test Case 3: Manual Level Adjustment - Decrease
**Objective:** Verify that skill level can be decreased manually

**Preconditions:**
- User has a skill at Level 15

**Steps:**
1. Click Edit on the Level 15 skill
2. Change Level from 15 to 5
3. Change XP to 0 (reset to start of level)
4. Click "Update Skill"

**Expected Results:**
- Level change to 5 is accepted
- XP change to 0 is accepted
- Skill card updates to show Level 5 with 0% progress
- No errors occur
- Change persists after refresh

**Status:** ⏳ Pending Manual Testing

---

### Test Case 4: Manual XP Adjustment Within Level
**Objective:** Verify that XP can be adjusted without changing level

**Preconditions:**
- User has a skill at Level 8 with maxXp of 260 and current XP of 100

**Steps:**
1. Click Edit on the skill
2. Keep Level at 8
3. Change XP from 100 to 250 (near max)
4. Note the modal shows "XP (max: 260)"
5. Click "Update Skill"

**Expected Results:**
- XP input shows the max value hint: "XP (max: 260)"
- Value 250 is accepted
- After update:
  - Skill card shows progress bar at ~96% (250/260)
  - "X XP to next level" updates to show only 10 XP needed
  - No level change occurs
  - Database stores the new XP value

**Status:** ⏳ Pending Manual Testing

---

### Test Case 5: Validation - Level Minimum Boundary
**Objective:** Verify that level cannot be set below 1

**Preconditions:**
- User has any skill

**Steps:**
1. Click Edit on the skill
2. Try to set Level to 0
3. Try to set Level to -5
4. Observe validation behavior

**Expected Results:**
- Input field has min="1" attribute
- Browser prevents entering values below 1
- If somehow entered, backend validates and returns error
- User receives clear error message
- Skill level remains unchanged

**Status:** ⏳ Pending Manual Testing

---

### Test Case 6: Validation - XP Minimum Boundary
**Objective:** Verify that XP cannot be set below 0

**Preconditions:**
- User has any skill

**Steps:**
1. Click Edit on the skill
2. Try to set XP to -10
3. Observe validation behavior

**Expected Results:**
- Input field has min="0" attribute
- Negative values are prevented by browser
- If entered, backend validation rejects it
- Clear error message shown to user

**Status:** ⏳ Pending Manual Testing

---

### Test Case 7: Validation - XP Maximum Boundary
**Objective:** Verify that XP cannot exceed maxXp for current level

**Preconditions:**
- User has a skill at Level 5 with maxXp of 172

**Steps:**
1. Click Edit on the skill
2. Try to set XP to 500 (exceeds maxXp of 172)
3. Attempt to update

**Expected Results:**
- Input field shows max="172" attribute
- Browser prevents values above 172
- Modal displays "XP (max: 172)" label
- If value exceeds max, update fails with error
- User receives feedback about the maximum allowed

**Status:** ⏳ Pending Manual Testing

---

### Test Case 8: Simultaneous Icon, Level, and XP Change
**Objective:** Verify that all three fields can be changed in one update

**Preconditions:**
- User has "Craftsman" skill at Level 3, 50 XP, with Wrench icon

**Steps:**
1. Click Edit on Craftsman
2. Change icon from Wrench to Hammer
3. Change Level from 3 to 7
4. Change XP from 50 to 150
5. Click "Update Skill"

**Expected Results:**
- All three changes are saved in one operation
- Toast: "✓ Skill Updated!"
- Skill card reflects all changes:
  - Icon: Hammer
  - Level: 7
  - XP: 150 / [maxXp for level 7]
- Single API call to `/api/skills/:skillId/icon` with all three fields
- Database updated with all values
- Changes persist after refresh

**Status:** ⏳ Pending Manual Testing

---

### Test Case 9: Edit Modal Cancel Behavior
**Objective:** Verify that canceling edit discards changes

**Preconditions:**
- User has any skill

**Steps:**
1. Click Edit on the skill
2. Change icon to a different one
3. Change Level to a different value
4. Change XP to a different value
5. Click "Cancel" button
6. Reopen the edit modal

**Expected Results:**
- Cancel button closes the modal
- No API call is made
- No toast notification appears
- Skill card shows original values (unchanged)
- Reopening modal shows original values selected

**Status:** ⏳ Pending Manual Testing

---

### Test Case 10: Edit Custom Skill
**Objective:** Verify that custom skills can be edited same as default skills

**Preconditions:**
- User has created a custom skill (e.g., "Guitar" with Music icon)

**Steps:**
1. Navigate to Skills page
2. Locate the custom skill
3. Click Edit on the custom skill
4. Change icon, level, and XP
5. Click "Update Skill"

**Expected Results:**
- Custom skills have Edit button
- Edit modal works identically to default skills
- All changes save successfully
- Custom skill metadata (name, description) remains unchanged
- Only icon, level, and XP are updated

**Status:** ⏳ Pending Manual Testing

---

### Test Case 11: Visual Feedback During Edit
**Objective:** Verify proper UI/UX feedback during edit process

**Preconditions:**
- User has any skill

**Steps:**
1. Click Edit on a skill
2. Observe modal appearance
3. Make changes
4. Click "Update Skill"
5. Observe loading state

**Expected Results:**
- Modal has proper styling:
  - Dark fantasy theme (slate/purple/yellow colors)
  - Clear title: "Edit [Skill Name]"
  - Icon grid is scrollable with max-height
  - Selected icon has purple border and glow
  - Input fields have proper labels
  - Help text shows: "💡 Tip: Adjust the level and XP..."
- During update:
  - Button text changes to "Updating..."
  - Button is disabled during save
- After update:
  - Toast notification appears
  - Modal closes smoothly

**Status:** ⏳ Pending Manual Testing

---

### Test Case 12: Edit Multiple Skills Sequentially
**Objective:** Verify that editing multiple skills in sequence works correctly

**Preconditions:**
- User has at least 3 skills

**Steps:**
1. Edit Skill 1: Change icon to Trophy
2. Verify and close
3. Edit Skill 2: Change level to 10
4. Verify and close
5. Edit Skill 3: Change XP to 50
6. Verify and close
7. Refresh page

**Expected Results:**
- Each edit saves independently
- No interference between edits
- All changes persist after refresh
- Skills query is invalidated after each update
- UI updates correctly for each change

**Status:** ⏳ Pending Manual Testing

---

### Test Case 13: Level Change Affects XP Requirements
**Objective:** Verify that changing level updates maxXp display

**Preconditions:**
- User understands that maxXp is calculated per level

**Steps:**
1. Open edit modal for any skill
2. Note the current "XP (max: X)" label
3. Increase the level by 2
4. Observe if maxXp hint updates (it shows cached value, which is expected)
5. Save and reopen modal
6. Verify maxXp is now correct for new level

**Expected Results:**
- Modal shows maxXp from current skill data
- After level change and save, maxXp is recalculated by backend
- XP bar on skill card reflects new maxXp correctly
- Progress percentage is accurate

**Status:** ⏳ Pending Manual Testing

---

### Test Case 14: Edit Skill Impact on Spider Chart
**Objective:** Verify that skill edits update the spider chart

**Preconditions:**
- User is on Skills page with spider chart visible

**Steps:**
1. Note current spider chart shape
2. Edit a skill and increase level significantly (e.g., 3 to 10)
3. Save changes
4. Observe spider chart

**Expected Results:**
- Spider chart updates automatically (query invalidation)
- The axis for the edited skill extends further (larger level = larger radius)
- Chart remains balanced and properly rendered
- All other skills remain at correct positions

**Status:** ⏳ Pending Manual Testing

---

### Test Case 15: Backend API Validation
**Objective:** Verify backend properly validates edit requests

**Test Data:**
- Skill ID: 1
- Icon: "Hammer"
- Level: 5
- XP: 100

**Steps:**
1. Use browser DevTools or API client
2. Send PATCH request to `/api/skills/1/icon` with:
   ```json
   {
     "icon": "Hammer",
     "level": 5,
     "xp": 100
   }
   ```
3. Verify response

**Expected Results:**
- Backend accepts all three fields
- Returns 200 status code
- Response: `{ "message": "Skill updated successfully" }`
- Database record is updated with all three values
- `updatedAt` timestamp is set to current time

**Invalid Requests to Test:**
- Missing icon: Returns 400 "Icon name is required"
- Invalid icon: Accepts any string (no strict validation)
- Level < 1: Returns 400 "Level must be a positive number"
- XP < 0: Returns 400 "XP must be a non-negative number"
- Invalid skill ID: Returns 404 "Skill not found"
- Unauthorized user: Returns 401 or 404

**Status:** ⏳ Pending Manual Testing

---

## Test Summary

**Total Test Cases:** 15
**Passed:** 0
**Failed:** 0
**Pending:** 15

**Priority:** High - Core feature for user control over progression

**Coverage Areas:**
- Icon selection (37+ icons)
- Level adjustment (up and down)
- XP adjustment within level bounds
- Input validation (min/max boundaries)
- Multi-field updates
- Cancel behavior
- Custom skills support
- Visual feedback
- Spider chart updates
- Backend API validation

**Notes:**
- Edit modal located at: `client/src/components/edit-skill-icon-modal.tsx`
- Backend endpoint: `PATCH /api/skills/:skillId/icon`
- Storage method: `updateSkill(userId, skillId, { icon, level, xp })`
- All edits invalidate both `/api/skills` and `/api/tasks` queries

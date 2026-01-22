# Custom Skills System - Test Cases

## Overview

This document contains comprehensive test cases for the Custom Skills feature. These tests cover backend API endpoints, frontend components, integration workflows, edge cases, performance, and security.

---

## Table of Contents

1. [Backend API Tests](#backend-api-tests)
2. [OpenAI Integration Tests](#openai-integration-tests)
3. [Frontend Component Tests](#frontend-component-tests)
4. [Integration Tests](#integration-tests)
5. [Edge Case Tests](#edge-case-tests)
6. [Performance Tests](#performance-tests)
7. [Security Tests](#security-tests)
8. [Manual Test Scripts](#manual-test-scripts)

---

## Backend API Tests

### POST /api/skills/custom

#### Test 1.1: Create custom skill with all fields
**Objective:** Verify creation with complete data

**Request:**
```bash
curl -X POST http://localhost:5001/api/skills/custom \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "skillName": "Photography",
    "skillIcon": "Camera",
    "skillDescription": "Photography and photo editing skills",
    "skillMilestones": ["First photo shoot", "Learn editing", "Sell photo"],
    "level": 1
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": 10,
  "userId": "user-123",
  "skillName": "Photography",
  "skillIcon": "Camera",
  "skillDescription": "Photography and photo editing skills",
  "skillMilestones": ["First photo shoot", "Learn editing", "Sell photo"],
  "isCustom": true,
  "level": 1,
  "xp": 0,
  "maxXp": 100
}
```

**Verification:**
- ✅ Status code is 201
- ✅ Response includes `id` and `userId`
- ✅ `isCustom` is true
- ✅ All fields match request
- ✅ `xp` starts at 0

---

#### Test 1.2: Create custom skill with minimal fields
**Objective:** Verify optional fields work

**Request:**
```bash
curl -X POST http://localhost:5001/api/skills/custom \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "skillName": "Cooking",
    "skillDescription": "Culinary skills"
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": 11,
  "skillName": "Cooking",
  "skillIcon": null,
  "skillDescription": "Culinary skills",
  "skillMilestones": null,
  "isCustom": true,
  "level": 1
}
```

**Verification:**
- ✅ Null values accepted for optional fields
- ✅ Default level is 1

---

#### Test 1.3: Reject duplicate skill names
**Objective:** Prevent duplicate skills

**Setup:** Create skill named "Guitar"

**Request:**
```bash
curl -X POST http://localhost:5001/api/skills/custom \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "skillName": "Guitar",
    "skillDescription": "Different description"
  }'
```

**Expected Response (409 Conflict):**
```json
{
  "message": "Skill name 'Guitar' already exists for this user"
}
```

**Verification:**
- ✅ Status code is 409
- ✅ Error message indicates duplicate
- ✅ Database unchanged

---

#### Test 1.4: Reject missing required fields
**Objective:** Validate required fields

**Request (missing description):**
```bash
curl -X POST http://localhost:5001/api/skills/custom \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "skillName": "TestSkill"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "message": "skillDescription is required"
}
```

**Verification:**
- ✅ Status code is 400
- ✅ Error message specific to missing field

---

#### Test 1.5: Reject unauthenticated requests
**Objective:** Ensure authentication required

**Request (no cookie):**
```bash
curl -X POST http://localhost:5001/api/skills/custom \
  -H "Content-Type: application/json" \
  -d '{
    "skillName": "TestSkill",
    "skillDescription": "Test"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "message": "Authentication required"
}
```

---

#### Test 1.6: Validate skill name length
**Objective:** Enforce 30 character limit

**Request:**
```bash
curl -X POST http://localhost:5001/api/skills/custom \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "skillName": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "skillDescription": "Test"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "message": "Skill name must be 30 characters or less"
}
```

---

#### Test 1.7: Validate description length
**Objective:** Enforce 500 character limit

**Request:** (description with 600 characters)

**Expected Response (400 Bad Request):**
```json
{
  "message": "Description must be 500 characters or less"
}
```

---

### DELETE /api/skills/:skillId

#### Test 2.1: Delete custom skill
**Objective:** Successfully delete custom skill

**Setup:** Create skill with ID 10

**Request:**
```bash
curl -X DELETE http://localhost:5001/api/skills/10 \
  -H "Cookie: connect.sid=<your-session-cookie>"
```

**Expected Response (200 OK):**
```json
{
  "message": "Skill deleted successfully"
}
```

**Verification:**
- ✅ Status code is 200
- ✅ GET /api/skills no longer includes skill
- ✅ Tasks with this skill have it removed

---

#### Test 2.2: Cannot delete default skills
**Objective:** Protect default skills

**Request:**
```bash
curl -X DELETE http://localhost:5001/api/skills/1 \
  -H "Cookie: connect.sid=<your-session-cookie>"
```

**Expected Response (403 Forbidden):**
```json
{
  "message": "Cannot delete default skills"
}
```

---

#### Test 2.3: 404 for non-existent skill
**Objective:** Handle invalid IDs

**Request:**
```bash
curl -X DELETE http://localhost:5001/api/skills/99999 \
  -H "Cookie: connect.sid=<your-session-cookie>"
```

**Expected Response (404 Not Found):**
```json
{
  "message": "Skill not found"
}
```

---

#### Test 2.4: Remove skill from all tasks
**Objective:** Verify cascade deletion

**Setup:**
1. Create custom skill "SkillToDelete"
2. Create task with skillTags: ["SkillToDelete"]

**Request:** DELETE /api/skills/{skillId}

**Verification:**
- ✅ Skill deleted
- ✅ Task's skillTags no longer includes "SkillToDelete"
- ✅ Other skillTags on task preserved

---

### GET /api/skills

#### Test 3.1: Return all user skills
**Objective:** Fetch default + custom skills

**Request:**
```bash
curl http://localhost:5001/api/skills \
  -H "Cookie: connect.sid=<your-session-cookie>"
```

**Expected Response (200 OK):**
```json
[
  {
    "id": 1,
    "skillName": "Craftsman",
    "isCustom": false,
    "level": 5
  },
  {
    "id": 2,
    "skillName": "Artist",
    "isCustom": false,
    "level": 3
  },
  // ... 7 more defaults
  {
    "id": 10,
    "skillName": "Photography",
    "skillIcon": "Camera",
    "isCustom": true,
    "level": 1
  }
]
```

**Verification:**
- ✅ Contains all 9 default skills
- ✅ Contains all user's custom skills
- ✅ Each has `isCustom` flag
- ✅ Custom skills have icons

---

#### Test 3.2: User isolation
**Objective:** Users only see own skills

**Setup:** Two users, each with custom skills

**Verification:**
- ✅ User A's GET /api/skills doesn't show User B's custom skills
- ✅ Both see same 9 defaults
- ✅ Each sees only their own custom skills

---

## OpenAI Integration Tests

### Test 4.1: AI categorization includes custom skills
**Objective:** Verify OpenAI receives custom skills

**Setup:** Create custom skill "Painting"

**Request:**
```bash
curl -X POST http://localhost:5001/api/tasks/categorize \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "title": "Paint a landscape",
    "details": "Create watercolor painting of mountains"
  }'
```

**Expected Response:**
```json
{
  "skills": ["Painting", "Artist"],
  "reasoning": "Task involves painting which matches both the custom Painting skill and default Artist skill"
}
```

**Verification:**
- ✅ Response includes custom "Painting" skill
- ✅ AI used custom skill description
- ✅ May also include related default skills

---

### Test 4.2: Use custom skill description
**Objective:** AI understands custom descriptions

**Setup:** Create "VideoEditing" with description mentioning "Premiere Pro"

**Request:** Categorize task mentioning Premiere Pro

**Expected:** AI suggests "VideoEditing"

---

### Test 4.3: Handle mixed default and custom skills
**Objective:** AI can suggest both types

**Expected:** Task can receive both default and custom skill suggestions

---

## Frontend Component Tests

### AddSkillModal Tests

#### Test 5.1: Modal renders when open
**Steps:**
1. Open Skills page
2. Click "Create Custom Skill"

**Expected:**
- ✅ Modal appears
- ✅ Title shows "Create Custom Skill"
- ✅ All form fields visible
- ✅ 20 icon options displayed

---

#### Test 5.2: Icon selection
**Steps:**
1. Open modal
2. Click "Palette" icon

**Expected:**
- ✅ Icon highlighted
- ✅ Visual selection indicator
- ✅ Only one icon selected at a time

---

#### Test 5.3: Form validation - name required
**Steps:**
1. Open modal
2. Leave name empty
3. Fill description
4. Click "Create Skill"

**Expected:**
- ✅ Error message: "Name is required"
- ✅ Form doesn't submit
- ✅ Modal stays open

---

#### Test 5.4: Form validation - description required
**Steps:**
1. Enter name
2. Leave description empty
3. Submit

**Expected:**
- ✅ Error: "Description is required"

---

#### Test 5.5: Character limit - name (30 chars)
**Steps:**
1. Type 50 characters in name field

**Expected:**
- ✅ Input stops at 30 characters
- ✅ Cannot type more

---

#### Test 5.6: Character limit - description (500 chars)
**Steps:**
1. Type 600 characters in description

**Expected:**
- ✅ Input stops at 500
- ✅ Counter shows "500 / 500"

---

#### Test 5.7: Character counter updates
**Steps:**
1. Type "Test description" (16 chars)

**Expected:**
- ✅ Counter shows "16 / 500"
- ✅ Updates in real-time

---

#### Test 5.8: Optional milestones
**Steps:**
1. Leave all milestone fields empty
2. Submit valid name + description

**Expected:**
- ✅ Skill created successfully
- ✅ No validation errors

---

#### Test 5.9: Successful submission
**Steps:**
1. Fill all required fields
2. Click "Create Skill"

**Expected:**
- ✅ Loading spinner appears
- ✅ Button disabled during submit
- ✅ Success toast appears
- ✅ Modal closes
- ✅ Skills list refreshes

---

#### Test 5.10: Cancel button
**Steps:**
1. Fill form partially
2. Click "Cancel"

**Expected:**
- ✅ Modal closes
- ✅ No API call made
- ✅ Form data discarded

---

### Skills Page Tests

#### Test 6.1: Display custom badge
**Expected:**
- ✅ Custom skills show purple "Custom" badge
- ✅ Default skills have no badge

---

#### Test 6.2: Delete button visibility
**Expected:**
- ✅ Delete button ONLY on custom skills
- ✅ No delete button on default skills

---

#### Test 6.3: Delete confirmation
**Steps:**
1. Click delete on custom skill
2. Observe dialog

**Expected:**
- ✅ Confirmation dialog appears
- ✅ Shows skill name
- ✅ Explains consequences
- ✅ Has "Cancel" and "Delete" buttons

---

#### Test 6.4: Skill list refresh
**Steps:**
1. Create new custom skill
2. Observe list

**Expected:**
- ✅ New skill appears immediately
- ✅ No page reload needed

---

### Dashboard Spider Chart Tests

#### Test 7.1: Render all skills
**Steps:**
1. Create 2 custom skills
2. Navigate to Dashboard

**Expected:**
- ✅ Chart shows all 9 defaults + 2 custom = 11 skills
- ✅ All skills have labels
- ✅ All skills have icons
- ✅ No overlapping

---

#### Test 7.2: Custom skill icons
**Expected:**
- ✅ Custom skills show selected icon
- ✅ Default skills show hardcoded icons

---

#### Test 7.3: Custom skill colors
**Expected:**
- ✅ Custom skills have purple/distinct coloring
- ✅ Colors consistent across views

---

#### Test 7.4: Loading state
**Steps:**
1. Refresh dashboard
2. Observe during API call

**Expected:**
- ✅ "Loading skills..." message
- ✅ Spinner or skeleton
- ✅ Chart appears after load

---

### SkillAdjustmentModal Tests

#### Test 8.1: Display all skills
**Steps:**
1. Open skill adjustment modal
2. Count skills

**Expected:**
- ✅ Shows all 9 defaults
- ✅ Shows all user's custom skills
- ✅ Grid or list layout

---

#### Test 8.2: Custom badge in modal
**Expected:**
- ✅ Custom skills have "Custom" badge
- ✅ Visually distinct

---

#### Test 8.3: Toggle custom skills
**Steps:**
1. Click checkbox for custom skill
2. Click again

**Expected:**
- ✅ First click checks checkbox
- ✅ Second click unchecks
- ✅ Skill added/removed from selection

---

### TaskCard Tests

#### Test 9.1: Display custom skill badges
**Setup:** Task with skillTags: ["Photography", "Craftsman"]

**Expected:**
- ✅ Both badges visible
- ✅ Icons displayed
- ✅ Different styling for custom vs default

---

#### Test 9.2: Custom label on badges
**Expected:**
- ✅ Custom skill badges show "(custom)" text
- ✅ Default skills don't have label

---

#### Test 9.3: Custom skill icons
**Expected:**
- ✅ Badge shows correct icon from skill data
- ✅ Fallback icon if null

---

## Integration Tests

### Test 10.1: Full workflow - Create → Use → Delete
**Steps:**
1. Create custom skill "Woodworking"
2. Verify appears in skills list
3. Create task about woodworking
4. AI suggests "Woodworking" skill
5. Complete task
6. Delete "Woodworking" skill
7. Check task no longer has skill

**Expected:**
- ✅ All steps complete without errors
- ✅ Skill removed from task after deletion

---

### Test 10.2: AI learning from manual adjustments
**Steps:**
1. Create custom skill "Gardening"
2. Create task "Water plants" (AI doesn't suggest Gardening)
3. Manually add "Gardening" skill
4. Submit as training data
5. Create similar task "Prune garden"
6. Check AI suggestion

**Expected:**
- ✅ AI learns to suggest "Gardening" for similar tasks

---

### Test 10.3: Multi-component sync
**Steps:**
1. Create custom skill
2. Check appears in:
   - Skills page
   - Spider chart
   - SkillAdjustmentModal
   - Task categorization

**Expected:**
- ✅ Skill visible in all locations
- ✅ Icons consistent
- ✅ Data matches everywhere

---

## Edge Case Tests

### Test 11.1: Special characters in name
**Input:** "C++ Programming"

**Expected:** ✅ Accepted

---

### Test 11.2: Unicode characters
**Input:** "Español 🎨"

**Expected:** ✅ Accepted and displayed correctly

---

### Test 11.3: Many custom skills (20+)
**Steps:** Create 25 custom skills

**Expected:**
- ✅ All created successfully
- ✅ Spider chart renders (may be crowded)
- ✅ Skills list scrollable
- ✅ Performance acceptable

---

### Test 11.4: Rapid create/delete
**Steps:**
1. Create skill
2. Immediately delete
3. Repeat 5 times

**Expected:**
- ✅ No race conditions
- ✅ No database inconsistencies

---

### Test 11.5: Empty milestone array
**Input:**
```json
{
  "skillMilestones": []
}
```

**Expected:** ✅ Accepted, stored as empty array

---

### Test 11.6: Null values
**Input:**
```json
{
  "skillIcon": null,
  "skillMilestones": null
}
```

**Expected:** ✅ Accepted, stored as null

---

## Performance Tests

### Test 12.1: API response time
**Metric:** GET /api/skills with 20 custom skills

**Target:** < 200ms

**Verification:**
```bash
time curl http://localhost:5001/api/skills \
  -H "Cookie: <session>"
```

---

### Test 12.2: Categorization speed
**Metric:** POST /api/tasks/categorize with 20 skills

**Target:** < 3 seconds (OpenAI call)

---

### Test 12.3: Spider chart render time
**Metric:** Dashboard load with 29 skills

**Target:** < 1 second for initial render

---

### Test 12.4: Skills page load
**Metric:** Skills page with 30 skills

**Target:** < 500ms

---

## Security Tests

### Test 13.1: SQL injection prevention
**Input:**
```json
{
  "skillName": "'; DROP TABLE user_skills; --",
  "skillDescription": "Test"
}
```

**Expected:**
- ✅ Treated as literal string (not executed)
- ✅ Skill created with exact name
- ✅ OR rejected with validation error
- ✅ Database intact

**Verification:** Run `GET /api/skills` - should still work

---

### Test 13.2: XSS prevention
**Input:**
```json
{
  "skillDescription": "<script>alert('XSS')</script>"
}
```

**Expected:**
- ✅ Stored as text
- ✅ When rendered, HTML escaped
- ✅ Script does not execute

---

### Test 13.3: Authentication enforcement
**Test all endpoints without cookies:**
- POST /api/skills/custom
- DELETE /api/skills/:id
- GET /api/skills

**Expected:** All return 401 Unauthorized

---

### Test 13.4: User isolation
**Setup:** Two users

**Test:**
- User A creates custom skill
- User B attempts to:
  - GET User A's skill
  - DELETE User A's skill

**Expected:**
- ✅ User B cannot see or modify User A's custom skills
- ✅ 403 or 404 responses

---

## Manual Test Scripts

### Quick Smoke Test (5 minutes)
```bash
# 1. Create skill
curl -X POST http://localhost:5001/api/skills/custom \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=$SESSION" \
  -d '{"skillName":"TestSkill","skillDescription":"Test"}'

# 2. Get all skills
curl http://localhost:5001/api/skills \
  -H "Cookie: connect.sid=$SESSION"

# 3. Delete skill
curl -X DELETE http://localhost:5001/api/skills/10 \
  -H "Cookie: connect.sid=$SESSION"
```

### Full Test Suite (30 minutes)
1. Run all backend API tests (15 tests)
2. Manual UI testing (10 tests)
3. Integration tests (3 tests)
4. Edge cases (6 tests)

---

## Test Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| Backend API | 15 | ✅ Ready |
| OpenAI Integration | 3 | ✅ Ready |
| Frontend Components | 20 | ✅ Ready |
| Integration | 3 | ✅ Ready |
| Edge Cases | 6 | ✅ Ready |
| Performance | 4 | ✅ Ready |
| Security | 4 | ✅ Ready |
| **TOTAL** | **55** | **✅ Complete** |

---

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend API Tests
```bash
# Run with newman (Postman CLI) or curl scripts
./scripts/test-api.sh
```

### Frontend Tests
```bash
# Using Vitest
npm run test

# With coverage
npm run test:coverage
```

### E2E Tests
```bash
# Using Playwright (if configured)
npm run test:e2e
```

---

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Custom Skills
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test
      - run: npm run test:api
```

---

## Bug Report Template

```markdown
**Test Case:** [e.g., Test 1.3: Reject duplicate skill names]

**Expected Behavior:**
Should return 409 Conflict

**Actual Behavior:**
Returns 200 OK and creates duplicate

**Steps to Reproduce:**
1. Create skill "Guitar"
2. Attempt to create another "Guitar"

**Environment:**
- Browser: Chrome 120
- OS: macOS 14
- Server: localhost:5001

**Logs:**
[Paste relevant console/server logs]
```

---

**Test Suite Version:** 1.0  
**Last Updated:** January 15, 2025  
**Status:** ✅ Complete & Ready for Execution

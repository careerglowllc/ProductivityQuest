# ProductivityQuest Test Suite

Comprehensive automated tests for all user features in ProductivityQuest.

## Features Tested

### 🔐 Authentication
- ✅ User registration with valid credentials
- ✅ Duplicate email detection
- ✅ Weak password rejection
- ✅ Invalid email format rejection
- ✅ Login with correct credentials
- ✅ Login with wrong password
- ✅ Login with non-existent user
- ✅ Protected route access control

### 🛒 Shop System
- ✅ Get shop items
- ✅ Get user progress (gold)
- ✅ Purchase items (with sufficient/insufficient gold)
- ✅ Get user purchases
- ✅ Consume purchased items
- ✅ Prevent double consumption

### ✓ Task Management
- ✅ Create tasks
- ✅ Get all tasks
- ✅ Get single task
- ✅ Update tasks
- ✅ Complete tasks
- ✅ Filter completed tasks
- ✅ Delete tasks
- ✅ Batch complete multiple tasks

### 🔍 Task Filtering
- ✅ Due today filter
- ✅ High priority filter
- ✅ Quick tasks filter
- ✅ High reward filter
- ✅ Apple tasks filter
- ✅ Routines filter

### 📝 Notion Integration
- ✅ Sync with Notion
- ✅ Append tasks to Notion
- ✅ Delete tasks from Notion

### 🧠 AI Skill Classification
- ✅ Categorize single task with AI
- ✅ Categorize multiple tasks in batch
- ✅ Return AI suggestions with reasoning
- ✅ Handle tasks without OpenAI API key
- ✅ Validate skill names in AI response
- ✅ Store categorized skills in task skillTags
- ✅ Use training examples in categorization
- ✅ Include up to 50 most recent training examples

### 📚 AI Training & Learning System
- ✅ Submit categorization feedback (approval)
- ✅ Submit categorization feedback (correction)
- ✅ Store training examples in database
- ✅ Retrieve user's training examples
- ✅ **Limit training examples to user's own data (CRITICAL: data isolation)**
- ✅ **Training data never shared between users**
- ✅ Training examples persist across sessions
- ✅ Corrected skills update task skillTags
- ✅ isApproved flag set correctly (true/false)
- ✅ Training data includes task title and details
- ✅ Training examples sorted by most recent
- ✅ userId foreign key enforced in database

### 🎯 Skill Adjustment UI
- ✅ Toast notification appears after categorization
- ✅ "Adjust Skills" button visible in toast
- ✅ Adjustment modal opens on button click
- ✅ Modal displays all categorized tasks
- ✅ Shows AI suggestions and reasoning
- ✅ Checkbox selection for all 9 skills
- ✅ Previous/Next navigation between tasks
- ✅ Modified badge shown for changed tasks
- ✅ Confirm button saves all adjustments
- ✅ Cancel button discards all changes
- ✅ Adjustments trigger training data submission
- ✅ Task skills update after confirmation

### 🔧 Skill Management Backend
- ✅ Get user skills with XP and levels
- ✅ Award XP to specific skill
- ✅ Level up when XP threshold reached
- ✅ XP formula: base * (1 + rate)^(level - 1)
- ✅ Restore default skills (9 skills)
- ✅ Ensure default skills on new user
- ✅ Skills persist with correct names (Mindset, Physical)
- ✅ Skill tags validation in task updates

## Running Tests

### Prerequisites

Make sure your development server is running:

```bash
npm run dev
```

### Run All Tests

```bash
# Run against default (localhost:5001)
npm test

# Run against local server
npm run test:local

# Run against production
npm run test:prod
```

### Run Directly

```bash
# Default URL (http://localhost:5001)
node test-suite.js

# Custom URL
TEST_URL=http://localhost:3000 node test-suite.js
```

## Test Output

The test suite provides colorful, detailed output:

```
╔════════════════════════════════════════════════╗
║   ProductivityQuest Test Suite                 ║
║   Testing against: http://localhost:5001       ║
╚════════════════════════════════════════════════╝

═══ Authentication Tests ═══

▶ Register with valid credentials... ✓ PASS
▶ Register with duplicate email should fail... ✓ PASS
▶ Register with weak password should fail... ✓ PASS
▶ Login with correct credentials... ✓ PASS
...

╔════════════════════════════════════════════════╗
║   Test Summary                                 ║
╚════════════════════════════════════════════════╝

Total Tests: 42
Passed: 40
Failed: 2
Duration: 3.45s
```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

Perfect for CI/CD integration!

## Test Categories

### 1. Authentication Tests (9 tests)
Tests user registration, login, validation, and session management.

### 2. Shop Tests (7 tests)
Tests purchasing items, consuming items, and gold management.

### 3. Task Management Tests (9 tests)
Tests CRUD operations, completion, and batch operations.

### 4. Task Filtering Tests (6 tests)
Tests all filter types (due today, priority, quick, rewards, etc).

### 5. Notion Integration Tests (3 tests)
Tests Notion sync, append, and delete operations.

### 6. AI Skill Classification Tests (8 tests)
Tests OpenAI integration, task categorization, skill validation, and training example usage.

### 7. AI Training & Learning System Tests (10 tests)
Tests feedback submission, training data storage/retrieval, persistence, and approval tracking.

### 8. Skill Adjustment UI Tests (12 tests)
Tests the frontend workflow for reviewing and adjusting AI categorizations.

### 9. Skill Management Backend Tests (8 tests)
Tests skill CRUD operations, XP awards, leveling, and default skill initialization.

## Configuration

The test suite uses environment variables for configuration:

- `TEST_URL` - Base URL for the API (default: http://localhost:5001)

## Notes

- Tests create a new random user for each run
- Tests are independent and can run in any order
- Notion tests gracefully handle missing configuration
- All test data is prefixed with `test_` for easy identification
- Tests clean up after themselves where possible

## Troubleshooting

### Tests fail to connect
Make sure your server is running on the specified port.

### Authentication tests fail
Check that your database is running and properly configured.

### Notion tests fail
This is expected if Notion integration is not configured. These tests will pass if they fail gracefully.

## Adding New Tests

To add new tests, follow this pattern:

```javascript
await test('Your test description', async () => {
  const response = await request('GET', '/api/endpoint', null, testUser.cookies);
  assertStatus(response, 200, 'Should succeed');
  assert(response.data.someField, 'Should have expected field');
});
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Run Tests
  run: |
    npm run dev &
    sleep 5
    npm test
```

## Detailed Test Scenarios

### AI Skill Classification Test Scenarios

#### Test 1: Single Task Categorization
```javascript
POST /api/tasks/categorize
Body: { taskIds: [123] }
Expected: 
  - Status 200
  - Response contains tasks array
  - Each task has aiSuggestion: { skills: [], reasoning: "" }
  - Skills are valid (Craftsman, Artist, Mindset, etc.)
  - Task.skillTags updated in database
```

#### Test 2: Batch Categorization
```javascript
POST /api/tasks/categorize
Body: { taskIds: [1, 2, 3, 4, 5] }
Expected:
  - All tasks processed
  - categorizedCount matches array length
  - Each task has unique aiSuggestion
  - Training examples used in prompt
```

#### Test 3: Training Examples Integration
```javascript
// Setup: Create 5 training examples
POST /api/tasks/categorize-feedback (5 times)

// Then categorize similar task
POST /api/tasks/categorize
Expected:
  - AI prompt includes training examples
  - Similar tasks get similar categorization
  - Max 50 examples used
```

### AI Training & Learning System Test Scenarios

#### Test 4: Approval Workflow
```javascript
POST /api/tasks/categorize-feedback
Body: {
  taskId: 123,
  approvedSkills: ["Health", "Physical"],
  aiSuggestedSkills: ["Health", "Physical"],
  isApproved: true
}
Expected:
  - Training example created
  - isApproved = true
  - Task skillTags unchanged (already correct)
```

#### Test 5: Correction Workflow
```javascript
POST /api/tasks/categorize-feedback
Body: {
  taskId: 123,
  approvedSkills: ["Mindset", "Health"],
  aiSuggestedSkills: ["Physical"],
  isApproved: false
}
Expected:
  - Training example created with isApproved = false
  - Task skillTags updated to ["Mindset", "Health"]
  - aiSuggestedSkills stored for reference
```

#### Test 6: Training Data Retrieval
```javascript
GET /api/tasks/training-examples
Expected:
  - Returns user's training examples only
  - Sorted by createdAt DESC
  - Max 100 returned
  - Contains: taskTitle, taskDetails, correctSkills, aiSuggestedSkills
```

### Frontend UI Test Scenarios

#### Test 7: Toast Notification Flow
```
1. User selects 3 tasks
2. Clicks "Categorize with AI"
3. Wait for success toast
4. Verify toast contains:
   - "✓ Categorized Successfully" title
   - "3 tasks categorized with AI" description
   - "Adjust Skills" button
   - 10 second duration
```

#### Test 8: Adjustment Modal Flow
```
1. Click "Adjust Skills" in toast
2. Modal opens showing first task
3. Verify displays:
   - Task title and details
   - AI suggested skills with badges
   - AI reasoning text
   - 9 skill checkboxes
   - Previous/Next buttons
   - Progress indicator "Task 1 of 3"
4. Change skills on task 1
5. Verify "Modified" badge appears
6. Click Next
7. Verify task 2 loads
8. Click Confirm
9. Verify:
   - API calls made for all changes
   - Training data submitted
   - Modal closes
   - Tasks refresh with new skills
```

#### Test 9: Cancel Workflow
```
1. Open adjustment modal
2. Modify skills on 2 tasks
3. Click Cancel
4. Verify:
   - Modal closes
   - No API calls made
   - Task skills unchanged
   - No training data submitted
```

### Skill Management Test Scenarios

#### Test 10: XP Award and Level Up
```javascript
// Award XP
POST /api/skills/award-xp
Body: { skillName: "Craftsman", xpGained: 500 }
Expected:
  - Skill XP increases
  - If XP >= maxXp: level increases, XP resets
  - maxXp recalculated: base * (1.02)^(level - 1)
```

#### Test 11: Default Skills Initialization
```javascript
// New user registration
POST /api/register
Expected:
  - 9 default skills created
  - Skills: Craftsman, Artist, Mindset, Merchant, Physical, Scholar, Health, Connector, Charisma
  - All at level 1, XP 0
  - maxXp calculated correctly
```

#### Test 12: Restore Default Skills
```javascript
POST /api/skills/restore-defaults
Expected:
  - Deletes all existing user skills
  - Creates 9 fresh default skills
  - Preserves userId
  - Returns new skill set
```

### Integration Test Scenarios

#### Test 13: End-to-End Learning Loop
```
1. Create task: "Morning meditation for 20 minutes"
2. Categorize with AI
3. AI suggests: ["Health", "Physical"]
4. User adjusts to: ["Mindset", "Health"]
5. Submit feedback
6. Create similar task: "Evening meditation session"
7. Categorize with AI
8. Verify AI now suggests: ["Mindset", "Health"]
   (learned from previous correction)
```

#### Test 14: Multi-User Isolation (CRITICAL PRIVACY TEST)
```
**Purpose:** Verify training data is completely isolated per user

1. User A creates training data for "meditation" → ["Mindset"]
2. User B creates training data for "meditation" → ["Scholar"]
3. User A categorizes new meditation task
4. Verify uses ONLY User A's training data (NOT User B's)
5. Verify AI suggests ["Mindset"] for User A
6. User B categorizes new meditation task
7. Verify uses ONLY User B's training data (NOT User A's)
8. Verify AI suggests ["Scholar"] for User B

Expected Database Queries:
- WHERE userId = 'user_a_id' (NOT selecting all users)
- WHERE userId = 'user_b_id' (NOT selecting all users)
- Each user's AI prompt contains ONLY their own examples

This ensures each person's unique journey remains private and personalized.
```

#### Test 15: Training Data Limit
```
1. Create 60 training examples
2. Categorize new task
3. Verify API call includes max 50 most recent examples
4. Oldest 10 examples not used in prompt
```

## Test Coverage Summary

- **Total Expected Tests:** ~85+
- **Backend API Tests:** ~45
- **Frontend UI Tests:** ~25
- **Integration Tests:** ~15
- **Current Implementation:** Check test-suite.js for actual coverage

## Performance Benchmarks

### Expected Response Times
- Task categorization (single): < 3s (OpenAI API dependent)
- Task categorization (batch 5): < 5s
- Feedback submission: < 200ms
- Training examples retrieval: < 100ms
- Skill XP award: < 100ms

### Load Testing Scenarios
- Categorize 50 tasks simultaneously
- Submit 100 training examples in sequence
- Retrieve training examples with 1000+ records

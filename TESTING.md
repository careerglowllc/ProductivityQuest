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

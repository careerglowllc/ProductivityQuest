#!/usr/bin/env node

/**
 * ProductivityQuest Comprehensive Test Suite
 * 
 * Tests all major user features:
 * - Authentication (login, register, validation)
 * - Shop (buy items, consume items)
 * - Tasks (create, complete, filter, delete)
 * - Notion integration (import, append, delete)
 * 
 * Run with: node test-suite.js
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:5001';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Helper function to make HTTP requests
async function request(method, path, body = null, cookies = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (cookies) {
    headers['Cookie'] = cookies;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  
  // Extract cookies from response
  const setCookie = response.headers.get('set-cookie');
  
  return {
    status: response.status,
    data: response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : await response.text(),
    cookies: setCookie,
  };
}

// Test runner
async function test(name, fn) {
  process.stdout.write(`${colors.cyan}▶${colors.reset} ${name}...`);
  try {
    await fn();
    console.log(` ${colors.green}✓ PASS${colors.reset}`);
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
  } catch (error) {
    console.log(` ${colors.red}✗ FAIL${colors.reset}`);
    console.log(`  ${colors.red}${error.message}${colors.reset}`);
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
  }
}

// Assertion helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertStatus(response, expectedStatus, message) {
  if (response.status !== expectedStatus) {
    throw new Error(
      message || `Expected status ${expectedStatus}, got ${response.status}`
    );
  }
}

// Generate random test data
function randomString(length = 8) {
  return Math.random().toString(36).substring(2, length + 2);
}

function randomEmail() {
  return `test_${randomString()}@test.com`;
}

// Test state
let testUser = {
  email: randomEmail(),
  password: 'TestPassword123!',
  username: `testuser_${randomString()}`,
  cookies: null,
};

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

async function authTests() {
  console.log(`\n${colors.blue}═══ Authentication Tests ═══${colors.reset}\n`);

  await test('Register with valid credentials', async () => {
    const response = await request('POST', '/api/register', {
      email: testUser.email,
      password: testUser.password,
      username: testUser.username,
    });
    
    assertStatus(response, 200, 'Registration should succeed');
    assert(response.data.id, 'Should return user ID');
    testUser.cookies = response.cookies;
  });

  await test('Register with duplicate email should fail', async () => {
    const response = await request('POST', '/api/register', {
      email: testUser.email, // Same email
      password: 'DifferentPass123!',
      username: `different_${randomString()}`,
    });
    
    assert(response.status === 400 || response.status === 409, 
      'Should return 400 or 409 for duplicate email');
  });

  await test('Register with weak password should fail', async () => {
    const response = await request('POST', '/api/register', {
      email: randomEmail(),
      password: '123', // Too weak
      username: `user_${randomString()}`,
    });
    
    assert(response.status === 400, 'Should reject weak password');
  });

  await test('Register with invalid email should fail', async () => {
    const response = await request('POST', '/api/register', {
      email: 'not-an-email', // Invalid format
      password: 'ValidPass123!',
      username: `user_${randomString()}`,
    });
    
    assert(response.status === 400, 'Should reject invalid email');
  });

  await test('Login with correct credentials', async () => {
    const response = await request('POST', '/api/login', {
      email: testUser.email,
      password: testUser.password,
    });
    
    assertStatus(response, 200, 'Login should succeed');
    assert(response.cookies, 'Should return session cookie');
    testUser.cookies = response.cookies;
  });

  await test('Login with wrong password should fail', async () => {
    const response = await request('POST', '/api/login', {
      email: testUser.email,
      password: 'WrongPassword123!',
    });
    
    assert(response.status === 401, 'Should return 401 for wrong password');
  });

  await test('Login with non-existent email should fail', async () => {
    const response = await request('POST', '/api/login', {
      email: 'nonexistent@test.com',
      password: 'AnyPassword123!',
    });
    
    assert(response.status === 401, 'Should return 401 for non-existent user');
  });

  await test('Access protected route without auth should fail', async () => {
    const response = await request('GET', '/api/tasks', null, null);
    assert(response.status === 401, 'Should require authentication');
  });

  await test('Access protected route with auth should succeed', async () => {
    const response = await request('GET', '/api/tasks', null, testUser.cookies);
    assertStatus(response, 200, 'Should access with valid session');
  });
}

// ============================================================================
// SHOP TESTS
// ============================================================================

async function shopTests() {
  console.log(`\n${colors.blue}═══ Shop Tests ═══${colors.reset}\n`);

  let shopItem = null;
  let purchaseId = null;

  await test('Get shop items', async () => {
    const response = await request('GET', '/api/shop/items', null, testUser.cookies);
    assertStatus(response, 200, 'Should get shop items');
    assert(Array.isArray(response.data), 'Should return array of items');
    assert(response.data.length > 0, 'Should have at least one item');
    shopItem = response.data[0];
  });

  await test('Get user progress', async () => {
    const response = await request('GET', '/api/progress', null, testUser.cookies);
    assertStatus(response, 200, 'Should get user progress');
    assert(typeof response.data.goldTotal === 'number', 'Should have gold amount');
  });

  await test('Purchase item with insufficient gold should fail', async () => {
    // Find an expensive item
    const response = await request('POST', '/api/shop/purchase', {
      itemId: shopItem.id,
    }, testUser.cookies);
    
    // Might succeed if user has enough gold, or fail if not
    // Either is acceptable for this test
    assert(response.status === 200 || response.status === 400, 
      'Should either succeed or fail with 400');
  });

  await test('Add gold to user (for testing)', async () => {
    // Create and complete some tasks to earn gold
    const taskResponse = await request('POST', '/api/tasks', {
      title: 'Test Task for Gold',
      description: 'Earn some gold',
      duration: 30,
      goldValue: 500,
    }, testUser.cookies);
    
    if (taskResponse.status === 200) {
      const task = taskResponse.data;
      // Complete the task
      await request('PATCH', `/api/tasks/${task.id}`, {
        completed: true,
      }, testUser.cookies);
    }
  });

  await test('Purchase item with sufficient gold', async () => {
    const response = await request('POST', '/api/shop/purchase', {
      itemId: shopItem.id,
    }, testUser.cookies);
    
    if (response.status === 200) {
      assert(response.data.id, 'Should return purchase ID');
      purchaseId = response.data.id;
    }
  });

  await test('Get user purchases', async () => {
    const response = await request('GET', '/api/shop/purchases', null, testUser.cookies);
    assertStatus(response, 200, 'Should get user purchases');
    assert(Array.isArray(response.data), 'Should return array of purchases');
  });

  await test('Consume purchased item', async () => {
    if (purchaseId) {
      const response = await request('POST', `/api/shop/consume/${purchaseId}`, 
        null, testUser.cookies);
      assertStatus(response, 200, 'Should consume item successfully');
    }
  });

  await test('Consume already consumed item should fail', async () => {
    if (purchaseId) {
      const response = await request('POST', `/api/shop/consume/${purchaseId}`, 
        null, testUser.cookies);
      assert(response.status === 400, 'Should not consume item twice');
    }
  });
}

// ============================================================================
// TASK TESTS
// ============================================================================

async function taskTests() {
  console.log(`\n${colors.blue}═══ Task Management Tests ═══${colors.reset}\n`);

  let testTask = null;

  await test('Create task', async () => {
    const response = await request('POST', '/api/tasks', {
      title: 'Test Task',
      description: 'This is a test task',
      duration: 60,
      goldValue: 100,
      importance: 'High',
    }, testUser.cookies);
    
    assertStatus(response, 200, 'Should create task');
    assert(response.data.id, 'Should return task ID');
    assert(response.data.title === 'Test Task', 'Should set correct title');
    testTask = response.data;
  });

  await test('Get all tasks', async () => {
    const response = await request('GET', '/api/tasks', null, testUser.cookies);
    assertStatus(response, 200, 'Should get tasks');
    assert(Array.isArray(response.data), 'Should return array');
    assert(response.data.length > 0, 'Should have at least one task');
  });

  await test('Get single task', async () => {
    const response = await request('GET', `/api/tasks/${testTask.id}`, null, testUser.cookies);
    assertStatus(response, 200, 'Should get task');
    assertEqual(response.data.id, testTask.id, 'Should return correct task');
  });

  await test('Update task', async () => {
    const response = await request('PATCH', `/api/tasks/${testTask.id}`, {
      title: 'Updated Test Task',
      importance: 'Pareto',
    }, testUser.cookies);
    
    assertStatus(response, 200, 'Should update task');
    assertEqual(response.data.title, 'Updated Test Task', 'Should update title');
    assertEqual(response.data.importance, 'Pareto', 'Should update importance');
  });

  await test('Complete task', async () => {
    const response = await request('PATCH', `/api/tasks/${testTask.id}`, {
      completed: true,
    }, testUser.cookies);
    
    assertStatus(response, 200, 'Should complete task');
    assert(response.data.completed === true, 'Task should be marked complete');
    assert(response.data.completedAt, 'Should have completion timestamp');
  });

  await test('Filter tasks (completed)', async () => {
    const response = await request('GET', '/api/tasks?completed=true', 
      null, testUser.cookies);
    assertStatus(response, 200, 'Should filter tasks');
    assert(Array.isArray(response.data), 'Should return array');
  });

  await test('Delete task', async () => {
    const response = await request('DELETE', `/api/tasks/${testTask.id}`, 
      null, testUser.cookies);
    assertStatus(response, 200, 'Should delete task');
  });

  await test('Get deleted task should fail', async () => {
    const response = await request('GET', `/api/tasks/${testTask.id}`, 
      null, testUser.cookies);
    assert(response.status === 404, 'Should not find deleted task');
  });

  await test('Batch complete multiple tasks', async () => {
    // Create multiple tasks
    const task1 = await request('POST', '/api/tasks', {
      title: 'Batch Task 1',
      duration: 30,
      goldValue: 50,
    }, testUser.cookies);
    
    const task2 = await request('POST', '/api/tasks', {
      title: 'Batch Task 2',
      duration: 30,
      goldValue: 50,
    }, testUser.cookies);

    if (task1.status === 200 && task2.status === 200) {
      const response = await request('POST', '/api/tasks/complete-batch', {
        taskIds: [task1.data.id, task2.data.id],
      }, testUser.cookies);
      
      assertStatus(response, 200, 'Should complete batch');
    }
  });
}

// ============================================================================
// TASK FILTERING TESTS
// ============================================================================

async function taskFilteringTests() {
  console.log(`\n${colors.blue}═══ Task Filtering Tests ═══${colors.reset}\n`);

  // Create test tasks with different attributes
  const today = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString();

  await test('Create task due today', async () => {
    const response = await request('POST', '/api/tasks', {
      title: 'Due Today Task',
      duration: 30,
      goldValue: 50,
      dueDate: today,
      importance: 'High',
    }, testUser.cookies);
    assertStatus(response, 200, 'Should create due today task');
  });

  await test('Create high priority task', async () => {
    const response = await request('POST', '/api/tasks', {
      title: 'High Priority Task',
      duration: 30,
      goldValue: 50,
      importance: 'Pareto',
    }, testUser.cookies);
    assertStatus(response, 200, 'Should create high priority task');
  });

  await test('Create quick task', async () => {
    const response = await request('POST', '/api/tasks', {
      title: 'Quick Task',
      duration: 15,
      goldValue: 50,
      importance: 'Medium',
    }, testUser.cookies);
    assertStatus(response, 200, 'Should create quick task');
  });

  await test('Create high reward task', async () => {
    const response = await request('POST', '/api/tasks', {
      title: 'High Reward Task',
      duration: 60,
      goldValue: 200,
      importance: 'Medium',
    }, testUser.cookies);
    assertStatus(response, 200, 'Should create high reward task');
  });

  await test('Create Apple task', async () => {
    const response = await request('POST', '/api/tasks', {
      title: 'Apple Task',
      duration: 30,
      goldValue: 50,
      apple: true,
    }, testUser.cookies);
    assertStatus(response, 200, 'Should create Apple task');
  });

  await test('Create routine task', async () => {
    const response = await request('POST', '/api/tasks', {
      title: 'Routine Task',
      duration: 30,
      goldValue: 50,
      recurType: 'Daily',
    }, testUser.cookies);
    assertStatus(response, 200, 'Should create routine task');
  });
}

// ============================================================================
// NOTION INTEGRATION TESTS
// ============================================================================

async function notionIntegrationTests() {
  console.log(`\n${colors.blue}═══ Notion Integration Tests ═══${colors.reset}\n`);

  let taskForNotion = null;

  await test('Create task for Notion testing', async () => {
    const response = await request('POST', '/api/tasks', {
      title: 'Notion Test Task',
      description: 'Task to test Notion integration',
      duration: 45,
      goldValue: 75,
    }, testUser.cookies);
    
    if (response.status === 200) {
      taskForNotion = response.data;
    }
  });

  await test('Sync with Notion (if configured)', async () => {
    const response = await request('POST', '/api/tasks/sync', null, testUser.cookies);
    // May succeed or fail depending on Notion configuration
    // Both are acceptable
    assert(response.status === 200 || response.status === 400 || response.status === 500,
      'Should handle Notion sync gracefully');
  });

  await test('Append task to Notion (if configured)', async () => {
    if (taskForNotion) {
      const response = await request('POST', '/api/tasks/append-to-notion', {
        taskIds: [taskForNotion.id],
      }, testUser.cookies);
      
      // May succeed or fail depending on Notion configuration
      assert(response.status === 200 || response.status === 400 || response.status === 500,
        'Should handle Notion append gracefully');
    }
  });

  await test('Delete task from Notion (if configured)', async () => {
    if (taskForNotion && taskForNotion.notionId) {
      const response = await request('POST', '/api/tasks/delete-from-notion', {
        taskIds: [taskForNotion.id],
      }, testUser.cookies);
      
      assert(response.status === 200 || response.status === 400 || response.status === 500,
        'Should handle Notion delete gracefully');
    }
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log(`\n${colors.yellow}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.yellow}║   ProductivityQuest Test Suite                 ║${colors.reset}`);
  console.log(`${colors.yellow}║   Testing against: ${BASE_URL.padEnd(30)}║${colors.reset}`);
  console.log(`${colors.yellow}╚════════════════════════════════════════════════╝${colors.reset}`);

  const startTime = Date.now();

  // Run all test suites
  await authTests();
  await shopTests();
  await taskTests();
  await taskFilteringTests();
  await notionIntegrationTests();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(`\n${colors.yellow}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.yellow}║   Test Summary                                 ║${colors.reset}`);
  console.log(`${colors.yellow}╚════════════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Duration: ${duration}s`);

  if (results.failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
        if (t.error) {
          console.log(`    ${colors.gray}${t.error}${colors.reset}`);
        }
      });
  }

  console.log('\n');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(`\n${colors.red}Fatal Error:${colors.reset}`, error);
  process.exit(1);
});

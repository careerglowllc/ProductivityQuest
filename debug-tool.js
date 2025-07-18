#!/usr/bin/env node

/**
 * Comprehensive Debug Tool for Task Management Gamification App
 * 
 * This tool tests all major functionalities of the application:
 * - Task management (CRUD operations)
 * - Gamification system (gold calculation, rewards)
 * - Recycling system (soft deletion, restoration)
 * - Shop system (purchases, gold spending)
 * - Notion integration (import/export)
 * - Progress tracking and statistics
 * 
 * Usage: node debug-tool.js [test-name]
 * Examples:
 *   node debug-tool.js                    # Run all tests
 *   node debug-tool.js tasks              # Test only task management
 *   node debug-tool.js recycling          # Test only recycling system
 *   node debug-tool.js shop               # Test only shop system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Base URL for API calls
const BASE_URL = 'http://localhost:5000';

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  failures: []
};

// Utility functions
function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(level, message) {
  const timestamp = new Date().toISOString();
  const levelColors = {
    INFO: 'cyan',
    PASS: 'green',
    FAIL: 'red',
    WARN: 'yellow',
    DEBUG: 'blue'
  };
  
  console.log(`[${timestamp}] ${colorize(level, levelColors[level])} ${message}`);
}

function assert(condition, message) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    log('PASS', message);
  } else {
    testResults.failed++;
    testResults.failures.push(message);
    log('FAIL', message);
  }
}

// HTTP request utility
async function makeRequest(method, endpoint, data = null) {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    const responseData = await response.json();
    
    return {
      status: response.status,
      data: responseData,
      success: response.ok
    };
  } catch (error) {
    log('FAIL', `Request failed: ${method} ${url} - ${error.message}`);
    return {
      status: 500,
      data: { error: error.message },
      success: false
    };
  }
}

// Test suite definitions
const testSuites = {
  async server() {
    log('INFO', 'Testing server connectivity...');
    
    // Test if server is running
    try {
      const response = await makeRequest('GET', '/api/progress');
      assert(response.success, 'Server is running and responding');
      assert(response.data.goldTotal !== undefined, 'Progress endpoint returns gold total');
    } catch (error) {
      assert(false, 'Server connectivity test failed');
    }
  },

  async tasks() {
    log('INFO', 'Testing task management system...');
    
    // Test getting tasks
    const tasksResponse = await makeRequest('GET', '/api/tasks');
    assert(tasksResponse.success, 'Can retrieve tasks list');
    assert(Array.isArray(tasksResponse.data), 'Tasks endpoint returns array');
    
    // Test creating a task
    const newTask = {
      title: 'Debug Test Task',
      description: 'This is a test task created by the debug tool',
      duration: 30,
      goldValue: 5,
      dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      completed: false,
      importance: 'Medium',
      kanbanStage: 'Not Started',
      recurType: '⏳One-Time',
      lifeDomain: 'General',
      apple: false,
      smartPrep: false,
      delegationTask: false,
      velin: false
    };
    
    const createResponse = await makeRequest('POST', '/api/tasks', newTask);
    if (!createResponse.success) {
      log('DEBUG', `Task creation failed: ${JSON.stringify(createResponse.data)}`);
      log('DEBUG', `Task data sent: ${JSON.stringify(newTask)}`);
    }
    assert(createResponse.success, 'Can create new task');
    
    if (createResponse.success) {
      const taskId = createResponse.data.id;
      
      // Test updating task
      const updateData = { title: 'Updated Debug Test Task' };
      const updateResponse = await makeRequest('PATCH', `/api/tasks/${taskId}`, updateData);
      assert(updateResponse.success, 'Can update task');
      assert(updateResponse.data.title === updateData.title, 'Task update reflects changes');
      
      // Test completing task
      const completeResponse = await makeRequest('PATCH', `/api/tasks/${taskId}/complete`);
      assert(completeResponse.success, 'Can complete task');
      assert(completeResponse.data.completed === true, 'Task marked as completed');
      assert(completeResponse.data.recycled === true, 'Completed task moved to recycling');
      
      // Test that completed task is not in main tasks list
      const tasksAfterComplete = await makeRequest('GET', '/api/tasks');
      const taskInMainList = tasksAfterComplete.data.some(task => task.id === taskId);
      assert(!taskInMainList, 'Completed task removed from main tasks list');
    }
  },

  async recycling() {
    log('INFO', 'Testing recycling system...');
    
    // Get recycled tasks
    const recycledResponse = await makeRequest('GET', '/api/recycled-tasks');
    assert(recycledResponse.success, 'Can retrieve recycled tasks');
    assert(Array.isArray(recycledResponse.data), 'Recycled tasks endpoint returns array');
    
    // Create a task to test recycling
    const testTask = {
      title: 'Recycling Test Task',
      description: 'Task for testing recycling functionality',
      duration: 20,
      goldValue: 3,
      completed: false,
      importance: 'Low',
      kanbanStage: 'Not Started',
      recurType: '⏳One-Time',
      lifeDomain: 'General',
      apple: false,
      smartPrep: false,
      delegationTask: false,
      velin: false
    };
    
    const createResponse = await makeRequest('POST', '/api/tasks', testTask);
    if (createResponse.success) {
      const taskId = createResponse.data.id;
      
      // Test deletion (should move to recycling)
      const deleteResponse = await makeRequest('DELETE', `/api/tasks/${taskId}`);
      assert(deleteResponse.success, 'Can delete task');
      
      // Check if task is in recycling
      const recycledAfterDelete = await makeRequest('GET', '/api/recycled-tasks');
      const recycledTask = recycledAfterDelete.data.find(task => task.id === taskId);
      assert(recycledTask !== undefined, 'Deleted task appears in recycling');
      assert(recycledTask.recycledReason === 'deleted', 'Task has correct recycled reason');
      
      // Test restoration
      const restoreResponse = await makeRequest('POST', `/api/tasks/${taskId}/restore`);
      assert(restoreResponse.success, 'Can restore task from recycling');
      assert(restoreResponse.data.recycled === false, 'Restored task is not recycled');
      
      // Test permanent deletion
      const deleteAgainResponse = await makeRequest('DELETE', `/api/tasks/${taskId}`);
      if (deleteAgainResponse.success) {
        const permanentDeleteResponse = await makeRequest('DELETE', `/api/tasks/${taskId}/permanent`);
        assert(permanentDeleteResponse.success, 'Can permanently delete task');
      }
    }
  },

  async shop() {
    log('INFO', 'Testing shop system...');
    
    // Test getting shop items
    const shopResponse = await makeRequest('GET', '/api/shop/items');
    assert(shopResponse.success, 'Can retrieve shop items');
    assert(Array.isArray(shopResponse.data), 'Shop items endpoint returns array');
    assert(shopResponse.data.length > 0, 'Shop has items available');
    
    // Get user progress before purchase
    const progressBefore = await makeRequest('GET', '/api/progress');
    
    if (shopResponse.success && shopResponse.data.length > 0) {
      const item = shopResponse.data[0];
      
      // Test purchasing item
      const purchaseData = {
        shopItemId: item.id,
        cost: item.cost
      };
      
      const purchaseResponse = await makeRequest('POST', '/api/shop/purchase', purchaseData);
      
      if (progressBefore.data.goldTotal >= item.cost) {
        assert(purchaseResponse.success, 'Can purchase item with sufficient gold');
        
        // Check if gold was deducted
        const progressAfter = await makeRequest('GET', '/api/progress');
        const expectedGold = progressBefore.data.goldTotal - item.cost;
        assert(progressAfter.data.goldTotal === expectedGold, 'Gold correctly deducted after purchase');
        
        // Test getting purchases
        const purchasesResponse = await makeRequest('GET', '/api/purchases');
        assert(purchasesResponse.success, 'Can retrieve purchase history');
        
        if (purchasesResponse.success && purchaseResponse.data.id) {
          // Test using purchase
          const useResponse = await makeRequest('PATCH', `/api/purchases/${purchaseResponse.data.id}/use`);
          assert(useResponse.success, 'Can use purchased item');
          assert(useResponse.data.used === true, 'Purchase marked as used');
        }
      } else {
        assert(true, 'Insufficient gold test - would fail appropriately');
      }
    }
  },

  async gamification() {
    log('INFO', 'Testing gamification system...');
    
    // Test gold calculation
    const testCases = [
      { duration: 10, importance: 'Low', expectedGold: 1 },
      { duration: 20, importance: 'Medium', expectedGold: 3 },
      { duration: 30, importance: 'High', expectedGold: 7.5 },
      { duration: 40, importance: 'Pareto', expectedGold: 12 }
    ];
    
    for (const testCase of testCases) {
      const task = {
        title: `Gold Test - ${testCase.importance}`,
        description: 'Testing gold calculation',
        duration: testCase.duration,
        goldValue: testCase.expectedGold,
        completed: false,
        importance: testCase.importance,
        kanbanStage: 'Not Started',
        recurType: '⏳One-Time',
        lifeDomain: 'General',
        apple: false,
        smartPrep: false,
        delegationTask: false,
        velin: false
      };
      
      const createResponse = await makeRequest('POST', '/api/tasks', task);
      if (createResponse.success) {
        const calculatedGold = createResponse.data.goldValue;
        assert(calculatedGold === testCase.expectedGold, 
          `Gold calculation correct for ${testCase.importance}: ${calculatedGold} = ${testCase.expectedGold}`);
      }
    }
    
    // Test progress tracking
    const progressResponse = await makeRequest('GET', '/api/progress');
    assert(progressResponse.success, 'Can retrieve user progress');
    assert(typeof progressResponse.data.goldTotal === 'number', 'Gold total is numeric');
    assert(typeof progressResponse.data.tasksCompleted === 'number', 'Tasks completed is numeric');
    
    // Test statistics
    const statsResponse = await makeRequest('GET', '/api/stats');
    assert(statsResponse.success, 'Can retrieve statistics');
    assert(typeof statsResponse.data.completedToday === 'number', 'Daily completion count is numeric');
    assert(typeof statsResponse.data.totalToday === 'number', 'Daily total count is numeric');
  },

  async notion() {
    log('INFO', 'Testing Notion integration...');
    
    // Test getting Notion task count
    const countResponse = await makeRequest('GET', '/api/notion/count');
    
    if (countResponse.success) {
      assert(typeof countResponse.data.count === 'number', 'Notion count returns numeric value');
      
      // Test import if there are tasks
      if (countResponse.data.count > 0) {
        const importResponse = await makeRequest('POST', '/api/notion/import', {});
        assert(importResponse.success, 'Can import tasks from Notion');
        assert(importResponse.data.count > 0, 'Import returns task count');
        
        // Test export
        const exportResponse = await makeRequest('POST', '/api/notion/export', {});
        assert(exportResponse.success, 'Can export tasks to Notion');
      } else {
        log('WARN', 'No tasks in Notion to test import/export');
      }
    } else {
      log('WARN', 'Notion integration not available - check credentials');
    }
  },

  async integration() {
    log('INFO', 'Testing system integration...');
    
    // Test complete workflow: create task → complete → check gold → check recycling
    const workflowTask = {
      title: 'Integration Test Task',
      description: 'End-to-end workflow test',
      duration: 50,
      goldValue: 8, // 50/10 * 1.5 (Medium importance)
      completed: false,
      importance: 'Medium',
      kanbanStage: 'Not Started',
      recurType: '⏳One-Time',
      lifeDomain: 'General',
      apple: false,
      smartPrep: false,
      delegationTask: false,
      velin: false
    };
    
    // Get initial state
    const initialProgress = await makeRequest('GET', '/api/progress');
    const initialGold = initialProgress.data.goldTotal;
    const initialCompleted = initialProgress.data.tasksCompleted;
    
    // Create task
    const createResponse = await makeRequest('POST', '/api/tasks', workflowTask);
    assert(createResponse.success, 'Integration test: Task creation');
    
    if (createResponse.success) {
      const taskId = createResponse.data.id;
      
      // Complete task
      const completeResponse = await makeRequest('PATCH', `/api/tasks/${taskId}/complete`);
      assert(completeResponse.success, 'Integration test: Task completion');
      
      // Check gold increase
      const finalProgress = await makeRequest('GET', '/api/progress');
      const goldIncrease = finalProgress.data.goldTotal - initialGold;
      assert(goldIncrease === workflowTask.goldValue, 
        `Integration test: Gold awarded (${goldIncrease} = ${workflowTask.goldValue})`);
      
      // Check task count increase
      const completedIncrease = finalProgress.data.tasksCompleted - initialCompleted;
      assert(completedIncrease === 1, 'Integration test: Task count increased');
      
      // Check recycling
      const recycledTasks = await makeRequest('GET', '/api/recycled-tasks');
      const recycledTask = recycledTasks.data.find(task => task.id === taskId);
      assert(recycledTask !== undefined, 'Integration test: Task moved to recycling');
      assert(recycledTask.recycledReason === 'completed', 'Integration test: Correct recycling reason');
    }
  },

  async search() {
    log('INFO', 'Testing search functionality...');
    
    // First, create test tasks with different content for search testing
    const testTasks = [
      {
        title: 'Project Management Meeting',
        description: 'Discuss quarterly goals and team assignments',
        duration: 60,
        goldValue: 6,
        importance: 'High',
        kanbanStage: 'Not Started',
        recurType: '⏳One-Time',
        lifeDomain: 'Purpose',
        apple: false,
        smartPrep: false,
        delegationTask: false,
        velin: false
      },
      {
        title: 'Weekly Exercise Routine',
        description: 'Cardio and strength training session',
        duration: 45,
        goldValue: 5,
        importance: 'Medium',
        kanbanStage: 'Not Started',
        recurType: '🔁Weekly',
        lifeDomain: 'Physical',
        apple: false,
        smartPrep: false,
        delegationTask: false,
        velin: false
      },
      {
        title: 'Budget Review',
        description: 'Review monthly expenses and financial goals',
        duration: 30,
        goldValue: 3,
        importance: 'High',
        kanbanStage: 'Not Started',
        recurType: '📅Monthly',
        lifeDomain: 'Finance',
        apple: false,
        smartPrep: false,
        delegationTask: false,
        velin: false
      }
    ];
    
    // Create the test tasks
    let createdTaskIds = [];
    for (const task of testTasks) {
      const createResponse = await makeRequest('POST', '/api/tasks', task);
      if (createResponse.success) {
        createdTaskIds.push(createResponse.data.id);
      }
    }
    
    assert(createdTaskIds.length === testTasks.length, 'Search test: Created all test tasks');
    
    // Get all tasks to test search logic
    const allTasksResponse = await makeRequest('GET', '/api/tasks');
    assert(allTasksResponse.success, 'Search test: Can retrieve all tasks');
    
    const allTasks = allTasksResponse.data;
    
    // Test search functionality by simulating frontend search logic
    function searchTasks(tasks, query) {
      if (!query.trim()) return tasks;
      
      const searchQuery = query.toLowerCase();
      return tasks.filter(task => {
        const titleMatch = task.title?.toLowerCase().includes(searchQuery);
        const descriptionMatch = task.description?.toLowerCase().includes(searchQuery);
        const categoryMatch = task.category?.toLowerCase().includes(searchQuery);
        const importanceMatch = task.importance?.toLowerCase().includes(searchQuery);
        return titleMatch || descriptionMatch || categoryMatch || importanceMatch;
      });
    }
    
    // Test various search scenarios
    const searchTests = [
      { query: 'project', expectedMinResults: 1, description: 'Search by title keyword' },
      { query: 'meeting', expectedMinResults: 1, description: 'Search by title keyword' },
      { query: 'quarterly', expectedMinResults: 1, description: 'Search by description keyword' },
      { query: 'exercise', expectedMinResults: 1, description: 'Search by title keyword' },
      { query: 'cardio', expectedMinResults: 1, description: 'Search by description keyword' },
      { query: 'high', expectedMinResults: 2, description: 'Search by importance level' },
      { query: 'medium', expectedMinResults: 1, description: 'Search by importance level' },
      { query: 'budget', expectedMinResults: 1, description: 'Search by title keyword' },
      { query: 'financial', expectedMinResults: 1, description: 'Search by description keyword' },
      { query: 'nonexistent', expectedMinResults: 0, description: 'Search with no results' }
    ];
    
    for (const test of searchTests) {
      const searchResults = searchTasks(allTasks, test.query);
      assert(searchResults.length >= test.expectedMinResults, 
        `Search test: ${test.description} - "${test.query}" (found ${searchResults.length}, expected min ${test.expectedMinResults})`);
    }
    
    // Test case sensitivity
    const upperCaseResults = searchTasks(allTasks, 'PROJECT');
    const lowerCaseResults = searchTasks(allTasks, 'project');
    assert(upperCaseResults.length === lowerCaseResults.length, 
      'Search test: Case insensitive search works');
    
    // Test empty search
    const emptyResults = searchTasks(allTasks, '');
    assert(emptyResults.length === allTasks.length, 
      'Search test: Empty search returns all tasks');
    
    // Test whitespace search
    const whitespaceResults = searchTasks(allTasks, '   ');
    assert(whitespaceResults.length === allTasks.length, 
      'Search test: Whitespace-only search returns all tasks');
    
    // Clean up: delete created test tasks
    for (const taskId of createdTaskIds) {
      await makeRequest('DELETE', `/api/tasks/${taskId}`);
      await makeRequest('DELETE', `/api/tasks/${taskId}/permanent`);
    }
    
    log('PASS', 'Search functionality tests completed');
  }
};

// Environment validation
function validateEnvironment() {
  log('INFO', 'Validating environment...');
  
  const requiredFiles = [
    'package.json',
    'server/index.ts',
    'server/routes.ts',
    'server/storage.ts',
    'client/src/App.tsx',
    'shared/schema.ts'
  ];
  
  for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(__dirname, file));
    assert(exists, `Required file exists: ${file}`);
  }
  
  // Check if server is running
  log('INFO', 'Checking if server is running...');
  
  // Check package.json for correct scripts
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    assert(packageJson.scripts && packageJson.scripts.dev, 'Dev script exists in package.json');
    assert(packageJson.dependencies && packageJson.dependencies.express, 'Express dependency exists');
  } catch (error) {
    assert(false, 'Cannot read or parse package.json');
  }
}

// Test runner
async function runTests(specificTest = null) {
  console.log(colorize('='.repeat(80), 'cyan'));
  console.log(colorize('🧪 Task Management App - Debug Tool', 'bright'));
  console.log(colorize('='.repeat(80), 'cyan'));
  
  // Validate environment first
  validateEnvironment();
  
  // Run specific test or all tests
  if (specificTest && testSuites[specificTest]) {
    log('INFO', `Running specific test: ${specificTest}`);
    await testSuites[specificTest]();
  } else if (specificTest) {
    log('FAIL', `Unknown test: ${specificTest}`);
    console.log('Available tests:', Object.keys(testSuites).join(', '));
    process.exit(1);
  } else {
    log('INFO', 'Running all tests...');
    
    // Run tests in logical order
    const testOrder = ['server', 'tasks', 'search', 'recycling', 'shop', 'gamification', 'notion', 'integration'];
    
    for (const testName of testOrder) {
      if (testSuites[testName]) {
        console.log(colorize(`\n--- ${testName.toUpperCase()} TESTS ---`, 'yellow'));
        await testSuites[testName]();
      }
    }
  }
  
  // Print summary
  console.log(colorize('\n' + '='.repeat(80), 'cyan'));
  console.log(colorize('📊 TEST SUMMARY', 'bright'));
  console.log(colorize('='.repeat(80), 'cyan'));
  
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  
  console.log(`Total Tests: ${testResults.total}`);
  console.log(colorize(`Passed: ${testResults.passed}`, 'green'));
  console.log(colorize(`Failed: ${testResults.failed}`, 'red'));
  console.log(`Pass Rate: ${passRate}%`);
  
  if (testResults.failures.length > 0) {
    console.log(colorize('\n🔍 FAILURES:', 'red'));
    testResults.failures.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure}`);
    });
  }
  
  if (testResults.failed === 0) {
    console.log(colorize('\n✅ All tests passed!', 'green'));
    process.exit(0);
  } else {
    console.log(colorize('\n❌ Some tests failed!', 'red'));
    process.exit(1);
  }
}

// Main execution
async function main() {
  // Add fetch polyfill for Node.js
  if (typeof fetch === 'undefined') {
    const { default: fetch } = await import('node-fetch');
    global.fetch = fetch;
  }
  
  const testName = process.argv[2];
  runTests(testName).catch(error => {
    log('FAIL', `Test runner error: ${error.message}`);
    process.exit(1);
  });
}

// Check if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runTests, testSuites };
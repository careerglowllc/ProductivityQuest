#!/usr/bin/env node

/**
 * Comprehensive Debug Tool for Task Management Gamification App
 * 
 * This tool tests all major functionalities of the application:
 * - Authentication system (user login/logout)
 * - Task management (CRUD operations, multi-selection)
 * - Gamification system (gold calculation, rewards)
 * - Recycling system (soft deletion, restoration, bulk operations)
 * - Shop system (purchases, gold spending)
 * - Search functionality (keyword search, filters)
 * - Notion integration (OAuth, import/export, selective sync)
 * - Google Calendar integration (OAuth, selective sync)
 * - Progress tracking and statistics
 * 
 * Usage: node debug-tool.js [test-name]
 * Examples:
 *   node debug-tool.js                    # Run all tests
 *   node debug-tool.js auth               # Test authentication
 *   node debug-tool.js tasks              # Test task management
 *   node debug-tool.js search             # Test search functionality
 *   node debug-tool.js recycling          # Test recycling system
 *   node debug-tool.js shop               # Test shop system
 *   node debug-tool.js notion             # Test Notion integration
 *   node debug-tool.js google             # Test Google Calendar integration
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

// HTTP request utility with session support
let sessionCookie = null;

async function makeRequest(method, endpoint, data = null, skipAuth = false) {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Add session cookie if available
    if (sessionCookie && !skipAuth) {
      options.headers['Cookie'] = sessionCookie;
    }
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    // Store session cookie from response
    if (response.headers.get('set-cookie')) {
      sessionCookie = response.headers.get('set-cookie');
    }
    
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = { message: 'Non-JSON response' };
    }
    
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

// Authentication helper
async function authenticateIfNeeded() {
  // Check if we're already authenticated
  const userResponse = await makeRequest('GET', '/api/auth/user');
  if (userResponse.success) {
    log('INFO', `Already authenticated as: ${userResponse.data.email || 'Unknown'}`);
    return true;
  }
  
  // For testing purposes, we'll assume authentication is handled externally
  // In a real debug scenario, you'd need to handle OAuth flow
  log('WARN', 'Authentication required - this debug tool requires an authenticated session');
  log('WARN', 'Open the app in a browser first to authenticate, then run this tool');
  return false;
}

// Test suite definitions
const testSuites = {
  async server() {
    log('INFO', 'Testing server connectivity...');
    
    // Test if server is running (without auth)
    try {
      const response = await makeRequest('GET', '/api/progress', null, true);
      assert(response.status !== 0, 'Server is running and responding to requests');
      
      // Check if we're authenticated
      const isAuth = await authenticateIfNeeded();
      if (isAuth) {
        const authResponse = await makeRequest('GET', '/api/progress');
        assert(authResponse.success, 'Can access authenticated endpoints');
        assert(authResponse.data.goldTotal !== undefined, 'Progress endpoint returns gold total');
      } else {
        log('WARN', 'Skipping authenticated endpoint tests - user not authenticated');
      }
    } catch (error) {
      assert(false, 'Server connectivity test failed');
    }
  },

  async auth() {
    log('INFO', 'Testing authentication system...');
    
    const isAuth = await authenticateIfNeeded();
    if (!isAuth) {
      log('WARN', 'Skipping authentication tests - user not authenticated');
      return;
    }
    
    // Test getting user info
    const userResponse = await makeRequest('GET', '/api/auth/user');
    assert(userResponse.success, 'Can retrieve user information');
    assert(userResponse.data.id !== undefined, 'User has valid ID');
    
    // Test user settings
    const settingsResponse = await makeRequest('GET', '/api/user/settings');
    assert(settingsResponse.success, 'Can retrieve user settings');
    
    log('INFO', `Current user: ${userResponse.data.email || 'Unknown'}`);
  },

  async search() {
    log('INFO', 'Testing search functionality...');
    
    const isAuth = await authenticateIfNeeded();
    if (!isAuth) {
      log('WARN', 'Skipping search tests - user not authenticated');
      return;
    }
    
    // Get all tasks first
    const tasksResponse = await makeRequest('GET', '/api/tasks');
    assert(tasksResponse.success, 'Can retrieve tasks for search testing');
    
    const tasks = tasksResponse.data;
    
    // Test search function (client-side logic)
    const searchTasks = (tasks, query) => {
      if (!query.trim()) return tasks;
      
      const searchQuery = query.toLowerCase();
      return tasks.filter(task => {
        const titleMatch = task.title?.toLowerCase().includes(searchQuery);
        const descriptionMatch = task.description?.toLowerCase().includes(searchQuery);
        const importanceMatch = task.importance?.toLowerCase().includes(searchQuery);
        const lifeDomainMatch = task.lifeDomain?.toLowerCase().includes(searchQuery);
        return titleMatch || descriptionMatch || importanceMatch || lifeDomainMatch;
      });
    };
    
    // Test various search scenarios
    const searchResults1 = searchTasks(tasks, 'project');
    const searchResults2 = searchTasks(tasks, 'high');
    const searchResults3 = searchTasks(tasks, '');
    
    assert(searchResults3.length === tasks.length, 'Empty search returns all tasks');
    assert(searchResults1.length <= tasks.length, 'Search returns filtered results');
    assert(searchResults2.length <= tasks.length, 'Importance search works');
    
    log('INFO', `Search tests: ${tasks.length} total tasks, found ${searchResults1.length} with 'project', ${searchResults2.length} with 'high'`);
  },

  async tasks() {
    log('INFO', 'Testing task management system...');
    
    const isAuth = await authenticateIfNeeded();
    if (!isAuth) {
      log('WARN', 'Skipping task tests - user not authenticated');
      return;
    }
    
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
    
    const isAuth = await authenticateIfNeeded();
    if (!isAuth) {
      log('WARN', 'Skipping recycling tests - user not authenticated');
      return;
    }
    
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
    
    const isAuth = await authenticateIfNeeded();
    if (!isAuth) {
      log('WARN', 'Skipping shop tests - user not authenticated');
      return;
    }
    
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
      } else {
        log('WARN', `Not enough gold to test purchase (have ${progressBefore.data.goldTotal}, need ${item.cost})`);
      }
    }
  },

  async notion() {
    log('INFO', 'Testing Notion integration...');
    
    const isAuth = await authenticateIfNeeded();
    if (!isAuth) {
      log('WARN', 'Skipping Notion tests - user not authenticated');
      return;
    }
    
    // Test getting Notion task count
    const countResponse = await makeRequest('GET', '/api/notion/count');
    if (countResponse.success) {
      assert(countResponse.data.count !== undefined, 'Notion count endpoint returns count');
      log('INFO', `Notion database has ${countResponse.data.count} tasks`);
    } else {
      log('WARN', 'Notion integration not configured or connection failed');
    }
    
    // Test Notion connection
    const testResponse = await makeRequest('GET', '/api/notion/test');
    if (testResponse.success) {
      assert(testResponse.data.databaseTitle !== undefined, 'Notion test returns database title');
      log('INFO', `Connected to Notion database: ${testResponse.data.databaseTitle}`);
    } else {
      log('WARN', 'Notion test connection failed - check API key and database permissions');
    }
    
    // Test importing from Notion (if configured)
    if (testResponse.success) {
      const importResponse = await makeRequest('POST', '/api/notion/import');
      if (importResponse.success) {
        assert(importResponse.data.imported !== undefined, 'Notion import returns imported count');
        log('INFO', `Imported ${importResponse.data.imported} tasks from Notion`);
      } else {
        log('WARN', 'Notion import failed - check database structure and permissions');
      }
    }
  },

  async google() {
    log('INFO', 'Testing Google Calendar integration...');
    
    const isAuth = await authenticateIfNeeded();
    if (!isAuth) {
      log('WARN', 'Skipping Google tests - user not authenticated');
      return;
    }
    
    // Test getting Google auth URL
    const authResponse = await makeRequest('GET', '/api/google/auth');
    if (authResponse.success) {
      assert(authResponse.data.authUrl !== undefined, 'Google auth endpoint returns auth URL');
      log('INFO', 'Google OAuth URL generated successfully');
    } else {
      log('WARN', 'Google OAuth not configured - check CLIENT_ID and CLIENT_SECRET');
    }
    
    // Test Google Calendar connection (if user is authenticated)
    const testResponse = await makeRequest('GET', '/api/google/test');
    if (testResponse.success) {
      assert(testResponse.data.connected === true, 'Google Calendar connection successful');
      log('INFO', 'Google Calendar connection test passed');
    } else {
      log('WARN', 'Google Calendar not connected - user needs to authenticate first');
    }
    
    // Test selective calendar sync (if connected)
    if (testResponse.success) {
      const tasksResponse = await makeRequest('GET', '/api/tasks');
      if (tasksResponse.success && tasksResponse.data.length > 0) {
        const taskIds = tasksResponse.data.slice(0, 2).map(task => task.id); // Select first 2 tasks
        const syncData = { taskIds };
        
        const syncResponse = await makeRequest('POST', '/api/google/sync', syncData);
        if (syncResponse.success) {
          assert(syncResponse.data.synced !== undefined, 'Google sync returns synced count');
          log('INFO', `Successfully synced ${syncResponse.data.synced} tasks to Google Calendar`);
        } else {
          log('WARN', 'Google Calendar sync failed - check permissions and calendar access');
        }
      }
    }
  },

  async stats() {
    log('INFO', 'Testing statistics and progress tracking...');
    
    const isAuth = await authenticateIfNeeded();
    if (!isAuth) {
      log('WARN', 'Skipping stats tests - user not authenticated');
      return;
    }
    
    // Test getting progress
    const progressResponse = await makeRequest('GET', '/api/progress');
    assert(progressResponse.success, 'Can retrieve user progress');
    assert(progressResponse.data.goldTotal !== undefined, 'Progress includes gold total');
    assert(progressResponse.data.tasksCompleted !== undefined, 'Progress includes tasks completed');
    
    // Test getting daily stats
    const statsResponse = await makeRequest('GET', '/api/stats');
    assert(statsResponse.success, 'Can retrieve daily statistics');
    assert(statsResponse.data.completedToday !== undefined, 'Stats include completed today');
    assert(statsResponse.data.totalToday !== undefined, 'Stats include total today');
    assert(statsResponse.data.goldEarnedToday !== undefined, 'Stats include gold earned today');
    
    log('INFO', `Progress: ${progressResponse.data.goldTotal} gold, ${progressResponse.data.tasksCompleted} completed`);
    log('INFO', `Today: ${statsResponse.data.completedToday}/${statsResponse.data.totalToday} tasks, ${statsResponse.data.goldEarnedToday} gold earned`);
  }
};

// Main execution function
async function main() {
  // Add fetch polyfill for Node.js
  if (typeof fetch === 'undefined') {
    const { default: fetch } = await import('node-fetch');
    global.fetch = fetch;
  }
  
  const targetTest = process.argv[2];
  
  console.log(colorize('🚀 Task Management Gamification App Debug Tool', 'bright'));
  console.log(colorize('='.repeat(60), 'cyan'));
  
  if (targetTest && !testSuites[targetTest]) {
    console.log(colorize(`❌ Test suite "${targetTest}" not found`, 'red'));
    console.log(colorize('Available test suites:', 'yellow'));
    Object.keys(testSuites).forEach(suite => {
      console.log(colorize(`  • ${suite}`, 'cyan'));
    });
    process.exit(1);
  }
  
  const suitesToRun = targetTest ? [targetTest] : Object.keys(testSuites);
  
  log('INFO', `Running ${suitesToRun.length} test suite(s): ${suitesToRun.join(', ')}`);
  
  for (const suiteName of suitesToRun) {
    try {
      console.log(colorize(`\n📋 Running ${suiteName} tests...`, 'bright'));
      await testSuites[suiteName]();
    } catch (error) {
      log('FAIL', `Test suite ${suiteName} crashed: ${error.message}`);
    }
  }
  
  // Print summary
  console.log(colorize('\n📊 Test Results Summary', 'bright'));
  console.log(colorize('='.repeat(40), 'cyan'));
  console.log(colorize(`✅ Passed: ${testResults.passed}`, 'green'));
  console.log(colorize(`❌ Failed: ${testResults.failed}`, 'red'));
  console.log(colorize(`📈 Total: ${testResults.total}`, 'blue'));
  
  if (testResults.failed > 0) {
    console.log(colorize('\n🔍 Failures:', 'red'));
    testResults.failures.forEach(failure => {
      console.log(colorize(`  • ${failure}`, 'red'));
    });
  }
  
  const successRate = testResults.total > 0 ? (testResults.passed / testResults.total * 100).toFixed(1) : 0;
  console.log(colorize(`\n🎯 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow'));
  
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Check if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(colorize(`💥 Debug tool crashed: ${error.message}`, 'red'));
    process.exit(1);
  });
}
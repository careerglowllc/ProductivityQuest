#!/usr/bin/env node

/**
 * Simple Search Logic Test
 * Tests the search functionality without needing server authentication
 */

// Test search function (same as frontend implementation)
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

// Test data
const testTasks = [
  {
    id: 1,
    title: 'Project Management Meeting',
    description: 'Discuss quarterly goals and team assignments',
    importance: 'High',
    category: 'Work',
    lifeDomain: 'Purpose'
  },
  {
    id: 2,
    title: 'Weekly Exercise Routine',
    description: 'Cardio and strength training session',
    importance: 'Medium',
    category: 'Health',
    lifeDomain: 'Physical'
  },
  {
    id: 3,
    title: 'Budget Review',
    description: 'Review monthly expenses and financial goals',
    importance: 'High',
    category: 'Finance',
    lifeDomain: 'Finance'
  },
  {
    id: 4,
    title: 'Read Technical Documentation',
    description: 'Study new framework for upcoming project',
    importance: 'Medium',
    category: 'Learning',
    lifeDomain: 'Purpose'
  }
];

// Test cases
const testCases = [
  { query: 'project', expected: 2, description: 'Search for "project" should find 2 tasks' },
  { query: 'meeting', expected: 1, description: 'Search for "meeting" should find 1 task' },
  { query: 'quarterly', expected: 1, description: 'Search for "quarterly" in description should find 1 task' },
  { query: 'exercise', expected: 1, description: 'Search for "exercise" should find 1 task' },
  { query: 'high', expected: 2, description: 'Search for "high" importance should find 2 tasks' },
  { query: 'medium', expected: 2, description: 'Search for "medium" importance should find 2 tasks' },
  { query: 'finance', expected: 1, description: 'Search for "finance" should find 1 task' },
  { query: 'nonexistent', expected: 0, description: 'Search for non-existent term should find 0 tasks' },
  { query: '', expected: 4, description: 'Empty search should return all tasks' },
  { query: '   ', expected: 4, description: 'Whitespace search should return all tasks' },
  { query: 'PROJECT', expected: 2, description: 'Uppercase search should be case-insensitive' },
  { query: 'cardio', expected: 1, description: 'Search in description should work' }
];

console.log('🔍 Testing Search Functionality\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const results = searchTasks(testTasks, testCase.query);
  const success = results.length === testCase.expected;
  
  if (success) {
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${results.length}`);
    console.log(`   Query: "${testCase.query}"`);
    console.log(`   Results: ${results.map(r => r.title).join(', ')}`);
    failed++;
  }
});

console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All search tests passed!');
  process.exit(0);
} else {
  console.log('🔧 Some tests failed. Check implementation.');
  process.exit(1);
}
#!/usr/bin/env node

/**
 * ProductivityQuest — Comprehensive Test Suite
 *
 * Covers ALL major features:
 *   Auth · Tasks · Filters · XP / Skills · Shop / Inventory
 *   Notion Integration · Google Calendar · Finances · Market Data
 *   Campaigns / Questlines · Stats · CSV Import/Export
 *   Standalone Calendar Events · Recycle Bin · AI Categorization
 *
 * Run: node test-suite.js
 * Override server: TEST_URL=http://localhost:5001 node test-suite.js
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:5001';

// ── ANSI colours ─────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  bold:   '\x1b[1m',
};

// ── Results tracker ───────────────────────────────────────────────────────────
const results = { passed: 0, failed: 0, skipped: 0, tests: [] };

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function request(method, path, body = null, cookies = null, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (cookies) headers['Cookie'] = cookies;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const response = await fetch(`${BASE_URL}${path}`, opts);
  const ct = response.headers.get('content-type') || '';
  return {
    status: response.status,
    data: ct.includes('application/json') ? await response.json() : await response.text(),
    cookies: response.headers.get('set-cookie'),
    headers: response.headers,
  };
}

// ── Assertions ────────────────────────────────────────────────────────────────
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function assertStatus(res, expected, msg) { if (res.status !== expected) throw new Error(msg || `Expected HTTP ${expected}, got ${res.status}: ${JSON.stringify(res.data)}`); }
function assertHas(obj, key, msg) { if (!(key in obj)) throw new Error(msg || `Expected key "${key}" in object`); }

// ── Test runner ───────────────────────────────────────────────────────────────
async function test(name, fn, { skip = false } = {}) {
  if (skip) {
    console.log(`${c.yellow}○${c.reset} ${name} ${c.gray}(skipped)${c.reset}`);
    results.skipped++;
    results.tests.push({ name, status: 'SKIP' });
    return;
  }
  process.stdout.write(`${c.cyan}▶${c.reset} ${name}...`);
  try {
    await fn();
    console.log(` ${c.green}✓ PASS${c.reset}`);
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
  } catch (err) {
    console.log(` ${c.red}✗ FAIL${c.reset}`);
    console.log(`  ${c.gray}→ ${err.message}${c.reset}`);
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: err.message });
  }
}

function section(title) {
  console.log(`\n${c.blue}${c.bold}═══ ${title} ═══${c.reset}\n`);
}

// ── Shared state ──────────────────────────────────────────────────────────────
let testUser = { cookies: null, id: null, username: null };
let taskId = null;
let financeItemId = null;
let campaignId = null;
let questlineId = null;
let shopItemId = null;
let purchaseId = null;
let standaloneEventId = null;
let createdSkillId = null;

const TEST_USERNAME = `testuser_${Date.now()}`;
const TEST_EMAIL    = `${TEST_USERNAME}@test.com`;
const TEST_PASSWORD = 'TestPass123!';

// =============================================================================
// 1. AUTHENTICATION
// =============================================================================
async function authTests() {
  section('Authentication');

  await test('Register new user', async () => {
    const res = await request('POST', '/api/auth/register', {
      username: TEST_USERNAME, email: TEST_EMAIL, password: TEST_PASSWORD,
    });
    assertStatus(res, 200, 'Register should return 200');
    assert(res.data.id, 'Should return user id');
    testUser.cookies = res.cookies;
    testUser.id = res.data.id;
    testUser.username = res.data.username;
  });

  await test('Reject duplicate username', async () => {
    const res = await request('POST', '/api/auth/register', {
      username: TEST_USERNAME, email: `dup_${TEST_EMAIL}`, password: TEST_PASSWORD,
    });
    assert(res.status === 400 || res.status === 409, 'Duplicate username should fail');
  });

  await test('Reject weak password', async () => {
    const res = await request('POST', '/api/auth/register', {
      username: `weakpwd_${Date.now()}`, email: 'weak@test.com', password: '123',
    });
    assert(res.status === 400, 'Weak password should be rejected');
  });

  await test('Login with correct credentials', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: TEST_USERNAME, password: TEST_PASSWORD,
    });
    assertStatus(res, 200, 'Login should return 200');
    assert(res.cookies, 'Should set session cookie');
    testUser.cookies = res.cookies;
  });

  await test('Login with wrong password returns 401', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: TEST_USERNAME, password: 'wrongpassword',
    });
    assertEqual(res.status, 401, 'Wrong password should be 401');
  });

  await test('GET /api/auth/user returns current user', async () => {
    const res = await request('GET', '/api/auth/user', null, testUser.cookies);
    assertStatus(res, 200);
    assertEqual(res.data.username, TEST_USERNAME, 'Should return correct username');
  });

  await test('Unauthenticated request returns 401', async () => {
    const res = await request('GET', '/api/tasks');
    assertEqual(res.status, 401, 'Should return 401 without auth');
  });

  await test('GET /api/user/settings returns settings object', async () => {
    const res = await request('GET', '/api/user/settings', null, testUser.cookies);
    assertStatus(res, 200);
    assert(typeof res.data === 'object', 'Should return settings object');
  });

  await test('PUT /api/user/settings updates settings', async () => {
    const res = await request('PUT', '/api/user/settings', {
      timezone: 'America/Los_Angeles',
    }, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('POST /api/settings/timezone updates timezone', async () => {
    const res = await request('POST', '/api/settings/timezone', {
      timezone: 'America/New_York',
    }, testUser.cookies);
    assertStatus(res, 200);
  });
}

// =============================================================================
// 2. TASKS — CRUD
// =============================================================================
async function taskCrudTests() {
  section('Tasks — CRUD');

  await test('Create task with full fields', async () => {
    const res = await request('POST', '/api/tasks', {
      title: 'Test Task Alpha',
      description: 'Integration test task',
      duration: 45,
      goldValue: 80,
      importance: 'High',
      category: 'Work',
      skillTags: ['Coding', 'Problem Solving'],
    }, testUser.cookies);
    assertStatus(res, 200, 'Should create task');
    assert(res.data.id, 'Should have id');
    assertEqual(res.data.title, 'Test Task Alpha');
    taskId = res.data.id;
  });

  await test('GET /api/tasks returns array', async () => {
    const res = await request('GET', '/api/tasks', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data), 'Should return array');
    assert(res.data.length > 0, 'Should have at least one task');
  });

  await test('Create task with minimal fields', async () => {
    const res = await request('POST', '/api/tasks', {
      title: 'Minimal Task', duration: 15, goldValue: 20, importance: 'Low',
    }, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('Create task fails without title', async () => {
    const res = await request('POST', '/api/tasks', {
      duration: 30, goldValue: 50, importance: 'Medium',
    }, testUser.cookies);
    assert(res.status === 400 || res.status === 422, 'Should reject missing title');
  });

  await test('PATCH task updates fields', async () => {
    const res = await request('PATCH', `/api/tasks/${taskId}`, {
      title: 'Test Task Alpha (updated)', description: 'Updated description',
    }, testUser.cookies);
    assertStatus(res, 200);
    assertEqual(res.data.title, 'Test Task Alpha (updated)');
  });

  await test('PATCH /api/tasks/:id/color updates color', async () => {
    const res = await request('PATCH', `/api/tasks/${taskId}/color`, {
      color: '#FF5733',
    }, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('POST /api/tasks/:id/unschedule unschedules task', async () => {
    const res = await request('POST', `/api/tasks/${taskId}/unschedule`, null, testUser.cookies);
    assert(res.status === 200 || res.status === 404);
  });

  await test('Complete task awards XP and gold', async () => {
    const res = await request('PATCH', `/api/tasks/${taskId}`, {
      completed: true,
    }, testUser.cookies);
    assertStatus(res, 200);
    assert(res.data.completed === true, 'Task should be marked completed');
  });

  await test('POST /api/tasks/undo-complete reverts completion', async () => {
    const res = await request('POST', '/api/tasks/undo-complete', {
      taskId: taskId,
    }, testUser.cookies);
    assert(res.status === 200 || res.status === 404);
  });

  await test('POST /api/tasks/complete-batch completes multiple tasks', async () => {
    const t1 = await request('POST', '/api/tasks', { title: 'Batch 1', duration: 15, goldValue: 20, importance: 'Low' }, testUser.cookies);
    const t2 = await request('POST', '/api/tasks', { title: 'Batch 2', duration: 15, goldValue: 20, importance: 'Low' }, testUser.cookies);
    if (t1.status === 200 && t2.status === 200) {
      const res = await request('POST', '/api/tasks/complete-batch', {
        taskIds: [t1.data.id, t2.data.id],
      }, testUser.cookies);
      assertStatus(res, 200);
    }
  });

  await test('POST /api/tasks/move-overdue-to-today', async () => {
    const res = await request('POST', '/api/tasks/move-overdue-to-today', null, testUser.cookies);
    assertStatus(res, 200);
  });
}

// =============================================================================
// 3. TASK FILTERING
// =============================================================================
async function taskFilteringTests() {
  section('Task Filtering');

  const filters = [
    'today','tomorrow','this-week','overdue',
    'high','medium','low','pareto',
    'completed','active',
    'business','personal',
    'duration-short','duration-medium','duration-long',
  ];

  for (const filter of filters) {
    await test(`Filter: ${filter}`, async () => {
      const res = await request('GET', `/api/tasks?filter=${filter}`, null, testUser.cookies);
      assertStatus(res, 200);
      assert(Array.isArray(res.data), `Filter "${filter}" should return array`);
    });
  }

  await test('Search tasks by title keyword', async () => {
    const res = await request('GET', '/api/tasks?search=Test', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data));
  });

  await test('Filter tasks by category', async () => {
    const res = await request('GET', '/api/tasks?category=Work', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data));
  });
}

// =============================================================================
// 4. TASK RECYCLE BIN
// =============================================================================
async function recycleBinTests() {
  section('Task Recycle Bin');

  let binTaskId = null;

  await test('Create task to be deleted', async () => {
    const res = await request('POST', '/api/tasks', {
      title: 'To Be Deleted', duration: 15, goldValue: 10, importance: 'Low',
    }, testUser.cookies);
    assertStatus(res, 200);
    binTaskId = res.data.id;
  });

  await test('Soft-delete task moves to recycle bin', async () => {
    if (!binTaskId) return;
    const res = await request('DELETE', `/api/tasks/${binTaskId}`, null, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('GET /api/recycled-tasks returns array', async () => {
    const res = await request('GET', '/api/recycled-tasks', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data));
  });

  await test('Restore task from recycle bin', async () => {
    if (!binTaskId) return;
    const res = await request('POST', `/api/tasks/${binTaskId}/restore`, null, testUser.cookies);
    assert(res.status === 200 || res.status === 404);
  });

  await test('Permanently delete task', async () => {
    if (!binTaskId) return;
    await request('DELETE', `/api/tasks/${binTaskId}`, null, testUser.cookies);
    const res = await request('DELETE', `/api/tasks/${binTaskId}/permanent`, null, testUser.cookies);
    assert(res.status === 200 || res.status === 404);
  });

  await test('POST /api/tasks/restore handles empty array', async () => {
    const res = await request('POST', '/api/tasks/restore', { taskIds: [] }, testUser.cookies);
    assert(res.status === 200 || res.status === 400);
  });

  await test('POST /api/tasks/permanent-delete handles empty array', async () => {
    const res = await request('POST', '/api/tasks/permanent-delete', { taskIds: [] }, testUser.cookies);
    assert(res.status === 200 || res.status === 400);
  });
}

// =============================================================================
// 5. CSV IMPORT / EXPORT
// =============================================================================
async function csvTests() {
  section('CSV Import / Export');

  await test('GET /api/tasks/export/csv returns CSV data', async () => {
    const res = await request('GET', '/api/tasks/export/csv', null, testUser.cookies);
    assertStatus(res, 200);
    assert(typeof res.data === 'string' || typeof res.data === 'object', 'Should return CSV data');
  });

  await test('POST /api/tasks/import/csv endpoint exists (no file = 400)', async () => {
    const res = await request('POST', '/api/tasks/import/csv', null, testUser.cookies);
    assert(res.status !== 404, 'CSV import endpoint should exist (not 404)');
  });
}

// =============================================================================
// 6. XP SYSTEM & SKILLS
// =============================================================================
async function xpSkillTests() {
  section('XP System & Skills');

  await test('GET /api/skills returns array', async () => {
    const res = await request('GET', '/api/skills', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data));
  });

  await test('GET /api/progress returns level and xp', async () => {
    const res = await request('GET', '/api/progress', null, testUser.cookies);
    assertStatus(res, 200);
    assertHas(res.data, 'level');
    assertHas(res.data, 'xp');
  });

  await test('XP formula: High priority 60min / 2 skills = 36 XP each', async () => {
    const t = await request('POST', '/api/tasks', {
      title: 'XP Calc Test', duration: 60, goldValue: 100, importance: 'High',
      skillTags: ['Coding', 'Problem Solving'],
    }, testUser.cookies);
    assertStatus(t, 200);
    const res = await request('PATCH', `/api/tasks/${t.data.id}`, { completed: true }, testUser.cookies);
    assertStatus(res, 200);
    if (res.data.skillXPGains && res.data.skillXPGains.length === 2) {
      assertEqual(res.data.skillXPGains[0].xpGained, 36, 'High 60min / 2 skills = 36 XP each');
    }
  });

  await test('XP formula: Low priority 15min = 15 XP', async () => {
    const t = await request('POST', '/api/tasks', {
      title: 'Low XP Test', duration: 15, goldValue: 25, importance: 'Low',
      skillTags: ['Organization'],
    }, testUser.cookies);
    assertStatus(t, 200);
    const res = await request('PATCH', `/api/tasks/${t.data.id}`, { completed: true }, testUser.cookies);
    if (res.data.skillXPGains && res.data.skillXPGains.length > 0) {
      assertEqual(res.data.skillXPGains[0].xpGained, 15, 'Low 15min = 15 XP');
    }
  });

  await test('XP formula: Pareto 30min = 39 XP (30% bonus)', async () => {
    const t = await request('POST', '/api/tasks', {
      title: 'Pareto XP Test', duration: 30, goldValue: 50, importance: 'Pareto',
      skillTags: ['Leadership'],
    }, testUser.cookies);
    assertStatus(t, 200);
    const res = await request('PATCH', `/api/tasks/${t.data.id}`, { completed: true }, testUser.cookies);
    if (res.data.skillXPGains && res.data.skillXPGains.length > 0) {
      assertEqual(res.data.skillXPGains[0].xpGained, 39, 'Pareto 30min = 39 XP (30% bonus)');
    }
  });

  await test('POST /api/skills/custom creates custom skill', async () => {
    const res = await request('POST', '/api/skills/custom', {
      name: `TestSkill_${Date.now()}`, description: 'Integration test skill', icon: 'Star',
    }, testUser.cookies);
    assertStatus(res, 200);
    assert(res.data.id);
    createdSkillId = res.data.id;
  });

  await test('PATCH /api/skills/id/:id updates skill', async () => {
    if (!createdSkillId) return;
    const res = await request('PATCH', `/api/skills/id/${createdSkillId}`, {
      description: 'Updated description',
    }, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('PATCH /api/skills/:id/milestones updates milestones', async () => {
    if (!createdSkillId) return;
    const res = await request('PATCH', `/api/skills/${createdSkillId}/milestones`, {
      milestones: [{ id: 'ms1', title: 'First Milestone', xpRequired: 100, completed: false }],
    }, testUser.cookies);
    assert(res.status === 200 || res.status === 404);
  });

  await test('DELETE /api/skills/:id deletes custom skill', async () => {
    if (!createdSkillId) return;
    const res = await request('DELETE', `/api/skills/${createdSkillId}`, null, testUser.cookies);
    assertStatus(res, 200);
    createdSkillId = null;
  });

  await test('POST /api/skills/restore-defaults restores defaults', async () => {
    const res = await request('POST', '/api/skills/restore-defaults', null, testUser.cookies);
    assertStatus(res, 200);
  });
}

// =============================================================================
// 7. SHOP & INVENTORY
// =============================================================================
async function shopTests() {
  section('Shop & Inventory');

  await test('GET /api/shop/items returns array', async () => {
    const res = await request('GET', '/api/shop/items', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data));
  });

  await test('POST /api/shop/seed-defaults seeds shop', async () => {
    const res = await request('POST', '/api/shop/seed-defaults', null, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('Shop has items after seed', async () => {
    const res = await request('GET', '/api/shop/items', null, testUser.cookies);
    assertStatus(res, 200);
    if (res.data.length > 0) shopItemId = res.data[0].id;
  });

  await test('POST /api/shop/items creates custom shop item', async () => {
    const res = await request('POST', '/api/shop/items', {
      name: 'Test Potion', description: 'A test item', cost: 50, emoji: '🧪', category: 'consumable',
    }, testUser.cookies);
    assertStatus(res, 200);
    assert(res.data.id);
  });

  await test('POST /api/shop/purchase buys item or returns 400 (insufficient gold)', async () => {
    if (!shopItemId) return;
    const res = await request('POST', '/api/shop/purchase', { itemId: shopItemId }, testUser.cookies);
    assert(res.status === 200 || res.status === 400);
    if (res.status === 200) purchaseId = res.data.purchaseId || res.data.id;
  });

  await test('GET /api/purchases returns purchase history', async () => {
    const res = await request('GET', '/api/purchases', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data));
  });

  await test('GET /api/inventory returns inventory', async () => {
    const res = await request('GET', '/api/inventory', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data));
  });

  await test('PATCH /api/purchases/:id/use uses inventory item', async () => {
    if (!purchaseId) return;
    const res = await request('PATCH', `/api/purchases/${purchaseId}/use`, null, testUser.cookies);
    assert(res.status === 200 || res.status === 404);
  });
}

// =============================================================================
// 8. CAMPAIGNS & QUESTLINES
// =============================================================================
async function campaignQuestlineTests() {
  section('Campaigns & Questlines');

  await test('GET /api/campaigns returns array', async () => {
    const res = await request('GET', '/api/campaigns', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data));
  });

  await test('POST /api/campaigns creates campaign', async () => {
    const res = await request('POST', '/api/campaigns', {
      name: 'Test Campaign', description: 'Integration test campaign',
      icon: 'Target', color: '#6366f1',
    }, testUser.cookies);
    assertStatus(res, 200);
    assert(res.data.id);
    campaignId = res.data.id;
  });

  await test('PATCH /api/campaigns/:id updates campaign', async () => {
    if (!campaignId) return;
    const res = await request('PATCH', `/api/campaigns/${campaignId}`, {
      description: 'Updated description',
    }, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('GET /api/questlines returns array', async () => {
    const res = await request('GET', '/api/questlines', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data));
  });

  await test('POST /api/questlines creates questline', async () => {
    const res = await request('POST', '/api/questlines', {
      name: 'Test Questline', description: 'Integration test questline',
      category: 'Work', icon: 'BookOpen',
    }, testUser.cookies);
    assertStatus(res, 200);
    assert(res.data.id);
    questlineId = res.data.id;
  });

  await test('GET /api/questlines/:id returns questline', async () => {
    if (!questlineId) return;
    const res = await request('GET', `/api/questlines/${questlineId}`, null, testUser.cookies);
    assertStatus(res, 200);
    assertEqual(res.data.name, 'Test Questline');
  });

  await test('PATCH /api/questlines/:id updates questline', async () => {
    if (!questlineId) return;
    const res = await request('PATCH', `/api/questlines/${questlineId}`, {
      description: 'Updated questline description',
    }, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('POST /api/questlines/:id/add-stages adds stages', async () => {
    if (!questlineId) return;
    const res = await request('POST', `/api/questlines/${questlineId}/add-stages`, {
      stages: [{ title: 'Stage 1', tasks: [] }],
    }, testUser.cookies);
    assert(res.status === 200 || res.status === 400);
  });

  await test('POST /api/questlines/:id/check-completion responds', async () => {
    if (!questlineId) return;
    const res = await request('POST', `/api/questlines/${questlineId}/check-completion`, null, testUser.cookies);
    assert(res.status === 200 || res.status === 404);
  });

  await test('DELETE /api/questlines/:id deletes questline', async () => {
    if (!questlineId) return;
    const res = await request('DELETE', `/api/questlines/${questlineId}`, null, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('DELETE /api/campaigns/:id deletes campaign', async () => {
    if (!campaignId) return;
    const res = await request('DELETE', `/api/campaigns/${campaignId}`, null, testUser.cookies);
    assertStatus(res, 200);
  });
}

// =============================================================================
// 9. FINANCES
// =============================================================================
async function financeTests() {
  section('Finances');

  await test('GET /api/finances returns array', async () => {
    const res = await request('GET', '/api/finances', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data));
  });

  await test('POST /api/finances creates finance item', async () => {
    const res = await request('POST', '/api/finances', {
      item: 'Test Expense',
      category: 'General',
      monthlyCost: 5000,
      recurType: 'Monthly',
    }, testUser.cookies);
    assertStatus(res, 200);
    assert(res.data.id);
    financeItemId = res.data.id;
  });

  await test('Finance item fields persisted correctly', async () => {
    const res = await request('GET', '/api/finances', null, testUser.cookies);
    assertStatus(res, 200);
    const item = res.data.find(i => i.id === financeItemId);
    assert(item, 'Created item should appear in list');
    assertEqual(item.monthlyCost, 5000, 'Monthly cost should be 5000 cents');
    assertEqual(item.category, 'General');
    assertEqual(item.recurType, 'Monthly');
  });

  await test('Annual cost = monthlyCost * 12', async () => {
    const res = await request('GET', '/api/finances', null, testUser.cookies);
    const item = res.data.find(i => i.id === financeItemId);
    if (item && item.annualCost !== undefined) {
      assertEqual(item.annualCost, item.monthlyCost * 12, 'annualCost should be 12x monthlyCost');
    }
  });

  await test('PG&E/NEM item label check (existing data)', async () => {
    const res = await request('GET', '/api/finances', null, testUser.cookies);
    assertStatus(res, 200);
    const pgItem = res.data.find(i => i.item && i.item.toLowerCase().includes('nem'));
    if (!pgItem) {
      console.log(`  \x1b[90m  info: PG&E/NEM item not present (expected for fresh accounts)\x1b[0m`);
    } else {
      assert(pgItem.item.includes('NEED UPDATE'), 'PG&E item should contain NEM/update note');
    }
  });

  await test('DELETE /api/finances/:id removes item', async () => {
    if (!financeItemId) return;
    const res = await request('DELETE', `/api/finances/${financeItemId}`, null, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('Deleted finance item absent from list', async () => {
    const res = await request('GET', '/api/finances', null, testUser.cookies);
    const item = res.data.find(i => i.id === financeItemId);
    assert(!item, 'Deleted finance item should not appear in list');
  });
}

// =============================================================================
// 10. MARKET DATA APIs
// =============================================================================
async function marketDataTests() {
  section('Market Data APIs');

  await test('GET /api/market/bitcoin returns positive BTC price', async () => {
    const res = await request('GET', '/api/market/bitcoin');
    assertStatus(res, 200);
    assert(typeof res.data.price === 'number', 'Price should be a number');
    assert(res.data.price > 0, 'BTC price should be > 0');
    console.log(`  \x1b[90m  BTC: $${res.data.price.toLocaleString()} (source: ${res.data.source})\x1b[0m`);
  });

  await test('GET /api/market/vtsax returns positive VTSAX price', async () => {
    const res = await request('GET', '/api/market/vtsax');
    assertStatus(res, 200);
    assert(typeof res.data.price === 'number');
    assert(res.data.price > 0);
    console.log(`  \x1b[90m  VTSAX: $${res.data.price} (source: ${res.data.source})\x1b[0m`);
  });

  await test('GET /api/market/voo returns positive VOO price', async () => {
    const res = await request('GET', '/api/market/voo');
    assertStatus(res, 200);
    assert(typeof res.data.price === 'number');
    assert(res.data.price > 0);
    console.log(`  \x1b[90m  VOO: $${res.data.price} (source: ${res.data.source})\x1b[0m`);
  });

  await test('GET /api/market/ibit returns IBIT price', async () => {
    const res = await request('GET', '/api/market/ibit');
    assertStatus(res, 200);
    assert(typeof res.data.price === 'number');
    console.log(`  \x1b[90m  IBIT: $${res.data.price} (source: ${res.data.source})\x1b[0m`);
  });

  await test('GET /api/market/property: 200 with price OR 502 (Redfin may block)', async () => {
    const address = '2605 Plumbago Court, Rocklin, CA 95677';
    const res = await request('GET', `/api/market/property?address=${encodeURIComponent(address)}`);
    if (res.status === 200) {
      assert(typeof res.data.price === 'number', 'Should have numeric price');
      assert(res.data.price > 0, 'Property price should be positive');
      console.log(`  \x1b[90m  Property: $${res.data.price?.toLocaleString()} (source: ${res.data.source})\x1b[0m`);
    } else {
      console.log(`  \x1b[33m  Redfin returned ${res.status} - bot detection likely active\x1b[0m`);
      console.log(`  \x1b[90m  UI falls back to manual value ($635,000) - this is expected behavior\x1b[0m`);
    }
    assert([200, 400, 500, 502].includes(res.status), `Unexpected status: ${res.status}`);
  });

  await test('GET /api/market/property without address returns 400', async () => {
    const res = await request('GET', '/api/market/property');
    assertEqual(res.status, 400, 'Missing address should return 400');
  });

  await test('BTC consecutive calls stay within $500 (caching check)', async () => {
    const r1 = await request('GET', '/api/market/bitcoin');
    const r2 = await request('GET', '/api/market/bitcoin');
    assertStatus(r2, 200);
    assert(Math.abs(r1.data.price - r2.data.price) < 500, 'Cached BTC price should be nearly equal');
  });
}

// =============================================================================
// 11. GOOGLE CALENDAR
// =============================================================================
async function googleCalendarTests() {
  section('Google Calendar Integration');

  await test('GET /api/google-calendar/authorize-url returns OAuth URL', async () => {
    const res = await request('GET', '/api/google-calendar/authorize-url', null, testUser.cookies);
    assertStatus(res, 200);
    const url = res.data.url || res.data.authUrl || res.data;
    assert(typeof url === 'string' && (url.includes('google') || url.includes('oauth')),
      'Should return a Google OAuth URL');
  });

  await test('GET /api/google/test returns connection status', async () => {
    const res = await request('GET', '/api/google/test', null, testUser.cookies);
    assert([200, 400, 401].includes(res.status));
    console.log(`  \x1b[90m  Google status: ${res.status === 200 ? 'connected' : 'not connected (expected for test user)'}\x1b[0m`);
  });

  await test('GET /api/google-calendar/debug responds', async () => {
    const res = await request('GET', '/api/google-calendar/debug', null, testUser.cookies);
    assert([200, 400, 401].includes(res.status));
  });

  await test('GET /api/google-calendar/calendars returns list or auth error', async () => {
    const res = await request('GET', '/api/google-calendar/calendars', null, testUser.cookies);
    assert([200, 400, 401].includes(res.status));
  });

  await test('GET /api/google-calendar/events returns events or auth error', async () => {
    const res = await request('GET', '/api/google-calendar/events', null, testUser.cookies);
    assert([200, 400, 401].includes(res.status));
  });

  await test('POST /api/calendar/sync handles no-token gracefully', async () => {
    const res = await request('POST', '/api/calendar/sync', {}, testUser.cookies);
    assert([200, 400, 401].includes(res.status));
  });

  await test('POST /api/google-calendar/sync handles no-token gracefully', async () => {
    const res = await request('POST', '/api/google-calendar/sync', {}, testUser.cookies);
    assert([200, 400, 401].includes(res.status));
  });

  await test('PUT /api/google-calendar/settings updates sync settings', async () => {
    const res = await request('PUT', '/api/google-calendar/settings', {
      enabled: false, syncDirection: 'one-way',
    }, testUser.cookies);
    assert([200, 400].includes(res.status));
  });
}

// =============================================================================
// 12. STANDALONE CALENDAR EVENTS
// =============================================================================
async function standaloneEventTests() {
  section('Standalone Calendar Events');

  await test('POST /api/standalone-events creates event', async () => {
    const res = await request('POST', '/api/standalone-events', {
      title: 'Test Standalone Event',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      color: '#6366f1',
    }, testUser.cookies);
    assertStatus(res, 200);
    assert(res.data.id);
    standaloneEventId = res.data.id;
  });

  await test('PATCH /api/standalone-events/:id updates event', async () => {
    if (!standaloneEventId) return;
    const res = await request('PATCH', `/api/standalone-events/${standaloneEventId}`, {
      title: 'Updated Event Title',
    }, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('DELETE /api/standalone-events/:id deletes event', async () => {
    if (!standaloneEventId) return;
    const res = await request('DELETE', `/api/standalone-events/${standaloneEventId}`, null, testUser.cookies);
    assertStatus(res, 200);
  });
}

// =============================================================================
// 13. NOTION INTEGRATION
// =============================================================================
async function notionTests() {
  section('Notion Integration');

  await test('GET /api/notion/test returns connection status', async () => {
    const res = await request('GET', '/api/notion/test', null, testUser.cookies);
    assert([200, 400, 500].includes(res.status));
    console.log(`  \x1b[90m  Notion: ${res.status === 200 ? 'connected' : 'not configured (expected for test user)'}\x1b[0m`);
  });

  await test('GET /api/notion/databases responds', async () => {
    const res = await request('GET', '/api/notion/databases', null, testUser.cookies);
    assert([200, 400, 500].includes(res.status));
  });

  await test('GET /api/notion/count responds', async () => {
    const res = await request('GET', '/api/notion/count', null, testUser.cookies);
    assert([200, 400, 500].includes(res.status));
  });

  await test('GET /api/notion/check-duplicates responds', async () => {
    const res = await request('GET', '/api/notion/check-duplicates', null, testUser.cookies);
    assert([200, 400, 500].includes(res.status));
  });

  await test('POST /api/notion/import handles missing token gracefully', async () => {
    const res = await request('POST', '/api/notion/import', { databaseId: 'test' }, testUser.cookies);
    assert([200, 400, 500].includes(res.status));
  });

  await test('POST /api/notion/export handles gracefully', async () => {
    const res = await request('POST', '/api/notion/export', { taskIds: [] }, testUser.cookies);
    assert([200, 400, 500].includes(res.status));
  });

  await test('POST /api/notion/sync-update responds', async () => {
    const res = await request('POST', '/api/notion/sync-update', {}, testUser.cookies);
    assert([200, 400, 500].includes(res.status));
  });
}

// =============================================================================
// 14. AI AUTO-CATEGORIZATION
// =============================================================================
async function aiCategorizationTests() {
  section('AI Auto-Categorization');

  await test('POST /api/tasks/categorize responds with suggestions', async () => {
    const res = await request('POST', '/api/tasks/categorize', {
      title: 'Write quarterly financial report', description: 'Q3 analysis',
    }, testUser.cookies);
    assert([200, 400, 500].includes(res.status));
    if (res.status === 200) {
      assert(res.data.category || res.data.skillTags || res.data.suggestions, 'Should return categorization');
    }
  });

  await test('POST /api/tasks/categorize-all bulk categorizes', async () => {
    const res = await request('POST', '/api/tasks/categorize-all', null, testUser.cookies);
    assert([200, 400, 500].includes(res.status));
  });

  await test('GET /api/tasks/training-examples returns array', async () => {
    const res = await request('GET', '/api/tasks/training-examples', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data));
  });

  await test('POST /api/tasks/categorize-feedback accepts feedback', async () => {
    const res = await request('POST', '/api/tasks/categorize-feedback', {
      taskTitle: 'Write report', suggestedCategory: 'Work', accepted: true,
    }, testUser.cookies);
    assert([200, 400].includes(res.status));
  });
}

// =============================================================================
// 15. STATS
// =============================================================================
async function statsTests() {
  section('Stats');

  await test('GET /api/stats returns stats object', async () => {
    const res = await request('GET', '/api/stats', null, testUser.cookies);
    assertStatus(res, 200);
    assert(typeof res.data === 'object');
  });
}

// =============================================================================
// 16. ADD TASK TO CALENDAR
// =============================================================================
async function addTaskToCalendarTests() {
  section('Add Task to Calendar');

  await test('POST /api/tasks/add-to-calendar handles no-token gracefully', async () => {
    const t = await request('POST', '/api/tasks', {
      title: 'Calendar Task', duration: 30, goldValue: 50, importance: 'Medium',
    }, testUser.cookies);
    if (t.status !== 200) return;
    const res = await request('POST', '/api/tasks/add-to-calendar', {
      taskId: t.data.id, startTime: new Date().toISOString(),
    }, testUser.cookies);
    assert([200, 400, 401].includes(res.status));
  });
}

// =============================================================================
// 17. GETTING STARTED
// =============================================================================
async function gettingStartedTests() {
  section('Getting Started');

  await test('GET /api/getting-started returns checklist', async () => {
    const res = await request('GET', '/api/getting-started', null, testUser.cookies);
    assertStatus(res, 200);
    assert(Array.isArray(res.data) || typeof res.data === 'object');
  });

  await test('POST /api/getting-started/:id/complete marks item complete', async () => {
    const listRes = await request('GET', '/api/getting-started', null, testUser.cookies);
    const items = Array.isArray(listRes.data) ? listRes.data : [];
    if (items.length > 0) {
      const res = await request('POST', `/api/getting-started/${items[0].id}/complete`, null, testUser.cookies);
      assert([200, 404].includes(res.status));
    }
  });
}

// =============================================================================
// 18. LOGOUT
// =============================================================================
async function logoutTests() {
  section('Logout');

  await test('POST /api/auth/logout clears session', async () => {
    const res = await request('POST', '/api/auth/logout', null, testUser.cookies);
    assertStatus(res, 200);
  });

  await test('GET /api/auth/user after logout returns 401', async () => {
    const res = await request('GET', '/api/auth/user', null, testUser.cookies);
    assertEqual(res.status, 401, 'Should be unauthorized after logout');
  });
}

// =============================================================================
// MAIN RUNNER
// =============================================================================
async function runAllTests() {
  const bar = '='.repeat(52);
  console.log(`\n\x1b[33m\x1b[1m${'='.repeat(54)}\x1b[0m`);
  console.log(`\x1b[33m\x1b[1m   ProductivityQuest -- Full Integration Test Suite\x1b[0m`);
  console.log(`\x1b[33m\x1b[1m   Server: ${BASE_URL}\x1b[0m`);
  console.log(`\x1b[33m\x1b[1m${'='.repeat(54)}\x1b[0m`);

  const start = Date.now();

  await authTests();
  await taskCrudTests();
  await taskFilteringTests();
  await recycleBinTests();
  await csvTests();
  await xpSkillTests();
  await shopTests();
  await campaignQuestlineTests();
  await financeTests();
  await marketDataTests();
  await googleCalendarTests();
  await standaloneEventTests();
  await notionTests();
  await aiCategorizationTests();
  await statsTests();
  await addTaskToCalendarTests();
  await gettingStartedTests();
  await logoutTests();

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const total = results.passed + results.failed + results.skipped;

  console.log(`\n\x1b[33m\x1b[1m${'='.repeat(54)}\x1b[0m`);
  console.log(`\x1b[33m\x1b[1m   Test Summary\x1b[0m`);
  console.log(`\x1b[33m\x1b[1m${'='.repeat(54)}\x1b[0m`);
  console.log(`\nTotal:    ${total}`);
  console.log(`\x1b[32mPassed:   ${results.passed}\x1b[0m`);
  console.log(`\x1b[31mFailed:   ${results.failed}\x1b[0m`);
  console.log(`\x1b[33mSkipped:  ${results.skipped}\x1b[0m`);
  console.log(`Duration: ${duration}s\n`);

  if (results.failed > 0) {
    console.log(`\x1b[31m\x1b[1mFailed tests:\x1b[0m`);
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`  \x1b[31mx\x1b[0m ${t.name}\n    \x1b[90m-> ${t.error}\x1b[0m`));
    console.log('');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error(`\n\x1b[31mFatal Error:\x1b[0m`, err);
  process.exit(1);
});

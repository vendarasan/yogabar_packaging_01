const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const { apiRequest, stopTestServer, store } = require('./testHelper');
const { SUPERADMIN } = require('../constants');

describe('Authentication & User Management CRUD', () => {
  after(async () => {
    await stopTestServer();
  });

  test('POST /api/auth/login — Super Admin login bypass', async () => {
    const res = await apiRequest('POST', '/api/auth/login', {
      body: { email: 'admin', password: SUPERADMIN.pass }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.user);
    assert.strictEqual(res.body.user.role, 'superadmin');
  });

  test('POST /api/auth/login — Invalid password returns 401', async () => {
    const res = await apiRequest('POST', '/api/auth/login', {
      body: { email: 'admin', password: 'WrongPassword!123' }
    });
    assert.strictEqual(res.status, 401);
    assert.ok(res.body.error);
  });

  test('POST /api/auth/login — Non-existent account returns 401', async () => {
    const res = await apiRequest('POST', '/api/auth/login', {
      body: { email: 'ghost_user@nonexistent.com', password: 'Password123' }
    });
    assert.strictEqual(res.status, 401);
    assert.match(res.body.error, /Account not found/);
  });

  test('GET /api/auth/me — Authenticated with Bearer token', async () => {
    const res = await apiRequest('GET', '/api/auth/me', { token: '__superadmin__' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.user);
    assert.strictEqual(res.body.user.role, 'superadmin');
  });

  test('GET /api/auth/me — Fails with 401 when missing token', async () => {
    const res = await apiRequest('GET', '/api/auth/me', { token: null });
    assert.strictEqual(res.status, 401);
  });

  test('User Management CRUD: Create, List, Update, and Delete Team Member', async () => {
    const testEmail = `test_engineer_${Date.now()}@yogabar.com`;

    // 1. Create user
    const createRes = await apiRequest('POST', '/api/auth/users', {
      token: '__superadmin__',
      body: {
        name: 'Unit Test User',
        email: testEmail,
        role: 'updater',
        title: 'Packaging Specialist',
        team: 'NPD Vertical',
        password: 'TestPassword@123'
      }
    });
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.body.user.email, testEmail);

    // 2. Verify duplicate creation is rejected
    const dupRes = await apiRequest('POST', '/api/auth/users', {
      token: '__superadmin__',
      body: {
        name: 'Unit Test User Duplicate',
        email: testEmail,
        role: 'updater'
      }
    });
    assert.strictEqual(dupRes.status, 409);

    // 3. List users
    const listRes = await apiRequest('GET', '/api/auth/users', { token: '__superadmin__' });
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.users));
    const found = listRes.body.users.find(u => u.email === testEmail);
    assert.ok(found, 'Created user should be in users list');

    // 4. Update user
    const updateRes = await apiRequest('PUT', `/api/auth/users/${encodeURIComponent(testEmail)}`, {
      token: '__superadmin__',
      body: {
        name: 'Unit Test User Updated',
        title: 'Senior Packaging Specialist'
      }
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.user.name, 'Unit Test User Updated');
    assert.strictEqual(updateRes.body.user.title, 'Senior Packaging Specialist');

    // 5. Delete user
    const deleteRes = await apiRequest('DELETE', `/api/auth/users/${encodeURIComponent(testEmail)}`, {
      token: '__superadmin__'
    });
    assert.strictEqual(deleteRes.status, 200);
    assert.ok(deleteRes.body.success);

    // 6. Confirm user is deleted
    const verifyListRes = await apiRequest('GET', '/api/auth/users', { token: '__superadmin__' });
    const stillFound = verifyListRes.body.users.find(u => u.email === testEmail);
    assert.strictEqual(stillFound, undefined, 'Deleted user should no longer exist');
  });

  test('Role Access Control: Non-admin cannot create users or delete projects', async () => {
    // Create a temporary updater session
    const updaterToken = 'token-updater-' + Date.now();
    const updaterEmail = 'updater_test@yogabar.com';
    store.users[updaterEmail] = {
      name: 'Regular Updater',
      role: 'updater',
      color: '#00d4c8'
    };
    store.sessions[updaterToken] = updaterEmail;

    // Updater trying to access /api/auth/users (admin only)
    const forbiddenUserList = await apiRequest('GET', '/api/auth/users', { token: updaterToken });
    assert.strictEqual(forbiddenUserList.status, 403);

    // Updater trying to delete a project (superadmin only)
    const forbiddenDelete = await apiRequest('DELETE', '/api/projects/PRJ-001', { token: updaterToken });
    assert.strictEqual(forbiddenDelete.status, 403);
  });
});

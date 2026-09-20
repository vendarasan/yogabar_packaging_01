'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('../db');

async function truncateTables() {
  console.log('=== STARTING TABLE TRUNCATE FOR MANUAL TESTING ===\n');
  await testConnection();

  // 1. Get all tables in public schema
  const res = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const allTables = res.rows.map(r => r.table_name);
  console.log('Total tables found in public schema:', allTables.length);

  // Preserve users, user sessions, user preferences, and schema_migrations
  const preservedTables = new Set(['users', 'user_sessions', 'user_preferences', 'schema_migrations']);
  const tablesToTruncate = allTables.filter(t => !preservedTables.has(t));

  console.log('\nPreserved tables (will NOT be truncated):');
  preservedTables.forEach(t => console.log('  🛡️', t));

  console.log('\nTables to be truncated (' + tablesToTruncate.length + '):');
  tablesToTruncate.forEach(t => console.log('  🗑️', t));

  if (tablesToTruncate.length > 0) {
    // Truncate all non-user tables with CASCADE
    const truncateSql = `TRUNCATE TABLE ${tablesToTruncate.map(t => `"${t}"`).join(', ')} CASCADE;`;
    console.log('\nExecuting TRUNCATE statement...');
    await query(truncateSql);
    console.log('✅ TRUNCATE executed successfully.');
  }

  // 2. Clear server/local_store.json
  const storePath = path.resolve(__dirname, '..', 'local_store.json');
  if (fs.existsSync(storePath)) {
    try {
      const storeData = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      storeData.projects = [];
      storeData.specs = [];
      if (storeData.logs) storeData.logs = [];
      if (storeData.advanceLogs) storeData.advanceLogs = [];
      if (storeData.tasks) storeData.tasks = [];
      if (storeData.notifications) storeData.notifications = [];
      if (storeData.comments) storeData.comments = [];
      if (storeData.approvals) storeData.approvals = [];
      fs.writeFileSync(storePath, JSON.stringify(storeData, null, 2), 'utf8');
      console.log('✅ local_store.json cleared (projects, specs, logs set to []).');
    } catch (err) {
      console.warn('⚠️ Error clearing local_store.json:', err.message);
    }
  }

  // 3. Verify counts
  console.log('\n=== VERIFYING FINAL TABLE COUNTS ===');
  for (const t of allTables) {
    const countRes = await query(`SELECT count(*) FROM "${t}"`);
    const count = countRes.rows[0].count;
    const icon = preservedTables.has(t) ? '🛡️' : '🧹';
    console.log(`  ${icon} ${t}: ${count} row(s)`);
  }

  console.log('\n✨ All requested tables truncated and ready for manual testing!');
  process.exit(0);
}

truncateTables().catch(err => {
  console.error('\n❌ Truncate failed:', err);
  process.exit(1);
});

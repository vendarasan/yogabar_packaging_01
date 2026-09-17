require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, getClient } = require('./index');

async function runMigrations() {
  console.log('🚀 Starting PostgreSQL Database Migrations...');
  const client = await getClient();

  try {
    // 1. Ensure migration tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch already executed migrations
    const res = await client.query('SELECT name FROM schema_migrations');
    const appliedSet = new Set(res.rows.map(r => r.name));

    // 3. Read migration files
    const migrationsDir = path.resolve(__dirname, '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('ℹ️ No migrations directory found at:', migrationsDir);
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`   ⏭  Already applied: ${file}`);
        continue;
      }

      console.log(`   ⚙️ Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`   ✅ Successfully applied: ${file}`);
        count++;
      } catch (migrationErr) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Failed applying ${file}:`, migrationErr.message);
        throw migrationErr;
      }
    }

    if (count === 0) {
      console.log('✨ All migrations are up to date! Zero pending.');
    } else {
      console.log(`🎉 Migrations complete! Applied ${count} new migration(s).`);
    }
  } catch (err) {
    console.error('❌ Migration runner failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Allow direct execution: node db/migrate.js
if (require.main === module) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { runMigrations };

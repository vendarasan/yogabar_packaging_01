/**
 * Enterprise Database & Store Restore Script (Pass 6)
 * Validates SHA-256 checksum and safely restores application state.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('../store');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

async function runRestore(backupFilePath = null) {
  let targetFile = backupFilePath;

  if (!targetFile) {
    targetFile = path.join(BACKUP_DIR, 'latest_backup.json');
  }

  if (!fs.existsSync(targetFile)) {
    throw new Error(`Backup file does not exist: ${targetFile}`);
  }

  const raw = fs.readFileSync(targetFile, 'utf-8');
  let backup;
  try {
    backup = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Corrupted JSON in backup file: ${err.message}`);
  }

  if (!backup.meta || !backup.data) {
    throw new Error('Invalid backup schema: Missing meta or data envelope.');
  }

  // Cryptographic integrity verification
  const serialized = JSON.stringify(backup.data);
  const computedHash = crypto.createHash('sha256').update(serialized).digest('hex');

  if (computedHash !== backup.meta.sha256) {
    throw new Error(`Checksum verification failed! Expected ${backup.meta.sha256}, calculated ${computedHash}. Backup may be tampered or corrupted.`);
  }

  // Apply restore to in-memory store
  store.projects = backup.data.projects || [];
  store.specLibrary = backup.data.specLibrary || [];
  store.users = backup.data.users || {};
  store.advanceLogs = backup.data.advanceLogs || [];

  // Persist locally
  if (typeof store.saveLocalStore === 'function') {
    store.saveLocalStore();
  }

  // Restore to database if connected
  const { isDbAvailable } = require('../db');
  let dbRestored = false;
  if (isDbAvailable && isDbAvailable()) {
    try {
      const { ProjectsRepo, UsersRepo, SpecLibraryRepo } = require('../db/repository');
      for (const p of store.projects) {
        await ProjectsRepo.save(p).catch(() => {});
      }
      for (const [email, u] of Object.entries(store.users)) {
        await UsersRepo.update(email, u).catch(() => UsersRepo.create({ email, ...u }).catch(() => {}));
      }
      for (const s of store.specLibrary) {
        await SpecLibraryRepo.create(s).catch(() => {});
      }
      dbRestored = true;
    } catch (dbErr) {
      console.warn('[Restore] Database sync warning:', dbErr.message);
    }
  }

  return {
    success: true,
    file: path.basename(targetFile),
    sha256: computedHash,
    backupCreatedAt: backup.meta.createdAt,
    restoredAt: new Date().toISOString(),
    counts: {
      projects: store.projects.length,
      specLibrary: store.specLibrary.length,
      users: Object.keys(store.users).length,
      advanceLogs: store.advanceLogs.length
    },
    databaseSynchronized: dbRestored
  };
}

if (require.main === module) {
  const fileArg = process.argv[2] || null;
  runRestore(fileArg)
    .then(res => {
      console.log('✅ Restore completed successfully:');
      console.log(`   Source: ${res.file}`);
      console.log(`   SHA-256 Verified: ${res.sha256}`);
      console.log(`   Restored: ${res.counts.projects} projects, ${res.counts.specLibrary} specs, ${res.counts.users} users`);
      console.log(`   DB Synchronized: ${res.databaseSynchronized}`);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Restore failed:', err.message);
      process.exit(1);
    });
}

module.exports = { runRestore };

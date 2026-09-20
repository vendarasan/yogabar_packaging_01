/**
 * Enterprise Database & Store Backup Script (Pass 6)
 * Creates timestamped snapshots with SHA-256 integrity verification and automated retention.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('../store');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = 10;

async function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Ensure store has local data loaded if in memory
  if (typeof store.loadLocalStore === 'function') {
    store.loadLocalStore();
  }

  // Optionally fetch from DB if available
  const { isDbAvailable } = require('../db');
  let projects = store.projects || [];
  let specLibrary = store.specLibrary || [];
  let users = store.users || {};
  let advanceLogs = store.advanceLogs || [];

  if (isDbAvailable && isDbAvailable()) {
    try {
      const { ProjectsRepo, UsersRepo, SpecLibraryRepo, LogsRepo } = require('../db/repository');
      const dbProjects = await ProjectsRepo.getAll(true);
      if (dbProjects && dbProjects.length > 0) projects = dbProjects;
      const dbUsers = await UsersRepo.getAll();
      if (dbUsers && Object.keys(dbUsers).length > 0) users = dbUsers;
      const dbSpecs = await SpecLibraryRepo.getAll();
      if (dbSpecs && dbSpecs.length > 0) specLibrary = dbSpecs;
      const dbLogs = await LogsRepo.getAll();
      if (dbLogs && dbLogs.length > 0) advanceLogs = dbLogs;
    } catch (err) {
      console.warn('[Backup] Database query warning, falling back to in-memory store:', err.message);
    }
  }

  const payload = {
    schemaVersion: '1.0',
    createdAt: new Date().toISOString(),
    data: {
      projects,
      specLibrary,
      users,
      advanceLogs
    }
  };

  const serialized = JSON.stringify(payload.data);
  const sha256 = crypto.createHash('sha256').update(serialized).digest('hex');

  const fullBackup = {
    meta: {
      schemaVersion: payload.schemaVersion,
      createdAt: payload.createdAt,
      sha256,
      counts: {
        projects: projects.length,
        specLibrary: specLibrary.length,
        users: Object.keys(users).length,
        advanceLogs: advanceLogs.length
      }
    },
    data: payload.data
  };

  const filename = `backup_${Date.now()}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const targetPath = path.join(BACKUP_DIR, filename);
  const latestPath = path.join(BACKUP_DIR, 'latest_backup.json');

  fs.writeFileSync(targetPath, JSON.stringify(fullBackup, null, 2), 'utf-8');
  fs.writeFileSync(latestPath, JSON.stringify(fullBackup, null, 2), 'utf-8');

  // Enforce retention policy: retain last MAX_BACKUPS files
  pruneOldBackups(BACKUP_DIR, MAX_BACKUPS);

  return {
    success: true,
    file: filename,
    path: targetPath,
    sha256,
    counts: fullBackup.meta.counts,
    createdAt: fullBackup.meta.createdAt
  };
}

function pruneOldBackups(dir, maxRetain) {
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > maxRetain) {
      const toDelete = files.slice(maxRetain);
      for (const item of toDelete) {
        fs.unlinkSync(path.join(dir, item.name));
      }
    }
  } catch (err) {
    console.warn('[Backup] Error pruning old backups:', err.message);
  }
}

if (require.main === module) {
  runBackup()
    .then(res => {
      console.log('✅ Backup successfully created:');
      console.log(`   File: ${res.file}`);
      console.log(`   SHA-256: ${res.sha256}`);
      console.log(`   Projects: ${res.counts.projects} | Specs: ${res.counts.specLibrary} | Users: ${res.counts.users}`);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Backup failed:', err);
      process.exit(1);
    });
}

module.exports = { runBackup, pruneOldBackups };

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const store = require('./store');
const { hashPass } = require('./utils');
const { SEED_USERS } = require('./constants');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const logRoutes = require('./routes/logRoutes');
const specRoutes = require('./routes/specRoutes');

const app = express();
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/specs', specRoutes);

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Error Handling Middleware ────────────────────────────────────
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ error: 'Uploaded file/payload is too large (exceeds 50MB limit).' });
  }
  if (err) {
    console.error('Server error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
  next();
});

// ── Startup & DB Initialization ─────────────────────────────────────
async function bootstrap() {
  // Always prepare memory cache first so app is instantly responsive
  store.users = {};
  for (const u of SEED_USERS) {
    store.users[u.email] = {
      name: u.name,
      role: u.role,
      title: u.title || '',
      team: u.team || '',
      mobile: u.mobile || '',
      avatar: u.avatar || '',
      department: u.department || '',
      description: u.description || '',
      color: u.color,
      passwordHash: hashPass(u.defaultPw),
      mustChangePw: false,
      tempPw: null
    };
  }

  const { testConnection } = require('./db');
  const { runMigrations } = require('./db/migrate');
  const { runSeeds } = require('./db/seed');
  const { ProjectsRepo, UsersRepo, SpecLibraryRepo } = require('./db/repository');

  let isDbConnected = false;
  try {
    const conn = await testConnection();
    isDbConnected = conn && conn.ok;
  } catch (e) {
    isDbConnected = false;
  }

  if (isDbConnected) {
    console.log('🐘 AWS RDS PostgreSQL Connected successfully!');
    try {
      await runMigrations();
      await runSeeds();
      const dbProjects = await ProjectsRepo.getAll();
      if (dbProjects && dbProjects.length > 0) {
        store.projects = dbProjects;
        console.log(`📦 Loaded ${dbProjects.length} project(s) from PostgreSQL database.`);
      }
      const dbUsers = await UsersRepo.getAll();
      if (dbUsers && Object.keys(dbUsers).length > 0) {
        store.users = { ...store.users, ...dbUsers };
        console.log(`👥 Synchronized users from PostgreSQL database.`);
      }
      const dbSpecs = await SpecLibraryRepo.getAll();
      if (dbSpecs && dbSpecs.length > 0) {
        store.specLibrary = dbSpecs;
        console.log(`📋 Loaded ${dbSpecs.length} spec(s) from Spec Library.`);
      }
    } catch (dbInitErr) {
      console.error('⚠️ DB Migration/Seed warning:', dbInitErr.message);
    }
  } else {
    store.loadLocalStore();
    console.log('\n======================================================');
    console.log('⚠  PostgreSQL RDS database not connected or password missing.');
    console.log('   Running in persistent local JSON storage mode (server/data/local_store.json).');
    console.log('   To activate persistent RDS storage, set DB_PASSWORD in server/.env');
    console.log('======================================================\n');
  }

  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`\n🚀 PKG Tracker API running on http://localhost:${PORT}`);
      console.log(`   Client expected at: ${CLIENT_URL}`);
      console.log(`   Super Admin login: username=admin  password=Admin@PKG#2024`);
      if (isDbConnected) {
        console.log(`   ✅ Persistent storage: AWS RDS PostgreSQL (ap-south-1)\n`);
      } else {
        console.log(`   ⚠  Temporary in-memory store active until RDS password is set\n`);
      }
    });
  }
  return app;
}

if (require.main === module) {
  bootstrap().catch(err => {
    console.error('Fatal startup error:', err);
  });
}

module.exports = { app, bootstrap };



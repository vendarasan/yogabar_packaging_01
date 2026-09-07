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

const app = express();
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/logs', logRoutes);

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Seed default users on startup ─────────────────────────────────
async function seedUsers() {
  for (const u of SEED_USERS) {
    if (!store.users[u.email]) {
      store.users[u.email] = {
        name: u.name,
        role: u.role,
        color: u.color,
        passwordHash: hashPass(u.defaultPw),
        mustChangePw: false,
        tempPw: null
      };
    }
  }
  console.log('✅ Seed users ready:', SEED_USERS.map(u => u.email).join(', '));
}

// ── Start ──────────────────────────────────────────────────────────
seedUsers().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 PKG Tracker API running on http://localhost:${PORT}`);
    console.log(`   Client expected at: ${CLIENT_URL}`);
    console.log(`   Super Admin login: username=admin  password=Admin@PKG#2024`);
    console.log(`   ⚠  In-memory store: all data cleared on shutdown\n`);
  });
});

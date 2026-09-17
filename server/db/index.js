require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ── Resolve SSL Root Certificate Bundle ─────────────────────────────
let sslConfig = false;
const isSslDisabled = process.env.DB_SSL_MODE === 'disable' || process.env.DB_SSL === 'false' || process.env.DB_SSL_MODE === 'false';

if (isSslDisabled) {
  sslConfig = false;
  console.log('🔓 SSL disabled for database connection (DB_SSL_MODE=disable).');
} else {
  const certEnvPath = process.env.DB_SSL_ROOT_CERT || './global-bundle.pem';
  const resolvedCertPath = path.isAbsolute(certEnvPath)
    ? certEnvPath
    : path.resolve(__dirname, '..', certEnvPath);

  if (fs.existsSync(resolvedCertPath)) {
    try {
      const caCert = fs.readFileSync(resolvedCertPath).toString();
      sslConfig = {
        ca: caCert,
        rejectUnauthorized: process.env.DB_SSL_MODE === 'verify-full' ? true : false
      };
      console.log(`🔒 SSL root certificate loaded from: ${resolvedCertPath} (mode: ${process.env.DB_SSL_MODE || 'verify-full'})`);
    } catch (err) {
      console.warn('⚠️ Warning: Failed to read SSL certificate bundle:', err.message);
      sslConfig = { rejectUnauthorized: false };
    }
  } else {
    console.warn(`⚠️ Warning: SSL root certificate not found at ${resolvedCertPath}. Defaulting to insecure SSL.`);
    sslConfig = { rejectUnauthorized: false };
  }
}

// ── Initialize Connection Pool ──────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || 'packaging-production-db.c5a6gcg8u3rs.ap-south-1.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'packaging_admin',
  password: process.env.DB_PASSWORD || '',
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('❌ Unexpected idle PostgreSQL client error:', err.message);
});

let isDbConnectedFlag = false;

function isDbAvailable() {
  return isDbConnectedFlag;
}

/**
 * Execute a SQL query using the pool
 */
async function query(text, params) {
  if (!isDbConnectedFlag && !process.env.DB_PASSWORD) {
    throw new Error('Database is not connected (DB_PASSWORD is not set or connection unavailable)');
  }
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL) {
      console.log(`[SQL] executed: ${text.slice(0, 80)}... | duration: ${duration}ms | rows: ${res.rowCount}`);
    }
    return res;
  } catch (err) {
    console.error(`[SQL Error] in query: ${text}`, err.message);
    throw err;
  }
}

/**
 * Get a dedicated client from pool (useful for transactions)
 */
async function getClient() {
  if (!isDbConnectedFlag && !process.env.DB_PASSWORD) {
    throw new Error('Database is not connected (DB_PASSWORD is not set or connection unavailable)');
  }
  return await pool.connect();
}

/**
 * Test PostgreSQL connectivity
 */
async function testConnection() {
  if (!process.env.DB_PASSWORD) {
    isDbConnectedFlag = false;
    console.log('👉 Note: DB_PASSWORD is empty in server/.env. Database will run in local fallback mode.');
    return { ok: false, error: 'DB_PASSWORD is empty' };
  }
  try {
    const res = await pool.query('SELECT NOW() AS current_time, current_database() AS db, current_user AS user');
    const { current_time, db, user } = res.rows[0];
    console.log(`✅ PostgreSQL Connected successfully to [${db}] on host [${process.env.DB_HOST}] as user [${user}] at ${current_time}`);
    isDbConnectedFlag = true;
    return { ok: true, current_time, db, user };
  } catch (err) {
    isDbConnectedFlag = false;
    console.error(`❌ PostgreSQL Connection Failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  isDbAvailable
};


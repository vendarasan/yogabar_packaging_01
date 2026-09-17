-- 002_create_users_and_sessions.sql
-- Users and active sessions storage

CREATE TABLE IF NOT EXISTS users (
  email VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'updater',
  title VARCHAR(255),
  team VARCHAR(255),
  department VARCHAR(255),
  mobile VARCHAR(50),
  avatar TEXT,
  color VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  must_change_pw BOOLEAN NOT NULL DEFAULT FALSE,
  temp_pw VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_team ON users (team);

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(255) PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON sessions (user_email);

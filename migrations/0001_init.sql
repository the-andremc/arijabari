-- Accounts: email sign-in with one-time codes, sessions, and claimed Jabari names.
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_codes (
  email        TEXT PRIMARY KEY,
  code_hash    TEXT NOT NULL,
  expires_at   INTEGER NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  sent_count   INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS jabaris (
  handle     TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

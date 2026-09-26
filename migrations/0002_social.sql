-- Published pages, photos, follows, reactions and notifications.

CREATE TABLE IF NOT EXISTS pages (
  handle       TEXT PRIMARY KEY REFERENCES jabaris(handle) ON DELETE CASCADE,
  data         TEXT NOT NULL,                 -- JSON: titles, tagline, theme, stickers, bubbles, moods, image order
  hero_image   TEXT,
  visibility   TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  updated_at   INTEGER NOT NULL,
  published_at INTEGER
);
CREATE INDEX IF NOT EXISTS pages_public ON pages(visibility, updated_at);

-- Photos live here until R2 is switched on (see lib/media.js).
CREATE TABLE IF NOT EXISTS page_images (
  id         TEXT PRIMARY KEY,
  handle     TEXT NOT NULL REFERENCES jabaris(handle) ON DELETE CASCADE,
  bytes      BLOB,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS page_images_handle ON page_images(handle);

-- Current follows (drives the Follow / Following button).
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  handle      TEXT NOT NULL REFERENCES jabaris(handle) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (follower_id, handle)
);
CREATE INDEX IF NOT EXISTS follows_handle ON follows(handle);

-- Every account that has ever followed a Jabari. The follower count is the size of this
-- table for a handle, so it only ever goes up and can't be pumped by re-following.
CREATE TABLE IF NOT EXISTS follow_history (
  follower_id TEXT NOT NULL,
  handle      TEXT NOT NULL,
  first_at    INTEGER NOT NULL,
  PRIMARY KEY (follower_id, handle)
);
CREATE INDEX IF NOT EXISTS follow_history_handle ON follow_history(handle);

-- One reaction per account per clip.
CREATE TABLE IF NOT EXISTS reactions (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clip_id    TEXT NOT NULL,
  emoji      TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, clip_id)
);
CREATE INDEX IF NOT EXISTS reactions_clip ON reactions(clip_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  actor      TEXT,            -- handle of whoever did it (null if they have no Jabari yet)
  handle     TEXT,            -- the Jabari it's about
  created_at INTEGER NOT NULL,
  read_at    INTEGER
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at);

-- Children accounts (sub-accounts under parent)
CREATE TABLE IF NOT EXISTS children (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id VARCHAR NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#FFD93D',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Child session tracking (independently revocable)
CREATE TABLE IF NOT EXISTS child_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id VARCHAR NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id VARCHAR NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Child Quran progress tracking
CREATE TABLE IF NOT EXISTS child_progress (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id VARCHAR NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  surah_number INTEGER NOT NULL,
  surah_name TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  accuracy INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  stars_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_child_sessions_child_id ON child_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_child_sessions_token ON child_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_child_progress_child_id ON child_progress(child_id);

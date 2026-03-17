CREATE TABLE IF NOT EXISTS child_game_scores (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id VARCHAR NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  surah_number INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_child ON child_game_scores(child_id);

CREATE TABLE IF NOT EXISTS child_badges (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id VARCHAR NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL DEFAULT '',
  badge_color TEXT NOT NULL DEFAULT '#FFD93D',
  earned_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_child_badge_unique ON child_badges(child_id, badge_key);

CREATE TABLE IF NOT EXISTS child_game_unlocks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id VARCHAR NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  surah_number INTEGER NOT NULL,
  game_type TEXT NOT NULL,
  unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  unlock_source TEXT NOT NULL DEFAULT 'surah_completion'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_child_game_unlock_unique ON child_game_unlocks(child_id, surah_number, game_type);

CREATE TABLE IF NOT EXISTS child_reward_balances (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id VARCHAR NOT NULL UNIQUE REFERENCES children(id) ON DELETE CASCADE,
  total_coins INTEGER NOT NULL DEFAULT 0,
  total_stars INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS child_reward_ledger (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id VARCHAR NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

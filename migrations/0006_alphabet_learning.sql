CREATE TABLE IF NOT EXISTS alphabet_letters (
  id SERIAL PRIMARY KEY,
  arabic TEXT NOT NULL,
  name_arabic TEXT NOT NULL,
  name_somali TEXT NOT NULL,
  phase INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 4),
  "order" INTEGER NOT NULL CHECK ("order" > 0),
  audio_url TEXT,
  tracing_path TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alphabet_letters_phase_order
  ON alphabet_letters (phase, "order");

CREATE TABLE IF NOT EXISTS alphabet_progress (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id VARCHAR NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  letter_id INTEGER NOT NULL REFERENCES alphabet_letters(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 4),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  tracing_score INTEGER NOT NULL DEFAULT 0 CHECK (tracing_score BETWEEN 0 AND 100),
  recitation_score INTEGER NOT NULL DEFAULT 0 CHECK (recitation_score BETWEEN 0 AND 100),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, letter_id)
);

CREATE INDEX IF NOT EXISTS idx_alphabet_progress_child_phase
  ON alphabet_progress (child_id, phase);

CREATE INDEX IF NOT EXISTS idx_alphabet_progress_completed
  ON alphabet_progress (child_id, completed);

CREATE TABLE IF NOT EXISTS alphabet_game_scores (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id VARCHAR NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('matching', 'tracing', 'recitation', 'quiz')),
  phase INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 4),
  score INTEGER NOT NULL CHECK (score >= 0),
  tokens_earned INTEGER NOT NULL DEFAULT 0 CHECK (tokens_earned >= 0),
  played_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alphabet_game_scores_child_phase
  ON alphabet_game_scores (child_id, phase);

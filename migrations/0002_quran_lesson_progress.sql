CREATE TABLE IF NOT EXISTS quran_lesson_progress (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id VARCHAR NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  surah_number INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  last_score INTEGER DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP,
  last_attempt_at TIMESTAMP,
  daily_attempts INTEGER NOT NULL DEFAULT 0,
  daily_attempt_date TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quran_progress_child ON quran_lesson_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_quran_progress_surah ON quran_lesson_progress(child_id, surah_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quran_progress_unique ON quran_lesson_progress(child_id, surah_number, ayah_number);

ALTER TABLE quran_lesson_progress ADD COLUMN IF NOT EXISTS daily_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quran_lesson_progress ADD COLUMN IF NOT EXISTS daily_attempt_date TEXT;

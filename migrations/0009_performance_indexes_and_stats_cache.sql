-- Performance indexes and precomputed stats cache

CREATE TABLE IF NOT EXISTS stats_cache (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bedtime_stories_published_date
  ON bedtime_stories (is_published, story_date DESC);

CREATE INDEX IF NOT EXISTS idx_parent_messages_published_date
  ON parent_messages (is_published, message_date DESC);

CREATE INDEX IF NOT EXISTS idx_promo_videos_visible_created
  ON promo_videos (is_visible, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_translations_lookup
  ON translations (entity_type, target_language, entity_id);

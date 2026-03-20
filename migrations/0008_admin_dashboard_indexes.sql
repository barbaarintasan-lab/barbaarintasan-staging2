-- Admin Dashboard Performance Indexes
-- These indexes optimize the admin dashboard queries for fast lookups and aggregations
-- Run this migration to set up the database for the admin dashboard system

-- ============================================================================
-- Parent Table Indexes
-- ============================================================================

-- Index for sorting parents by creation date (newest first)
CREATE INDEX IF NOT EXISTS idx_parents_created_at ON parents(created_at DESC);

-- Index for searching parents by email
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);

-- Index for searching parents by name using text search (optional, advanced)
-- CREATE INDEX IF NOT EXISTS idx_parents_name_trigram ON parents USING GIN(name gin_trgm_ops);

-- ============================================================================
-- Children Table Indexes
-- ============================================================================

-- Index for finding children by parent
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);

-- Index for sorting children by creation date
CREATE INDEX IF NOT EXISTS idx_children_created_at ON children(created_at DESC);

-- Composite index for finding children by parent and sorting by creation date
CREATE INDEX IF NOT EXISTS idx_children_parent_created ON children(parent_id, created_at DESC);

-- Index for searching children by name
-- CREATE INDEX IF NOT EXISTS idx_children_name_trigram ON children USING GIN(name gin_trgm_ops);

-- ============================================================================
-- Child Progress (Quran Lessons) Indexes
-- ============================================================================

-- Index for finding completed surahs for a child
CREATE INDEX IF NOT EXISTS idx_child_progress_child_id ON child_progress(child_id);

-- Composite index for finding completed lessons for a child
CREATE INDEX IF NOT EXISTS idx_child_progress_completed ON child_progress(child_id, completed);

-- Index for sorting progress by completion date
CREATE INDEX IF NOT EXISTS idx_child_progress_completed_at ON child_progress(child_id, completed_at DESC);

-- ============================================================================
-- Quran Lesson Progress (Ayah-level) Indexes
-- ============================================================================

-- Index for finding progress by child
CREATE INDEX IF NOT EXISTS idx_quran_progress_child_id ON quran_lesson_progress(child_id);

-- Index for sorting by last attempt date (for analytics)
CREATE INDEX IF NOT EXISTS idx_quran_progress_last_attempt ON quran_lesson_progress(last_attempt_at DESC);

-- Composite index for finding activity by child in a time range
CREATE INDEX IF NOT EXISTS idx_quran_progress_child_date ON quran_lesson_progress(child_id, last_attempt_at DESC);

-- Index for finding completed attempts
CREATE INDEX IF NOT EXISTS idx_quran_progress_completed ON quran_lesson_progress(child_id, completed);

-- ============================================================================
-- Child Game Scores Indexes
-- ============================================================================

-- Index for finding scores for a child
CREATE INDEX IF NOT EXISTS idx_game_scores_child_id ON child_game_scores(child_id);

-- Index for sorting by completion date (for analytics)
CREATE INDEX IF NOT EXISTS idx_game_scores_completed_at ON child_game_scores(completed_at DESC);

-- Composite index for finding activity by child in a time range
CREATE INDEX IF NOT EXISTS idx_game_scores_child_date ON child_game_scores(child_id, completed_at DESC);

-- Index for finding specific game type scores
CREATE INDEX IF NOT EXISTS idx_game_scores_game_type ON child_game_scores(child_id, game_type);

-- ============================================================================
-- Child Reward Balances Indexes
-- ============================================================================

-- Index for finding rewards for a child (already has unique constraint, but adding for completeness)
CREATE INDEX IF NOT EXISTS idx_reward_balances_child_id ON child_reward_balances(child_id);

-- ============================================================================
-- Child Reward Ledger Indexes
-- ============================================================================

-- Index for finding ledger entries for a child
CREATE INDEX IF NOT EXISTS idx_reward_ledger_child_id ON child_reward_ledger(child_id);

-- Index for sorting ledger by creation date
CREATE INDEX IF NOT EXISTS idx_reward_ledger_created ON child_reward_ledger(child_id, created_at DESC);

-- Index for finding entries by source (for audit trails)
CREATE INDEX IF NOT EXISTS idx_reward_ledger_source ON child_reward_ledger(source);

-- ============================================================================
-- Child Badges Indexes
-- ============================================================================

-- Index for finding badges for a child
CREATE INDEX IF NOT EXISTS idx_child_badges_child_id ON child_badges(child_id);

-- Index for sorting badges by earned date
CREATE INDEX IF NOT EXISTS idx_child_badges_earned_at ON child_badges(child_id, earned_at DESC);

-- ============================================================================
-- Enrollment Indexes
-- ============================================================================

-- Index for finding enrollments by parent
CREATE INDEX IF NOT EXISTS idx_enrollments_parent_id ON enrollments(parent_id);

-- Index for finding enrollments by course
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);

-- Composite index for finding enrollments by parent and course
CREATE INDEX IF NOT EXISTS idx_enrollments_parent_course ON enrollments(parent_id, course_id);

-- Index for finding active enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- Composite index for finding active enrollments by parent
CREATE INDEX IF NOT EXISTS idx_enrollments_parent_status ON enrollments(parent_id, status);

-- ============================================================================
-- Courses Indexes
-- ============================================================================

-- Index for finding courses by ID (already likely has primary index)
CREATE INDEX IF NOT EXISTS idx_courses_course_id ON courses(course_id);

-- Index for finding live courses
CREATE INDEX IF NOT EXISTS idx_courses_is_live ON courses(is_live);

-- ============================================================================
-- Combined Analytics Indexes
-- ============================================================================

-- This composite index helps with analytics queries that filter by date range
-- and count active users across tables
CREATE INDEX IF NOT EXISTS idx_quran_progress_analytics 
  ON quran_lesson_progress(last_attempt_at DESC, child_id)
  WHERE last_attempt_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_game_scores_analytics 
  ON child_game_scores(completed_at DESC, child_id);

-- ============================================================================
-- Index Size Verification Query
-- ============================================================================
-- Run this query to see the size of all indexes:
-- SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
-- FROM pg_indexes
-- WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
-- AND tablename IN ('parents', 'children', 'child_progress', 'quran_lesson_progress', 
--                    'child_game_scores', 'child_reward_balances', 'child_reward_ledger',
--                    'child_badges', 'enrollments', 'courses')
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- Query Performance Analysis (Optional)
-- ============================================================================
-- Enable query plan analysis for debugging slow queries:
-- EXPLAIN ANALYZE SELECT COUNT(*) FROM children WHERE parent_id = 'some-parent-id';
-- EXPLAIN ANALYZE SELECT * FROM quran_lesson_progress 
--   WHERE child_id = 'some-child-id' AND last_attempt_at > NOW() - INTERVAL '7 days';

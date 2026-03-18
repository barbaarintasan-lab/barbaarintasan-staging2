-- Drop the old global unique constraint on children.username (if it still exists under either name)
ALTER TABLE children DROP CONSTRAINT IF EXISTS children_username_key;
ALTER TABLE children DROP CONSTRAINT IF EXISTS children_username_unique;
DROP INDEX IF EXISTS children_username_key;
-- Ensure the per-parent composite index exists
CREATE UNIQUE INDEX IF NOT EXISTS children_parent_username_unique_idx ON children(parent_id, username);

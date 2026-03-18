ALTER TABLE children DROP CONSTRAINT IF EXISTS children_username_unique;
ALTER TABLE children DROP CONSTRAINT IF EXISTS children_username_key;
DROP INDEX IF EXISTS children_username_unique;
DROP INDEX IF EXISTS children_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS children_parent_username_unique_idx ON children(parent_id, username);
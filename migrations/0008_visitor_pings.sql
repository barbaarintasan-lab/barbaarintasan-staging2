CREATE TABLE IF NOT EXISTS visitor_pings (
  visitor_key TEXT PRIMARY KEY,
  last_pinged_at TIMESTAMP NOT NULL DEFAULT NOW()
);

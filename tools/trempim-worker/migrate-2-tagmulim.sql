-- טרמפים – מיגרציה 2: תגמולים (נקודות, דירוגים, דרגות, הזמנות). מריצים פעם אחת:
-- npx wrangler d1 execute trempim --remote --file migrate-2-tagmulim.sql
ALTER TABLE users ADD COLUMN ref_code TEXT;
ALTER TABLE users ADD COLUMN ref_by TEXT;
ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN amb INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN cert_sent INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN board INTEGER DEFAULT 1;
ALTER TABLE rides ADD COLUMN pts_upload INTEGER DEFAULT 0;
ALTER TABLE rides ADD COLUMN active_bonus INTEGER DEFAULT 0;
ALTER TABLE rides ADD COLUMN closed INTEGER;
ALTER TABLE reports ADD COLUMN rating TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_ref ON users(ref_code);
CREATE INDEX IF NOT EXISTS users_refby ON users(ref_by);
CREATE TABLE IF NOT EXISTS points_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL,           -- upload | upload_regular | upload_cancel | active | approve | approve_free | approve_cancel | warm | before
  points INTEGER NOT NULL,
  ride TEXT,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pl_user ON points_log(user_id, created);
CREATE INDEX IF NOT EXISTS pl_created ON points_log(created);
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  request TEXT NOT NULL,
  rater TEXT NOT NULL,
  ratee TEXT NOT NULL,
  role TEXT NOT NULL,             -- driver = דירוג לנהג, rider = דירוג לטרמפיסט
  stars INTEGER NOT NULL,
  text TEXT,
  hidden INTEGER DEFAULT 0,
  created INTEGER NOT NULL,
  UNIQUE(request, rater)
);
CREATE INDEX IF NOT EXISTS rt_ratee ON ratings(ratee, created);
-- נקודות שנצברו לפני היומן: שורה אחת "before" כדי שהפירוט יסתכם נכון
INSERT INTO points_log (id,user_id,reason,points,ride,created)
  SELECT 'b' || id, id, 'before', points, NULL, CAST(strftime('%s','now') AS INTEGER) * 1000 FROM users WHERE points > 0;

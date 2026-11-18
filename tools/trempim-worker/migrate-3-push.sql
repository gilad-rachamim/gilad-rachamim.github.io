-- מיגרציה 3: התראות (Web Push) ו"מחפשים טרמפ". מריצים פעם אחת:
-- npx wrangler d1 execute trempim --remote --file migrate-3-push.sql
CREATE TABLE IF NOT EXISTS push_subs (
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created INTEGER NOT NULL,
  last_ok INTEGER
);
CREATE INDEX IF NOT EXISTS push_subs_user ON push_subs(user_id);
CREATE TABLE IF NOT EXISTS wants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  from_label TEXT, from_lat REAL NOT NULL, from_lng REAL NOT NULL,
  to_label TEXT, to_lat REAL NOT NULL, to_lng REAL NOT NULL,
  radius REAL DEFAULT 2,
  date TEXT,                      -- חד-פעמי: YYYY-MM-DD
  days TEXT,                      -- קבוע: "0,1,2" (ראשון=0)
  time_from TEXT NOT NULL,        -- HH:MM
  time_to TEXT NOT NULL,
  created INTEGER NOT NULL,
  expires TEXT NOT NULL,          -- עד מתי (YYYY-MM-DD): חד-פעמי עד התאריך, קבוע 30 יום ואפשר לחדש
  notified INTEGER DEFAULT 0      -- כמה פעמים כבר הודענו
);
CREATE INDEX IF NOT EXISTS wants_exp ON wants(expires);
CREATE INDEX IF NOT EXISTS wants_user ON wants(user_id);

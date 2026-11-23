-- kelim-kishur: מסד נתונים (D1). הרצה: npx wrangler@4 d1 execute kelim-kishur --remote --file schema.sql
CREATE TABLE IF NOT EXISTS links (
  code TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  created INTEGER NOT NULL,
  key_hash TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  last_click INTEGER,
  checked_at INTEGER DEFAULT 0,
  disabled INTEGER DEFAULT 0,   -- 0 פעיל, 1 הושבת (דיווחים/בדיקת בטיחות), 2 נמחק על ידי היוצר
  creator TEXT                  -- גיבוב מומלח של ה-IP, לא ה-IP עצמו
);
CREATE TABLE IF NOT EXISTS clicks (
  code TEXT NOT NULL,
  day TEXT NOT NULL,            -- YYYY-MM-DD שעון ישראל
  n INTEGER DEFAULT 0,
  PRIMARY KEY (code, day)
);
CREATE TABLE IF NOT EXISTS rl (
  k TEXT NOT NULL,
  win TEXT NOT NULL,
  n INTEGER DEFAULT 0,
  PRIMARY KEY (k, win)
);
CREATE TABLE IF NOT EXISTS reports (
  code TEXT NOT NULL,
  reporter TEXT NOT NULL,
  reason TEXT,
  ts INTEGER,
  PRIMARY KEY (code, reporter)
);

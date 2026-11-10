-- טרמפים – מסד נתונים (Cloudflare D1)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,            -- google sub
  email TEXT,
  name TEXT NOT NULL,
  pic TEXT,
  phone TEXT,
  paybox TEXT,
  agreed INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  rating_n INTEGER DEFAULT 0,
  blocked INTEGER DEFAULT 0,
  created INTEGER NOT NULL,
  ref_code TEXT, ref_by TEXT,     -- קישור הזמנה אישי, ומי הזמין
  level INTEGER DEFAULT 0,        -- 1 נהג חסד, 2 נהג קבוע, 3 עמוד התווך
  amb INTEGER DEFAULT 0,          -- שגריר השכונה
  cert_sent INTEGER DEFAULT 0,    -- מתי גילעד שלח תעודה מודפסת
  board INTEGER DEFAULT 1         -- להופיע בלוח הכבוד
);
CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  driver TEXT NOT NULL,
  from_label TEXT, from_lat REAL, from_lng REAL,
  to_label TEXT, to_lat REAL, to_lng REAL,
  date TEXT,                      -- YYYY-MM-DD לנסיעה חד-פעמית
  days TEXT,                      -- "0,1,2,3,4" לנסיעה קבועה (0=ראשון)
  start TEXT, until TEXT,         -- טווח לנסיעה קבועה
  time TEXT NOT NULL,             -- HH:MM
  seats INTEGER NOT NULL,
  rate REAL NOT NULL,             -- ₪ לק"מ: 0 = חינם, אחרת 1–1.5
  km REAL, min REAL,
  route TEXT,                     -- JSON [[lat,lng],...]
  note TEXT,
  status TEXT DEFAULT 'open',
  created INTEGER NOT NULL,
  pts_upload INTEGER DEFAULT 0,   -- נקודות שניתנו על ההעלאה
  active_bonus INTEGER DEFAULT 0, -- קיבלה בונוס "פעילה"
  closed INTEGER,
  kind TEXT DEFAULT 'car',        -- car | taxi (מונית משותפת: מתחלקים במונה)
  split TEXT                      -- במונית: equal (שווה בשווה) | km (לפי הק"מ של כל אחד)
);
-- הוספה לטבלה קיימת (10.11.2026):
-- ALTER TABLE rides ADD COLUMN kind TEXT DEFAULT 'car';
-- ALTER TABLE rides ADD COLUMN split TEXT;
CREATE INDEX IF NOT EXISTS rides_date ON rides(date);
CREATE INDEX IF NOT EXISTS rides_driver ON rides(driver);
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  ride TEXT NOT NULL,
  date TEXT NOT NULL,
  rider TEXT NOT NULL,
  pickup_label TEXT, pickup_lat REAL, pickup_lng REAL,
  drop_label TEXT, drop_lat REAL, drop_lng REAL,
  seg_km REAL, price INTEGER, pass_time TEXT,
  mode TEXT NOT NULL,             -- paid | free
  msg TEXT,
  status TEXT DEFAULT 'pending',  -- pending | approved | declined | cancelled
  created INTEGER NOT NULL,
  updated INTEGER
);
CREATE INDEX IF NOT EXISTS req_ride ON requests(ride, date);
CREATE INDEX IF NOT EXISTS req_rider ON requests(rider);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  by_user TEXT, about_user TEXT, ride TEXT, text TEXT, created INTEGER,
  rating TEXT
);
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  by_user TEXT, text TEXT, created INTEGER
);
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

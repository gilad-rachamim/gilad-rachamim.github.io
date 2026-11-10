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
  created INTEGER NOT NULL
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
  by_user TEXT, about_user TEXT, ride TEXT, text TEXT, created INTEGER
);
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  by_user TEXT, text TEXT, created INTEGER
);

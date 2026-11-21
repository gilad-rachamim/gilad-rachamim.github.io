-- פורטל שכבה (kelim/shichva) – D1. הרצה: npx wrangler d1 execute shichva --remote --file schema.sql
-- פרטיות קטינים: אין כאן מייל, טלפון או תמונה. שם פרטי + כיתה בלבד. קבצים (אלבום) רק ב-R2 דרך השרת עם קוד.

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,              -- "מחזור כ"ג" / שם השכבה
  slogan TEXT DEFAULT '',
  hachtara TEXT NOT NULL,          -- תאריך ההכתרה YYYY-MM-DD
  join_code TEXT UNIQUE NOT NULL,  -- קוד הצטרפות לתלמידים
  admin_code TEXT UNIQUE NOT NULL, -- קוד הרכז (שחזור במכשיר אחר)
  melave_code TEXT UNIQUE NOT NULL,-- קוד המלווה מהצוות (צפייה ואישור בלבד)
  melave_name TEXT DEFAULT 'ראש הישיבה',
  demo INTEGER DEFAULT 0,
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  name TEXT NOT NULL,
  klass TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'chaver', -- rakaz | gizbar | chaver | melave
  token TEXT UNIQUE NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS members_grade ON members(grade_id);

CREATE TABLE IF NOT EXISTS committees (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  name TEXT NOT NULL,
  about TEXT DEFAULT '',
  head_id TEXT DEFAULT '',
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS committees_grade ON committees(grade_id);

CREATE TABLE IF NOT EXISTS cmembers (
  committee_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  PRIMARY KEY (committee_id, member_id)
);

-- מוצר: טקסט/מם/טריילר/סרטון/רעיון. state: draft -> liked -> head -> melave -> approved | replace
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  committee_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text',
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  data TEXT DEFAULT '{}',
  about_staff INTEGER DEFAULT 0,
  light TEXT DEFAULT '',
  light_why TEXT DEFAULT '',
  state TEXT NOT NULL DEFAULT 'draft',
  file_id TEXT DEFAULT '',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS products_grade ON products(grade_id, state);

CREATE TABLE IF NOT EXISTS votes (
  product_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  PRIMARY KEY (product_id, member_id)
);

CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  who TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT DEFAULT '',
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS history_product ON history(product_id);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  title TEXT NOT NULL,
  due TEXT DEFAULT '',
  done INTEGER DEFAULT 0,
  owner TEXT DEFAULT '',
  committee_id TEXT DEFAULT '',
  sort INTEGER DEFAULT 0,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_grade ON tasks(grade_id);

-- אלבום: רק המטא-דאטה. הקבצים ב-R2 (FILES). בלי R2 – ריק.
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  folder TEXT NOT NULL,
  year TEXT DEFAULT '',
  event TEXT DEFAULT '',
  by_id TEXT NOT NULL,
  by_name TEXT NOT NULL,
  w INTEGER DEFAULT 0,
  h INTEGER DEFAULT 0,
  has_orig INTEGER DEFAULT 0,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS photos_grade ON photos(grade_id, folder);

-- מונה יומי לבינה (לכל שכבה) – כדי להישאר במכסה החינמית
CREATE TABLE IF NOT EXISTS ai_count (
  grade_id TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER DEFAULT 0,
  PRIMARY KEY (grade_id, day)
);

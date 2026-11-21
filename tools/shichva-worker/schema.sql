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

/* ---------- סבב ב': קיוסק, גבייה וספונסרים. הסכומים באגורות (מספר שלם). האתר לא סולק ולא מחזיק כסף – זה פנקס בלבד. ---------- */
CREATE TABLE IF NOT EXISTS k_items (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,     -- מחיר מכירה
  cost INTEGER NOT NULL DEFAULT 0,      -- עלות אחרונה ליחידה (מחושבת מקנייה)
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0, -- מתחת לזה: "נגמר במלאי"
  track INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS k_items_grade ON k_items(grade_id, active);

-- פנקס: לא מוחקים, רק מבטלים (voided) עם סיבה – כך תמיד רואים מה קרה.
CREATE TABLE IF NOT EXISTS k_tx (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  kind TEXT NOT NULL,                   -- income | expense
  date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  item_id TEXT DEFAULT '',
  item_name TEXT DEFAULT '',
  qty INTEGER DEFAULT 0,
  category TEXT DEFAULT '',
  method TEXT DEFAULT 'cash',           -- cash | bit | other
  note TEXT DEFAULT '',
  sale_id TEXT DEFAULT '',
  by_id TEXT NOT NULL,
  by_name TEXT NOT NULL,
  voided INTEGER DEFAULT 0,
  void_reason TEXT DEFAULT '',
  void_by TEXT DEFAULT '',
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS k_tx_grade ON k_tx(grade_id, date);

-- קבלה בצילום (לא חובה). קטנה ודחוסה מהדפדפן, מוגשת רק לגזבר/רכז. אין בה תמונות של תלמידים.
CREATE TABLE IF NOT EXISTS k_receipt (
  tx_id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  mime TEXT NOT NULL,
  data TEXT NOT NULL,
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS k_shop (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  name TEXT NOT NULL,
  qty TEXT DEFAULT '',
  done INTEGER DEFAULT 0,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS k_shop_grade ON k_shop(grade_id);

CREATE TABLE IF NOT EXISTS k_shift (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  day TEXT NOT NULL,
  slot TEXT NOT NULL,
  member_id TEXT NOT NULL,
  name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS k_shift_grade ON k_shift(grade_id, day);

-- ספירת קופה: מה אמור להיות מול מה נספר
CREATE TABLE IF NOT EXISTS k_count (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  counted INTEGER NOT NULL,
  expected INTEGER NOT NULL,
  diff INTEGER NOT NULL,
  by_name TEXT NOT NULL,
  note TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS k_count_grade ON k_count(grade_id, ts);

-- גבייה שכבתית: קישור לקבוצת Bit/PayBox שהשכבה פתחה + "מי שילם" שהגזבר מסמן. אין סליקה.
CREATE TABLE IF NOT EXISTS k_coll (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  title TEXT NOT NULL,
  per_head INTEGER NOT NULL DEFAULT 0,
  link TEXT DEFAULT '',
  due TEXT DEFAULT '',
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS k_coll_grade ON k_coll(grade_id);
CREATE TABLE IF NOT EXISTS k_paid (
  coll_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY (coll_id, member_id)
);

-- ספונסרים: עד 20 עסקים לשכבה. עסקים בלבד – לא פרטי קטינים. השליחה תמיד ידנית (מייל/ווטסאפ של התלמיד).
CREATE TABLE IF NOT EXISTS k_sponsor (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  business TEXT NOT NULL,
  contact TEXT DEFAULT '',
  package TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',   -- new | letter | sent | talked | yes | no
  note TEXT DEFAULT '',
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS k_sponsor_grade ON k_sponsor(grade_id);

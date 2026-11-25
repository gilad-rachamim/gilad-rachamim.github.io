# kelim-kishur – שרת קיצור הקישורים

Worker + D1 לכתובת `s.hakelim.com`. בדיקות מקומיות: `python -X utf8 test_local.py`.

פריסה (פעם אחת): `wrangler d1 create kelim-kishur`, עדכון `database_id` ב-`wrangler.toml`,
`wrangler d1 execute kelim-kishur --remote --file schema.sql`, `wrangler secret put IP_SALT`,
`wrangler secret put ADMIN_KEY`, הוספת `routes` עם `custom_domain`, ואז `wrangler deploy`.

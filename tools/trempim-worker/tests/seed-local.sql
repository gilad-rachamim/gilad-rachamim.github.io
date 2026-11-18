-- מצב התחלתי לבדיקות המקומיות בלבד (wrangler d1 execute trempim --local). לא להריץ ב-remote!
DELETE FROM requests; DELETE FROM rides; DELETE FROM points_log; DELETE FROM ratings; DELETE FROM reports;
DELETE FROM push_subs; DELETE FROM wants;
DELETE FROM users WHERE id IN ('gA','gB','gC','gD','gE');
INSERT INTO users (id,email,name,pic,phone,paybox,agreed,created) VALUES
 ('gA','a@test.local','אבי אברהם','','0501111111','',1,0),
 ('gB','b@test.local','בתיה בן דוד','','0502222222','',1,0),
 ('gC','c@test.local','גדי גולן','','0503333333','',1,0),
 ('gD','d@test.local','דנה דהן','','0504444444','',1,0),
 ('gE','e@test.local','אלי אליהו','','0505555555','',1,0);
-- בקשה שפג תוקפה: באותה דרך בדיוק, אבל עד אתמול – לא אמורה לקבל כלום
INSERT INTO wants (id,user_id,from_label,from_lat,from_lng,to_label,to_lat,to_lng,radius,date,days,time_from,time_to,created,expires)
 VALUES ('wexpired01','gD','ישן',31.78,35.22,'ישן',31.78,35.28,2,NULL,'0,1,2,3,4,5,6','00:00','23:59',0,'2000-01-01');

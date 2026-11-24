# בדיקה מקומית: שרת דמה של אלופים + wrangler dev, ושולחים מכירה לדוגמה כמו ש-Payhip שולח.
import hashlib, json, os, subprocess, sys, threading, time, urllib.error, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
CALLS = []
REJECT_DETAIL = {'on': False}


class Mock(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _do(self):
        n = int(self.headers.get('content-length') or 0)
        body = json.loads(self.rfile.read(n) or b'{}')
        CALLS.append((self.command, self.path, body, self.headers.get('idempotency-key'), self.headers.get('authorization')))
        code, out = 200, {'ok': True, 'data': {}, 'requestId': 'r'}
        if self.command == 'PUT':
            if REJECT_DETAIL['on'] and 'receiptDetailLines' in body:
                code, out = 422, {'ok': False, 'error': {'code': 'validation'}}
            else:
                out['data'] = {'id': 'x', 'totals': {'gross': body['payments'][0]['amount']}}
        elif self.path.endswith('/issue'):
            code = 201
            out['data'] = {'document': {'number': '10001'}, 'warnings': []}
        elif self.path.endswith('/send-to-customer'):
            code, out = 403, {'ok': False, 'error': {'code': 'sending_closed'}}
        b = json.dumps(out).encode()
        self.send_response(code)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    do_PUT = do_POST = _do


srv = HTTPServer(('127.0.0.1', 8799), Mock)
threading.Thread(target=srv.serve_forever, daemon=True).start()

DEV_VARS = os.path.join(HERE, '.dev.vars')
with open(DEV_VARS, 'w') as f:
    f.write('ALUFFIM_API_KEY=ak1.test.test\nALUFFIM_BUSINESS_ID=biz-test\nPAYHIP_API_KEY=payhip-test\nADMIN_KEY=admin-test\nALUFFIM_BASE=http://127.0.0.1:8799\n')
proc = subprocess.Popen('npx wrangler@4 dev --local --port 8798', shell=True, cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def call(path, body=None, headers=None):
    req = urllib.request.Request(
        'http://127.0.0.1:8798' + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'content-type': 'application/json', **(headers or {})},
        method='POST' if body is not None else 'GET',
    )
    try:
        r = urllib.request.urlopen(req, timeout=20)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'{}')


fails = []


def check(name, cond):
    print(('עבר  ' if cond else 'נכשל ') + name)
    if not cond:
        fails.append(name)


def count(suffix):
    return len([c for c in CALLS if c[1].endswith(suffix)])


try:
    up = False
    for _ in range(90):
        try:
            if call('/')[0] == 200:
                up = True
                break
        except Exception:
            time.sleep(1)
    check('השרת המקומי עלה', up)
    sig = hashlib.sha256(b'payhip-test').hexdigest()
    tid = 'T%d' % int(time.time())
    sale = {'id': tid, 'email': 'buyer@example.com', 'currency': 'ILS', 'price': 1800, 'type': 'paid', 'payment_type': 'paypal',
            'items': [{'product_name': 'קבוצת Claude + 30 בקשות', 'product_key': 'kNyeO', 'quantity': '1'}], 'signature': sig}

    check('חתימה שגויה נדחית', call('/payhip', {**sale, 'signature': 'x' * 64})[0] == 403)
    check('בלי חתימה תקינה אין קריאה לאלופים', len(CALLS) == 0)

    st, out = call('/payhip', sale)
    check('מכירה: 200 ומספר קבלה', st == 200 and out.get('number') == '10001')
    put = [c for c in CALLS if c[0] == 'PUT'][0]
    check('טיוטה: סוג קבלה, 1800 אגורות, מייל הלקוח',
          put[2]['type'] == 'receipt' and put[2]['payments'][0]['amount'] == 1800 and put[2]['oneOffCustomer']['emails'] == ['buyer@example.com'])
    check('טיוטה: כותרת הרשאה ומזהה חד-פעמי', put[4] == 'Bearer ak1.test.test' and bool(put[3]))
    iss = [c for c in CALLS if c[1].endswith('/issue')][0]
    check('הפקה: סכום צפוי 1800, אמיתית, תאריך היום',
          iss[2]['expectedGross'] == 1800 and iss[2]['mode'] == 'real' and len(iss[2]['documentDate']) == 10)
    check('שליחה נוסתה, ודחייה שלה לא מפילה את הקבלה', count('/send-to-customer') == 1 and out.get('sent') is False)

    n = count('/issue')
    st, out = call('/payhip', sale)
    check('אותה מכירה פעמיים: לא מופקת קבלה שנייה', st == 200 and out.get('already') is True and count('/issue') == n)

    REJECT_DETAIL['on'] = True
    st, out = call('/payhip', {**sale, 'id': tid + 'b', 'price': 14700})
    puts = [c for c in CALLS if c[0] == 'PUT'][-2:]
    check('טיוטה נדחתה: ניסיון שני עם שורות רגילות', st == 200 and 'receiptDetailLines' in puts[0][2] and 'lines' in puts[1][2])

    st, out = call('/payhip', {**sale, 'id': tid + 'c', 'price': 0})
    check('סכום אפס: בלי קבלה', st == 200 and out.get('skipped') == 'zero')
    st, out = call('/payhip', {**sale, 'id': tid + 'd', 'currency': 'USD'})
    check('מטבע זר: לטיפול ידני', st == 200 and out.get('manual') == 'currency')
    st, out = call('/payhip', {**sale, 'type': 'refunded', 'amount_refunded': 1800, 'date_refunded': 1})
    check('החזר: נרשם לטיפול ידני', st == 200 and out.get('refund') == 'manual')

    check('מצב בלי מפתח: נדחה', call('/matzav')[0] == 403)
    st, out = call('/matzav', headers={'x-admin-key': 'admin-test'})
    check('מצב: מוכן, רשומות, המייל מוסתר',
          st == 200 and out['ready'] and out['count'] >= 4 and 'buyer@' not in json.dumps(out['rows']))
    check('מצב: החזר ומטבע זר נספרים כבעיות', st == 200 and out['problems'] >= 2)
finally:
    subprocess.run('taskkill /F /T /PID %d' % proc.pid, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        os.remove(DEV_VARS)
    except OSError:
        pass
print('הכול עבר' if not fails else 'נכשלו: %d' % len(fails))
sys.exit(1 if fails else 0)

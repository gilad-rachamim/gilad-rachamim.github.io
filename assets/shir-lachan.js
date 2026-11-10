// "השיר שלי" – מלחינים: אווירה/קצב/משקל/גובה, מהלך אקורדים לכל חלק, מנגינה לכל שורה (3 הצעות, זמזום, תיקון ידני), דף אקורדים ו-MIDI.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sl-parts') || !window.Shir || !window.Shir.M) return;
  var S = window.Shir, M = S.M, TOOL = 'shir_lachan', esc = S.esc;
  var song, player = null, sel = null, offers = {}, busy = false;
  function used(how) { S.used(TOOL, how); }
  function m() { return M.music(song); }
  function key(pid, i) { return pid + ':' + i; }

  function drawSongs() { $('sl-songs').innerHTML = S.list().map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === song.id ? ' selected' : '') + '>' + esc(s.title || s.topic || 'שיר בלי שם') + '</option>'; }).join(''); }
  function chips() {
    var mm = m();
    [['sl-mood', mm.mood], ['sl-tempo', mm.tempo], ['sl-meter', String(mm.meter)], ['sl-range', mm.range]].forEach(function (x) {
      [].forEach.call($(x[0]).children, function (b) { b.classList.toggle('on', b.getAttribute('data-v') === x[1]); });
    });
  }
  function melHtml(L, pid, i, notes) {
    var chunks = S.splitSyl(L.text, L.n), lo = 99, hi = -99;
    notes.forEach(function (n) { lo = Math.min(lo, n.d); hi = Math.max(hi, n.d); });
    return notes.map(function (n, k) {
      var h = 18 + ((n.d - (lo - 1)) / Math.max(3, hi - lo + 1)) * 72;
      var isSel = sel && sel.pid === pid && sel.i === i && sel.k === k;
      return '<i data-k="' + k + '" class="' + (isSel ? 'sel' : '') + '" style="height:' + Math.min(100, h).toFixed(0) + '%;flex-grow:' + n.len + '" title="' + esc((chunks[k] || {}).s || '') + '"><small>' + esc((chunks[k] || {}).s || '') + '</small></i>';
    }).join('');
  }
  function draw() {
    $('sl-demo').hidden = !song.demo; chips(); drawSongs();
    var mm = m(), any = false, seen = {};
    var list = M.PROGS[mm.mood];
    $('sl-parts').innerHTML = song.parts.map(function (p) {
      if (seen[p.id]) return ''; seen[p.id] = 1;
      var pl = M.partLines(song, p); if (!pl.length) return ''; any = true;
      var cur = (mm.prog[p.type] || 0) % list.length;
      return '<div class="shr-part ' + p.type + '" data-p="' + p.id + '"><div class="ph"><b>' + S.partName(song, p) + '</b><button class="shr-mini" type="button" data-playpart="1">▶ לנגן</button></div>' +
        '<div class="shr-chips" data-prog="1">' + list.map(function (pr, j) { return '<button type="button" class="' + (j === cur ? 'on' : '') + '" data-j="' + j + '" dir="ltr">' + pr.map(function (r) { return M.chordName(mm, r); }).join(' ') + '</button>'; }).join('') + '</div>' +
        pl.map(function (L, i) {
          var prog = M.progOf(mm, p.type), ch = []; for (var b = 0; b < L.mel.bars; b++) ch.push(M.chordName(mm, prog[(L.barOffset + b) % prog.length]));
          var off = offers[key(p.id, i)];
          return '<div class="shr-ml" data-i="' + i + '"><div class="t"><span>' + esc(L.text) + '</span><span class="chs">' + ch.join(' | ') + '</span></div>' +
            '<div class="shr-mel" data-mel="1">' + melHtml(L, p.id, i, L.mel.notes) + '</div>' +
            '<div class="shr-nudge" ' + (sel && sel.pid === p.id && sel.i === i ? '' : 'hidden') + '><button class="shr-mini" type="button" data-n="up">▲ למעלה</button><button class="shr-mini" type="button" data-n="down">▼ למטה</button><button class="shr-mini" type="button" data-n="long">ארוך יותר</button><button class="shr-mini" type="button" data-n="short">קצר יותר</button></div>' +
            '<div class="acts"><button class="shr-mini" type="button" data-playline="1">▶ השורה</button><button class="shr-mini gold" type="button" data-offer="1">הצע לי מנגינה</button><button class="shr-mini" type="button" data-hum="1">🎤 אני מזמזם</button></div>' +
            (off ? '<div class="shr-sug"><button class="x" type="button" data-closeoff="1" aria-label="לסגור">✕</button><p>שלוש מנגינות לשורה. שומעים, ובוחרים אחת:</p><div class="opts">' + off.map(function (o, j) { return '<span><button type="button" data-try="' + j + '">▶ ' + (j + 1) + '</button> <button type="button" data-take="' + j + '">לבחור ' + (j + 1) + '</button></span>'; }).join('') + '</div></div>' : '') +
            '</div>';
        }).join('') + '</div>';
    }).join('');
    $('sl-empty').hidden = any;
    drawCard();
    S.save();
  }
  // ---------- דף אקורדים ----------
  function drawCard() {
    var th = song.theme || 'klaf', mm = m(), seen = {};
    $('sl-card').className = 'shr-card t-' + th;
    [].forEach.call($('sl-theme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === th); });
    var tl = M.timeline(song), txt = [];
    var body = S.sung(song).map(function (x) {
      if (seen[x.part.id]) { txt.push('(' + x.name + ')'); return '<h4>(' + esc(x.name) + ')</h4>'; } seen[x.part.id] = 1;
      txt.push('[' + x.name + ']');
      var lines = tl.lines.filter(function (l) { return l.part === x.part.id; }).slice(0, x.lines.length);
      return '<h4>' + esc(x.name) + '</h4>' + lines.map(function (l) {
        var chs = tl.chords.filter(function (c) { return c.t >= l.t0 - tl.eighth * 2 && c.t < l.t1 - 0.01; }), used = {}, html = '', plainCh = [];
        l.syls.forEach(function (s) {
          var c = null; chs.forEach(function (cc, ci) { if (!used[ci] && cc.t <= s.t + 0.001) { c = cc; used[ci] = 1; } });
          if (c) plainCh.push(c.name);
          html += (c ? '<span class="cs"><span class="ch">' + c.name + '</span>' + esc(s.s) + '</span>' : esc(s.s)) + (s.last ? ' ' : '');
        });
        txt.push(plainCh.join('  ') + '\n' + l.text);
        return '<p class="cl">' + html + '</p>';
      }).join('');
    }).join('');
    $('sl-card').innerHTML = '<h3>' + esc(song.title || 'השיר שלי') + '</h3><p class="by">' + (song.author ? 'מילים ולחן: ' + esc(song.author) + ' · ' : '') + ({ major: 'מז\'ור', minor: 'מינור', hijaz: 'חיג\'אז' }[mm.mood]) + ' · ' + M.BPM[mm.tempo] + ' פעמות לדקה · ' + mm.meter + '/4</p>' + body + '<p class="ft">"השיר שלי" – הכלים של גילעד רחמים</p>';
    $('sl-wa').href = S.wa((song.title ? '🎵 ' + song.title + '\n\n' : '') + txt.join('\n') + '\n\nהלחנתי ב"השיר שלי", בחינם: https://hakelim.com/kelim/shir/');
  }

  // ---------- נגינה ----------
  function stop() { if (player) { player.stop(); player = null; } $('sl-stop').hidden = true; $('sl-play').hidden = false; [].forEach.call(document.querySelectorAll('.shr-mel i.now'), function (e) { e.classList.remove('now'); }); }
  function opts() { return { lead: $('sl-lead').checked, chords: $('sl-acc').checked, drums: $('sl-acc').checked }; }
  function playRange(tl, from, to) {
    stop(); $('sl-stop').hidden = false; $('sl-play').hidden = true;
    var lastEl = null;
    player = M.play(tl, Object.assign(opts(), { from: from, to: to }), function (t) {
      var n = null; for (var k = 0; k < tl.notes.length; k++) { var x = tl.notes[k]; if (t >= x.t && t < x.t + x.dur) { n = x; break; } }
      var el = null;
      if (n) { var line = tl.lines[n.line], pe = document.querySelector('[data-p="' + line.part + '"]'); if (pe) { var rows = pe.querySelectorAll('.shr-ml'), li = 0; for (var q = 0; q < n.line; q++) if (tl.lines[q].part === line.part) li++; var row = rows[li % rows.length]; el = row && row.querySelectorAll('.shr-mel i')[n.syl]; } }
      if (el !== lastEl) { if (lastEl) lastEl.classList.remove('now'); if (el) el.classList.add('now'); lastEl = el; }
    }, stop);
  }
  function lineRange(tl, pid, i) { var c = -1; for (var k = 0; k < tl.lines.length; k++) { if (tl.lines[k].part === pid) { c++; if (c === i) return [tl.lines[k].t0 - tl.eighth, tl.lines[k].t1]; } } return null; }
  function partRange(tl, pid) {
    var k = 0; while (k < tl.lines.length && tl.lines[k].part !== pid) k++;
    if (k >= tl.lines.length) return null;
    var a = tl.lines[k].t0 - tl.eighth, b = tl.lines[k].t1;
    while (k + 1 < tl.lines.length && tl.lines[k + 1].part === pid && tl.lines[k + 1].idx === tl.lines[k].idx + 1 && S.part(song, pid).lines.filter(function (l) { return l.t && l.t.trim(); }).length > (k + 1 - firstOf(tl, pid))) { k++; b = tl.lines[k].t1; }
    return [a, b];
  }
  function firstOf(tl, pid) { for (var k = 0; k < tl.lines.length; k++) if (tl.lines[k].part === pid) return k; return 0; }

  // ---------- זמזום ----------
  function hum(pid, i, btn) {
    if (busy) return; busy = true; stop();
    var p = S.part(song, pid), pl = M.partLines(song, p), L = pl[i], tl = M.timeline(song), r = lineRange(tl, pid, i), dur = (r[1] - r[0]) + 0.8;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('sl-msg').textContent = 'הדפדפן הזה לא נותן להקליט. אפשר לבחור מנגינה מההצעות.'; busy = false; return; }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      var c = M.ctx(), src = c.createMediaStreamSource(stream), proc = c.createScriptProcessor(4096, 1, 1), chunks = [], t0 = c.currentTime;
      var sink = c.createGain(); sink.gain.value = 0; src.connect(proc); proc.connect(sink); sink.connect(c.destination);
      proc.onaudioprocess = function (e) { chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
      btn.textContent = '🎤 מזמזמים… (' + Math.ceil(dur) + ' שנ\')'; $('sl-msg').textContent = 'מזמזמים את השורה "' + L.text + '" – ' + L.n + ' הברות. הליווי מנגן ברקע.';
      var acc = M.play(tl, { lead: false, chords: true, drums: true, from: r[0], to: r[1], volume: 0.5 });
      setTimeout(function () {
        acc.stop(); proc.disconnect(); src.disconnect(); stream.getTracks().forEach(function (t) { t.stop(); });
        var len = chunks.reduce(function (a, x) { return a + x.length; }, 0), data = new Float32Array(len), o = 0; chunks.forEach(function (x) { data.set(x, o); o += x.length; });
        var notes = humToNotes(data, c.sampleRate, L);
        busy = false; btn.textContent = '🎤 אני מזמזם';
        if (!notes) { $('sl-msg').textContent = 'לא שמעתי מספיק זמזום. מנסים שוב, קרוב יותר לטלפון.'; return; }
        L.mel.notes = notes; L.mel.hum = 1; S.undemo(song); used('hum'); $('sl-msg').textContent = 'המנגינה מהזמזום נכנסה. אפשר לשמוע ולתקן.'; draw();
      }, dur * 1000 + 300);
    }, function () { busy = false; $('sl-msg').textContent = 'אין גישה למיקרופון. אפשר לאשר בהגדרות הדפדפן, או לבחור מנגינה מההצעות.'; });
  }
  function humToNotes(data, sr, L) {
    var tr = M.track(data, sr, 0.01, 2048).filter(function (x) { return x.f > 0; });
    if (tr.length < L.n * 3) return null;
    var mids = tr.map(function (x) { return M.f2m(x.f); }), t0 = tr[0].t, t1 = tr[tr.length - 1].t, out = [], mm = m();
    var melMed = median(L.mel.notes.map(function (n) { return M.deg2midi(mm, n.d); })), hMed = median(mids), shift = Math.round((melMed - hMed) / 12) * 12;
    for (var k = 0; k < L.n; k++) {
      var a = t0 + (t1 - t0) * k / L.n, b = t0 + (t1 - t0) * (k + 1) / L.n, seg = [];
      tr.forEach(function (x, j) { if (x.t >= a && x.t < b) seg.push(mids[j]); });
      var md = seg.length ? median(seg) : (out.length ? M.deg2midi(mm, out[out.length - 1].d) : melMed);
      out.push({ d: Math.max(-2, Math.min(9, M.midi2deg(mm, md + shift))), len: L.mel.notes[k].len });
    }
    return out;
  }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b.length ? b[Math.floor(b.length / 2)] : 0; }

  // ---------- אירועים ----------
  function setOpt(id, prop, regen) {
    $(id).onclick = function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return; stop();
      var v = b.getAttribute('data-v'); m()[prop] = prop === 'meter' ? +v : v;
      if (prop === 'mood') { m().prog = { verse: 0, chorus: v === 'major' ? 2 : 1, bridge: v === 'hijaz' ? 2 : 3 }; }
      if (regen) M.regenAll(song);
      S.undemo(song); used('set_' + prop); offers = {}; draw();
    };
  }
  setOpt('sl-mood', 'mood', true); setOpt('sl-tempo', 'tempo'); setOpt('sl-meter', 'meter', true); setOpt('sl-range', 'range');
  $('sl-parts').onclick = function (e) {
    var t = e.target, pe = t.closest('[data-p]'); if (!pe) return;
    var pid = pe.getAttribute('data-p'), p = S.part(song, pid), row = t.closest('[data-i]'), i = row ? +row.getAttribute('data-i') : -1;
    var j = t.closest('[data-prog] [data-j]');
    if (j) { stop(); m().prog[p.type] = +j.getAttribute('data-j'); S.undemo(song); used('prog'); draw(); return; }
    if (t.hasAttribute('data-playpart')) { var tl = M.timeline(song), r = partRange(tl, pid); if (r) { used('play_part'); playRange(tl, r[0], r[1]); } return; }
    if (i < 0) return;
    var pl = M.partLines(song, p), L = pl[i];
    if (t.hasAttribute('data-playline')) { var tl2 = M.timeline(song), r2 = lineRange(tl2, pid, i); used('play_line'); playRange(tl2, r2[0], r2[1]); return; }
    if (t.hasAttribute('data-offer')) { offers[key(pid, i)] = M.options(song, p, i); used('offer'); draw(); return; }
    if (t.hasAttribute('data-closeoff')) { delete offers[key(pid, i)]; draw(); return; }
    if (t.hasAttribute('data-try') || t.hasAttribute('data-take')) {
      var o = offers[key(pid, i)][+(t.getAttribute('data-try') || t.getAttribute('data-take'))];
      var keep = L.mel; m().mel[pid][i] = o;
      if (t.hasAttribute('data-take')) { delete offers[key(pid, i)]; S.undemo(song); used('take'); draw(); return; }
      var tl3 = M.timeline(song), r3 = lineRange(tl3, pid, i); m().mel[pid][i] = keep; used('try'); playRange(tl3, r3[0], r3[1]); return;
    }
    if (t.hasAttribute('data-hum')) { hum(pid, i, t); return; }
    var note = t.closest('.shr-mel i');
    if (note) { var k = +note.getAttribute('data-k'); sel = sel && sel.pid === pid && sel.i === i && sel.k === k ? null : { pid: pid, i: i, k: k }; draw(); if (sel) { var nn = L.mel.notes[k]; var c = M.ctx(), tlx = { notes: [{ t: 0, dur: 0.35, midi: M.deg2midi(m(), nn.d) }], chords: [], drums: [] }; M.schedule(c, c.destination, tlx, c.currentTime + 0.02, {}); } return; }
    var n = t.getAttribute('data-n');
    if (n && sel) {
      var notes = L.mel.notes, x = notes[sel.k];
      if (n === 'up') x.d = Math.min(9, x.d + 1);
      if (n === 'down') x.d = Math.max(-2, x.d - 1);
      if (n === 'long' || n === 'short') {
        var tot = notes.reduce(function (a, q) { return a + q.len; }, 0), cap = L.mel.bars * m().meter * 2 - L.mel.start - 1;
        if (n === 'long' && tot < cap) x.len++;
        else if (n === 'long') { for (var q = notes.length - 1; q >= 0; q--) if (q !== sel.k && notes[q].len > 1) { notes[q].len--; x.len++; break; } }
        if (n === 'short' && x.len > 1) x.len--;
      }
      S.undemo(song); used('nudge');
      var c2 = M.ctx(); M.schedule(c2, c2.destination, { notes: [{ t: 0, dur: 0.3, midi: M.deg2midi(m(), x.d) }], chords: [], drums: [] }, c2.currentTime + 0.02, {});
      draw();
    }
  };
  $('sl-play').onclick = function () { var tl = M.timeline(song); used('play_all'); playRange(tl, 0, tl.total); };
  $('sl-stop').onclick = stop;
  $('sl-theme').onclick = function (e) { var b = e.target.closest('[data-t]'); if (!b) return; song.theme = b.getAttribute('data-t'); used('theme'); drawCard(); S.save(); };
  $('sl-print').onclick = function () { used('print'); window.print(); };
  $('sl-wa').addEventListener('click', function () { used('wa'); });
  $('sl-midi').onclick = function () {
    var blob = M.midiFile(M.timeline(song), M.BPM[m().tempo]), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = (song.title || 'השיר שלי') + '.mid'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); used('midi');
  };
  $('sl-songs').onchange = function () { stop(); song = S.select(this.value); offers = {}; sel = null; used('switch'); draw(); };
  var go = $('sl-go'); if (go && go.tagName === 'A') go.addEventListener('click', function () { used('next'); S.save(); });

  song = S.cur();
  draw();
})();

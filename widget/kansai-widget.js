// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: torii-gate;

/* =========================================================
   旅のしおり — 京都・大阪 主畫面 / 鎖定畫面小工具（Scriptable）

   用法：
   1. App Store 下載 Scriptable（免費）
   2. 開新 script，貼上呢個檔案全部內容，改名「旅のしおり」
   3. 主畫面長按 → ＋ → Scriptable → 揀大細 → 加入
   4. 長按 widget → 編輯小工具：
        Script     → 旅のしおり
        Parameter  → 樣式（見下面，留空 = auto）
        When Interacting → Run Script 或 Open URL 都得

   樣式（Parameter）：
     auto       出發前倒數；旅程中顯示下一站；完結後顯示回憶
     countdown  倒數日數
     next       下一站（中 / 大尺寸會列埋之後幾站）
     today      今日行程表（出發前顯示 Day 1）
     day1…day7  指定某一日嘅行程表
     flight     登機證（出發前顯示去程，之後顯示回程）
     hotel      今晚住邊度（撳一下開 Google Maps）
     todo       待處理事項
     week       七日總覽

   鎖定畫面（iOS 16+）都支援：圓形、長方形、文字一行。
   ========================================================= */

const SITE = 'https://oxygen1024.github.io/Osaka.github.io/';
const DATA_URL = SITE + 'data/trip.json';

const C = {
  paper: Color.dynamic(new Color('#F3EEE5'), new Color('#12110E')),
  card: Color.dynamic(new Color('#FBF9F4'), new Color('#1E1C18')),
  ink: Color.dynamic(new Color('#1B1915'), new Color('#EEE8DC')),
  ink2: Color.dynamic(new Color('#5A544B'), new Color('#ACA497')),
  ink3: Color.dynamic(new Color('#8E8679'), new Color('#7B7467')),
  hair: Color.dynamic(new Color('#1B1915', 0.12), new Color('#EEE8DC', 0.14)),
  shu: Color.dynamic(new Color('#C63F28'), new Color('#E8664B')),
  matcha: Color.dynamic(new Color('#46744A'), new Color('#8DBE86')),
  yama: Color.dynamic(new Color('#A9650F'), new Color('#E2A452')),
  white: new Color('#FFF6EE')
};

const F = {
  num: (s) => new Font('Georgia', s),
  numI: (s) => new Font('Georgia-Italic', s),
  disp: (s) => new Font('HiraMinProN-W6', s),
  ui: (s) => Font.systemFont(s),
  med: (s) => Font.mediumSystemFont(s),
  semi: (s) => Font.semiboldSystemFont(s),
  bold: (s) => Font.boldSystemFont(s),
  mono: (s) => Font.boldMonospacedSystemFont(s)
};

const WD = ['日', '一', '二', '三', '四', '五', '六'];
const KANJI = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

// ---------------- 資料 ----------------
async function loadTrip() {
  const fm = FileManager.local();
  const path = fm.joinPath(fm.cacheDirectory(), 'kansai-trip.json');
  try {
    const req = new Request(DATA_URL + '?t=' + Date.now());
    req.timeoutInterval = 12;
    const json = await req.loadJSON();
    if (!json || !json.days) throw new Error('bad data');
    fm.writeString(path, JSON.stringify(json));
    return json;
  } catch (e) {
    if (fm.fileExists(path)) return JSON.parse(fm.readString(path));
    throw e;
  }
}

function nowJST() {
  const p = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
  return { ymd: p.year + '-' + p.month + '-' + p.day, min: (+p.hour) * 60 + (+p.minute) };
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function dayDate(trip, i) {
  const p = trip.start_date.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2] + i));
}
function md(d) { return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); }
function dot(d) { return (d.getUTCMonth() + 1) + '.' + pad2(d.getUTCDate()); }
function wd(d) { return '週' + WD[d.getUTCDay()]; }
function timeKey(t) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
  return m ? (+m[1]) * 60 + (+m[2]) : null;
}
function startTime(t) {
  const m = /^(\d{1,2}:\d{2})/.exec(t || '');
  return m ? m[1] : (t || '');
}
function clean(s) { return String(s || '').replace(/^[←-⯿\u{1F000}-\u{1FAFF}️\s]+/u, '').trim(); }
function dayUrl(i) { return SITE + '#day' + (i + 1); }
function mapUrl(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }

// 旅程狀態：出發前 / 旅程中 / 完結
function phase(trip, now) {
  const today = Date.parse(now.ymd + 'T00:00:00Z');
  const diff = Math.round((dayDate(trip, 0).getTime() - today) / 864e5);
  const n = trip.days.length;
  if (diff > 0) return { kind: 'before', days: diff, idx: 0 };
  if (-diff < n) return { kind: 'during', idx: -diff };
  return { kind: 'after', idx: n - 1 };
}

// 下一站同之後幾站
function upcoming(trip, now, ph, count) {
  const out = [];
  let di = ph.kind === 'during' ? ph.idx : 0;
  let fromMin = ph.kind === 'during' ? now.min : -1;
  if (ph.kind === 'after') return out;
  for (; di < trip.days.length && out.length < count; di++) {
    trip.days[di].items.forEach((it, ii) => {
      if (out.length >= count) return;
      const k = timeKey(it.time);
      if (fromMin >= 0 && (k == null || k <= fromMin)) return;
      out.push({ it: it, di: di, ii: ii });
    });
    fromMin = -1;
  }
  return out;
}

function tonightHotel(trip, now, ph) {
  const hotels = trip.hotels || [];
  if (!hotels.length) return null;
  const today = now.ymd.replace(/-/g, '/');
  const norm = (s) => String(s || '').replace(/-/g, '/');
  const found = hotels.find((h) => norm(h.checkin) <= today && today < norm(h.checkout));
  if (found) return found;
  return ph.kind === 'after' ? hotels[hotels.length - 1] : hotels[0];
}

function pendingItems(trip) {
  const out = [];
  trip.days.forEach((d, di) => d.items.forEach((it) => { if (it.status === 'pending') out.push({ it: it, di: di }); }));
  return out;
}

// ---------------- 排版小工具 ----------------
function txt(stack, str, font, color, lines) {
  const t = stack.addText(String(str == null ? '' : str));
  t.font = font;
  t.textColor = color;
  if (lines) t.lineLimit = lines;
  t.minimumScaleFactor = 0.6;
  return t;
}
function sym(stack, name, size, color) {
  const s = SFSymbol.named(name);
  if (!s) return null;
  const img = stack.addImage(s.image);
  img.imageSize = new Size(size, size);
  img.tintColor = color;
  return img;
}
function row(stack) { const r = stack.addStack(); r.layoutHorizontally(); r.centerAlignContent(); return r; }
function col(stack) { const c = stack.addStack(); c.layoutVertically(); return c; }

function kicker(stack, label, withSun) {
  const r = row(stack);
  sym(r, 'circle.fill', 6, C.shu);
  r.addSpacer(5);
  txt(r, label, F.bold(10), C.ink2, 1);
  if (withSun) { r.addSpacer(); sym(r, 'circle.fill', 20, C.shu); }
  return r;
}

function newWidget(pad) {
  const w = new ListWidget();
  w.backgroundColor = C.paper;
  const p = pad == null ? 14 : pad;
  w.setPadding(p, p, p, p);
  w.url = SITE;
  return w;
}

function itemRow(stack, x, opts) {
  const r = row(stack);
  r.url = dayUrl(x.di);
  const tcol = r.addStack();
  tcol.size = new Size(opts.timeW || 42, 0);
  txt(tcol, startTime(x.it.time) || '·', F.num(opts.size + 1), opts.color || C.ink, 1);
  tcol.addSpacer();
  r.addSpacer(6);
  if (opts.dot) { sym(r, 'circle.fill', 5, opts.dotColor || C.ink3); r.addSpacer(6); }
  txt(r, x.it.what, F.semi(opts.size), opts.color || C.ink, 1);
  r.addSpacer();
  return r;
}

// ---------------- 樣式 ----------------
function wCountdown(trip, now, ph, fam) {
  const w = newWidget();
  const big = fam === 'large' ? 96 : 58;
  kicker(w, '旅のしおり · KANSAI', true);
  w.addSpacer();
  if (ph.kind === 'before') {
    txt(w, '距離出發', F.bold(11), C.ink2);
    const r = row(w);
    r.bottomAlignContent();
    txt(r, ph.days, F.num(big), C.ink, 1);
    r.addSpacer(4);
    txt(r, '日', F.disp(16), C.ink);
  } else if (ph.kind === 'during') {
    txt(w, '旅程第', F.bold(11), C.ink2);
    const r = row(w);
    r.bottomAlignContent();
    txt(r, ph.idx + 1, F.num(big), C.shu, 1);
    r.addSpacer(4);
    txt(r, '日 / ' + trip.days.length, F.disp(14), C.ink);
    w.url = dayUrl(ph.idx);
  } else {
    txt(w, 'おつかれさま', F.disp(22), C.ink, 2);
    txt(w, '旅程完結', F.bold(11), C.ink2);
  }
  const s = dayDate(trip, 0), e = dayDate(trip, trip.days.length - 1);
  txt(w, s.getUTCFullYear() + '.' + dot(s) + ' — ' + dot(e), F.num(12), C.ink3, 1);

  if (fam === 'medium' || fam === 'large') {
    // 右邊加多欄：之後幾站
    const ww = newWidget();
    const top = row(ww);
    top.topAlignContent();
    const left = col(top);
    left.size = new Size(130, 0);
    kicker(left, '旅のしおり', false);
    left.addSpacer();
    if (ph.kind === 'before') {
      txt(left, '距離出發', F.bold(11), C.ink2);
      const r = row(left); r.bottomAlignContent();
      txt(r, ph.days, F.num(fam === 'large' ? 80 : 56), C.ink, 1); r.addSpacer(3); txt(r, '日', F.disp(15), C.ink);
    } else if (ph.kind === 'during') {
      txt(left, '旅程第', F.bold(11), C.ink2);
      const r = row(left); r.bottomAlignContent();
      txt(r, ph.idx + 1, F.num(fam === 'large' ? 80 : 56), C.shu, 1); r.addSpacer(3); txt(r, '日 / ' + trip.days.length, F.disp(13), C.ink);
    } else {
      txt(left, 'おつかれさま', F.disp(20), C.ink, 2);
    }
    txt(left, s.getUTCFullYear() + '.' + dot(s) + ' — ' + dot(e), F.num(12), C.ink3, 1);
    top.addSpacer(12);
    const right = col(top);
    const list = ph.kind === 'after' ? [] : upcoming(trip, now, ph, fam === 'large' ? 12 : 5);
    txt(right, ph.kind === 'before' ? 'DAY 1 · ' + clean(trip.days[0].title) : '接下來', F.bold(10), C.shu, 1);
    right.addSpacer(6);
    if (!list.length) txt(right, '多謝一齊去旅行。', F.ui(13), C.ink2);
    list.forEach((x, i) => {
      itemRow(right, x, { size: 12, timeW: 40, color: i === 0 ? C.ink : C.ink2 });
      right.addSpacer(fam === 'large' ? 7 : 4);
    });
    right.addSpacer();
    ww.url = w.url;
    return ww;
  }
  return w;
}

function wNext(trip, now, ph, fam) {
  const list = upcoming(trip, now, ph, fam === 'large' ? 9 : fam === 'medium' ? 4 : 1);
  if (!list.length) return wCountdown(trip, now, ph, fam);
  const first = list[0];
  const dd = dayDate(trip, first.di);
  const w = newWidget();
  w.url = dayUrl(first.di);
  const label = ph.kind === 'during' && first.di === ph.idx ? '下一站' : 'DAY ' + (first.di + 1) + ' · ' + md(dd);

  if (fam === 'small') {
    kicker(w, label, false);
    w.addSpacer(6);
    txt(w, startTime(first.it.time), F.num(34), C.shu, 1);
    w.addSpacer(2);
    txt(w, first.it.what, F.disp(15), C.ink, 3);
    w.addSpacer();
    const where = first.it.address || first.it.place;
    if (where) {
      const r = row(w);
      sym(r, 'mappin', 10, C.ink3); r.addSpacer(3);
      txt(r, where, F.ui(10), C.ink3, 1);
    }
    return w;
  }

  const top = row(w);
  top.topAlignContent();
  const left = col(top);
  left.size = new Size(fam === 'large' ? 0 : 150, 0);
  kicker(left, label, false);
  left.addSpacer(6);
  txt(left, startTime(first.it.time), F.num(fam === 'large' ? 44 : 36), C.shu, 1);
  txt(left, first.it.what, F.disp(fam === 'large' ? 20 : 15), C.ink, 3);
  const where = first.it.address || first.it.place;
  if (where) {
    left.addSpacer(4);
    const r = row(left);
    sym(r, 'mappin', 10, C.ink3); r.addSpacer(3);
    txt(r, where, F.ui(10), C.ink3, 1);
  }
  if (first.it.ref) {
    left.addSpacer(4);
    const r = row(left);
    txt(r, '預約 ', F.bold(10), C.ink3); txt(r, first.it.ref, F.mono(11), C.ink, 1);
  }
  left.addSpacer();

  if (fam === 'medium') {
    top.addSpacer(10);
    const right = col(top);
    txt(right, '之後', F.bold(10), C.ink3);
    right.addSpacer(6);
    list.slice(1).forEach((x) => { itemRow(right, x, { size: 12, timeW: 40, color: C.ink2 }); right.addSpacer(5); });
    right.addSpacer();
    return w;
  }
  // large：下面再列之後幾站
  w.addSpacer(10);
  const line = w.addStack(); line.size = new Size(0, 1); line.backgroundColor = C.hair;
  w.addSpacer(10);
  txt(w, '之後', F.bold(10), C.ink3);
  w.addSpacer(6);
  list.slice(1).forEach((x) => { itemRow(w, x, { size: 13, timeW: 46, color: C.ink2 }); w.addSpacer(6); });
  w.addSpacer();
  return w;
}

function wDay(trip, now, ph, fam, di) {
  const d = trip.days[di];
  const dd = dayDate(trip, di);
  const w = newWidget();
  w.url = dayUrl(di);
  const isToday = ph.kind === 'during' && ph.idx === di;
  const head = row(w);
  head.bottomAlignContent();
  const numCol = col(head);
  txt(numCol, 'DAY', F.bold(9), C.ink3);
  txt(numCol, pad2(di + 1), F.num(fam === 'small' ? 40 : 44), C.ink, 1);
  head.addSpacer(8);
  const info = col(head);
  txt(info, md(dd) + ' ' + wd(dd) + (isToday ? ' · 今日' : ''), F.bold(10), isToday ? C.shu : C.ink3, 1);
  txt(info, clean(d.title), F.disp(fam === 'small' ? 14 : 17), C.ink, 2);
  head.addSpacer();
  if (fam !== 'small') {
    const seal = head.addStack();
    seal.layoutVertically();
    seal.borderColor = C.shu; seal.borderWidth = 1; seal.cornerRadius = 4;
    seal.setPadding(3, 3, 3, 3);
    ((KANJI[di + 1] || String(di + 1)) + '日目').split('').forEach((c) => txt(seal, c, F.disp(9), C.shu));
  }

  if (fam === 'small') {
    w.addSpacer();
    const conf = d.items.filter((x) => x.status === 'confirmed').length;
    txt(w, d.items.length + ' 個行程' + (conf ? ' · ' + conf + ' 已確認' : ''), F.med(11), C.ink2, 1);
    const firstItem = d.items[0];
    if (firstItem) txt(w, startTime(firstItem.time) + '  ' + firstItem.what, F.ui(10), C.ink3, 1);
    return w;
  }

  w.addSpacer(8);
  if (d.alert) {
    const a = row(w);
    sym(a, 'exclamationmark.triangle.fill', 10, C.yama); a.addSpacer(4);
    txt(a, clean(d.alert), F.semi(10), C.yama, 1);
    w.addSpacer(6);
  }
  const max = fam === 'large' ? 13 : 4;
  let start = 0;
  if (isToday) {
    const nextIdx = d.items.findIndex((x) => { const k = timeKey(x.time); return k != null && k > now.min; });
    if (nextIdx > 0) start = Math.max(0, Math.min(nextIdx - 1, d.items.length - max));
  }
  d.items.slice(start, start + max).forEach((it, k) => {
    const ii = start + k;
    const key = timeKey(it.time);
    let color = C.ink, dotColor = C.ink3;
    if (it.status === 'confirmed') dotColor = C.matcha;
    if (it.status === 'pending') dotColor = C.yama;
    if (isToday && key != null) {
      const nextIdx = d.items.findIndex((x) => { const kk = timeKey(x.time); return kk != null && kk > now.min; });
      if (ii === nextIdx) { color = C.shu; dotColor = C.shu; }
      else if (key <= now.min) color = C.ink3;
    }
    itemRow(w, { it: it, di: di }, { size: fam === 'large' ? 13 : 12, timeW: 42, color: color, dot: true, dotColor: dotColor });
    w.addSpacer(fam === 'large' ? 6 : 4);
  });
  const rest = d.items.length - start - max;
  if (rest > 0) txt(w, '＋ 仲有 ' + rest + ' 個', F.med(10), C.ink3);
  w.addSpacer();
  return w;
}

function wFlight(trip, now, ph, fam) {
  const fl = trip.flights || [];
  if (!fl.length) return wCountdown(trip, now, ph, fam);
  const today = now.ymd;
  const f = ph.kind === 'before' || (ph.kind === 'during' && ph.idx === 0 && now.min < 8 * 60) ? fl[0] : fl[fl.length - 1];
  const w = newWidget(fam === 'small' ? 14 : 16);
  w.url = SITE + '#overview';
  const top = row(w);
  txt(top, (f.label || '') + ' · ' + (f.date || ''), F.bold(10), C.ink3, 1);
  top.addSpacer();
  sym(top, 'airplane', 12, C.shu);
  w.addSpacer();
  const route = row(w);
  route.bottomAlignContent();
  const a = col(route);
  txt(a, f.from_code || '', F.num(fam === 'small' ? 26 : 36), C.ink, 1);
  txt(a, f.dep || '', F.num(fam === 'small' ? 13 : 16), C.ink2, 1);
  route.addSpacer();
  if (fam !== 'small') { sym(route, 'arrow.right', 14, C.shu); route.addSpacer(); }
  const b = col(route);
  b.centerAlignContent();
  txt(b, f.to_code || '', F.num(fam === 'small' ? 26 : 36), C.ink, 1).rightAlignText();
  txt(b, f.arr || '', F.num(fam === 'small' ? 13 : 16), C.ink2, 1).rightAlignText();
  if (fam !== 'small') {
    const names = row(w);
    txt(names, f.from || '', F.ui(10), C.ink3, 1); names.addSpacer(); txt(names, f.to || '', F.ui(10), C.ink3, 1);
  }
  w.addSpacer(fam === 'small' ? 6 : 10);
  const stub = row(w);
  txt(stub, '航班 ', F.ui(10), C.ink3);
  txt(stub, f.code || '', F.mono(12), C.ink, 1);
  stub.addSpacer();
  if (f.note && fam !== 'small') txt(stub, f.note, F.ui(10), C.ink3, 1);
  void today;
  return w;
}

function wHotel(trip, now, ph, fam) {
  const h = tonightHotel(trip, now, ph);
  if (!h) return wCountdown(trip, now, ph, fam);
  const w = newWidget();
  w.url = mapUrl(h.name);
  kicker(w, ph.kind === 'during' ? '今晚住' : '住宿', false);
  w.addSpacer();
  const r = row(w);
  r.bottomAlignContent();
  txt(r, h.nights || '', F.num(fam === 'small' ? 34 : 40), C.ink, 1);
  r.addSpacer(3);
  txt(r, '晚', F.disp(13), C.ink2);
  r.addSpacer();
  w.addSpacer(2);
  txt(w, h.name, F.disp(fam === 'small' ? 13 : 16), C.ink, fam === 'small' ? 3 : 2);
  const ci = String(h.checkin || '').replace(/^\d{4}\D/, '').replace(/\D/, '.');
  const co = String(h.checkout || '').replace(/^\d{4}\D/, '').replace(/\D/, '.');
  txt(w, ci + ' → ' + co, F.num(12), C.ink2, 1);
  if (fam !== 'small') {
    w.addSpacer(4);
    if (h.address) { const a = row(w); sym(a, 'mappin', 10, C.ink3); a.addSpacer(3); txt(a, h.address, F.ui(10), C.ink3, 2); }
    if (h.phone) { const p = row(w); sym(p, 'phone', 10, C.ink3); p.addSpacer(3); txt(p, h.phone, F.ui(10), C.ink3, 1); }
  }
  return w;
}

function wTodo(trip, now, ph, fam) {
  const list = pendingItems(trip);
  const w = newWidget();
  w.url = SITE + '#todo';
  kicker(w, '待辦', false);
  if (fam === 'small') w.addSpacer(); else w.addSpacer(6);
  if (!list.length) {
    const r = row(w);
    const seal = r.addStack();
    seal.borderColor = C.shu; seal.borderWidth = 2; seal.cornerRadius = 22; seal.size = new Size(44, 44); seal.centerAlignContent();
    txt(seal, '完了', F.disp(12), C.shu);
    r.addSpacer(8);
    txt(r, '冇待處理事項', F.semi(12), C.ink2);
    w.addSpacer();
    return w;
  }
  const r = row(w);
  r.bottomAlignContent();
  txt(r, list.length, F.num(fam === 'small' ? 44 : 40), C.ink, 1);
  r.addSpacer(4);
  txt(r, '項待處理', F.disp(13), C.ink);
  w.addSpacer(6);
  const max = fam === 'small' ? 2 : fam === 'medium' ? 3 : 10;
  list.slice(0, max).forEach((x) => {
    const it = row(w);
    it.url = dayUrl(x.di);
    sym(it, 'circle', 9, C.yama); it.addSpacer(5);
    txt(it, 'D' + (x.di + 1) + ' ', F.bold(10), C.ink3);
    txt(it, x.it.what, F.semi(fam === 'small' ? 10 : 12), C.ink, 1);
    w.addSpacer(3);
  });
  w.addSpacer();
  return w;
}

function wWeek(trip, now, ph, fam) {
  const w = newWidget();
  kicker(w, '旅のしおり · 7日', fam !== 'small');
  w.addSpacer(8);
  const n = trip.days.length;
  if (fam === 'small') {
    const grid = col(w);
    for (let i = 0; i < n; i++) {
      const r = row(grid); r.url = dayUrl(i);
      const isToday = ph.kind === 'during' && ph.idx === i;
      txt(r, pad2(i + 1), F.num(12), isToday ? C.shu : C.ink, 1);
      r.addSpacer(6);
      txt(r, clean(trip.days[i].title), F.semi(10), isToday ? C.shu : C.ink2, 1);
      grid.addSpacer(2);
    }
    return w;
  }
  const strip = row(w);
  for (let i = 0; i < n; i++) {
    const dd = dayDate(trip, i);
    const isToday = ph.kind === 'during' && ph.idx === i;
    const cell = strip.addStack();
    cell.layoutVertically();
    cell.centerAlignContent();
    cell.url = dayUrl(i);
    cell.cornerRadius = 10;
    cell.setPadding(5, 6, 6, 6);
    if (isToday) cell.backgroundColor = C.ink;
    txt(cell, wd(dd), F.bold(8), isToday ? C.paper : C.ink3, 1);
    txt(cell, dd.getUTCDate(), F.num(20), isToday ? C.paper : C.ink, 1);
    if (i < n - 1) strip.addSpacer();
  }
  w.addSpacer(10);
  const focus = ph.kind === 'during' ? ph.idx : 0;
  const lines = fam === 'large' ? n : 2;
  for (let k = 0; k < lines; k++) {
    const i = fam === 'large' ? k : Math.min(focus + k, n - 1);
    if (fam !== 'large' && k > 0 && i === focus) break;
    const r = row(w); r.url = dayUrl(i);
    txt(r, 'DAY ' + pad2(i + 1), F.bold(9), i === focus && ph.kind === 'during' ? C.shu : C.ink3, 1);
    r.addSpacer(8);
    txt(r, clean(trip.days[i].title), F.disp(fam === 'large' ? 15 : 13), C.ink, 1);
    r.addSpacer();
    txt(r, trip.days[i].items.length + '', F.num(12), C.ink3);
    w.addSpacer(fam === 'large' ? 8 : 4);
  }
  w.addSpacer();
  return w;
}

// ---------------- 鎖定畫面 ----------------
function wAccessory(trip, now, ph, fam) {
  const w = new ListWidget();
  w.url = ph.kind === 'during' ? dayUrl(ph.idx) : SITE;
  const next = upcoming(trip, now, ph, 1)[0];
  if (fam === 'accessoryInline') {
    if (ph.kind === 'before') txt(w, '旅のしおり · 距離出發 ' + ph.days + ' 日', F.semi(12), Color.white());
    else if (next) txt(w, startTime(next.it.time) + ' ' + next.it.what, F.semi(12), Color.white());
    else txt(w, '旅のしおり · おつかれさま', F.semi(12), Color.white());
    return w;
  }
  if (fam === 'accessoryCircular') {
    w.addAccessoryWidgetBackground = true;
    const c = w.addStack(); c.layoutVertically(); c.centerAlignContent();
    if (ph.kind === 'before') {
      txt(c, ph.days, F.num(22), Color.white(), 1).centerAlignText();
      txt(c, '日', F.bold(9), Color.white()).centerAlignText();
    } else if (ph.kind === 'during') {
      txt(c, 'DAY', F.bold(8), Color.white()).centerAlignText();
      txt(c, ph.idx + 1, F.num(22), Color.white(), 1).centerAlignText();
    } else {
      txt(c, '完', F.disp(20), Color.white()).centerAlignText();
    }
    return w;
  }
  // accessoryRectangular
  if (ph.kind === 'before') {
    txt(w, '旅のしおり', F.bold(11), Color.white());
    txt(w, '距離出發 ' + ph.days + ' 日', F.semi(15), Color.white(), 1);
    txt(w, clean(trip.title), F.ui(11), Color.white(), 1);
  } else if (next) {
    txt(w, (ph.kind === 'during' && next.di === ph.idx ? '下一站' : 'DAY ' + (next.di + 1)) + ' · ' + startTime(next.it.time), F.bold(11), Color.white());
    txt(w, next.it.what, F.semi(14), Color.white(), 2);
  } else {
    txt(w, '旅のしおり', F.bold(11), Color.white());
    txt(w, 'おつかれさま', F.semi(15), Color.white());
  }
  return w;
}

// ---------------- 組合 ----------------
const PATTERNS = ['auto', 'countdown', 'next', 'today', 'flight', 'hotel', 'todo', 'week'];

function build(trip, pattern, fam) {
  const now = nowJST();
  const ph = phase(trip, now);
  if (/^accessory/.test(fam)) return wAccessory(trip, now, ph, fam);
  const p = String(pattern || 'auto').trim().toLowerCase();
  const m = /^day\s*(\d+)$/.exec(p);
  if (m) return wDay(trip, now, ph, fam, Math.min(Math.max(+m[1] - 1, 0), trip.days.length - 1));
  switch (p) {
    case 'countdown': return wCountdown(trip, now, ph, fam);
    case 'next': return wNext(trip, now, ph, fam);
    case 'today': return wDay(trip, now, ph, fam, ph.idx);
    case 'flight': return wFlight(trip, now, ph, fam);
    case 'hotel': return wHotel(trip, now, ph, fam);
    case 'todo': return wTodo(trip, now, ph, fam);
    case 'week': return wWeek(trip, now, ph, fam);
    default:
      if (ph.kind === 'during') return fam === 'large' ? wDay(trip, now, ph, fam, ph.idx) : wNext(trip, now, ph, fam);
      return wCountdown(trip, now, ph, fam);
  }
}

function errorWidget(msg) {
  const w = newWidget();
  kicker(w, '旅のしおり', false);
  w.addSpacer();
  txt(w, '載入唔到行程', F.semi(13), C.ink);
  txt(w, msg, F.ui(10), C.ink3, 3);
  return w;
}

async function main() {
  let trip;
  try { trip = await loadTrip(); } catch (e) {
    const w = errorWidget(String(e.message || e));
    if (config.runsInWidget) Script.setWidget(w); else await w.presentSmall();
    return Script.complete();
  }

  if (config.runsInWidget) {
    const w = build(trip, args.widgetParameter, config.widgetFamily || 'small');
    w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
    Script.setWidget(w);
    return Script.complete();
  }

  // 喺 App 入面撳 ▶︎：預覽唔同樣式同大細
  const pick = new Alert();
  pick.title = '旅のしおり Widget';
  pick.message = '揀一個樣式預覽（加 widget 時喺 Parameter 填返個名）';
  const choices = PATTERNS.concat(trip.days.map((_, i) => 'day' + (i + 1)));
  choices.forEach((c) => pick.addAction(c));
  pick.addCancelAction('取消');
  const pi = await pick.presentSheet();
  if (pi < 0) return Script.complete();
  const size = new Alert();
  size.title = choices[pi];
  ['small', 'medium', 'large'].forEach((s) => size.addAction(s));
  size.addCancelAction('取消');
  const si = await size.presentSheet();
  if (si < 0) return Script.complete();
  const fam = ['small', 'medium', 'large'][si];
  const w = build(trip, choices[pi], fam);
  if (fam === 'small') await w.presentSmall();
  else if (fam === 'medium') await w.presentMedium();
  else await w.presentLarge();
  Script.complete();
}

await main();

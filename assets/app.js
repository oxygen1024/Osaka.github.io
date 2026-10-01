(function () {
  'use strict';

  // ================= 設定 =================
  var body = document.body;
  var LS = {
    token: 'kansai-token',
    branch: 'kansai-branch',
    draft: 'kansai-trip-draft',
    checks: 'kansai-checks',
    tab: 'kansai-tab'
  };
  var WD = ['日', '一', '二', '三', '四', '五', '六'];
  var KANJI = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  var IMG_EXT = /\.(jpe?g|png|webp|gif|heic)$/i;
  var PDF_EXT = /\.pdf$/i;
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  var state = {
    repo: body.dataset.repo,
    branch: lsGet(LS.branch) || body.dataset.branch || 'main',
    token: lsGet(LS.token) || '',
    trip: null,
    sha: null,
    source: 'site',      // site | local | github
    photos: [],          // {path, url, sha}
    checks: {},
    tab: null
  };
  try { state.checks = JSON.parse(lsGet(LS.checks) || '{}') || {}; } catch (e) { state.checks = {}; }

  // ================= 圖示 =================
  var ICONS = {
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    phone: '<path d="M5.2 4h3.3l1.6 4-2.1 1.4a11 11 0 0 0 6.6 6.6L16 13.9l4 1.6v3.3a1.7 1.7 0 0 1-1.8 1.7A16.2 16.2 0 0 1 3.5 5.8 1.7 1.7 0 0 1 5.2 4z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14.5 7.5l2 2"/>',
    grip: '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plane: '<path d="M21 15.4v-1.7l-7.8-4.9V4.3a1.2 1.2 0 0 0-2.4 0v4.5L3 13.7v1.7l7.8-2.4v4.6l-2.1 1.5V21l3.3-1 3.3 1v-1.9l-2.1-1.5V13z"/>',
    bed: '<path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11.5" r="1.6"/>',
    train: '<rect x="5.5" y="3" width="13" height="13" rx="3"/><path d="M5.5 10h13M9 20l-1.5 2M15 20l1.5 2M9 13.2h.01M15 13.2h.01"/>',
    bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21v-3M16 21v-3M8 14.5h.01M16 14.5h.01"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>',
    list: '<path d="M11 6h9M11 12h9M11 18h9"/><path d="M4 6l1.2 1.2L7.5 5M4 12l1.2 1.2L7.5 11M4 18l1.2 1.2L7.5 17"/>',
    sliders: '<path d="M4 7h9M18 7h2M4 17h3M12 17h8"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="9.5" cy="17" r="2.3"/>',
    alert: '<path d="M12 4.5l8.5 15h-17z"/><path d="M12 10v4M12 17h.01"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.6 1.6 3.7 3.7 0 0 1-.5 7.4z"/>',
    device: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    sync: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4.5h-4.5"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    chevron: '<path d="M9.5 6l6 6-6 6"/>',
    camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.3"/>'
  };
  var FILLED = { grip: 1, plane: 1 };
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function icon(name) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'i' + (FILLED[name] ? ' fill' : ''));
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || '';
    return s;
  }
  function checkMark() {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS.check;
    return s;
  }

  // ================= 小工具 =================
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { n.dataset[d] = v[d]; });
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return n;
  }

  function iconBtn(name, label, onclick, cls) {
    return el('button', { type: 'button', class: 'icon-btn press' + (cls ? ' ' + cls : ''), 'aria-label': label, title: label, onclick: onclick }, [icon(name)]);
  }

  // 去除資料入面舊有嘅 emoji 前綴
  function clean(s) { return String(s || '').replace(/^[←-⯿\u{1F000}-\u{1FAFF}️\s]+/u, '').trim(); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  var toastTimer;
  function toast(msg, ms, ic) {
    var t = document.getElementById('toast');
    t.textContent = '';
    if (ic) t.appendChild(icon(ic));
    t.appendChild(el('span', { text: msg }));
    t.setAttribute('data-show', '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.removeAttribute('data-show'); }, ms || 2600);
  }

  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }

  function bytesToB64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }
  function utf8ToB64(s) { return bytesToB64(new TextEncoder().encode(s)); }
  function b64ToUtf8(b) {
    var bin = atob(b.replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function dayDate(i) {
    var p = state.trip.start_date.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + i));
  }
  function ymd(d) { return d.toISOString().slice(0, 10); }
  function md(d) { return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); }
  function wd(d) { return WD[d.getUTCDay()]; }
  function dotDate(s) { var m = /(\d{4})\D(\d{1,2})\D(\d{1,2})/.exec(s || ''); return m ? +m[2] + '.' + pad2(+m[3]) : s; }

  // 日本時間（可以用 ?now=2026-10-24T13:00 測試）
  function nowJST() {
    var q = new URLSearchParams(location.search).get('now');
    var m = q && /^(\d{4}-\d{2}-\d{2})(?:T(\d{1,2}):(\d{2}))?/.exec(q);
    if (m) return { ymd: m[1], min: m[2] ? (+m[2]) * 60 + (+m[3]) : 0 };
    var parts = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return { ymd: parts.year + '-' + parts.month + '-' + parts.day, min: (+parts.hour) * 60 + (+parts.minute) };
  }

  function mapUrl(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
  function telUrl(p) { return 'tel:' + p.replace(/[^\d+]/g, ''); }
  function newId() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
  function isWide() { return window.matchMedia('(min-width: 1000px)').matches; }

  function timeKey(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }

  // ================= GitHub API =================
  var API_ERR = {
    401: 'Token 無效或者已過期，請重新產生',
    403: 'Token 冇權限：Contents 要揀「Read and write」',
    404: '搵唔到 repo：產生 token 時要揀 Osaka.github.io 呢個 repository',
    409: '版本衝突',
    422: '版本衝突'
  };

  function api(method, path, data) {
    return fetch('https://api.github.com/repos/' + state.repo + (path ? '/' + path : ''), {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + state.token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: data ? JSON.stringify(data) : undefined,
      cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) {
        var err = new Error(API_ERR[r.status] || ('GitHub 錯誤 ' + r.status));
        err.status = r.status;
        throw err;
      }
      return r.status === 204 ? null : r.json();
    }, function () {
      throw new Error('連唔到 GitHub（檢查網絡；如果 token 係複製落嚟，試吓重新貼過）');
    });
  }

  function rawUrl(path) {
    return 'https://raw.githubusercontent.com/' + state.repo + '/' + encodeURIComponent(state.branch) + '/' + encPath(path);
  }

  // ================= 載入 =================
  function loadTrip() {
    if (state.token) {
      return api('GET', 'contents/data/trip.json?ref=' + encodeURIComponent(state.branch)).then(function (res) {
        state.trip = JSON.parse(b64ToUtf8(res.content));
        state.sha = res.sha;
        state.source = 'github';
        setSync('ok');
      }).catch(function (e) {
        setSync('error');
        toast('連接 GitHub 失敗（' + e.message + '），暫時顯示網站版本', 4000, 'alert');
        return loadSiteTrip();
      });
    }
    var draft = lsGet(LS.draft);
    if (draft) {
      try {
        state.trip = JSON.parse(draft);
        state.source = 'local';
        setSync('local');
        return Promise.resolve();
      } catch (e) { lsSet(LS.draft, null); }
    }
    return loadSiteTrip();
  }

  function loadSiteTrip() {
    return fetch('data/trip.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (t) {
        state.trip = t;
        state.source = 'site';
        if (!state.token) setSync('local');
      });
  }

  function loadPhotos() {
    if (state.token) {
      return api('GET', 'git/trees/' + encodeURIComponent(state.branch) + '?recursive=1').then(function (res) {
        state.photos = res.tree.filter(function (f) {
          return f.type === 'blob' && f.path.indexOf('photos/') === 0 && (IMG_EXT.test(f.path) || PDF_EXT.test(f.path));
        }).map(function (f) { return { path: f.path, sha: f.sha, url: rawUrl(f.path) }; });
      }).catch(function () { return loadSitePhotos(); });
    }
    return loadSitePhotos();
  }

  function loadSitePhotos() {
    return fetch('photos.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (list) {
        state.photos = list.filter(function (p) { return IMG_EXT.test(p) || PDF_EXT.test(p); })
          .map(function (p) { return { path: p, url: encPath(p) }; });
      });
  }

  // ================= 儲存 =================
  var saving = Promise.resolve();
  function saveTrip(message) {
    var json = JSON.stringify(state.trip, null, 2) + '\n';
    if (!state.token) {
      lsSet(LS.draft, json);
      state.source = 'local';
      setSync('local');
      toast('已儲存喺呢部手機', 2200, 'device');
      return Promise.resolve(true);
    }
    setSync('saving');
    saving = saving.then(function () {
      return api('PUT', 'contents/data/trip.json', {
        message: message || '手機更新行程',
        content: utf8ToB64(json),
        sha: state.sha,
        branch: state.branch
      }).then(function (res) {
        state.sha = res.content.sha;
        state.source = 'github';
        setSync('ok');
        toast('已同步到 GitHub', 2200, 'cloud');
        return true;
      }).catch(function (e) {
        setSync('error');
        if (e.status === 409 || e.status === 422) {
          toast('其他裝置啱啱改過，已載入最新版本，請再改一次', 5000, 'alert');
          return loadTrip().then(function () { render(); return false; });
        }
        lsSet(LS.draft, json);
        toast('同步失敗（' + e.message + '），已先存喺本機', 5000, 'alert');
        return false;
      });
    });
    return saving;
  }

  function setSync(s) {
    var b = document.getElementById('sync');
    var m = {
      ok: ['cloud', '已同步'],
      saving: ['sync', '儲存中'],
      error: ['alert', '未同步'],
      local: ['device', '本機']
    }[s];
    b.textContent = '';
    b.dataset.state = s;
    if (!m) return;
    b.appendChild(icon(m[0]));
    b.appendChild(el('span', { text: m[1] }));
  }

  // ================= 畫面 =================
  var firstRender = true;
  function render() {
    var t = state.trip;
    var now = nowJST();
    document.title = t.title;
    renderHero(t, now);
    renderTabs(now);
    var main = document.getElementById('main');
    main.textContent = '';
    main.appendChild(renderOverview(now));
    t.days.forEach(function (d, i) { main.appendChild(renderDay(d, i, now)); });
    main.appendChild(renderTodo());
    main.appendChild(renderSettings());
    refreshChecks();
    show(state.tab && document.getElementById(state.tab) ? state.tab : pickStartTab(), !firstRender, true);
    firstRender = false;
  }

  function renderHero(t, now) {
    var parts = String(t.title).split(/\s+/);
    var a = parts.shift() || '', b = parts.join(' ');
    var ta = document.getElementById('title-a');
    ta.textContent = '';
    a.split('・').forEach(function (seg, i) {
      if (i) ta.appendChild(el('span', { class: 'dot', text: '・' }));
      ta.appendChild(document.createTextNode(seg));
    });
    document.getElementById('title-b').textContent = b;

    var s = dayDate(0), e = dayDate(t.days.length - 1);
    var dates = document.getElementById('trip-dates');
    dates.textContent = '';
    dates.appendChild(document.createTextNode(s.getUTCFullYear() + '.' + (s.getUTCMonth() + 1) + '.' + pad2(s.getUTCDate())));
    dates.appendChild(el('em', { text: '—' }));
    dates.appendChild(document.createTextNode((e.getUTCMonth() + 1) + '.' + pad2(e.getUTCDate())));

    var cd = document.getElementById('countdown');
    cd.textContent = '';
    var today = Date.parse(now.ymd + 'T00:00:00Z');
    var diff = Math.round((s.getTime() - today) / 864e5);
    if (diff > 0) cd.append('距離出發', el('b', { text: diff }), '日');
    else if (-diff < t.days.length) cd.append('旅程第', el('b', { text: 1 - diff }), '日 / ' + t.days.length);
    else cd.append('旅程完結 · おつかれさま');
  }

  function renderTabs(now) {
    var track = document.getElementById('tabs');
    track.textContent = '';
    track.appendChild(el('span', { class: 'tab-ind', 'aria-hidden': 'true' }));
    track.appendChild(tabBtn('overview', [icon('book'), el('span', { class: 'lbl', text: '總覽' })]));
    state.trip.days.forEach(function (d, i) {
      var dd = dayDate(i);
      var b = tabBtn('day' + (i + 1), [
        el('span', { class: 'wd', text: '週' + wd(dd) }),
        el('span', { class: 'n', text: dd.getUTCDate() }),
        el('span', { class: 't', text: clean(d.title) })
      ], 'Day ' + (i + 1) + '，' + md(dd));
      if (ymd(dd) === now.ymd) b.classList.add('today');
      track.appendChild(b);
    });
    track.appendChild(el('span', { class: 'tab-sep', 'aria-hidden': 'true' }));
    track.appendChild(tabBtn('todo', [icon('list'), el('span', { class: 'lbl', text: '待辦' }), el('b', { class: 'badge', id: 'todo-count', hidden: true })]));
    track.appendChild(tabBtn('settings', [icon('sliders'), el('span', { class: 'lbl', text: '設定' })]));
  }

  function tabBtn(id, kids, label) {
    return el('button', { type: 'button', class: 'tab', role: 'tab', 'aria-selected': 'false', 'aria-label': label || null, dataset: { tab: id } }, kids);
  }

  function kick(n, text, extra) {
    return el('h3', { class: 'kick' }, [el('b', { text: pad2(n) }), text, extra != null ? el('small', { text: extra }) : null]);
  }

  function tag(status, key, inputClass) {
    if (status !== 'confirmed' && status !== 'pending') return null;
    var ok = status === 'confirmed';
    var label = ok ? '已確認' : '待處理';
    return el('label', { class: 'tag ' + (ok ? 'ok' : 'todo') }, [
      el('input', { type: 'checkbox', class: inputClass || null, 'aria-label': label + '（剔選）', dataset: { key: key } }),
      el('span', { class: 'box' }, [checkMark()]),
      el('span', { text: label })
    ]);
  }

  var PRIO = { high: '高・必去', mid: '中', low: '低' };
  function prioChip(p) { return PRIO[p] ? el('span', { class: 'chip ' + p }, [el('i'), PRIO[p]]) : null; }

  // 「名稱 | 網址」或者淨網址，一行一條；只接受 http(s)
  function parseLinks(text) {
    return String(text || '').split(/\n+/).map(function (line) {
      line = line.trim();
      if (!line) return null;
      var label = '', url = line;
      var bar = line.lastIndexOf('|');
      if (bar > 0) { label = line.slice(0, bar).trim(); url = line.slice(bar + 1).trim(); }
      if (!/^https?:\/\//i.test(url)) {
        if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(url)) url = 'https://' + url;
        else return null;
      }
      try {
        var u = new URL(url);
        return { url: u.href, label: label || u.hostname.replace(/^www\./, '') };
      } catch (e) { return null; }
    }).filter(Boolean);
  }

  // 備註入面嘅網址變成可以撳嘅連結
  function linkify(text) {
    var out = [], re = /https?:\/\/[^\s<>"]+/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      var label = m[0];
      try { var u = new URL(m[0]); label = u.hostname.replace(/^www\./, '') + (u.pathname.length > 1 ? '/…' : ''); } catch (e) {}
      out.push(el('a', { class: 'inline-link', href: m[0], target: '_blank', rel: 'noopener', text: label }));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  function actions(place, phone, links) {
    var ls = parseLinks(links);
    if (!place && !phone && !ls.length) return null;
    return el('div', { class: 'actions' }, [
      place ? el('a', { class: 'pill press', href: mapUrl(place), target: '_blank', rel: 'noopener' }, [icon('pin'), el('span', { text: '地圖' })]) : null,
      phone ? el('a', { class: 'pill press', href: telUrl(phone) }, [icon('phone'), el('span', { text: phone })]) : null
    ].concat(ls.map(function (l) {
      return el('a', { class: 'pill link press', href: l.url, target: '_blank', rel: 'noopener' }, [icon('link'), el('span', { text: l.label })]);
    })));
  }

  function meta(name, text) {
    return el('div', { class: 'meta' }, [icon(name), el('span', { text: text })]);
  }

  // 預約編號：撳一下複製
  function refBtn(code) {
    var b = el('button', { type: 'button', class: 'ref press', 'aria-label': '複製預約編號 ' + code }, [
      el('span', { class: 'lab', text: '預約' }),
      el('span', { class: 'code' }, [el('span', { text: code }), el('span', { class: 'done' }, [icon('check'), '已複製'])])
    ]);
    var t;
    b.addEventListener('click', function () {
      copyText(code).then(function () {
        b.classList.add('copied');
        buzz(8);
        clearTimeout(t);
        t = setTimeout(function () { b.classList.remove('copied'); }, 1600);
      }, function () { toast('複製唔到，請長按選取', 2400, 'alert'); });
    });
    return b;
  }
  function copyText(s) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(s);
    return new Promise(function (ok, fail) {
      var ta = el('textarea', { readonly: true, style: 'position:fixed;opacity:0;top:0' });
      ta.value = s;
      body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? ok() : fail(); } catch (e) { fail(); }
      ta.remove();
    });
  }

  function timeCol(t) {
    var m = /^(\d{1,2}:\d{2})\s*[–\-~〜至]\s*(\d{1,2}:\d{2})$/.exec(t || '');
    if (m) return el('div', { class: 't-time' }, [el('b', { text: m[1] }), el('small', { text: '至 ' + m[2] })]);
    if (/^\d{1,2}:\d{2}$/.test(t || '')) return el('div', { class: 't-time' }, [el('b', { text: t })]);
    return el('div', { class: 't-time' }, [t ? el('span', { class: 'word', text: t }) : null]);
  }

  // ---------- 總覽 ----------
  function renderOverview(now) {
    var t = state.trip;
    var sec = el('section', { class: 'panel', id: 'overview', role: 'tabpanel' });
    var k = 0, r = 0;
    function rise(node) { if (node) { node.classList.add('rise'); node.style.setProperty('--i', Math.min(r++, 8)); } return node; }

    sec.appendChild(kick(++k, '行程目錄'));
    sec.appendChild(el('ol', { class: 'toc' }, t.days.map(function (d, i) {
      var dd = dayDate(i);
      return rise(el('li', null, [el('a', { href: '#day' + (i + 1), class: ymd(dd) === now.ymd ? 'today' : null }, [
        el('span', { class: 'n', text: pad2(i + 1) }),
        el('span', null, [el('span', { class: 'd', text: md(dd) + ' 週' + wd(dd) }), el('span', { class: 'tt', text: clean(d.title) })]),
        el('span', { class: 'c' }, [String(d.items.length), icon('chevron')])
      ])]));
    })));

    if ((t.flights || []).length) {
      sec.appendChild(kick(++k, '機票'));
      t.flights.forEach(function (f) {
        sec.appendChild(rise(el('article', { class: 'pass' }, [
          el('div', { class: 'pass-main' }, [
            el('div', { class: 'pass-top' }, [el('span', { text: f.label + ' · ' + f.date }), tag(f.status, 'flight-' + f.code)]),
            el('div', { class: 'pass-route' }, [
              el('div', { class: 'pt' }, [el('b', { text: f.from_code || '' }), el('span', { text: f.dep })]),
              el('div', { class: 'line' }, [icon('plane')]),
              el('div', { class: 'pt' }, [el('b', { text: f.to_code || '' }), el('span', { text: f.arr })])
            ]),
            el('div', { class: 'pass-names' }, [el('span', { text: f.from }), el('span', { text: f.to })])
          ]),
          el('div', { class: 'pass-stub' }, [el('span', null, ['航班 ', el('b', { text: f.code })]), el('span', { text: f.note || '' })])
        ])));
      });
    }

    if ((t.hotels || []).length) {
      sec.appendChild(kick(++k, '住宿'));
      t.hotels.forEach(function (h, i) {
        sec.appendChild(rise(el('article', { class: 'stay' }, [
          el('div', { class: 'stay-n' }, [el('b', { text: h.nights }), el('span', { text: '晚' })]),
          el('div', null, [
            el('div', { class: 'stay-head' }, [
              el('div', null, [el('h3', { text: h.name }), el('div', { class: 'stay-dates', text: dotDate(h.checkin) + ' → ' + dotDate(h.checkout) })]),
              tag(h.status, 'hotel-' + (i + 1))
            ]),
            h.address ? meta('pin', h.address) : null,
            actions(h.name, h.phone)
          ])
        ])));
      });
    }

    if ((t.transport || []).length) {
      sec.appendChild(kick(++k, '交通票務'));
      sec.appendChild(rise(el('div', { class: 'rows' }, t.transport.map(function (x, i) {
        var ic = /巴士|bus/i.test(x.what) ? 'bus' : /suica|icoca|卡/i.test(x.what) ? 'card' : 'train';
        return el('div', { class: 'row-item' }, [
          el('span', { class: 'row-ic' }, [icon(ic)]),
          el('div', null, [
            el('div', { class: 'row-head' }, [el('b', { text: x.what })]),
            x.note ? el('div', { class: 'sub', text: x.note }) : null,
            el('div', { class: 'chips' }, [tag(x.status, 'transport-' + (i + 1)), x.ref ? refBtn(x.ref) : null])
          ])
        ]);
      }))));
    }

    sec.appendChild(kick(++k, '預訂截圖'));
    (t.photo_folders || []).forEach(function (c, i) {
      sec.appendChild(el('h4', { class: 'sub-h', text: clean(c.name) }));
      sec.appendChild(gallery(c.folder));
    });
    return sec;
  }

  // ---------- 每日 ----------
  function renderItem(item, di, ii, mark) {
    var place = item.place || item.address;
    var cls = ['item', 'rise', item.status, item.priority ? 'prio-' + item.priority : '', mark || ''].join(' ');
    return el('li', { class: cls, dataset: { id: item.id }, style: '--i:' + Math.min(ii, 8) }, [
      timeCol(item.time),
      el('div', { class: 't-rail' }, [el('span', { class: 'node' })]),
      el('article', { class: 't-card' }, [
        el('div', { class: 't-head' }, [
          el('h3', { class: 't-what', text: item.what }),
          el('div', { class: 't-tools' }, [
            iconBtn('edit', '編輯', function () { openEdit(di, ii); }),
            el('button', { type: 'button', class: 'icon-btn handle', 'aria-label': '按住拖拉排序', title: '按住拖拉排序' }, [icon('grip')])
          ])
        ]),
        el('div', { class: 'chips' }, [
          tag(item.status, item.id),
          mark === 'next' ? el('span', { class: 'chip next', text: '下一站' }) : mark === 'now' ? el('span', { class: 'chip now', text: '進行中' }) : null,
          prioChip(item.priority)
        ]),
        item.address ? meta('pin', item.address) : null,
        item.ref ? refBtn(item.ref) : null,
        item.note ? el('div', { class: 'note' }, linkify(item.note)) : null,
        actions(place, item.phone, item.links)
      ])
    ]);
  }

  function dayMarks(items, isToday, nowMin) {
    var marks = [];
    if (!isToday) return marks;
    var cur = -1, next = -1;
    items.forEach(function (it, i) {
      var k = timeKey(it.time);
      if (k == null) return;
      if (k <= nowMin) cur = i;
      else if (next < 0) next = i;
    });
    items.forEach(function (it, i) {
      if (timeKey(it.time) == null) return;
      if (i === next) marks[i] = 'next';
      else if (i === cur) marks[i] = 'now';
      else if (cur >= 0 && i < cur) marks[i] = 'past';
    });
    return marks;
  }

  function renderDay(d, i, now) {
    var dd = dayDate(i);
    var n = i + 1;
    var confirmed = d.items.filter(function (it) { return it.status === 'confirmed'; }).length;
    var pending = d.items.filter(function (it) { return it.status === 'pending'; }).length;
    var marks = dayMarks(d.items, ymd(dd) === now.ymd, now.min);
    var stats = [el('b', { text: d.items.length }), ' 個行程'];
    if (confirmed) stats.push(' · ', el('b', { text: confirmed }), ' 個已確認');
    if (pending) stats.push(' · ', el('b', { text: pending }), ' 個待處理');

    return el('section', { class: 'panel', id: 'day' + n, role: 'tabpanel' }, [
      el('header', { class: 'day-head' }, [
        el('div', { class: 'day-num' }, [el('small', { text: 'DAY' }), el('span', { text: pad2(n) })]),
        el('div', { class: 'day-info' }, [
          el('div', { class: 'day-date', text: (dd.getUTCMonth() + 1) + '月' + dd.getUTCDate() + '日 · 星期' + wd(dd) }),
          el('div', { class: 'day-title' }, [el('h2', { text: clean(d.title) }), iconBtn('edit', '編輯當日主題', function () { openDayEdit(i); })]),
          el('div', { class: 'day-stats' }, stats)
        ]),
        el('div', { class: 'seal', 'aria-hidden': 'true' }, ((KANJI[n] || String(n)) + '日目').split('').map(function (c) { return el('span', { text: c }); }))
      ]),
      d.alert ? el('p', { class: 'alert' }, [icon('alert'), el('span', { text: clean(d.alert) })]) : null,
      el('ol', { class: 'timeline', dataset: { day: i } }, d.items.map(function (it, ii) { return renderItem(it, i, ii, marks[ii]); })),
      el('button', { type: 'button', class: 'add press', onclick: function () { openEdit(i, -1); } }, [icon('plus'), '新增行程']),
      kick(1, '相片・文件', String(photosIn('day' + n).length || '')),
      gallery('day' + n)
    ]);
  }

  // ---------- 待辦 ----------
  function renderTodo() {
    var list = [];
    state.trip.days.forEach(function (d, di) {
      d.items.forEach(function (it, ii) { if (it.status === 'pending') list.push({ it: it, di: di, ii: ii }); });
    });
    return el('section', { class: 'panel', id: 'todo', role: 'tabpanel' }, [
      el('div', { class: 'todo-hero' }, [el('b', { id: 'todo-big', text: list.length }), el('span', { text: '項待處理' })]),
      el('p', { class: 'fine', text: '標咗「待處理」嘅行程會自動列喺度；喺度剔咗，當日行程都會一齊剔（只存喺呢部手機）。' }),
      list.length ? el('ul', { class: 'todo-list' }, list.map(function (x, i) {
        var li = el('li', { class: 'rise', style: '--i:' + i }, [
          tag('pending', x.it.id, 'todo-box'),
          el('div', { class: 'todo-text' }, [
            el('small', { text: 'Day ' + (x.di + 1) + (x.it.time ? ' · ' + x.it.time : '') }),
            el('b', { text: x.it.what })
          ]),
          el('div', { class: 'todo-tools' }, [
            iconBtn('edit', '編輯', function () { openEdit(x.di, x.ii); }),
            el('a', { class: 'icon-btn press', href: '#day' + (x.di + 1), 'aria-label': '去 Day ' + (x.di + 1) }, [icon('chevron')])
          ])
        ]);
        return li;
      })) : el('div', { class: 'done-state' }, [el('div', { class: 'stamp', text: '完了' }), el('p', { text: '冇待處理事項，全部搞掂。' })])
    ]);
  }

  // ---------- 設定 ----------
  function renderSettings() {
    var connected = !!state.token;
    var draft = lsGet(LS.draft);
    var tokenInput = el('input', { type: 'password', placeholder: 'github_pat_…', value: state.token, autocomplete: 'off', spellcheck: 'false' });
    var branchInput = el('input', { value: state.branch, spellcheck: 'false', autocapitalize: 'off' });

    return el('section', { class: 'panel', id: 'settings', role: 'tabpanel' }, [
      el('div', { class: 'page-head' }, [el('h2', { text: '設定' }), el('p', { text: '連接 GitHub 之後，喺手機改嘅行程同上載嘅相片會同步去電腦。' })]),
      kick(1, '同步'),
      el('div', { class: 'card rise', style: '--i:0' }, [
        el('div', { class: 'card-title' }, [icon(connected ? 'cloud' : 'device'), connected ? '已連接 GitHub' : '未連接 GitHub']),
        el('p', { text: connected
          ? '修改行程同上載相片會直接儲存到 GitHub。'
          : '而家修改只會存喺呢部手機，亦唔可以上載相片。' }),
        el('label', { class: 'fld' }, ['GitHub Token', tokenInput]),
        el('label', { class: 'fld' }, ['Branch', branchInput]),
        el('div', { class: 'actions' }, [
          el('button', { type: 'button', class: 'solid press', text: '儲存並連接', onclick: function () {
            // 清走複製時夾帶嘅空格、換行或者全形字元
            state.token = tokenInput.value.replace(/[^\x21-\x7e]/g, '');
            tokenInput.value = state.token;
            state.branch = branchInput.value.trim() || body.dataset.branch || 'main';
            lsSet(LS.branch, state.branch === body.dataset.branch ? null : state.branch);
            if (!state.token) { lsSet(LS.token, null); toast('已中斷連接', 2200, 'device'); boot(); return; }
            toast('連接緊…', 10000, 'sync');
            api('GET', '').then(function (r) {
              if (!r.permissions || !r.permissions.push) throw new Error(API_ERR[403]);
              lsSet(LS.token, state.token);
              toast('連接成功', 2400, 'check');
              boot();
            }).catch(function (e) {
              state.token = lsGet(LS.token) || '';
              toast('連接失敗：' + e.message, 7000, 'alert');
            });
          } }),
          connected ? el('button', { type: 'button', class: 'ghost press', text: '中斷連接', onclick: function () {
            state.token = '';
            lsSet(LS.token, null);
            toast('已中斷連接', 2200, 'device');
            boot();
          } }) : null
        ])
      ]),

      draft ? el('div', { class: 'card warn rise', style: '--i:1' }, [
        el('div', { class: 'card-title' }, [icon('device'), '呢部手機有未上載嘅修改']),
        el('div', { class: 'actions' }, [
          connected ? el('button', { type: 'button', class: 'solid press', text: '上載到 GitHub', onclick: function () {
            if (!confirm('用呢部手機嘅版本覆蓋 GitHub 上面嘅行程？')) return;
            state.trip = JSON.parse(draft);
            saveTrip('上載手機本機修改').then(function (ok) { if (ok) { lsSet(LS.draft, null); render(); } });
          } }) : null,
          el('button', { type: 'button', class: 'ghost danger press', text: '刪除本機修改', onclick: function () {
            if (!confirm('刪除呢部手機嘅修改，還原做網站版本？')) return;
            lsSet(LS.draft, null);
            boot();
          } })
        ])
      ]) : null,

      kick(2, '點樣攞 Token'),
      el('ol', { class: 'steps' }, [
        el('li', null, ['打開 ', el('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener', text: 'GitHub → 新增 Fine-grained token' })]),
        el('li', { text: 'Token name 隨便填；Expiration 揀旅行完之後嘅日子' }),
        el('li', { text: 'Repository access 揀「Only select repositories」→ ' + state.repo }),
        el('li', { text: 'Repository permissions → Contents 揀「Read and write」' }),
        el('li', { text: 'Generate token，複製 github_pat_ 開頭嗰串字，貼落上面' })
      ]),
      el('p', { class: 'fine', text: 'Token 只會儲存喺呢部裝置嘅瀏覽器。唔見咗手機可以喺 GitHub 刪除個 token。' })
    ]);
  }

  // ================= 相片 =================
  function photosIn(folder) {
    var prefix = 'photos/' + folder + '/';
    return state.photos.filter(function (p) { return p.path.indexOf(prefix) === 0 && p.path.indexOf('/', prefix.length) < 0; })
      .sort(function (a, b) { return a.path.localeCompare(b.path); });
  }

  function gallery(folder) {
    var prefix = 'photos/' + folder + '/';
    var files = photosIn(folder);
    var wrap = el('div', { class: 'gallery-wrap' });
    if (files.length) {
      wrap.appendChild(el('div', { class: 'gallery' }, files.map(function (p) {
        var name = p.path.slice(prefix.length).replace(/\.[^.]+$/, '').replace(/^[:：\s]+/, '');
        var thumb;
        if (PDF_EXT.test(p.path)) {
          thumb = el('a', { class: 'thumb pdf press', href: p.url, target: '_blank', rel: 'noopener' }, [
            el('span', { class: 'ph' }, [icon('file'), el('em', { text: 'PDF' })]),
            el('span', { class: 'cap', text: name })
          ]);
        } else {
          var img = el('img', { src: p.url, loading: 'lazy', decoding: 'async', alt: name, 'data-loading': '' });
          img.addEventListener('load', function () { img.removeAttribute('data-loading'); });
          img.addEventListener('error', function () { img.removeAttribute('data-loading'); });
          thumb = el('button', { type: 'button', class: 'thumb press', onclick: function () { openViewer(p, name, img); } }, [
            el('span', { class: 'ph' }, [img]),
            el('span', { class: 'cap', text: name })
          ]);
        }
        return el('div', { class: 'tile' }, [
          thumb,
          state.token && p.sha ? el('button', { type: 'button', class: 'tile-del press', 'aria-label': '刪除 ' + name, onclick: function () { deletePhoto(p, name); } }, [icon('trash')]) : null
        ]);
      })));
    } else {
      wrap.appendChild(el('p', { class: 'empty', text: '未有相片' }));
    }
    wrap.appendChild(el('button', { type: 'button', class: 'upload press', onclick: function () { pickFiles(folder); } }, [icon('upload'), '上載相片 / PDF']));
    return wrap;
  }

  var uploadFolder = null;
  var fileInput = document.getElementById('file-input');
  function pickFiles(folder) {
    if (!state.token) {
      toast('要先喺「設定」連接 GitHub 先可以上載相片', 4000, 'alert');
      show('settings');
      return;
    }
    uploadFolder = folder;
    fileInput.value = '';
    fileInput.click();
  }

  fileInput.addEventListener('change', function () {
    var files = Array.prototype.slice.call(fileInput.files || []);
    if (!files.length || !uploadFolder) return;
    var folder = uploadFolder;
    var single = files.length === 1;
    var chain = Promise.resolve();
    var done = 0;
    files.forEach(function (f, idx) {
      chain = chain.then(function () {
        toast('上載中 ' + (idx + 1) + ' / ' + files.length, 60000, 'upload');
        return prepareFile(f).then(function (prep) {
          var base = prep.base;
          if (single) {
            var n = prompt('相片名稱（會顯示喺相下面）', base);
            if (n === null) return null;
            base = n.trim().replace(/[\\/:*?"<>|#%]/g, '_') || base;
          }
          var path = uniquePath('photos/' + folder + '/', base, prep.ext);
          return api('PUT', 'contents/' + encPath(path), {
            message: '手機上載相片 ' + path,
            content: prep.b64,
            branch: state.branch
          }).then(function (res) {
            state.photos.push({ path: path, sha: res.content.sha, url: rawUrl(path) });
            done++;
          });
        });
      });
    });
    chain.then(function () {
      toast(done ? '已上載 ' + done + ' 個檔案' : '已取消', 2400, done ? 'check' : null);
      render();
    }).catch(function (e) {
      toast('上載失敗：' + e.message, 5000, 'alert');
      render();
    });
  });

  function uniquePath(prefix, base, ext) {
    var taken = {};
    state.photos.forEach(function (p) { taken[p.path.toLowerCase()] = 1; });
    var path = prefix + base + ext, n = 2;
    while (taken[path.toLowerCase()]) path = prefix + base + '-' + (n++) + ext;
    return path;
  }

  // 相片壓縮到最長 2000px JPEG，PDF / GIF 原檔上載
  function prepareFile(file) {
    var base = (file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
    var origExt = ((file.name || '').match(/\.[^.]+$/) || [''])[0].toLowerCase();
    function raw() {
      return file.arrayBuffer().then(function (buf) {
        return { base: base, ext: origExt || (file.type === 'application/pdf' ? '.pdf' : '.jpg'), b64: bytesToB64(new Uint8Array(buf)) };
      });
    }
    if (!/^image\//.test(file.type) || file.type === 'image/gif') return raw();
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 2000;
        var scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (blob) {
          if (!blob) { resolve(raw()); return; }
          blob.arrayBuffer().then(function (buf) {
            resolve({ base: base, ext: '.jpg', b64: bytesToB64(new Uint8Array(buf)) });
          });
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(raw()); };
      img.src = url;
    });
  }

  function deletePhoto(p, name) {
    if (!confirm('確定刪除「' + name + '」？')) return;
    api('DELETE', 'contents/' + encPath(p.path), { message: '手機刪除相片 ' + p.path, sha: p.sha, branch: state.branch })
      .then(function () {
        state.photos = state.photos.filter(function (x) { return x !== p; });
        closeViewer(true);
        render();
        toast('已刪除', 2200, 'trash');
      }).catch(function (e) { toast('刪除失敗：' + e.message, 4000, 'alert'); });
  }

  // ================= 相片檢視（由縮圖放大） =================
  var viewer = document.getElementById('viewer');
  var vBg = viewer.querySelector('.viewer-bg');
  var vImg = viewer.querySelector('img');
  var vCap = viewer.querySelector('.caption');
  var vDel = document.getElementById('photo-delete');
  var viewing = null;

  function flipFrom(fromEl, toEl) {
    var a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    if (!a.width || !b.width) return null;
    var s = Math.max(a.width / b.width, a.height / b.height);
    return 'translate(' + ((a.left + a.width / 2) - (b.left + b.width / 2)) + 'px,' + ((a.top + a.height / 2) - (b.top + b.height / 2)) + 'px) scale(' + s + ')';
  }
  function visible(n) {
    if (!n || !n.isConnected) return false;
    var r = n.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
  }

  function openViewer(p, name, srcImg) {
    viewing = { p: p, src: srcImg };
    vCap.textContent = name;
    vDel.hidden = !(state.token && p.sha);
    vImg.style.transform = '';
    vImg.style.opacity = '';
    vImg.src = p.url;
    viewer.hidden = false;
    body.classList.add('noscroll');
    void viewer.offsetWidth;
    viewer.setAttribute('data-open', '');
    function go() {
      if (REDUCED) { vImg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 }); return; }
      var from = visible(srcImg) && flipFrom(srcImg, vImg);
      if (from) vImg.animate([{ transform: from, opacity: .5, borderRadius: '20px' }, { transform: 'none', opacity: 1, borderRadius: '6px' }], { duration: 440, easing: EASE_DRAWER });
      else vImg.animate([{ transform: 'scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: EASE_OUT });
    }
    if (vImg.complete && vImg.naturalWidth) go();
    else {
      vImg.style.opacity = '0';
      vImg.onload = function () { vImg.onload = null; vImg.style.opacity = ''; go(); };
    }
  }

  function closeViewer(instant) {
    if (viewer.hidden) return;
    var v = viewing;
    viewer.removeAttribute('data-open');
    function end() {
      viewer.hidden = true;
      vImg.removeAttribute('src');
      vImg.style.transform = '';
      vImg.style.opacity = '';
      vBg.style.opacity = '';
      viewing = null;
      if (!anySheetOpen()) body.classList.remove('noscroll');
    }
    if (instant || REDUCED) { end(); return; }
    var current = vImg.style.transform || 'none';
    var to = v && visible(v.src) && (vImg.style.transform = '', flipFrom(v.src, vImg));
    vImg.style.transform = current === 'none' ? '' : current;
    var anim = to
      ? vImg.animate([{ transform: current, opacity: 1 }, { transform: to, opacity: .3 }], { duration: 300, easing: EASE_OUT, fill: 'forwards' })
      : vImg.animate([{ transform: current, opacity: 1 }, { transform: current + ' scale(.94)', opacity: 0 }], { duration: 200, easing: EASE_OUT, fill: 'forwards' });
    vBg.style.opacity = '';
    anim.onfinish = function () { anim.cancel(); end(); };
  }

  viewer.addEventListener('click', function (e) {
    if (vDrag && vDrag.moved) return;
    if (e.target === vImg || e.target.closest('#photo-delete')) return;
    if (e.target.closest('[data-close]') || e.target === viewer || e.target === vBg) closeViewer();
  });
  vDel.addEventListener('click', function () { if (viewing) deletePhoto(viewing.p, vCap.textContent); });

  // 向下掃走相片
  var vDrag = null;
  vImg.addEventListener('pointerdown', function (e) {
    if (vDrag) return;
    vDrag = { y0: e.clientY, x0: e.clientX, id: e.pointerId, samples: [{ y: e.clientY, t: e.timeStamp }], moved: false };
    try { vImg.setPointerCapture(e.pointerId); } catch (err) {}
  });
  vImg.addEventListener('pointermove', function (e) {
    if (!vDrag || e.pointerId !== vDrag.id) return;
    var dy = e.clientY - vDrag.y0, dx = e.clientX - vDrag.x0;
    if (!vDrag.moved && Math.abs(dy) < 8) return;
    vDrag.moved = true;
    vDrag.dy = dy;
    pushSample(vDrag.samples, e.clientY, e.timeStamp);
    var down = Math.max(0, dy);
    var s = 1 - Math.min(down, 400) / 1600;
    vImg.style.transform = 'translate(' + dx * .4 + 'px,' + (dy < 0 ? -rubber(-dy, 400) : dy) + 'px) scale(' + s + ')';
    vBg.style.opacity = String(.94 * (1 - Math.min(down, 360) / 480));
  });
  function endVDrag(e) {
    if (!vDrag || e.pointerId !== vDrag.id) return;
    var d = vDrag;
    setTimeout(function () { vDrag = null; }, 0);
    if (!d.moved) return;
    var v = velocity(d.samples);
    if (d.dy > 110 || v > 0.11) { closeViewer(); return; }
    var cur = vImg.style.transform;
    vImg.style.transform = '';
    vBg.style.opacity = '';
    if (!REDUCED) vImg.animate([{ transform: cur }, { transform: 'none' }], { duration: 380, easing: EASE_DRAWER });
  }
  vImg.addEventListener('pointerup', endVDrag);
  vImg.addEventListener('pointercancel', endVDrag);

  // ================= 物理小工具 =================
  function rubber(over, dim) { var c = 0.55; return (over * dim * c) / (dim + c * over); }
  function pushSample(arr, y, t) { arr.push({ y: y, t: t }); while (arr.length > 2 && t - arr[0].t > 100) arr.shift(); }
  function velocity(arr) {
    if (arr.length < 2) return 0;
    var a = arr[0], b = arr[arr.length - 1];
    return b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0;
  }

  // ================= 底部表格（可以拉落嚟關） =================
  var sheetTimers = new WeakMap();
  function anySheetOpen() { return !!document.querySelector('.sheet:not([hidden])'); }

  function openSheet(s) {
    clearTimeout(sheetTimers.get(s));
    s.removeAttribute('data-closing');
    var b = s.querySelector('.sheet-body');
    b.style.transform = '';
    s.querySelector('.sheet-scrim').style.opacity = '';
    s.hidden = false;
    body.classList.add('noscroll');
    void s.offsetWidth;
    s.setAttribute('data-open', '');
    var sc = s.querySelector('.sheet-scroll');
    if (sc) sc.scrollTop = 0;
  }

  function closeSheet(s) {
    if (s.hidden || !s.hasAttribute('data-open')) return;
    var b = s.querySelector('.sheet-body');
    s.setAttribute('data-closing', '');
    s.removeAttribute('data-open');
    b.style.transform = '';
    s.querySelector('.sheet-scrim').style.opacity = '';
    sheetTimers.set(s, setTimeout(function () {
      s.hidden = true;
      s.removeAttribute('data-closing');
      if (!anySheetOpen() && viewer.hidden) body.classList.remove('noscroll');
    }, REDUCED ? 0 : 300));
  }
  function closeSheets() {
    document.querySelectorAll('.sheet[data-open]').forEach(closeSheet);
    editing = null;
    editingDay = null;
  }

  document.querySelectorAll('.sheet').forEach(function (s) {
    s.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheets(); });
    var b = s.querySelector('.sheet-body');
    var scrim = s.querySelector('.sheet-scrim');
    var sd = null;
    b.addEventListener('pointerdown', function (e) {
      if (!e.target.closest('.sheet-grab, .sheet-head') || e.target.closest('button') || sd) return;
      if (window.matchMedia('(min-width: 720px)').matches) return;
      sd = { y0: e.clientY, id: e.pointerId, h: b.offsetHeight, samples: [{ y: e.clientY, t: e.timeStamp }], dy: 0 };
      b.style.transition = 'none';
      try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    });
    b.addEventListener('pointermove', function (e) {
      if (!sd || e.pointerId !== sd.id) return;
      var dy = e.clientY - sd.y0;
      sd.dy = dy;
      pushSample(sd.samples, e.clientY, e.timeStamp);
      b.style.transform = 'translateY(' + (dy < 0 ? -rubber(-dy, sd.h) : dy) + 'px)';
      scrim.style.opacity = String(1 - Math.max(0, dy) / sd.h);
    });
    function up(e) {
      if (!sd || e.pointerId !== sd.id) return;
      var d = sd;
      sd = null;
      b.style.transition = '';
      if (d.dy > d.h * 0.28 || velocity(d.samples) > 0.11) { closeSheets(); return; }
      b.style.transform = '';
      scrim.style.opacity = '';
    }
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
  });

  // ================= 編輯行程 =================
  var sheet = document.getElementById('sheet');
  var form = document.getElementById('edit-form');
  var editing = null; // {di, ii}
  var FIELDS = ['time', 'what', 'status', 'priority', 'address', 'place', 'phone', 'ref', 'note', 'links'];

  function openEdit(di, ii) {
    editing = { di: di, ii: ii };
    var item = ii >= 0 ? state.trip.days[di].items[ii] : {};
    document.getElementById('edit-title').textContent = ii >= 0 ? '編輯行程' : '新增行程 · Day ' + (di + 1);
    var daySel = form.elements.day;
    daySel.textContent = '';
    state.trip.days.forEach(function (d, i) {
      daySel.appendChild(el('option', { value: i, text: 'Day ' + (i + 1) + ' · ' + md(dayDate(i)) }));
    });
    daySel.value = di;
    FIELDS.forEach(function (f) { form.elements[f].value = item[f] || ''; });
    document.getElementById('edit-delete').hidden = ii < 0;
    form.querySelectorAll('[data-move]').forEach(function (b) { b.disabled = ii < 0; });
    openSheet(sheet);
  }

  function insertByTime(items, item) {
    var k = timeKey(item.time);
    if (k == null) { items.push(item); return; }
    for (var i = 0; i < items.length; i++) {
      var ki = timeKey(items[i].time);
      if (ki != null && ki > k) { items.splice(i, 0, item); return; }
    }
    items.push(item);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!editing) return;
    var days = state.trip.days;
    var old = editing.ii >= 0 ? days[editing.di].items[editing.ii] : null;
    var item = { id: old ? old.id : newId() };
    FIELDS.forEach(function (f) { item[f] = String(form.elements[f].value || '').trim(); });
    var target = +form.elements.day.value;
    var fromDi = editing.di;
    if (old && target === editing.di) {
      days[editing.di].items[editing.ii] = item;
    } else {
      if (old) days[editing.di].items.splice(editing.ii, 1);
      insertByTime(days[target].items, item);
    }
    closeSheets();
    render();
    if (target !== fromDi) show('day' + (target + 1));
    markLanded(target, item.id);
    saveTrip((old ? '修改' : '新增') + '行程：Day ' + (target + 1) + ' ' + item.what);
  });

  form.querySelectorAll('[data-move]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!editing || editing.ii < 0) return;
      var items = state.trip.days[editing.di].items;
      var to = editing.ii + (+b.dataset.move);
      if (to < 0 || to >= items.length) { toast('已經係' + (to < 0 ? '第一' : '最後') + '項', 1800); return; }
      var tmp = items[to]; items[to] = items[editing.ii]; items[editing.ii] = tmp;
      editing.ii = to;
      render();
      markLanded(editing.di, items[to].id);
      saveTrip('調整 Day ' + (editing.di + 1) + ' 行程次序');
    });
  });

  document.getElementById('edit-delete').addEventListener('click', function () {
    if (!editing || editing.ii < 0) return;
    var items = state.trip.days[editing.di].items;
    var it = items[editing.ii];
    if (!confirm('確定刪除「' + it.what + '」？')) return;
    items.splice(editing.ii, 1);
    var di = editing.di;
    closeSheets();
    render();
    saveTrip('刪除行程：Day ' + (di + 1) + ' ' + it.what);
  });

  // 當日主題 / 提示
  var daySheet = document.getElementById('day-sheet');
  var dayForm = document.getElementById('day-form');
  var editingDay = null;
  function openDayEdit(i) {
    editingDay = i;
    dayForm.elements.title.value = state.trip.days[i].title || '';
    dayForm.elements.alert.value = state.trip.days[i].alert || '';
    openSheet(daySheet);
  }
  dayForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (editingDay == null) return;
    var d = state.trip.days[editingDay];
    d.title = dayForm.elements.title.value.trim();
    d.alert = dayForm.elements.alert.value.trim();
    var i = editingDay;
    closeSheets();
    render();
    saveTrip('修改 Day ' + (i + 1) + ' 主題');
  });

  function markLanded(di, id) {
    if (REDUCED) return;
    var n = document.querySelector('#day' + (di + 1) + ' .item[data-id="' + id + '"]');
    if (n) n.classList.add('landed');
  }

  // ================= 分頁 =================
  function placeIndicator(btn, instant) {
    var ind = document.querySelector('.tab-ind');
    if (!ind || !btn) return;
    if (instant) ind.style.transition = 'none';
    ind.style.width = btn.offsetWidth + 'px';
    ind.style.height = btn.offsetHeight + 'px';
    ind.style.transform = 'translate(' + btn.offsetLeft + 'px,' + btn.offsetTop + 'px)';
    if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
  }

  function show(id, silent, instant) {
    var track = document.getElementById('tabs');
    var btn = track.querySelector('[data-tab="' + id + '"]');
    var panel = document.getElementById(id);
    if (!btn || !panel) return false;
    track.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('aria-selected', b === btn ? 'true' : 'false'); });
    placeIndicator(btn, instant || silent);
    if (track.scrollWidth > track.clientWidth + 2) {
      var left = btn.offsetLeft - (track.clientWidth - btn.offsetWidth) / 2;
      track.scrollTo({ left: left, behavior: silent || REDUCED ? 'auto' : 'smooth' });
    }
    document.querySelectorAll('.panel').forEach(function (p) {
      var on = p === panel;
      p.classList.toggle('active', on);
      if (on && !silent) {
        p.classList.remove('enter');
        void p.offsetWidth;
        p.classList.add('enter');
      }
    });
    var changed = state.tab !== id;
    state.tab = id;
    lsSet(LS.tab, id);
    if (!silent && changed) {
      if (isWide()) window.scrollTo(0, 0);
      else {
        var heroH = document.querySelector('.hero').offsetHeight;
        if (window.scrollY > heroH) window.scrollTo(0, heroH);
      }
    }
    return true;
  }

  function pickStartTab() {
    var hash = location.hash.slice(1);
    if (hash && document.getElementById(hash)) return hash;
    var today = document.querySelector('#tabs .tab.today');
    if (today) return today.dataset.tab;
    var saved = lsGet(LS.tab);
    if (saved && document.getElementById(saved)) return saved;
    return 'overview';
  }

  document.getElementById('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (!b) return;
    show(b.dataset.tab);
    history.replaceState(null, '', '#' + b.dataset.tab);
  });
  document.getElementById('sync').addEventListener('click', function () { show('settings'); });
  window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });
  var rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () { placeIndicator(document.querySelector('.tab[aria-selected="true"]'), true); }, 60);
  });

  // ================= 剔選框 =================
  function refreshChecks() {
    document.querySelectorAll('input[type=checkbox][data-key]').forEach(function (b) {
      b.checked = !!state.checks[b.dataset.key];
      var box = b.closest('.item, .todo-list li');
      if (box) box.classList.toggle('checked', b.checked);
    });
    var left = 0;
    document.querySelectorAll('.todo-box').forEach(function (b) { if (!b.checked) left++; });
    var badge = document.getElementById('todo-count');
    if (badge) { badge.textContent = left || ''; badge.hidden = !left; }
    var big = document.getElementById('todo-big');
    if (big) big.textContent = left;
    return left;
  }

  document.getElementById('main').addEventListener('change', function (e) {
    var b = e.target;
    if (!b.matches || !b.matches('input[type=checkbox][data-key]')) return;
    if (b.checked) state.checks[b.dataset.key] = 1; else delete state.checks[b.dataset.key];
    lsSet(LS.checks, JSON.stringify(state.checks));
    var before = document.querySelectorAll('.todo-box:not(:checked)').length;
    var left = refreshChecks();
    tickFx(b);
    if (b.checked && b.closest('.tag.todo') && left === 0 && document.querySelectorAll('.todo-box').length && before !== left) {
      toast('所有待辦已完成', 2600, 'check');
    }
  });

  // 剔選：標籤輕輕彈一下；完成待辦會有少少慶祝
  function tickFx(box) {
    var label = box.closest('.tag');
    if (REDUCED || !label) return;
    label.animate([{ transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duration: 300, easing: EASE_OUT });
    if (!box.checked) return;
    buzz(10);
    if (!label.classList.contains('todo')) return;
    var r = label.querySelector('.box').getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var colors = ['var(--shu)', 'var(--yama)', 'var(--matcha)'];
    for (var i = 0; i < 9; i++) {
      var p = el('span', { class: 'spark' });
      p.style.background = colors[i % 3];
      p.style.left = (cx - 3) + 'px';
      p.style.top = (cy - 3) + 'px';
      body.appendChild(p);
      var ang = (Math.PI * 2 * i) / 9 + Math.random() * .5;
      var dist = 18 + Math.random() * 14;
      p.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + Math.cos(ang) * dist + 'px,' + Math.sin(ang) * dist + 'px) scale(.3)', opacity: 0 }
      ], { duration: 520 + Math.random() * 120, easing: EASE_OUT }).onfinish = (function (n) { return function () { n.remove(); }; })(p);
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeViewer(); closeSheets(); }
  });

  // ================= 拖拉排序 =================
  var drag = null;
  document.getElementById('main').addEventListener('pointerdown', function (e) {
    var h = e.target.closest('.handle');
    if (!h || drag) return;
    var li = h.closest('.item');
    var list = li.parentNode;
    e.preventDefault();
    var r = li.getBoundingClientRect();
    var ph = el('li', { class: 'item placeholder' });
    ph.style.height = r.height + 'px';
    list.insertBefore(ph, li);
    li.classList.add('dragging');
    li.style.width = r.width + 'px';
    li.style.left = r.left + 'px';
    li.style.top = r.top + 'px';
    body.classList.add('is-dragging');
    drag = { li: li, list: list, ph: ph, offset: e.clientY - r.top, y: e.clientY, before: order(list), id: e.pointerId };
    try { h.setPointerCapture(e.pointerId); } catch (err) {}
    buzz(12);
    requestAnimationFrame(autoScroll);
  });

  function order(list) {
    return Array.prototype.map.call(list.querySelectorAll(':scope > .item[data-id]'), function (n) { return n.dataset.id; }).join(',');
  }

  function siblings() {
    return Array.prototype.filter.call(drag.list.children, function (n) { return n !== drag.li && n !== drag.ph; });
  }

  // 用 layout 位置（offsetTop）判斷，唔受讓位動畫影響
  function placeAt(y) {
    var sibs = siblings();
    var ly = y - drag.list.getBoundingClientRect().top;
    var target = null;
    for (var i = 0; i < sibs.length; i++) {
      if (ly < sibs[i].offsetTop + sibs[i].offsetHeight / 2) { target = sibs[i]; break; }
    }
    var cur = drag.ph.nextSibling === drag.li ? drag.li.nextSibling : drag.ph.nextSibling;
    if (cur === target) return;
    // FLIP：其他卡片順滑讓位
    var first = sibs.map(function (n) { return n.getBoundingClientRect().top; });
    if (target) drag.list.insertBefore(drag.ph, target); else drag.list.appendChild(drag.ph);
    buzz(4);
    if (REDUCED) return;
    sibs.forEach(function (n, k) {
      n.getAnimations().forEach(function (a) { a.cancel(); });
      var dy = first[k] - n.getBoundingClientRect().top;
      if (!dy) return;
      n.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 220, easing: EASE_OUT });
    });
  }

  function autoScroll() {
    if (!drag) return;
    var edge = 90, v = 0;
    if (drag.y < edge + 70) v = -Math.ceil((edge + 70 - drag.y) / 7);
    else if (drag.y > innerHeight - edge) v = Math.ceil((drag.y - innerHeight + edge) / 7);
    if (v) { window.scrollBy(0, v); placeAt(drag.y); }
    requestAnimationFrame(autoScroll);
  }

  document.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    drag.y = e.clientY;
    drag.li.style.top = (e.clientY - drag.offset) + 'px';
    placeAt(e.clientY);
  }, { passive: false });

  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag;
    drag = null;
    body.classList.remove('is-dragging');
    var pr = d.ph.getBoundingClientRect();
    function finish() {
      d.li.classList.remove('dragging', 'dropping');
      d.li.style.width = d.li.style.left = d.li.style.top = '';
      d.list.insertBefore(d.li, d.ph);
      d.ph.remove();
      if (order(d.list) === d.before) return;
      var di = +d.list.dataset.day;
      var byId = {};
      state.trip.days[di].items.forEach(function (it) { byId[it.id] = it; });
      state.trip.days[di].items = order(d.list).split(',').map(function (id) { return byId[id]; });
      render();
      markLanded(di, d.li.dataset.id);
      saveTrip('拖拉調整 Day ' + (di + 1) + ' 行程次序');
    }
    if (REDUCED) { finish(); return; }
    d.li.classList.add('dropping');
    d.li.style.left = pr.left + 'px';
    d.li.style.top = pr.top + 'px';
    setTimeout(finish, 230);
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  // ================= 啟動 =================
  document.querySelectorAll('[data-icon]').forEach(function (n) { n.insertBefore(icon(n.dataset.icon), n.firstChild); });

  function boot() {
    return Promise.all([loadTrip(), loadPhotos()]).then(render).catch(function (e) {
      document.getElementById('main').textContent = '載入失敗：' + e.message;
    });
  }
  boot();
})();

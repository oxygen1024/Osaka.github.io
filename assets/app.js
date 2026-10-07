(function () {
  'use strict';

  // ================= 設定 =================
  var body = document.body;
  var LS = {
    token: 'kansai-token',
    branch: 'kansai-branch',
    draft: 'kansai-trip-draft',
    checks: 'kansai-checks',
    tab: 'kansai-tab',
    tripCache: 'kansai-trip-cache',
    photoCache: 'kansai-photo-cache'
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
    route: '<circle cx="6" cy="18.5" r="2.2"/><circle cx="18" cy="5.5" r="2.2"/><path d="M8.2 18.5H15a3.2 3.2 0 0 0 0-6.4H9a3.2 3.2 0 0 1 0-6.4h6.8"/>',
    nav: '<path d="M4.5 11.2L19.5 4.5l-6.7 15-1.9-6.4z"/>',
    yen: '<path d="M6.5 4l5.5 7.5L17.5 4M12 11.5V20M8 13h8M8 16.3h8"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
    offline: '<path d="M3.5 3.5l17 17"/><path d="M8.6 16.2a4.8 4.8 0 0 1 6.8 0M5.2 12.8a9.6 9.6 0 0 1 3.9-2.4M14.9 10.4a9.6 9.6 0 0 1 3.9 2.4M2 9.3a14.5 14.5 0 0 1 4-2.6M10.8 5a14.5 14.5 0 0 1 11.2 4.3"/><path d="M12 20h.01"/>',
    umbrella: '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6.3a2 2 0 0 1-4 0M12 3v.6"/>',
    wsun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    wpart: '<path d="M8.5 2.8v1.4M3 8.3h1.4M4.6 4.4l1 1M12.4 4.4l-1 1"/><path d="M5.6 10.4A3.4 3.4 0 0 1 11.6 6.9"/><path d="M9 20.5a3.6 3.6 0 0 1-.5-7.2 5 5 0 0 1 9.6 1.4 2.9 2.9 0 0 1-.4 5.8z"/>',
    wcloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.6 1.6 3.7 3.7 0 0 1-.5 7.4z"/>',
    wrain: '<path d="M7 15a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.6 1.6 3.7 3.7 0 0 1-.5 7.4z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
    wsnow: '<path d="M7 15a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.6 1.6 3.7 3.7 0 0 1-.5 7.4z"/><path d="M8 19h.01M12 20.5h.01M16 19h.01"/>',
    wstorm: '<path d="M7 15a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.6 1.6 3.7 3.7 0 0 1-.5 7.4z"/><path d="M12.8 15.5l-2.3 3.5h3l-2.3 3.5"/>',
    wfog: '<path d="M7 12a4.5 4.5 0 0 1 .4-6 6 6 0 0 1 10.6 2"/><path d="M4 15h16M6 18.5h12"/>',
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

  function readJSON(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  function cacheTrip() { lsSet(LS.tripCache, JSON.stringify({ sha: state.sha, trip: state.trip })); }
  // Google Maps 路線（大眾運輸）；冇起點就由你而家位置出發
  function dirUrl(from, to) {
    return 'https://www.google.com/maps/dir/?api=1' + (from ? '&origin=' + encodeURIComponent(from) : '') +
      '&destination=' + encodeURIComponent(to) + '&travelmode=transit';
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
      var err = new Error(navigator.onLine === false ? '離線中' : '連唔到 GitHub（檢查網絡；如果 token 係複製落嚟，試吓重新貼過）');
      err.status = 0;
      throw err;
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
        cacheTrip();
        setSync('ok');
      }).catch(function (e) {
        // 離線：用返上次同步落嚟嘅版本（連埋未上載嘅修改）
        var c = readJSON(LS.tripCache);
        var draft = lsGet(LS.draft);
        if (c && c.trip) {
          state.trip = c.trip;
          state.sha = c.sha;
          if (draft) try { state.trip = JSON.parse(draft); } catch (x) {}
          state.source = 'cache';
          setSync(navigator.onLine === false ? 'offline' : 'error');
          toast(navigator.onLine === false ? '離線中，顯示上次同步嘅版本' : '連接 GitHub 失敗（' + e.message + '），顯示上次同步嘅版本', 3500, navigator.onLine === false ? 'offline' : 'alert');
          return;
        }
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
        lsSet(LS.photoCache, JSON.stringify(state.photos));
      }).catch(function () {
        var c = readJSON(LS.photoCache);
        if (c && c.length) { state.photos = c; return; }
        return loadSitePhotos();
      });
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
        lsSet(LS.draft, null);
        cacheTrip();
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
        if (navigator.onLine === false || e.status === 0) {
          setSync('offline');
          toast('離線中，已存喺手機，有網會自動上載', 3200, 'offline');
        } else toast('同步失敗（' + e.message + '），已先存喺本機', 5000, 'alert');
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
      local: ['device', '本機'],
      offline: ['offline', '離線']
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
    main.appendChild(renderMoney());
    main.appendChild(renderSettings());
    refreshChecks();
    refreshFlights();
    fillWeather();
    paintOffline();
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
    track.appendChild(tabBtn('money', [icon('yen'), el('span', { class: 'lbl', text: '記帳' })]));
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
      place ? el('a', { class: 'pill press', href: dirUrl('', place), target: '_blank', rel: 'noopener', 'aria-label': '由你而家位置導航去呢度' }, [icon('nav'), el('span', { text: '導航' })]) : null,
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

    sec.appendChild(kick(++k, '天氣'));
    sec.appendChild(rise(el('div', { class: 'wx-week', 'aria-live': 'polite' }, [el('p', { class: 'empty', text: '載入天氣中…' })])));

    if ((t.flights || []).length) {
      sec.appendChild(kick(++k, '機票'));
      t.flights.forEach(function (f, fi) {
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
          el('div', { class: 'pass-stub' }, [el('span', null, ['航班 ', el('b', { text: f.code })]), el('span', { text: f.note || '' })]),
          flightLiveBox(f, fi)
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
  function renderItem(item, di, ii, mark, leg) {
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
        actions(place, item.phone, item.links),
        leg ? el('a', { class: 'leg press', href: dirUrl(leg.from, leg.to), target: '_blank', rel: 'noopener', 'aria-label': '下一站 ' + leg.what + ' 嘅 Google Maps 路線' }, [
          icon('route'),
          el('span', { class: 'leg-k', text: '下一站' }),
          el('span', { class: 'leg-to', text: leg.what }),
          el('span', { class: 'leg-go' }, ['路線', icon('chevron')])
        ]) : null
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
    var legs = dayLegs(d.items, i);
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
      el('div', { class: 'wx', dataset: { day: i }, hidden: true }),
      d.alert ? el('p', { class: 'alert' }, [icon('alert'), el('span', { text: clean(d.alert) })]) : null,
      el('ol', { class: 'timeline', dataset: { day: i } }, d.items.map(function (it, ii) { return renderItem(it, i, ii, marks[ii], legs[ii]); })),
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

      kick(2, '離線模式'),
      renderOfflineCard(),

      kick(3, '航班即時數據'),
      renderFlightKeyCard(),

      kick(4, '主畫面小工具'),
      renderWidgetCard(),

      kick(5, '點樣攞 Token'),
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

  // ================= 航班狀態 =================
  // A：按時刻表即時推算（倒數 / 飛行進度）；B：有 AeroDataBox key 就讀真實數據
  var ADB_LS = 'kansai-adb-key';
  var ADB_HOST = 'aerodatabox.p.rapidapi.com';
  var TZ = { HKG: '+08:00', KIX: '+09:00', ITM: '+09:00', UKB: '+09:00', NRT: '+09:00', HND: '+09:00', TPE: '+08:00', MFM: '+08:00' };
  var FL_STATUS = {
    Unknown: '未知', Expected: '預定', EnRoute: '飛行中', CheckIn: '辦理登機', Boarding: '登機中',
    GateClosed: '閘口已關', Departed: '已起飛', Delayed: '延誤', Approaching: '即將降落', Arrived: '已到達',
    Landed: '已降落', Diverted: '改降', Canceled: '取消', Cancelled: '取消', CanceledUncertain: '可能取消'
  };
  var flightLive = {};   // fi -> {t, data} | {err}
  var flightBusy = {};

  function nowMs() {
    var q = new URLSearchParams(location.search).get('now');
    if (q && /^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(q)) return Date.parse(q.replace(/T(\d):/, 'T0$1:') + ':00+09:00');
    return Date.now();
  }
  function hhmm(t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? pad2(+m[1]) + ':' + m[2] : '00:00'; }
  function flightTimes(f, i) {
    var t = state.trip;
    var d = f.dep_date || (i === 0 ? t.start_date : t.end_date);
    var ad = f.arr_date || d;
    var dep = Date.parse(d + 'T' + hhmm(f.dep) + ':00' + (f.dep_tz || TZ[f.from_code] || '+09:00'));
    var arr = Date.parse(ad + 'T' + hhmm(f.arr) + ':00' + (f.arr_tz || TZ[f.to_code] || '+09:00'));
    if (arr <= dep) arr += 864e5;
    return { date: d, dep: dep, arr: arr };
  }
  function parseTimeObj(o) {
    if (!o) return null;
    var s = typeof o === 'string' ? o : (o.local || o.utc);
    if (!s) return null;
    var ms = Date.parse(s.replace(' ', 'T'));
    var m = /(\d{2}:\d{2})/.exec(s);
    return isNaN(ms) ? null : { ms: ms, hm: m ? m[1] : '' };
  }
  function parseLive(json) {
    var f = Array.isArray(json) ? json[0] : json;
    if (!f || !f.departure) return null;
    function side(x) {
      x = x || {};
      var sched = parseTimeObj(x.scheduledTime || x.scheduledTimeLocal);
      var best = parseTimeObj(x.actualTime || x.runwayTime || x.revisedTime || x.predictedTime || x.actualTimeLocal);
      return { sched: sched, best: best, terminal: x.terminal || '', gate: x.gate || '', belt: x.baggageBelt || '', desk: x.checkInDesk || '' };
    }
    return { status: f.status || 'Unknown', dep: side(f.departure), arr: side(f.arrival), aircraft: (f.aircraft && f.aircraft.model) || '' };
  }

  // aviationstack key = 32 位 hex；其他當 AeroDataBox（RapidAPI / API.Market）
  function flightProvider(key) { return /^[0-9a-f]{32}$/i.test(key || '') ? 'aviationstack' : 'aerodatabox'; }

  var AS_STATUS = { scheduled: 'Expected', active: 'EnRoute', landed: 'Landed', cancelled: 'Canceled', incident: 'Unknown', diverted: 'Diverted' };
  // aviationstack 嘅時間其實係機場當地時間（雖然寫 +00:00），要配返機場時區
  function asTime(s, tz) {
    if (!s) return null;
    var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(s);
    if (!m) return null;
    var ms = Date.parse(m[1] + 'T' + m[2] + ':00' + (tz || '+09:00'));
    return isNaN(ms) ? null : { ms: ms, hm: m[2] };
  }
  function parseAviationstack(j, f, ft) {
    var list = (j && j.data) || [];
    var hit = list.filter(function (x) { return x.flight_date === ft.date; })[0];
    if (!hit) return null;
    function side(x, tz) {
      x = x || {};
      return {
        sched: asTime(x.scheduled, tz),
        best: asTime(x.actual || x.estimated_runway || x.estimated, tz),
        terminal: x.terminal || '', gate: x.gate || '', belt: x.baggage || '', desk: ''
      };
    }
    var dep = side(hit.departure, TZ[(hit.departure || {}).iata] || TZ[f.from_code]);
    var arr = side(hit.arrival, TZ[(hit.arrival || {}).iata] || TZ[f.to_code]);
    if (dep.best && dep.sched && dep.best.ms === dep.sched.ms) dep.best = null;
    if (arr.best && arr.sched && arr.best.ms === arr.sched.ms) arr.best = null;
    var st = AS_STATUS[hit.flight_status] || 'Unknown';
    if (st === 'Expected' && hit.departure && hit.departure.delay >= 15) st = 'Delayed';
    return { status: st, dep: dep, arr: arr, aircraft: (hit.aircraft && hit.aircraft.iata) || '' };
  }
  function asFetch(key, f) {
    var url = 'https://api.aviationstack.com/v1/flights?access_key=' + encodeURIComponent(key) + '&flight_iata=' + encodeURIComponent(String(f.code).replace(/\s+/g, '')) + '&limit=10';
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); }, function () { throw new Error('連唔到 aviationstack'); })
      .then(function (j) {
        if (j && j.error) {
          var c = j.error.code || '';
          if (/usage_limit/.test(c)) throw new Error('aviationstack 今個月 100 次額度用完');
          if (/invalid_access_key|missing_access_key|inactive_user/.test(c)) throw new Error('aviationstack key 無效');
          throw new Error('aviationstack：' + (j.error.message || c));
        }
        return j;
      });
  }

  function fetchFlight(f, fi, force) {
    var key = lsGet(ADB_LS);
    if (!key) return Promise.resolve(null);
    var prov = flightProvider(key);
    var ft = flightTimes(f, fi);
    var ck = 'kansai-fl-' + f.code + '-' + ft.date;
    var cached = null;
    try { cached = JSON.parse(lsGet(ck) || 'null'); } catch (e) {}
    if (cached && !flightLive[fi]) flightLive[fi] = cached;
    var n = nowMs();
    // 免費方案每月 400 units：起飛前 48–6 小時每 3 小時一次；之後到降落後 2 小時每 15 分鐘一次
    var inWindow = n > ft.dep - 48 * 36e5 && n < ft.arr + 2 * 36e5;
    var every = n < ft.dep - 6 * 36e5 ? 3 * 36e5 : 15 * 6e4;
    if (prov === 'aviationstack') {
      // 免費 100 次／月，而且只有當日實時數據：起飛前 6 小時至降落後 1 小時，每 30 分鐘一次
      inWindow = n > ft.dep - 6 * 36e5 && n < ft.arr + 36e5;
      every = 30 * 6e4;
    }
    if (!force && (!inWindow || (cached && Date.now() - cached.t < every))) return Promise.resolve(cached);
    if (flightBusy[fi]) return flightBusy[fi];
    var path = '/flights/number/' + encodeURIComponent(f.code) + '/' + ft.date +
      '?dateLocalRole=Departure&withAircraftImage=false&withLocation=false';
    flightBusy[fi] = (prov === 'aviationstack'
      ? asFetch(key, f).then(function (j) { return { __as: parseAviationstack(j, f, ft) }; })
      : adbFetch(key, path))
      .then(function (j) {
        var data = j && j.__as !== undefined ? j.__as : parseLive(j);
        var rec = { t: Date.now(), data: data };
        if (data) lsSet(ck, JSON.stringify(rec));
        flightLive[fi] = data ? rec : { t: Date.now(), data: null, empty: true };
        return flightLive[fi];
      }, function (e) {
        flightLive[fi] = { t: Date.now(), err: e.message, data: cached && cached.data };
        throw e;
      })
      .then(function (x) { delete flightBusy[fi]; updateFlights(); return x; }, function (e) { delete flightBusy[fi]; updateFlights(); throw e; });
    return flightBusy[fi];
  }

  // 同一條 key 自動試 RapidAPI 同 API.Market，記住用得嗰個
  var ADB_PROVIDERS = {
    rapidapi: function (key, path) {
      return fetch('https://' + ADB_HOST + path, { headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': ADB_HOST }, cache: 'no-store' });
    },
    apimarket: function (key, path) {
      return fetch('https://prod.api.market/api/v1/aedbx/aerodatabox' + path, { headers: { 'x-magicapi-key': key }, cache: 'no-store' });
    }
  };
  function adbOnce(name, key, path) {
    return ADB_PROVIDERS[name](key, path).then(function (r) {
      if (r.status === 204) return { ok: true, json: [] };
      return r.text().then(function (txt) {
        var j = null;
        try { j = JSON.parse(txt); } catch (e) {}
        if (r.ok) return { ok: true, json: j };
        var msg = (j && (j.message || j.error || j.detail)) || ('HTTP ' + r.status);
        return { ok: false, status: r.status, msg: String(msg) };
      });
    }, function () { return { ok: false, status: 0, msg: '連唔到伺服器' }; });
  }
  function adbFetch(key, path) {
    var saved = lsGet('kansai-adb-provider');
    var order = saved === 'apimarket' ? ['apimarket', 'rapidapi'] : ['rapidapi', 'apimarket'];
    var errors = [];
    function attempt(i) {
      if (i >= order.length) {
        var auth = errors.every(function (e) { return e.status === 400 || e.status === 401 || e.status === 403; });
        if (errors.some(function (e) { return e.status === 429; })) throw new Error('今個月免費額度用完（429）');
        throw new Error(auth
          ? 'Key 用唔到：RapidAPI 話「' + errors[0].msg + '」。請確認已經喺 AeroDataBox 頁撳咗 Subscribe（Basic 免費），同埋複製嘅係 X-RapidAPI-Key'
          : '航班數據錯誤：' + errors.map(function (e) { return e.msg; }).join(' / '));
      }
      return adbOnce(order[i], key, path).then(function (res) {
        if (res.ok) { lsSet('kansai-adb-provider', order[i]); return res.json; }
        errors.push(res);
        if (res.status === 429) return attempt(order.length);
        return attempt(i + 1);
      });
    }
    return attempt(0);
  }

  function flightLinks(f) {
    var c = String(f.code || '').replace(/\s+/g, '');
    return el('div', { class: 'actions' }, [
      el('a', { class: 'pill press', href: 'https://www.flightradar24.com/data/flights/' + c.toLowerCase(), target: '_blank', rel: 'noopener' }, [icon('plane'), el('span', { text: 'Flightradar24' })]),
      el('a', { class: 'pill press', href: 'https://www.flightaware.com/live/flight/' + c, target: '_blank', rel: 'noopener' }, [icon('link'), el('span', { text: 'FlightAware' })])
    ]);
  }

  function flightLiveBox(f, fi) {
    var box = el('div', { class: 'pass-live', dataset: { fi: fi } }, [
      el('div', { class: 'pl-head' }, [el('span', { class: 'pl-state' }), el('b', { class: 'pl-big' })]),
      el('div', { class: 'pl-track', 'aria-hidden': 'true' }, [
        el('span', { class: 'pl-fill' }),
        el('span', { class: 'pl-ride' }, [el('span', { class: 'pl-plane' }, [icon('plane')])])
      ]),
      el('div', { class: 'pl-live' }),
      flightLinks(f)
    ]);
    return box;
  }

  function dur(ms) {
    var m = Math.max(0, Math.round(ms / 6e4));
    var d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    if (d >= 2) return d + ' 日 ' + h + ' 小時';
    if (d === 1) return '1 日 ' + h + ' 小時';
    return (h ? h + ' 小時 ' : '') + mm + ' 分';
  }

  function updateFlights() {
    var t = state.trip;
    if (!t || !t.flights) return;
    var n = nowMs();
    document.querySelectorAll('.pass-live').forEach(function (box) {
      var fi = +box.dataset.fi;
      var f = t.flights[fi];
      if (!f) return;
      var ft = flightTimes(f, fi);
      var rec = flightLive[fi];
      var live = rec && rec.data;
      var dep = (live && live.dep.best && live.dep.best.ms) || (live && live.dep.sched && live.dep.sched.ms) || ft.dep;
      var arr = (live && live.arr.best && live.arr.best.ms) || (live && live.arr.sched && live.arr.sched.ms) || ft.arr;
      var st = live && live.status;
      var cancelled = /^Cancel|^Canceled/.test(st || '');
      var p, label, big;
      if (cancelled) { p = 0; label = '航班狀態'; big = '已取消'; }
      else if (n < dep) { p = 0; label = '距離起飛'; big = dur(dep - n); }
      else if (n < arr && !/Arrived|Landed/.test(st || '')) {
        p = Math.min(1, (n - dep) / (arr - dep));
        label = '飛行中 · 約 ' + Math.round(p * 100) + '%';
        big = '仲有 ' + dur(arr - n);
      } else { p = 1; label = '航班'; big = '已到達'; }
      box.dataset.phase = cancelled ? 'cancel' : p >= 1 ? 'done' : p > 0 ? 'air' : 'ground';
      box.querySelector('.pl-state').textContent = label;
      box.querySelector('.pl-big').textContent = big;
      box.querySelector('.pl-fill').style.transform = 'scaleX(' + p + ')';
      box.querySelector('.pl-ride').style.transform = 'translateX(' + (p * 100) + '%)';

      var lv = box.querySelector('.pl-live');
      lv.textContent = '';
      if (!lsGet(ADB_LS)) {
        lv.appendChild(el('span', { class: 'pl-note', text: '按時刻表推算。想睇真實延誤同閘口，可以喺「設定」加入航班數據 key。' }));
        return;
      }
      if (rec && rec.err) lv.appendChild(el('span', { class: 'pl-note warn', text: rec.err }));
      if (rec && rec.empty) lv.appendChild(el('span', { class: 'pl-note', text: '暫時未有呢班機當日嘅即時數據（出發當日先會有）' }));
      if (!rec) lv.appendChild(el('span', { class: 'pl-note', text: n < ft.dep - (flightProvider(lsGet(ADB_LS)) === 'aviationstack' ? 6 : 48) * 36e5 ? '起飛前 ' + (flightProvider(lsGet(ADB_LS)) === 'aviationstack' ? 6 : 48) + ' 小時內會自動更新真實數據' : '更新緊…' }));
      if (live) {
        var depDelay = live.dep.sched && live.dep.best ? Math.round((live.dep.best.ms - live.dep.sched.ms) / 6e4) : 0;
        var stTxt = FL_STATUS[st] || st;
        var late = depDelay >= 15 || st === 'Delayed';
        var grid = el('div', { class: 'pl-grid' }, [
          el('span', { class: 'pl-status ' + (cancelled ? 'bad' : late ? 'late' : 'ok'), text: stTxt + (depDelay >= 5 ? ' · 遲 ' + depDelay + ' 分' : '') }),
          plCell('起飛', (live.dep.best || live.dep.sched || {}).hm, live.dep.sched && live.dep.best && live.dep.best.hm !== live.dep.sched.hm ? '原定 ' + live.dep.sched.hm : ''),
          plCell('到達', (live.arr.best || live.arr.sched || {}).hm, live.arr.sched && live.arr.best && live.arr.best.hm !== live.arr.sched.hm ? '原定 ' + live.arr.sched.hm : ''),
          live.dep.terminal || live.dep.gate ? plCell('出發', [live.dep.terminal ? 'T' + live.dep.terminal : '', live.dep.gate ? '閘口 ' + live.dep.gate : ''].filter(Boolean).join(' · '), live.dep.desk ? '櫃檯 ' + live.dep.desk : '') : null,
          live.arr.terminal || live.arr.belt ? plCell('抵達', [live.arr.terminal ? 'T' + live.arr.terminal : '', live.arr.belt ? '行李帶 ' + live.arr.belt : ''].filter(Boolean).join(' · ')) : null
        ]);
        lv.appendChild(grid);
      }
      var stamp = rec && rec.t ? new Date(rec.t) : null;
      lv.appendChild(el('div', { class: 'pl-foot' }, [
        el('span', { text: stamp ? '更新於 ' + pad2(stamp.getHours()) + ':' + pad2(stamp.getMinutes()) : '' }),
        el('button', { type: 'button', class: 'pl-refresh press', onclick: function () {
          var b = this; b.classList.add('spin');
          fetchFlight(f, fi, true).then(function () { toast('已更新 ' + f.code, 1800, 'check'); }, function (e) { toast(e.message, 3500, 'alert'); })
            .then(function () { b.classList.remove('spin'); });
        } }, [icon('sync'), '更新'])
      ]));
    });
  }
  function plCell(k, v, sub) {
    if (!v) return null;
    return el('span', { class: 'pl-cell' }, [el('small', { text: k }), el('b', { text: v }), sub ? el('em', { text: sub }) : null]);
  }
  function refreshFlights() {
    var t = state.trip;
    if (!t || !t.flights) return;
    t.flights.forEach(function (f, fi) { fetchFlight(f, fi, false).catch(function () {}); });
    updateFlights();
  }
  setInterval(function () { if (!document.hidden) refreshFlights(); }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshFlights(); });

  function renderFlightKeyCard() {
    var has = !!lsGet(ADB_LS);
    var input = el('input', { type: 'password', placeholder: 'X-RapidAPI-Key', value: lsGet(ADB_LS) || '', autocomplete: 'off', spellcheck: 'false' });
    return el('div', { class: 'card rise', style: '--i:2' }, [
      el('div', { class: 'card-title' }, [icon('plane'), has ? '已連接航班數據' : '航班即時數據（選用）']),
      el('p', { text: '支援 aviationstack（免費 100 次／月）或 AeroDataBox 嘅 key，網站會自動識別。加入之後，機票卡會顯示真實狀態、延誤、閘口同行李帶，臨近起飛同飛行中自動更新。冇 key 都會按時刻表顯示倒數同飛行進度。' }),
      el('ol', { class: 'steps compact' }, [
        el('li', null, ['打開 ', el('a', { href: 'https://aviationstack.com/signup/free', target: '_blank', rel: 'noopener', text: 'aviationstack' }), ' 註冊免費方案（或者用 AeroDataBox）']),
        el('li', { text: 'Dashboard 最頂「Your API Key」撳複製' }),
        el('li', { text: '貼落下面，撳「儲存並測試」（測試會用 1 次額度）' })
      ]),
      el('label', { class: 'fld' }, ['API Key', input]),
      el('div', { class: 'actions' }, [
        el('button', { type: 'button', class: 'solid press', text: '儲存並測試', onclick: function () {
          var k = input.value.replace(/[^\x21-\x7e]/g, '');
          input.value = k;
          if (!k) { lsSet(ADB_LS, null); toast('已移除航班數據 key', 2200); render(); return; }
          lsSet(ADB_LS, k);
          lsSet('kansai-adb-provider', null);
          toast('測試緊…', 8000, 'sync');
          var f = state.trip.flights && state.trip.flights[0];
          if (!f) return;
          fetchFlight(f, 0, true).then(function (rec) {
            toast(rec && rec.data ? '連接成功：' + f.code + ' ' + (FL_STATUS[rec.data.status] || rec.data.status) : '連接成功（暫時未有 ' + f.code + ' 數據，接近出發日會有）', 4000, 'check');
            render();
          }, function (e) { toast('測試失敗：' + e.message, 5000, 'alert'); });
        } }),
        has ? el('button', { type: 'button', class: 'ghost press', text: '移除', onclick: function () { lsSet(ADB_LS, null); toast('已移除', 1800); render(); } }) : null
      ]),
      el('p', { class: 'fine', text: 'Key 只會儲存喺呢部裝置。免費方案每月次數有限：aviationstack 只會喺起飛前 6 小時至降落後 1 小時，每 30 分鐘更新一次（兩班機合共約 40 次）。' })
    ]);
  }

  // ---------- iPhone 小工具（Scriptable） ----------
  var widgetSrc = null;
  function loadWidgetSrc() {
    if (widgetSrc) return Promise.resolve(widgetSrc);
    return fetch('widget/kansai-widget.js?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) { widgetSrc = t; return t; });
  }
  var WIDGET_STYLES = [
    ['auto', '自動：出發前倒數，旅程中顯示下一站'],
    ['countdown', '倒數日數'],
    ['next', '下一站（中／大尺寸列埋之後幾站）'],
    ['today', '今日行程表'],
    ['day1 … day7', '指定某一日'],
    ['flight', '登機證'],
    ['hotel', '今晚住邊度'],
    ['todo', '待處理事項'],
    ['week', '七日總覽']
  ];
  function renderWidgetCard() {
    loadWidgetSrc().catch(function () {});
    return el('div', { class: 'card rise', style: '--i:2' }, [
      el('div', { class: 'card-title' }, [icon('device'), 'iPhone 主畫面 / 鎖定畫面']),
      el('p', { text: '用免費 App「Scriptable」整 widget，自動讀取呢個網站嘅行程。' }),
      el('ol', { class: 'steps compact' }, [
        el('li', null, ['App Store 下載 ', el('a', { href: 'https://apps.apple.com/app/scriptable/id1405459188', target: '_blank', rel: 'noopener', text: 'Scriptable' })]),
        el('li', { text: '撳下面「複製程式」，喺 Scriptable 撳 ＋ 開新 script，貼上，改名「旅のしおり」' }),
        el('li', { text: '主畫面長按 → ＋ → Scriptable → 揀大細 → 加入' }),
        el('li', { text: '長按 widget → 編輯：Script 揀「旅のしおり」，Parameter 填樣式名（留空 = auto）' })
      ]),
      el('div', { class: 'wstyles' }, WIDGET_STYLES.map(function (x) {
        return el('div', { class: 'wstyle' }, [el('code', { text: x[0] }), el('span', { text: x[1] })]);
      })),
      el('p', { class: 'fine', text: '鎖定畫面（圓形、長方形、一行文字）都用得。喺 Scriptable 入面撳 ▶︎ 可以預覽每款樣式。' }),
      el('div', { class: 'actions' }, [
        el('button', { type: 'button', class: 'solid press', onclick: function (e) {
          var btn = e.currentTarget;
          var go = function (t) {
            return copyText(t).then(function () { toast('已複製 widget 程式，去 Scriptable 貼上', 3000, 'check'); });
          };
          (widgetSrc ? go(widgetSrc) : loadWidgetSrc().then(go)).catch(function () {
            toast('複製唔到，改為打開程式頁，請全選複製', 3500, 'alert');
            window.open('widget/kansai-widget.js', '_blank');
          });
          btn.blur();
        } }, [icon('upload'), '複製程式']),
        el('a', { class: 'ghost press', href: 'widget/kansai-widget.js', target: '_blank', rel: 'noopener', text: '睇程式' })
      ])
    ]);
  }

  // ================= 交通指引：下一站 =================
  // 當晚住邊間酒店（入住日 ≤ 當日 < 退房日；最後一日就用退房嗰間）
  function hotelFor(di) {
    var d = ymd(dayDate(di)), hs = state.trip.hotels || [], hit = null;
    hs.forEach(function (h) {
      var ci = String(h.checkin || '').replace(/\//g, '-'), co = String(h.checkout || '').replace(/\//g, '-');
      if (ci <= d && d < co) hit = h;
    });
    if (!hit) hs.forEach(function (h) { if (String(h.checkout || '').replace(/\//g, '-') === d) hit = h; });
    return hit;
  }
  function placeOf(it, di) {
    var p = it.place || it.address;
    if (p) return p;
    if (/酒店|hotel|check.?in|寄存行李/i.test(it.what)) { var h = hotelFor(di); if (h) return h.name; }
    return '';
  }
  // 冇地點嘅行程（例如剪髮、搭車）當係仲喺上一個地方
  function dayLegs(items, di) {
    var eff = [], last = '';
    items.forEach(function (it, i) { var p = placeOf(it, di); if (p) last = p; eff[i] = last; });
    var legs = [];
    items.forEach(function (it, i) {
      var nx = items[i + 1];
      if (!nx) return;
      var to = placeOf(nx, di);
      if (to && to !== eff[i]) legs[i] = { from: eff[i], to: to, what: nx.what };
    });
    return legs;
  }

  // ================= 天氣（Open-Meteo，免 key）=================
  var CITIES = {
    kyoto: { name: '京都', lat: 35.0037, lon: 135.7588, re: /京都|嵐山|祇園|河原町|二条|伏見|kyoto/i },
    osaka: { name: '大阪', lat: 34.6723, lon: 135.5013, re: /大阪|梅田|心斎橋|心齋橋|難波|なんば|osaka|關西機場|関西空港|返回香港/i },
    miyazu: { name: '天橋立', lat: 35.5694, lon: 135.1906, re: /天橋立|宮津|丹後|伊根/ },
    minoh: { name: '箕面', lat: 34.8269, lon: 135.4705, re: /箕面|吹田|万博/ }
  };
  var CITY_KEYS = Object.keys(CITIES);
  var WX_LS = 'kansai-wx', WX_PAST_LS = 'kansai-wx-past';
  var WX_TTL = 2 * 3600e3;

  function dayCities(di) {
    var title = String(state.trip.days[di].title || ''), found = [];
    CITY_KEYS.forEach(function (k) {
      var m = CITIES[k].re.exec(title);
      if (m) found.push({ k: k, at: m.index });
    });
    found.sort(function (a, b) { return a.at - b.at; });
    var keys = found.map(function (f) { return f.k; }).slice(0, 2);
    if (!keys.length) {
      var h = hotelFor(di);
      var hk = h && CITY_KEYS.filter(function (k) { return CITIES[k].re.test(h.name + ' ' + h.address); })[0];
      keys = [hk || 'osaka'];
    }
    return keys;
  }

  // WMO weather code → [圖示, 描述]
  function wxCode(c) {
    if (c === 0) return ['wsun', '晴'];
    if (c === 1) return ['wsun', '大致天晴'];
    if (c === 2) return ['wpart', '間中有雲'];
    if (c === 3) return ['wcloud', '陰天'];
    if (c === 45 || c === 48) return ['wfog', '有霧'];
    if (c >= 51 && c <= 57) return ['wrain', '毛毛雨'];
    if (c === 61) return ['wrain', '小雨'];
    if (c === 63) return ['wrain', '有雨'];
    if (c >= 64 && c <= 67) return ['wrain', '大雨'];
    if (c >= 71 && c <= 77) return ['wsnow', '落雪'];
    if (c >= 80 && c <= 82) return ['wrain', '驟雨'];
    if (c === 85 || c === 86) return ['wsnow', '陣雪'];
    if (c >= 95) return ['wstorm', '雷暴'];
    return ['wcloud', '—'];
  }

  function wxQuery(base, extra) {
    var ks = CITY_KEYS;
    return base + '?latitude=' + ks.map(function (k) { return CITIES[k].lat; }).join(',') +
      '&longitude=' + ks.map(function (k) { return CITIES[k].lon; }).join(',') +
      '&timezone=Asia%2FTokyo' + extra;
  }
  // 將 Open-Meteo（單點或者多點）結果變成 {city: {date: {...}}}
  function wxIndex(json, hourly) {
    var arr = Array.isArray(json) ? json : [json], out = {};
    arr.forEach(function (r, ci) {
      var k = CITY_KEYS[ci], dmap = {};
      if (!r || !r.daily) return;
      r.daily.time.forEach(function (d, i) {
        dmap[d] = {
          code: r.daily.weather_code[i],
          hi: r.daily.temperature_2m_max[i],
          lo: r.daily.temperature_2m_min[i],
          pop: r.daily.precipitation_probability_max ? r.daily.precipitation_probability_max[i] : null,
          rain: r.daily.precipitation_sum ? r.daily.precipitation_sum[i] : null,
          hours: []
        };
      });
      if (hourly && r.hourly) r.hourly.time.forEach(function (t, i) {
        var d = t.slice(0, 10), h = +t.slice(11, 13);
        if (dmap[d] && h >= 9 && h <= 21 && h % 3 === 0) dmap[d].hours.push({ h: h, temp: r.hourly.temperature_2m[i], pop: r.hourly.precipitation_probability[i], code: r.hourly.weather_code[i] });
      });
      out[k] = dmap;
    });
    return out;
  }

  var wx = { now: null, past: null, busy: false, tried: false, pastFail: 0 };
  function loadWeather(force) {
    var c = readJSON(WX_LS), p = readJSON(WX_PAST_LS);
    if (c) wx.now = c;
    if (p) wx.past = p.data;
    var jobs = [];
    if (navigator.onLine !== false && (force || !c || Date.now() - c.t > WX_TTL)) {
      jobs.push(fetch(wxQuery('https://api.open-meteo.com/v1/forecast',
        '&forecast_days=16&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&hourly=temperature_2m,precipitation_probability,weather_code'))
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) { wx.now = { t: Date.now(), data: wxIndex(j, true) }; lsSet(WX_LS, JSON.stringify(wx.now)); }));
    }
    // 預報最多 16 日；未出預報嗰幾日用去年同期做參考
    var s = state.trip.start_date, e = state.trip.end_date;
    var ps = (+s.slice(0, 4) - 1) + s.slice(4), pe = (+e.slice(0, 4) - 1) + e.slice(4);
    if (navigator.onLine !== false && (!p || p.range !== ps + pe) && Date.now() - wx.pastFail > 30 * 60e3) {
      jobs.push(fetch(wxQuery('https://archive-api.open-meteo.com/v1/archive',
        '&start_date=' + ps + '&end_date=' + pe + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum'))
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) { wx.past = wxIndex(j, false); lsSet(WX_PAST_LS, JSON.stringify({ range: ps + pe, data: wx.past })); })
        .catch(function (err) { wx.pastFail = Date.now(); throw err; }));
    }
    return Promise.all(jobs.map(function (j) { return j.catch(function () {}); }));
  }

  function wxFor(k, date) {
    var n = wx.now && wx.now.data[k] && wx.now.data[k][date];
    if (n) return { f: n, live: true };
    var py = (+date.slice(0, 4) - 1) + date.slice(4);
    var p = wx.past && wx.past[k] && wx.past[k][py];
    return p ? { f: p, live: false } : null;
  }
  function deg(v) { return v == null ? '–' : Math.round(v) + '°'; }

  function fillWeather(force) {
    paintWeather();
    if (wx.busy) return;
    wx.busy = true;
    loadWeather(force).then(function () { wx.busy = false; wx.tried = true; paintWeather(); });
  }

  function paintWeather() {
    if (!state.trip) return;
    var days = state.trip.days;
    document.querySelectorAll('.wx[data-day]').forEach(function (box) {
      var di = +box.dataset.day, date = ymd(dayDate(di));
      box.textContent = '';
      var any = false, wet = false, ref = false;
      dayCities(di).forEach(function (k) {
        var w = wxFor(k, date);
        if (!w) return;
        any = true;
        var f = w.f, c = wxCode(f.code);
        if (!w.live) ref = true;
        if (w.live && f.pop != null && f.pop >= 50) wet = true;
        box.appendChild(el('div', { class: 'wx-row' + (w.live ? '' : ' wx-past') }, [
          el('span', { class: 'wx-ic' }, [icon(c[0])]),
          el('div', { class: 'wx-main' }, [
            el('b', { text: CITIES[k].name }),
            el('span', { text: c[1] + (w.live ? '' : ' · 去年') })
          ]),
          el('div', { class: 'wx-temp' }, [el('b', { text: deg(f.hi) }), el('span', { text: deg(f.lo) })]),
          w.live && f.pop != null ? el('div', { class: 'wx-pop' + (f.pop >= 50 ? ' wet' : '') }, [icon('umbrella'), f.pop + '%'])
            : (!w.live && f.rain != null ? el('div', { class: 'wx-pop' }, [icon('umbrella'), f.rain < 0.1 ? '無雨' : f.rain.toFixed(1) + 'mm']) : null)
        ]));
        if (w.live && f.hours.length && k === dayCities(di)[0]) {
          box.appendChild(el('div', { class: 'wx-hours' }, f.hours.map(function (h) {
            return el('div', { class: 'wx-h' + (h.pop >= 50 ? ' wet' : '') }, [
              el('small', { text: h.h + ':00' }), icon(wxCode(h.code)[0]), el('b', { text: deg(h.temp) }), el('em', { text: h.pop + '%' })
            ]);
          })));
        }
      });
      if (any) {
        box.appendChild(el('p', { class: 'wx-foot' }, [
          wet ? el('span', { class: 'wx-tip' }, [icon('umbrella'), '可能落雨，記得帶遮']) : null,
          el('span', { text: ref ? '預報出發前 16 日先有，而家顯示去年同日作參考' : '天氣：Open-Meteo' })
        ]));
      }
      box.hidden = !any;
    });

    var week = document.querySelector('.wx-week');
    if (!week) return;
    week.textContent = '';
    var cells = days.map(function (d, di) {
      var k = dayCities(di)[0], date = ymd(dayDate(di)), w = wxFor(k, date), dd = dayDate(di);
      return el('a', { class: 'wx-cell press' + (w && !w.live ? ' wx-past' : ''), href: '#day' + (di + 1) }, [
        el('small', { text: md(dd) + ' ' + wd(dd) }),
        el('span', { class: 'wx-city', text: CITIES[k].name }),
        icon(w ? wxCode(w.f.code)[0] : 'wcloud'),
        el('b', { text: w ? deg(w.f.hi) : '–' }),
        el('span', { class: 'lo', text: w ? deg(w.f.lo) : '' }),
        w && w.live && w.f.pop != null ? el('em', { class: w.f.pop >= 50 ? 'wet' : null, text: w.f.pop + '%' }) : el('em', { text: w ? '去年' : '' })
      ]);
    });
    var hasLive = days.some(function (d, di) { var w = wxFor(dayCities(di)[0], ymd(dayDate(di))); return w && w.live; });
    var hasAny = days.some(function (d, di) { return !!wxFor(dayCities(di)[0], ymd(dayDate(di))); });
    if (hasAny) week.appendChild(el('div', { class: 'wx-grid' }, cells));
    var opens = new Date(dayDate(0).getTime() - 15 * 864e5);
    week.appendChild(el('p', { class: 'fine', text: !hasAny ? (navigator.onLine === false ? '離線中，未有天氣資料'
        : !wx.tried ? '載入天氣中…' : '天氣預報 ' + md(opens) + ' 左右開始有，到時會自動顯示。')
      : (hasLive ? '最高 / 最低溫，% 係降雨機會。' : '') + (days.every(function (d, di) { var w = wxFor(dayCities(di)[0], ymd(dayDate(di))); return w && w.live; }) ? '' : '淡色係去年同日嘅天氣，預報出發前 16 日先有。') }));
  }
  setInterval(function () { if (!document.hidden && state.trip) fillWeather(); }, 30 * 60e3);

  // ================= 記帳 =================
  var FX_LS = 'kansai-fx', FX_MANUAL = 'kansai-fx-manual';
  var FX_DEFAULT = 19.2;   // 1 HKD = ¥19.2（後備）
  var CATS = [
    { k: 'food', name: '餐飲' }, { k: 'transport', name: '交通' }, { k: 'shop', name: '購物' },
    { k: 'ticket', name: '門票' }, { k: 'stay', name: '住宿' }, { k: 'other', name: '其他' }
  ];
  var PAYS = [{ k: 'cash', name: '現金' }, { k: 'card', name: '信用卡' }, { k: 'ic', name: 'Suica' }];
  var moneyEdit = null;

  function catName(k) { var c = CATS.filter(function (x) { return x.k === k; })[0]; return c ? c.name : '其他'; }
  function payName(k) { var c = PAYS.filter(function (x) { return x.k === k; })[0]; return c ? c.name : ''; }
  function fxRate() {
    var m = parseFloat(lsGet(FX_MANUAL));
    if (m > 0) return m;
    var c = readJSON(FX_LS);
    return c && c.rate > 0 ? c.rate : FX_DEFAULT;
  }
  function loadFx() {
    var c = readJSON(FX_LS);
    if (navigator.onLine === false || (c && Date.now() - c.t < 12 * 3600e3)) return Promise.resolve(false);
    return fetch('https://open.er-api.com/v6/latest/HKD').then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.rates && j.rates.JPY > 0) { lsSet(FX_LS, JSON.stringify({ rate: j.rates.JPY, t: Date.now() })); return true; }
      return false;
    }).catch(function () { return false; });
  }
  function toJPY(e) { return e.cur === 'HKD' ? e.amt * fxRate() : e.amt; }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function hkd(jpy) { return 'HK$' + (jpy / fxRate()).toLocaleString('en-US', { maximumFractionDigits: jpy / fxRate() < 100 ? 1 : 0 }); }
  function moneyDayName(d) { return d < 0 ? '出發前' : 'Day ' + (d + 1) + ' · ' + md(dayDate(d)); }
  function defaultMoneyDay() {
    var now = nowJST(), t = state.trip;
    for (var i = 0; i < t.days.length; i++) if (ymd(dayDate(i)) === now.ymd) return i;
    return now.ymd < t.start_date ? -1 : t.days.length - 1;
  }

  function segGroup(name, opts, val, legend) {
    return el('fieldset', { class: 'seg' }, [el('legend', { text: legend })].concat(opts.map(function (o) {
      var inp = el('input', { type: 'radio', name: name, value: o.k });
      if (o.k === val) inp.checked = true;
      return el('label', { class: name === 'cat' ? 'cat-' + o.k : null }, [inp, el('span', { text: o.name })]);
    })));
  }

  function renderMoney() {
    var t = state.trip;
    var list = t.expenses || [];
    var total = list.reduce(function (s, e) { return s + toJPY(e); }, 0);
    var budget = +t.budget || 0;
    var editing = moneyEdit && list.filter(function (e) { return e.id === moneyEdit; })[0];
    var cur = editing || { day: defaultMoneyDay(), cur: lsGet('kansai-last-cur') || 'JPY', cat: 'food', pay: lsGet('kansai-last-pay') || 'cash', amt: '', note: '' };

    var amt = el('input', { name: 'amt', inputmode: 'decimal', placeholder: '0', autocomplete: 'off', 'aria-label': '金額', value: cur.amt === '' ? '' : String(cur.amt) });
    var conv = el('span', { class: 'm-conv' });
    var daySel = el('select', { name: 'day' }, [el('option', { value: '-1', text: '出發前' })].concat(t.days.map(function (d, i) {
      return el('option', { value: String(i), text: 'Day ' + (i + 1) + ' · ' + md(dayDate(i)) + ' ' + clean(d.title) });
    })));
    daySel.value = String(cur.day);
    var form = el('form', { class: 'card m-form' + (editing ? ' editing' : ''), autocomplete: 'off' }, [
      el('div', { class: 'm-amt' }, [
        el('span', { class: 'm-sym', text: cur.cur === 'HKD' ? 'HK$' : '¥' }),
        amt
      ]),
      conv,
      segGroup('cur', [{ k: 'JPY', name: '日圓 ¥' }, { k: 'HKD', name: '港幣 HK$' }], cur.cur, '貨幣'),
      segGroup('cat', CATS, cur.cat, '分類'),
      segGroup('pay', PAYS, cur.pay, '付款方式'),
      el('div', { class: 'field-row' }, [
        el('label', { class: 'fld' }, ['備註', el('input', { name: 'note', placeholder: '例如：一蘭拉麵', value: cur.note || '' })]),
        el('label', { class: 'fld' }, ['日子', daySel])
      ]),
      el('div', { class: 'actions' }, [
        el('button', { type: 'submit', class: 'solid press' }, [icon(editing ? 'check' : 'plus'), editing ? '更新' : '記低']),
        editing ? el('button', { type: 'button', class: 'ghost press', text: '取消', onclick: function () { moneyEdit = null; render(); } }) : null,
        editing ? el('button', { type: 'button', class: 'ghost danger press', onclick: function () { delExpense(editing); } }, [icon('trash'), '刪除']) : null
      ])
    ]);
    function syncConv() {
      var v = parseFloat(String(amt.value).replace(/,/g, ''));
      var c = form.elements.cur.value;
      form.querySelector('.m-sym').textContent = c === 'HKD' ? 'HK$' : '¥';
      conv.textContent = v > 0 ? (c === 'HKD' ? '≈ ¥' + fmt(v * fxRate()) : '≈ ' + hkd(v)) : '';
    }
    amt.addEventListener('input', syncConv);
    form.addEventListener('change', syncConv);
    syncConv();
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = parseFloat(String(amt.value).replace(/,/g, ''));
      if (!(v > 0)) { amt.focus(); toast('請輸入金額', 1800, 'alert'); return; }
      var rec = {
        id: editing ? editing.id : newId(),
        day: +daySel.value,
        amt: Math.round(v * 100) / 100,
        cur: form.elements.cur.value,
        cat: form.elements.cat.value || 'other',
        pay: form.elements.pay.value || '',
        note: form.elements.note.value.trim(),
        t: editing ? editing.t : Date.now()
      };
      lsSet('kansai-last-cur', rec.cur);
      lsSet('kansai-last-pay', rec.pay);
      t.expenses = t.expenses || [];
      if (editing) t.expenses = t.expenses.map(function (e) { return e.id === rec.id ? rec : e; });
      else t.expenses.push(rec);
      moneyEdit = null;
      buzz(10);
      render();
      var row = document.querySelector('.m-row[data-id="' + rec.id + '"]');
      if (row && !REDUCED) row.animate([{ background: 'var(--shu-soft)' }, { background: 'transparent' }], { duration: 900, easing: EASE_OUT });
      saveTrip('記帳：' + (rec.note || catName(rec.cat)) + ' ' + (rec.cur === 'HKD' ? 'HK$' : '¥') + rec.amt);
    });

    // 分類
    var byCat = {};
    list.forEach(function (e) { byCat[e.cat] = (byCat[e.cat] || 0) + toJPY(e); });
    var catRows = CATS.filter(function (c) { return byCat[c.k]; }).sort(function (a, b) { return byCat[b.k] - byCat[a.k]; });

    // 明細（按日，新嘅喺上面）
    var groups = {};
    list.forEach(function (e) { (groups[e.day] = groups[e.day] || []).push(e); });
    var dayKeys = Object.keys(groups).map(Number).sort(function (a, b) { return b - a; });

    var fx = readJSON(FX_LS), manual = parseFloat(lsGet(FX_MANUAL)) > 0;
    var fxInput = el('input', { inputmode: 'decimal', placeholder: String((fx && fx.rate) ? fx.rate.toFixed(2) : FX_DEFAULT), value: manual ? lsGet(FX_MANUAL) : '' });
    var budgetInput = el('input', { inputmode: 'numeric', placeholder: '例如 150000', value: budget ? String(budget) : '' });

    var r = 0;
    function rise(node) { node.classList.add('rise'); node.style.setProperty('--i', Math.min(r++, 8)); return node; }
    var used = budget ? total / budget : 0;
    var daysWithSpend = dayKeys.filter(function (d) { return d >= 0; }).length;

    return el('section', { class: 'panel', id: 'money', role: 'tabpanel' }, [
      el('div', { class: 'm-hero' }, [
        el('small', { text: '總支出' }),
        el('div', { class: 'm-total' }, [el('span', { text: '¥' }), el('b', { text: fmt(total) })]),
        el('div', { class: 'm-sub' }, [
          el('span', { text: '≈ ' + hkd(total) }),
          daysWithSpend ? el('span', { text: '旅程中每日平均 ¥' + fmt(list.filter(function (e) { return e.day >= 0; }).reduce(function (s, e) { return s + toJPY(e); }, 0) / daysWithSpend) }) : null
        ]),
        budget ? el('div', { class: 'm-budget' + (used > 1 ? ' over' : used > .85 ? ' near' : '') }, [
          el('div', { class: 'm-bar' }, [el('i', { style: 'transform:scaleX(' + Math.min(used, 1).toFixed(4) + ')' })]),
          el('div', { class: 'm-bud-t' }, [
            el('span', { text: '預算 ¥' + fmt(budget) }),
            el('b', { text: used > 1 ? '超支 ¥' + fmt(total - budget) : '剩 ¥' + fmt(budget - total) + '（' + hkd(budget - total) + '）' })
          ])
        ]) : null
      ]),

      kick(1, editing ? '修改紀錄' : '記一筆'),
      rise(form),

      catRows.length ? kick(2, '分類') : null,
      catRows.length ? rise(el('div', { class: 'card m-cats' }, catRows.map(function (c) {
        var v = byCat[c.k];
        return el('div', { class: 'm-cat cat-' + c.k }, [
          el('span', { class: 'm-cat-n' }, [el('i'), c.name]),
          el('div', { class: 'm-bar' }, [el('i', { style: 'transform:scaleX(' + (v / total).toFixed(4) + ')' })]),
          el('b', { text: '¥' + fmt(v) }),
          el('small', { text: Math.round(v / total * 100) + '%' })
        ]);
      }))) : null,

      kick(catRows.length ? 3 : 2, '明細', list.length ? list.length + ' 筆' : null),
      list.length ? el('div', { class: 'm-days' }, dayKeys.map(function (d) {
        var items = groups[d].slice().sort(function (a, b) { return b.t - a.t; });
        var sum = items.reduce(function (s, e) { return s + toJPY(e); }, 0);
        return rise(el('div', { class: 'rows m-day' }, [
          el('div', { class: 'm-day-h' }, [el('b', { text: moneyDayName(d) }), el('span', { text: '¥' + fmt(sum) + ' · ' + hkd(sum) })])
        ].concat(items.map(function (e) {
          return el('button', { type: 'button', class: 'm-row press cat-' + e.cat, dataset: { id: e.id }, onclick: function () {
            moneyEdit = e.id; render();
            var f = document.querySelector('.m-form');
            if (f) { f.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' }); }
          } }, [
            el('span', { class: 'm-dot' }),
            el('span', { class: 'm-what' }, [el('b', { text: e.note || catName(e.cat) }), el('small', { text: catName(e.cat) + (e.pay ? ' · ' + payName(e.pay) : '') })]),
            el('span', { class: 'm-amt-r' }, [
              el('b', { text: e.cur === 'HKD' ? 'HK$' + e.amt.toLocaleString('en-US') : '¥' + fmt(e.amt) }),
              el('small', { text: e.cur === 'HKD' ? '≈ ¥' + fmt(toJPY(e)) : '≈ ' + hkd(e.amt) })
            ])
          ]);
        }))));
      })) : el('p', { class: 'empty', text: '未有紀錄。喺上面記低第一筆。' }),

      kick(catRows.length ? 4 : 3, '匯率・預算'),
      rise(el('div', { class: 'card' }, [
        el('p', { text: 'HK$1 = ¥' + fxRate().toFixed(2) + (manual ? '（自訂）' : fx ? '（自動，' + new Date(fx.t).toLocaleDateString('zh-HK') + ' 更新）' : '（預設值，有網會自動更新）') }),
        el('div', { class: 'field-row' }, [
          el('label', { class: 'fld' }, ['自訂匯率 ', el('em', { text: 'HK$1 = ¥…，留空就用自動' }), fxInput]),
          el('label', { class: 'fld' }, ['總預算 ', el('em', { text: '日圓' }), budgetInput])
        ]),
        el('div', { class: 'actions' }, [el('button', { type: 'button', class: 'solid press', text: '儲存', onclick: function () {
          var f = parseFloat(fxInput.value);
          lsSet(FX_MANUAL, f > 0 ? String(f) : null);
          var b = Math.round(parseFloat(String(budgetInput.value).replace(/,/g, '')) || 0);
          var changed = (b || 0) !== (+t.budget || 0);
          if (b > 0) t.budget = b; else delete t.budget;
          render();
          if (changed) saveTrip('更新旅行預算'); else toast('已儲存', 1600, 'check');
        } })])
      ]))
    ]);
  }

  // 匯率更新咗：淨係重畫記帳頁（唔好打斷緊輸入緊嘅表單）
  function refreshMoney() {
    var old = document.getElementById('money');
    if (!old || old.contains(document.activeElement)) return;
    var fresh = renderMoney();
    if (old.classList.contains('active')) fresh.classList.add('active');
    old.replaceWith(fresh);
  }

  function delExpense(e) {
    if (!confirm('刪除呢筆紀錄？')) return;
    state.trip.expenses = (state.trip.expenses || []).filter(function (x) { return x.id !== e.id; });
    moneyEdit = null;
    render();
    saveTrip('刪除記帳紀錄');
  }

  // ================= 離線模式 =================
  var MEDIA_CACHE = 'kansai-media-v1';
  var offlineStat = { done: 0, total: 0, busy: false };
  function mediaUrls() {
    return state.photos.map(function (p) { return new URL(p.url, location.href).href; });
  }
  function precacheMedia(loud) {
    if (!('caches' in window) || offlineStat.busy || navigator.onLine === false) return Promise.resolve();
    var urls = mediaUrls();
    offlineStat = { done: 0, total: urls.length, busy: true };
    paintOffline();
    return caches.open(MEDIA_CACHE).then(function (c) {
      var chain = Promise.resolve();
      urls.forEach(function (u) {
        chain = chain.then(function () {
          return c.match(u).then(function (hit) {
            if (hit) return;
            return fetch(u, { mode: 'cors' }).then(function (r) { if (r.ok) return c.put(u, r); });
          }).then(function () { offlineStat.done++; paintOffline(); }, function () { paintOffline(); });
        });
      });
      return chain;
    }).then(function () {
      offlineStat.busy = false;
      paintOffline();
      if (loud) toast(offlineStat.done === offlineStat.total ? '全部檔案已儲存，可以離線睇' : '部分檔案下載唔到，有網再試', 2600, offlineStat.done === offlineStat.total ? 'check' : 'alert');
    }, function () { offlineStat.busy = false; paintOffline(); });
  }
  function renderOfflineCard() {
    return el('div', { class: 'card rise', style: '--i:2' }, [
      el('div', { class: 'card-title' }, [icon('offline'), '離線模式']),
      el('p', { text: '行程、預約編號、記帳同相片會儲存喺呢部手機，搭地鐵或者冇網都睇到。離線時改嘅嘢會先存喺手機，有網會自動上載。' }),
      el('p', { class: 'off-stat' }),
      el('div', { class: 'actions' }, [el('button', { type: 'button', class: 'ghost press', onclick: function () { precacheMedia(true); } }, [icon('download'), '立即下載全部相片'])])
    ]);
  }
  function paintOffline() {
    var p = document.querySelector('.off-stat');
    if (!p) return;
    var sw = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
    p.textContent = (sw ? '✓ 離線模式已啟用' : '離線模式準備中（重新開一次網頁就會啟用）') +
      (offlineStat.total ? ' · 相片 ' + offlineStat.done + ' / ' + offlineStat.total + (offlineStat.busy ? ' 下載中…' : ' 已儲存') : '');
  }
  function updateOnline() {
    body.classList.toggle('is-offline', navigator.onLine === false);
    if (navigator.onLine === false) { setSync('offline'); return; }
    // 返回線上：上載離線時嘅修改
    if (state.token && lsGet(LS.draft) && state.trip) {
      saveTrip('上載離線時嘅修改').then(function (ok) { if (ok) toast('已上載離線時嘅修改', 2400, 'cloud'); });
    } else if (state.token && state.source !== 'github') boot();
    else if (state.token) setSync('ok');
    fillWeather();
  }
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; }).then(paintOffline).catch(function () {});
    });
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
    return Promise.all([loadTrip(), loadPhotos()]).then(function () {
      render();
      if (navigator.onLine === false) setSync('offline');
      paintOffline();
      loadFx().then(function (ch) { if (ch) refreshMoney(); });
      setTimeout(function () { precacheMedia(false); }, 2500);
    }).catch(function (e) {
      document.getElementById('main').textContent = '載入失敗：' + e.message;
    });
  }
  boot();
})();

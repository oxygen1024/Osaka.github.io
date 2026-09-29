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
  var IMG_EXT = /\.(jpe?g|png|webp|gif|heic)$/i;
  var PDF_EXT = /\.pdf$/i;

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
    tab: null,
    sync: ''
  };
  try { state.checks = JSON.parse(lsGet(LS.checks) || '{}') || {}; } catch (e) { state.checks = {}; }

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
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  var toastTimer;
  function toast(msg, ms) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, ms || 2600);
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

  function mapUrl(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
  function telUrl(p) { return 'tel:' + p.replace(/[^\d+]/g, ''); }

  function newId() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ================= GitHub API =================
  function api(method, path, data) {
    return fetch('https://api.github.com/repos/' + state.repo + '/' + path, {
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
        var err = new Error('GitHub ' + r.status);
        err.status = r.status;
        throw err;
      }
      return r.status === 204 ? null : r.json();
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
        toast('連接 GitHub 失敗（' + e.message + '），暫時顯示網站版本', 4000);
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
      toast('已儲存（只喺呢部手機）');
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
        toast('已儲存到 GitHub ☁️');
        return true;
      }).catch(function (e) {
        setSync('error');
        if (e.status === 409 || e.status === 422) {
          toast('其他裝置啱啱改過，已重新載入最新版本，請再改一次', 5000);
          return loadTrip().then(function () { render(); return false; });
        }
        lsSet(LS.draft, json);
        toast('儲存到 GitHub 失敗（' + e.message + '），已先存喺本機', 5000);
        return false;
      });
    });
    return saving;
  }

  function setSync(s) {
    state.sync = s;
    var b = document.getElementById('sync');
    var label = {
      ok: '☁️ 已同步',
      saving: '⏳ 儲存中…',
      error: '⚠️ 未同步',
      local: '📱 只存本機'
    }[s] || '';
    b.textContent = label;
    b.className = 'sync ' + s;
  }

  // ================= 畫面 =================
  function render() {
    var t = state.trip;
    document.getElementById('trip-title').textContent = t.title;
    document.title = t.title;
    var s = dayDate(0), e = dayDate(t.days.length - 1);
    document.getElementById('trip-sub').textContent =
      s.getUTCFullYear() + '/' + md(s) + '（' + wd(s) + '）– ' + md(e) + '（' + wd(e) + '）· ' + t.travellers + ' 人';

    renderTabs();
    var main = document.getElementById('main');
    main.textContent = '';
    main.appendChild(renderOverview());
    t.days.forEach(function (d, i) { main.appendChild(renderDay(d, i)); });
    main.appendChild(renderTodo());
    main.appendChild(renderSettings());
    refreshChecks();
    show(state.tab || pickStartTab(), true);
  }

  function renderTabs() {
    var nav = document.getElementById('tabs');
    nav.textContent = '';
    var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
    nav.appendChild(el('button', { type: 'button', dataset: { tab: 'overview' } }, ['🧳', el('small', { text: '總覽' })]));
    state.trip.days.forEach(function (d, i) {
      var dd = dayDate(i);
      nav.appendChild(el('button', {
        type: 'button',
        class: ymd(dd) === today ? 'today' : null,
        dataset: { tab: 'day' + (i + 1), date: ymd(dd) }
      }, ['Day ' + (i + 1), el('small', { text: md(dd) })]));
    });
    nav.appendChild(el('button', { type: 'button', dataset: { tab: 'todo' } },
      ['✅', el('small', null, ['待辦 ', el('b', { class: 'badge', id: 'todo-count', hidden: true })])]));
    nav.appendChild(el('button', { type: 'button', dataset: { tab: 'settings' } }, ['⚙️', el('small', { text: '設定' })]));
  }

  function tag(status, key) {
    if (status !== 'confirmed' && status !== 'pending') return null;
    var ok = status === 'confirmed';
    return el('label', { class: 'tag ' + (ok ? 'ok' : 'todo') }, [
      el('input', { type: 'checkbox', dataset: { key: key } }),
      el('span', { text: ok ? '已確認' : '待處理' })
    ]);
  }

  var PRIO = { high: ['🔴 高', 'high'], mid: ['🔵 中', 'mid'], low: ['⚪ 低', 'low'] };
  function prioChip(p) { return PRIO[p] ? el('span', { class: 'prio ' + PRIO[p][1], text: PRIO[p][0] }) : null; }

  function actions(place, phone) {
    if (!place && !phone) return null;
    return el('div', { class: 'actions' }, [
      place ? el('a', { class: 'btn', href: mapUrl(place), target: '_blank', rel: 'noopener', text: '📍 地圖' }) : null,
      phone ? el('a', { class: 'btn', href: telUrl(phone), text: '📞 ' + phone }) : null
    ]);
  }

  function renderOverview() {
    var t = state.trip;
    var sec = el('section', { class: 'panel', id: 'overview' }, [el('h2', { text: '行程總覽' })]);

    sec.appendChild(el('ol', { class: 'daylist' }, t.days.map(function (d, i) {
      var dd = dayDate(i);
      return el('li', null, [el('a', { href: '#day' + (i + 1) }, [
        el('b', { text: 'Day ' + (i + 1) }),
        el('span', { text: md(dd) + '（' + wd(dd) + '）' }),
        d.title
      ])]);
    })));

    sec.appendChild(el('h3', { text: '✈️ 機票' }));
    (t.flights || []).forEach(function (f) {
      sec.appendChild(el('div', { class: 'card' + (f.status ? ' ' + f.status : '') }, [
        el('div', { class: 'card-head' }, [el('b', { text: f.label + '・' + f.code }), tag(f.status, 'flight-' + f.code)]),
        el('div', { class: 'muted', text: f.date }),
        el('div', { class: 'flight' }, [
          el('div', null, [el('strong', { text: f.dep }), el('span', { text: f.from })]),
          el('div', { class: 'arrow', text: '→' }),
          el('div', null, [el('strong', { text: f.arr }), el('span', { text: f.to })])
        ])
      ]));
    });

    sec.appendChild(el('h3', { text: '🏨 住宿' }));
    (t.hotels || []).forEach(function (h, i) {
      sec.appendChild(el('div', { class: 'card' + (h.status ? ' ' + h.status : '') }, [
        el('div', { class: 'card-head' }, [el('b', { text: h.name }), tag(h.status, 'hotel-' + (i + 1))]),
        el('div', { class: 'muted', text: h.checkin + ' 入住 → ' + h.checkout + ' 退房（' + h.nights + ' 晚）' }),
        el('div', { class: 'field', text: '🏠 ' + h.address }),
        actions(h.name, h.phone)
      ]));
    });

    sec.appendChild(el('h3', { text: '🚆 交通票務' }));
    (t.transport || []).forEach(function (x, i) {
      sec.appendChild(el('div', { class: 'card' + (x.status ? ' ' + x.status : '') }, [
        el('div', { class: 'card-head' }, [el('b', { text: x.what }), tag(x.status, 'transport-' + (i + 1))]),
        x.ref ? el('div', { class: 'field' }, ['🔖 預約編號：', el('code', { class: 'ref', text: x.ref })]) : null,
        x.note ? el('div', { class: 'muted', text: x.note }) : null
      ]));
    });

    sec.appendChild(el('h3', { text: '📎 預訂截圖' }));
    (t.photo_folders || []).forEach(function (c) {
      sec.appendChild(el('h4', { text: c.name }));
      sec.appendChild(gallery(c.folder));
    });
    return sec;
  }

  function renderItem(item, di, ii) {
    var place = item.place || item.address;
    return el('li', { class: [item.status, item.priority ? 'prio-' + item.priority : ''].join(' ') }, [
      el('div', { class: 'row' }, [
        item.time ? el('time', { text: item.time }) : null,
        prioChip(item.priority),
        el('span', { class: 'spacer' }),
        tag(item.status, item.id),
        el('button', { type: 'button', class: 'icon edit', 'aria-label': '編輯', text: '✏️', onclick: function () { openEdit(di, ii); } })
      ]),
      el('div', { class: 'what', text: item.what }),
      item.address ? el('div', { class: 'field', text: '🏠 ' + item.address }) : null,
      item.ref ? el('div', { class: 'field' }, ['🔖 預約編號：', el('code', { class: 'ref', text: item.ref })]) : null,
      item.note ? el('div', { class: 'note', text: item.note }) : null,
      actions(place, item.phone)
    ]);
  }

  function renderDay(d, i) {
    var dd = dayDate(i);
    return el('section', { class: 'panel', id: 'day' + (i + 1) }, [
      el('h2', null, [
        el('span', { text: 'Day ' + (i + 1) }),
        el('span', { class: 'date', text: dd.getUTCFullYear() + '/' + md(dd) + '（' + wd(dd) + '）' })
      ]),
      el('div', { class: 'dayhead' }, [
        el('p', { class: 'daytitle', text: d.title }),
        el('button', { type: 'button', class: 'icon edit', 'aria-label': '編輯當日', text: '✏️', onclick: function () { openDayEdit(i); } })
      ]),
      d.alert ? el('p', { class: 'alert', text: '⚠️ ' + d.alert }) : null,
      el('ol', { class: 'timeline' }, d.items.map(function (it, ii) { return renderItem(it, i, ii); })),
      el('button', { type: 'button', class: 'btn add', text: '＋ 新增行程', onclick: function () { openEdit(i, -1); } }),
      el('h3', { text: '📷 相片 / 文件' }),
      gallery('day' + (i + 1))
    ]);
  }

  function renderTodo() {
    var list = [];
    state.trip.days.forEach(function (d, di) {
      d.items.forEach(function (it, ii) { if (it.status === 'pending') list.push({ it: it, di: di, ii: ii }); });
    });
    return el('section', { class: 'panel', id: 'todo' }, [
      el('h2', { text: '待辦事項' }),
      el('p', { class: 'muted', text: '所有標咗「待處理」嘅行程都會自動列喺度。剔咗會同對應嗰日一齊剔（剔選只存喺呢部手機）。' }),
      list.length ? el('ul', { class: 'todolist' }, list.map(function (x) {
        return el('li', null, [
          el('label', { class: 'tag todo' }, [
            el('input', { type: 'checkbox', class: 'todo-box', dataset: { key: x.it.id } }),
            el('span', { text: '待處理' })
          ]),
          el('span', { class: 'todo-text' }, [
            el('small', { text: 'Day ' + (x.di + 1) + (x.it.time ? ' · ' + x.it.time : '') }),
            x.it.what
          ]),
          el('button', { type: 'button', class: 'icon edit', 'aria-label': '編輯', text: '✏️', onclick: function () { openEdit(x.di, x.ii); } }),
          el('a', { class: 'btn', href: '#day' + (x.di + 1), text: '→' })
        ]);
      })) : el('p', { class: 'empty', text: '冇待處理事項 🎉' })
    ]);
  }

  function renderSettings() {
    var connected = !!state.token;
    var draft = lsGet(LS.draft);
    var tokenInput = el('input', { type: 'password', placeholder: 'github_pat_…', value: state.token, autocomplete: 'off' });
    var branchInput = el('input', { value: state.branch });

    return el('section', { class: 'panel', id: 'settings' }, [
      el('h2', { text: '設定' }),

      el('div', { class: 'card' }, [
        el('b', { text: connected ? '☁️ 已連接 GitHub' : '📱 未連接 GitHub' }),
        el('p', { class: 'muted', text: connected
          ? '修改行程同上載相片會直接儲存到 GitHub，電腦同手機都會見到。'
          : '而家修改只會存喺呢部手機，亦唔可以上載相片。連接 GitHub 之後就可以同步同上載。' }),
        el('label', null, ['GitHub Token', tokenInput]),
        el('label', null, ['Branch（網站用緊邊個 branch）', branchInput]),
        el('div', { class: 'actions' }, [
          el('button', { type: 'button', class: 'btn primary', text: '💾 儲存並連接', onclick: function () {
            state.token = tokenInput.value.trim();
            state.branch = branchInput.value.trim() || body.dataset.branch || 'main';
            lsSet(LS.token, state.token || null);
            lsSet(LS.branch, state.branch === body.dataset.branch ? null : state.branch);
            if (!state.token) { toast('已中斷連接'); boot(); return; }
            api('GET', '').then(function (r) {
              if (!r.permissions || !r.permissions.push) throw new Error('Token 冇寫入權限');
              toast('連接成功 ✅');
              boot();
            }).catch(function (e) {
              toast('連接失敗：' + e.message + '（檢查 token 同權限）', 5000);
            });
          } }),
          connected ? el('button', { type: 'button', class: 'btn', text: '中斷連接', onclick: function () {
            state.token = '';
            lsSet(LS.token, null);
            toast('已中斷連接');
            boot();
          } }) : null
        ])
      ]),

      draft ? el('div', { class: 'card pending' }, [
        el('b', { text: '📱 呢部手機有未上載嘅修改' }),
        el('div', { class: 'actions' }, [
          connected ? el('button', { type: 'button', class: 'btn primary', text: '⬆️ 上載本機修改到 GitHub', onclick: function () {
            if (!confirm('用呢部手機嘅版本覆蓋 GitHub 上面嘅行程？')) return;
            state.trip = JSON.parse(draft);
            saveTrip('上載手機本機修改').then(function (ok) { if (ok) { lsSet(LS.draft, null); render(); } });
          } }) : null,
          el('button', { type: 'button', class: 'btn danger', text: '🗑 刪除本機修改', onclick: function () {
            if (!confirm('刪除呢部手機嘅修改，還原做網站版本？')) return;
            lsSet(LS.draft, null);
            boot();
          } })
        ])
      ]) : null,

      el('h3', { text: '點樣攞 GitHub Token（只需做一次）' }),
      el('ol', { class: 'steps' }, [
        el('li', null, ['用瀏覽器打開 ', el('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener', text: 'GitHub → 新增 Fine-grained token' })]),
        el('li', { text: 'Token name 隨便填，例如「關西行程」；Expiration 揀旅行完之後嘅日子' }),
        el('li', { text: 'Repository access 揀「Only select repositories」→ 揀 ' + state.repo }),
        el('li', { text: 'Permissions → Repository permissions → Contents 揀「Read and write」' }),
        el('li', { text: '撳 Generate token，複製 github_pat_ 開頭嗰串字，貼落上面再撳「儲存並連接」' })
      ]),
      el('p', { class: 'muted', text: '⚠️ Token 只會儲存喺呢部裝置嘅瀏覽器。唔好俾其他人睇到；唔見咗手機可以喺 GitHub 刪除個 token。' })
    ]);
  }

  // ================= 相片 =================
  function gallery(folder) {
    var prefix = 'photos/' + folder + '/';
    var files = state.photos.filter(function (p) { return p.path.indexOf(prefix) === 0 && p.path.indexOf('/', prefix.length) < 0; })
      .sort(function (a, b) { return a.path.localeCompare(b.path); });
    var wrap = el('div', { class: 'gallery-wrap' });
    var grid = el('div', { class: 'gallery' }, files.map(function (p) {
      var name = p.path.slice(prefix.length).replace(/\.[^.]+$/, '');
      if (PDF_EXT.test(p.path)) {
        return el('a', { class: 'thumb pdf', href: p.url, target: '_blank', rel: 'noopener' }, [el('b', { text: '📄 PDF' }), el('span', { text: name })]);
      }
      return el('button', { type: 'button', class: 'thumb', onclick: function () { openViewer(p, name); } }, [
        el('img', { src: p.url, loading: 'lazy', alt: name }),
        el('span', { text: name })
      ]);
    }));
    wrap.appendChild(grid);
    if (!files.length) wrap.appendChild(el('p', { class: 'empty', text: '未有相片' }));
    wrap.appendChild(el('button', { type: 'button', class: 'btn upload', text: '📤 上載相片 / PDF', onclick: function () { pickFiles(folder); } }));
    return wrap;
  }

  var uploadFolder = null;
  var fileInput = document.getElementById('file-input');
  function pickFiles(folder) {
    if (!state.token) {
      toast('要先喺「⚙️ 設定」連接 GitHub 先可以上載相片', 4000);
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
        toast('上載中 ' + (idx + 1) + ' / ' + files.length + '…', 60000);
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
      toast(done ? '已上載 ' + done + ' 個檔案 ✅' : '已取消');
      render();
    }).catch(function (e) {
      toast('上載失敗：' + e.message, 5000);
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

  var viewer = document.getElementById('viewer');
  var vImg = viewer.querySelector('img');
  var vCap = viewer.querySelector('.caption');
  var vDel = document.getElementById('photo-delete');
  var viewing = null;
  function openViewer(p, name) {
    viewing = p;
    vImg.src = p.url;
    vCap.textContent = name;
    vDel.hidden = !(state.token && p.sha);
    viewer.hidden = false;
  }
  function closeViewer() { viewer.hidden = true; vImg.removeAttribute('src'); viewing = null; }
  viewer.addEventListener('click', function (e) { if (e.target === viewer || e.target.classList.contains('close')) closeViewer(); });
  vDel.addEventListener('click', function () {
    var p = viewing;
    if (!p || !confirm('確定刪除「' + vCap.textContent + '」？')) return;
    api('DELETE', 'contents/' + encPath(p.path), { message: '手機刪除相片 ' + p.path, sha: p.sha, branch: state.branch })
      .then(function () {
        state.photos = state.photos.filter(function (x) { return x !== p; });
        closeViewer();
        render();
        toast('已刪除');
      }).catch(function (e) { toast('刪除失敗：' + e.message, 4000); });
  });

  // ================= 編輯行程 =================
  var sheet = document.getElementById('sheet');
  var form = document.getElementById('edit-form');
  var editing = null; // {di, ii}
  var FIELDS = ['time', 'what', 'status', 'priority', 'address', 'place', 'phone', 'ref', 'note'];

  function openEdit(di, ii) {
    editing = { di: di, ii: ii };
    var item = ii >= 0 ? state.trip.days[di].items[ii] : {};
    document.getElementById('edit-title').textContent = ii >= 0 ? '編輯行程' : '新增行程（Day ' + (di + 1) + '）';
    var daySel = form.elements.day;
    daySel.textContent = '';
    state.trip.days.forEach(function (d, i) {
      daySel.appendChild(el('option', { value: i, text: 'Day ' + (i + 1) + '・' + md(dayDate(i)) }));
    });
    daySel.value = di;
    FIELDS.forEach(function (f) { form.elements[f].value = item[f] || ''; });
    document.getElementById('edit-delete').hidden = ii < 0;
    form.querySelectorAll('[data-move]').forEach(function (b) { b.disabled = ii < 0; });
    sheet.hidden = false;
    body.classList.add('noscroll');
  }

  function closeSheets() {
    sheet.hidden = true;
    document.getElementById('day-sheet').hidden = true;
    body.classList.remove('noscroll');
    editing = null;
  }
  document.querySelectorAll('.sheet').forEach(function (s) {
    s.addEventListener('click', function (e) { if (e.target === s || e.target.hasAttribute('data-close')) closeSheets(); });
  });

  function timeKey(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    return m ? (+m[1]) * 60 + (+m[2]) : null;
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
    FIELDS.forEach(function (f) { item[f] = form.elements[f].value.trim(); });
    var target = +form.elements.day.value;
    if (old && target === editing.di) {
      days[editing.di].items[editing.ii] = item;
    } else {
      if (old) days[editing.di].items.splice(editing.ii, 1);
      insertByTime(days[target].items, item);
    }
    closeSheets();
    render();
    saveTrip((old ? '修改' : '新增') + '行程：Day ' + (target + 1) + ' ' + item.what);
  });

  form.querySelectorAll('[data-move]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!editing || editing.ii < 0) return;
      var items = state.trip.days[editing.di].items;
      var to = editing.ii + (+b.dataset.move);
      if (to < 0 || to >= items.length) { toast('已經係' + (to < 0 ? '第一' : '最後') + '項'); return; }
      var tmp = items[to]; items[to] = items[editing.ii]; items[editing.ii] = tmp;
      editing.ii = to;
      render();
      saveTrip('調整 Day ' + (editing.di + 1) + ' 行程次序');
      toast('已移到第 ' + (to + 1) + ' 項');
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
    daySheet.hidden = false;
    body.classList.add('noscroll');
  }
  dayForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (editingDay == null) return;
    var d = state.trip.days[editingDay];
    d.title = dayForm.elements.title.value.trim();
    d.alert = dayForm.elements.alert.value.trim();
    var i = editingDay;
    editingDay = null;
    closeSheets();
    render();
    saveTrip('修改 Day ' + (i + 1) + ' 主題');
  });

  // ================= 分頁 =================
  function show(id, silent) {
    var tabs = document.querySelectorAll('#tabs button');
    var found = false;
    tabs.forEach(function (b) {
      var on = b.dataset.tab === id;
      b.classList.toggle('active', on);
      if (on) { found = true; b.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    });
    if (!found) return false;
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('active', p.id === id); });
    state.tab = id;
    lsSet(LS.tab, id);
    if (!silent) window.scrollTo(0, 0);
    return true;
  }

  function pickStartTab() {
    var hash = location.hash.slice(1);
    if (hash && document.getElementById(hash)) return hash;
    var today = document.querySelector('#tabs button.today');
    if (today) return today.dataset.tab;
    var saved = lsGet(LS.tab);
    if (saved && document.getElementById(saved)) return saved;
    return 'overview';
  }

  document.getElementById('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]');
    if (!b) return;
    show(b.dataset.tab);
    history.replaceState(null, '', '#' + b.dataset.tab);
  });
  document.getElementById('sync').addEventListener('click', function () { show('settings'); });
  window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });

  // ================= 剔選框 =================
  function refreshChecks() {
    document.querySelectorAll('input[type=checkbox][data-key]').forEach(function (b) {
      b.checked = !!state.checks[b.dataset.key];
      var box = b.closest('li, .card');
      if (box) box.classList.toggle('checked', b.checked);
    });
    var left = 0;
    document.querySelectorAll('.todo-box').forEach(function (b) { if (!b.checked) left++; });
    var badge = document.getElementById('todo-count');
    if (badge) { badge.textContent = left || ''; badge.hidden = !left; }
  }
  document.getElementById('main').addEventListener('change', function (e) {
    var b = e.target;
    if (!b.matches || !b.matches('input[type=checkbox][data-key]')) return;
    if (b.checked) state.checks[b.dataset.key] = 1; else delete state.checks[b.dataset.key];
    lsSet(LS.checks, JSON.stringify(state.checks));
    refreshChecks();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeViewer(); closeSheets(); }
  });

  // ================= 啟動 =================
  function boot() {
    return Promise.all([loadTrip(), loadPhotos()]).then(render).catch(function (e) {
      document.getElementById('main').textContent = '載入失敗：' + e.message;
    });
  }
  boot();
})();

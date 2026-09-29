(function () {
  var tabs = document.querySelectorAll('#tabs button');
  var TAB_KEY = 'kansai-tab';
  var CHECK_KEY = 'kansai-checks';

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) {}
    return null;
  }

  // ---------- 分頁 ----------
  function show(id) {
    var found = false;
    tabs.forEach(function (b) {
      var on = b.dataset.tab === id;
      b.classList.toggle('active', on);
      if (on) { found = true; b.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    });
    if (!found) return false;
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.toggle('active', p.id === id);
    });
    store(TAB_KEY, id);
    return true;
  }

  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      show(b.dataset.tab);
      history.replaceState(null, '', '#' + b.dataset.tab);
      window.scrollTo(0, 0);
    });
  });
  window.addEventListener('hashchange', function () {
    if (show(location.hash.slice(1))) window.scrollTo(0, 0);
  });

  // 今日日期（日本時間）
  var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
  var todayTab = null;
  tabs.forEach(function (b) {
    if (b.dataset.date === today) { b.classList.add('today'); todayTab = b.dataset.tab; }
  });

  var hash = location.hash.slice(1);
  if (!(hash && show(hash)) && !(todayTab && show(todayTab)) && !show(store(TAB_KEY) || '')) {
    show(tabs[0].dataset.tab);
  }

  // ---------- 剔選框（儲存喺本機） ----------
  var checks = {};
  try { checks = JSON.parse(store(CHECK_KEY) || '{}') || {}; } catch (e) { checks = {}; }
  var boxes = document.querySelectorAll('input[type=checkbox][data-key]');

  function refresh() {
    boxes.forEach(function (b) {
      b.checked = !!checks[b.dataset.key];
      var li = b.closest('li, .card');
      if (li) li.classList.toggle('checked', b.checked);
    });
    var left = 0;
    document.querySelectorAll('.todo-box').forEach(function (b) { if (!b.checked) left++; });
    var badge = document.getElementById('todo-count');
    badge.textContent = left || '';
    badge.hidden = !left;
  }

  boxes.forEach(function (b) {
    b.addEventListener('change', function () {
      if (b.checked) checks[b.dataset.key] = 1; else delete checks[b.dataset.key];
      store(CHECK_KEY, JSON.stringify(checks));
      refresh();
    });
  });
  refresh();

  // ---------- 相片放大 ----------
  var viewer = document.getElementById('viewer');
  var vImg = viewer.querySelector('img');
  var vCap = viewer.querySelector('.caption');
  document.querySelectorAll('button.thumb').forEach(function (t) {
    t.addEventListener('click', function () {
      vImg.src = t.dataset.full;
      vCap.textContent = t.dataset.name;
      viewer.hidden = false;
    });
  });
  function close() { viewer.hidden = true; vImg.removeAttribute('src'); }
  viewer.addEventListener('click', function (e) { if (e.target !== vImg) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();

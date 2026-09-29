(function () {
  var tabs = document.querySelectorAll('#tabs button');
  var KEY = 'osaka-tab';

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
    try { localStorage.setItem(KEY, id); } catch (e) {}
    return true;
  }

  tabs.forEach(function (b) {
    b.addEventListener('click', function () { show(b.dataset.tab); window.scrollTo(0, 0); });
  });

  // 今日日期（日本時間）
  var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
  var todayTab = null;
  tabs.forEach(function (b) {
    if (b.dataset.date === today) { b.classList.add('today'); todayTab = b.dataset.tab; }
  });

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (!(todayTab && show(todayTab)) && !(saved && show(saved))) show(tabs[0].dataset.tab);

  // 相片放大
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

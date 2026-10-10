// 旅のしおり — 離線模式
// 網頁同行程：有網就攞最新，冇網用返上次嘅版本
// 相片同字型：存咗就直接用
var SHELL = 'kansai-shell-v1';
var MEDIA = 'kansai-media-v1';
var CORE = ['./', 'assets/style.css', 'assets/app.js', 'data/trip.json', 'photos.json', 'manifest.webmanifest', 'assets/icon.svg', 'assets/icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) {
    return Promise.all(CORE.map(function (u) {
      return fetch(u, { cache: 'no-store' }).then(function (r) { if (r.ok) return c.put(key(new URL(u, self.registration.scope)), r); }).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== SHELL && k !== MEDIA; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// 同一個檔唔理 ?v= / ?t=，首頁統一用 scope 做 key
function key(url) {
  var u = new URL(url);
  var scope = new URL(self.registration.scope);
  if (u.origin === scope.origin && (u.pathname === scope.pathname || u.pathname === scope.pathname + 'index.html')) return scope.href;
  return u.origin + u.pathname;
}

function networkFirst(req, wait) {
  var k = key(req.url);
  return new Promise(function (resolve) {
    var settled = false;
    function fallback() {
      return caches.open(SHELL).then(function (c) { return c.match(k); }).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.open(SHELL).then(function (c) { return c.match(self.registration.scope); }) : null);
      });
    }
    // 訊號差（例如地鐵）唔好等太耐，先出舊版本
    var timer = setTimeout(function () {
      fallback().then(function (hit) { if (hit && !settled) { settled = true; resolve(hit); } });
    }, wait);
    fetch(req).then(function (r) {
      if (r.ok) { var copy = r.clone(); caches.open(SHELL).then(function (c) { c.put(k, copy); }); }
      clearTimeout(timer);
      if (!settled) { settled = true; resolve(r); }
    }, function () {
      clearTimeout(timer);
      fallback().then(function (hit) {
        if (settled) return;
        settled = true;
        resolve(hit || new Response('離線中，未有儲存呢個檔案', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
      });
    });
  });
}

function cacheFirst(req, name) {
  return caches.open(name).then(function (c) {
    return c.match(req.url).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (r) {
        if (r.ok || r.type === 'opaque') c.put(req.url, r.clone());
        return r;
      });
    });
  });
}

function staleWhileRevalidate(req) {
  return caches.open(SHELL).then(function (c) {
    return c.match(req.url).then(function (hit) {
      var net = fetch(req).then(function (r) { if (r.ok || r.type === 'opaque') c.put(req.url, r.clone()); return r; });
      return hit || net;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  var scope = new URL(self.registration.scope);
  if (u.origin === scope.origin) {
    if (u.pathname.indexOf(scope.pathname + 'photos/') === 0) e.respondWith(cacheFirst(req, MEDIA));
    else e.respondWith(networkFirst(req, req.mode === 'navigate' ? 3500 : 5000));
  } else if (u.hostname === 'raw.githubusercontent.com' && u.pathname.indexOf('/photos/') > 0) {
    e.respondWith(cacheFirst(req, MEDIA));
  } else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req));
  }
  // 其他（GitHub API、天氣、匯率、航班）由網頁自己處理同快取
});

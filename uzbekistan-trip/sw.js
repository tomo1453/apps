// オフライン対応：電波があれば最新版を取得、なければ端末に保存した版を表示する
// index.html を更新したら CACHE の番号を上げてください
const CACHE = 'uzbekistan-trip-v10';
// 見どころの写真（Wikimedia Commons）は別のキャッシュに保存（バージョンを上げても消さない）
const PHOTO_CACHE = 'uzbekistan-photos';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('uzbekistan-trip-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // 写真：一度取得したら端末に保存し、以後は保存分を使う（オフラインでも表示）
  if (url.hostname === 'upload.wikimedia.org') {
    e.respondWith(
      caches.open(PHOTO_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request.url);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          if (res && (res.ok || res.type === 'opaque')) cache.put(e.request.url, res.clone());
          return res;
        } catch (err) {
          return new Response('', { status: 504 });
        }
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;
  if (!url.pathname.includes('/uzbekistan-trip/')) return;

  // アプリ本体：電波があれば最新版（4秒で応答がなければ保存分）、なければ保存分
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const network = fetch(e.request, { cache: 'no-cache' })
        .then((res) => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => null);
      const timeout = new Promise((r) => setTimeout(() => r(null), 4000));
      const res = await Promise.race([network, timeout]);
      if (res) return res;
      const cached = await cache.match(e.request, { ignoreSearch: true });
      if (cached) { e.waitUntil(network); return cached; }
      return (await network) || (await cache.match('./index.html')) ||
        new Response('オフラインです', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })
  );
});

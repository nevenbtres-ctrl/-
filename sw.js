/* ================== Service Worker — Tuba Depot ================== */
/* ملاحظة: عند تحديث الكود، غيّر رقم CACHE_VERSION لإجبار التحديث */

const CACHE_VERSION = 'v1';
const CACHE_NAME    = `tuba-depot-${CACHE_VERSION}`;

const LOCAL_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon.svg'
];

const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

/* ---------- التثبيت ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled([
        ...LOCAL_ASSETS.map(url => cache.add(url).catch(err => console.warn('cache miss:', url, err))),
        ...CDN_ASSETS.map(url => cache.add(url).catch(() => {}))
      ]);
    }).then(() => self.skipWaiting())
  );
});

/* ---------- التنشيط وحذف الكاش القديم ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---------- استراتيجية الجلب ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith('http')) return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        /* تحديث في الخلفية (stale-while-revalidate) */
        fetch(req).then(res => {
          if (res && res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then(res => {
        if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});

/* ---------- دعم التحديث الفوري ---------- */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

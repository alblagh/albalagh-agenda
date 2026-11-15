/* Service Worker - يجعل التطبيق يعمل بدون إنترنت على الهاتف والكمبيوتر */
const CACHE = 'albalagh-agenda-v4';
const FILES = ['./', './index.html', './css/style.css', './js/app.js', './manifest.json', './fonts/fonts.css',
  ...Array.from({length: 10}, (_, i) => `./fonts/tajawal-${i + 1}.woff2`),
  './lib/chart.umd.min.js', './lib/xlsx.full.min.js', './assets/logo.png', './assets/icon-192.png', './assets/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const same = new URL(e.request.url).origin === location.origin;
  // نطلب دائمًا أحدث نسخة من الخادم (بدون ذاكرة المتصفح) ونرجع للنسخة المحفوظة عند انقطاع الإنترنت
  e.respondWith(
    (same ? fetch(e.request.url, {cache: 'no-cache', credentials: 'same-origin'}) : fetch(e.request)).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window'}).then(list => list.length ? list[0].focus() : self.clients.openWindow('./index.html')));
});

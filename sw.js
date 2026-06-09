// ============================================================
// Service Worker — מוקד שיבוץ
// מאפשר עבודה אופליין ומאיץ טעינה
// ============================================================

const CACHE_NAME = 'moakad-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.14.0/dist/tabler-icons.min.css',
];

// ── התקנה: שמור את כל הקבצים ב-cache ──────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Cache partial fail:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── הפעלה: מחק cache ישן ──────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── בקשות: Cache First עם Fallback לרשת ───────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // בקשות API — תמיד מהרשת
  if (event.request.url.includes('/api/') ||
      event.request.url.includes('anthropic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // אופליין — החזר דף ראשי
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      });
    })
  );
});

// ── Push Notifications — התראות ──────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'יש עדכון חדש בסידור',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    dir: 'rtl',
    lang: 'he',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'פתח' },
      { action: 'close', title: 'סגור' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'מוקד שיבוץ', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
  }
});

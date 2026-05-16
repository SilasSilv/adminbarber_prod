const CACHE_NAME = 'adminbarber-v3'; // Incrementado para forçar atualização

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/og-image.png'
];

// =====================================================
// INSTALL
// =====================================================

self.addEventListener('install', event => {
  console.log('[SW] Install iniciado');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache criado:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Arquivos cacheados');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Erro no install:', err);
      })
  );
});

// =====================================================
// FETCH
// =====================================================

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(err => {
        console.error('[SW] Erro no fetch:', err);
      })
  );
});

// =====================================================
// ACTIVATE
// =====================================================

self.addEventListener('activate', event => {
  console.log('[SW] Activate iniciado');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service Worker ativado');
      return self.clients.claim();
    })
  );
});

// ... resto do código de push notifications mantido ...

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = {
      title: 'Lembrete',
      body: event.data ? event.data.text() : ''
    };
  }

  const title = payload.title || 'Lembrete de agendamento';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'appointment-reminder',
    data: payload.data || {},
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = data.confirmUrl || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      for (const w of wins) {
        if ('focus' in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
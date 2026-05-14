const CACHE_NAME = 'adminbarber-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
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
          console.log('[SW] Cache hit:', event.request.url);
          return response;
        }

        console.log('[SW] Fetch network:', event.request.url);

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

// =====================================================
// PUSH NOTIFICATIONS
// =====================================================

self.addEventListener('push', event => {
  console.log('[SW] PUSH RECEBIDO');

  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};

    console.log('[SW] PAYLOAD JSON:', payload);
  } catch (err) {
    console.warn('[SW] Payload não era JSON');

    payload = {
      title: 'Lembrete',
      body: event.data ? event.data.text() : ''
    };

    console.log('[SW] PAYLOAD TEXT:', payload);
  }

  const title = payload.title || 'Lembrete de agendamento';

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'appointment-reminder',
    data: payload.data || {},
    actions: payload.actions || [],
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  console.log('[SW] Exibindo notificação:', {
    title,
    options
  });

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[SW] Notificação exibida com sucesso');
      })
      .catch(err => {
        console.error('[SW] Erro ao exibir notificação:', err);
      })
  );
});

// =====================================================
// CLICK NA NOTIFICAÇÃO
// =====================================================

self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click');

  event.notification.close();

  const data = event.notification.data || {};

  let url = data.confirmUrl || '/';

  if (event.action === 'cancel') {
    url = data.cancelUrl || url;
  } else if (event.action === 'confirm') {
    url = data.confirmUrl || url;
  }

  console.log('[SW] Abrindo URL:', url);

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(wins => {

      for (const w of wins) {
        if ('focus' in w) {
          console.log('[SW] Focando janela existente');

          w.navigate(url);

          return w.focus();
        }
      }

      console.log('[SW] Abrindo nova janela');

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }).catch(err => {
      console.error('[SW] Erro no notificationclick:', err);
    })
  );
});

// =====================================================
// ERROS GERAIS
// =====================================================

self.addEventListener('error', event => {
  console.error('[SW] Erro global:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Promise rejeitada:', event.reason);
});
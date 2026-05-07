const CACHE_NAME = 'shuttlix-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/bus-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('SW: Pre-caching core assets');
      // Use allSettled to ensure failure of one doesn't kill the whole install
      const results = await Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)));
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn('SW: Some assets failed to cache:', failed);
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('SW: Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // API Calls: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          
          // If offline and request is for JSON
          if (event.request.headers.get('accept')?.includes('application/json')) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Offline', 
              message: 'Check your internet connection' 
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        })
    );
    return;
  }

  // Static Assets: Cache First, then Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        // Cache our own assets and fonts/CDNs if successful
        if (networkResponse.ok && (isSameOrigin || url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('unpkg.com'))) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(async () => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
    let data = { title: 'ShutliX', body: 'New notification' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'ShutliX', body: event.data.text() };
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/bus-logo.png',
        badge: '/bus-logo.png',
        data: data.data || {},
        vibrate: [100, 50, 100],
        actions: [
            { action: 'view', title: 'View Details' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/';
    const notificationId = event.notification.data?.id;
    
    // Track click
    if (notificationId) {
        event.waitUntil(
            fetch('/api/v1/notifications/track-click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId, timestamp: Date.now() })
            }).catch(err => console.warn('Failed to track notification click', err))
        );
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let client of windowClients) {
                if (new URL(client.url).pathname === new URL(urlToOpen, self.location.origin).pathname && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

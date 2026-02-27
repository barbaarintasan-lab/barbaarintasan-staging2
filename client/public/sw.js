const CACHE_VERSION = 'v12';
const CACHE_NAME = `barbaarintasan-${CACHE_VERSION}`;
const API_CACHE_NAME = `barbaarintasan-api-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/offline.html',
  '/favicon.png',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Background sync queue for failed API requests
const SYNC_QUEUE_KEY = 'pending-sync-requests';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing new service worker...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('barbaarintasan-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Handle offline course cache requests (video files stored in offline-course-* caches)
  if (url.pathname.match(/\.(mp4|webm|m4v|mov)$/) || url.pathname.includes('/public-files/')) {
    event.respondWith(offlineVideoFirst(event.request));
    return;
  }
  
  if (url.pathname.startsWith('/api/')) {
    const cachableApis = ['/api/courses', '/api/homepage-sections', '/api/testimonials', '/api/quran-reciters'];
    if (cachableApis.some(p => url.pathname === p)) {
      event.respondWith(staleWhileRevalidate(event.request));
    } else {
      event.respondWith(networkFirst(event.request));
    }
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (url.pathname.match(/\.(js|css)$/) && url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)$/)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

// Handle video files - check offline caches first, then network
async function offlineVideoFirst(request) {
  // Check all offline course caches
  const cacheNames = await caches.keys();
  const offlineCaches = cacheNames.filter(name => name.startsWith('offline-course-'));
  
  for (const cacheName of offlineCaches) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving video from offline cache:', request.url);
      return cachedResponse;
    }
  }
  
  // Also check main cache
  const mainCache = await caches.open(CACHE_NAME);
  const mainCacheResponse = await mainCache.match(request);
  if (mainCacheResponse) {
    return mainCacheResponse;
  }
  
  // Fall back to network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache videos in main cache for future use
      mainCache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Video fetch failed, no offline version available:', request.url);
    return new Response('Video not available offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function networkFirstNavigation(request) {
  try {
    const networkResponse = await fetch(request, { cache: 'no-store' });
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache...');
    const cachedResponse = await caches.match('/offline.html');
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline - Please check your connection', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  if (cachedResponse) {
    fetchPromise;
    return cachedResponse;
  }
  
  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;
  
  return new Response(JSON.stringify({ error: 'Offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('', { status: 503 });
  }
}

self.addEventListener('push', (event) => {
  let data = { title: 'Barbaarintasan Academy', body: 'Waxaa helay fariin cusub!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || null,
      title: data.title,
      body: data.body,
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const url = notificationData.url;
  const title = notificationData.title || 'Barbaarintasan Academy';
  const body = notificationData.body || '';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      if (url) {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }
      
      const payload = { type: 'PUSH_NOTIFICATION_CLICK', title, body };
      
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage(payload);
          return client.focus();
        }
      }
      
      const encodedData = encodeURIComponent(JSON.stringify({ title, body }));
      return clients.openWindow('/?notification=' + encodedData);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting and activate immediately');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    self.registration.update();
  }
});

// Background sync handler - retry failed requests when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('[SW] Background sync triggered for messages');
    event.waitUntil(processPendingSyncRequests());
  }
});

async function processPendingSyncRequests() {
  try {
    // Get pending requests from IndexedDB or cache
    const cache = await caches.open(CACHE_NAME);
    const pendingRequests = await cache.match('/pending-sync');
    
    if (!pendingRequests) return;
    
    const requests = await pendingRequests.json();
    
    for (const req of requests) {
      try {
        await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body,
        });
        console.log('[SW] Synced pending request:', req.url);
      } catch (error) {
        console.log('[SW] Failed to sync request:', req.url, error);
      }
    }
    
    // Clear the pending requests
    await cache.delete('/pending-sync');
  } catch (error) {
    console.log('[SW] Error processing pending sync requests:', error);
  }
}

// Periodic background sync for keeping data fresh
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-courses') {
    console.log('[SW] Periodic sync triggered for courses');
    event.waitUntil(refreshCourseData());
  }
});

async function refreshCourseData() {
  try {
    const response = await fetch('/api/courses');
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/courses', response.clone());
      console.log('[SW] Refreshed course data in background');
    }
  } catch (error) {
    console.log('[SW] Background course refresh failed:', error);
  }
}

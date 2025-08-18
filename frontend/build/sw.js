const CACHE_NAME = 'surge-docs-v1.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const API_CACHE = `${CACHE_NAME}-api`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// API endpoints that can be cached
const CACHEABLE_API_ENDPOINTS = [
  '/api/workspaces',
  '/api/templates',
  '/api/documents',
  '/api/search',
  '/api/analytics/overview'
];

// Network-first strategies for these endpoints
const NETWORK_FIRST_ENDPOINTS = [
  '/api/auth',
  '/api/comments',
  '/api/versions',
  '/api/collaboration'
];

// Cache-first strategies for these endpoints
const CACHE_FIRST_ENDPOINTS = [
  '/api/templates/categories',
  '/api/export/formats',
  '/api/branding'
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE &&
                cacheName.startsWith('surge-docs-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - handle all network requests
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const { url, method } = request;

  // Only handle GET requests
  if (method !== 'GET') return;

  // Handle different types of requests
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'document-sync') {
    event.waitUntil(syncOfflineDocuments());
  } else if (event.tag === 'comment-sync') {
    event.waitUntil(syncOfflineComments());
  } else if (event.tag === 'analytics-sync') {
    event.waitUntil(syncOfflineAnalytics());
  }
});

/**
 * Push notifications
 */
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'You have new updates in your workspace',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: event.data ? event.data.json() : {},
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Surge Documentation', options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

/**
 * Message handler for communication with main thread
 */
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  const { type, payload } = event.data;

  switch (type) {
    case 'CACHE_DOCUMENT':
      handleCacheDocument(payload);
      break;
    case 'CACHE_WORKSPACE':
      handleCacheWorkspace(payload);
      break;
    case 'CLEAR_CACHE':
      handleClearCache(payload);
      break;
    case 'GET_CACHE_STATUS':
      handleGetCacheStatus(event);
      break;
    case 'UPDATE_AVAILABLE':
      handleUpdateAvailable(event);
      break;
  }
});

// Helper functions

function isStaticAsset(url) {
  return url.includes('/static/') || 
         url.includes('/icons/') || 
         url.includes('fonts.googleapis.com') ||
         url.endsWith('.js') || 
         url.endsWith('.css') || 
         url.endsWith('.png') || 
         url.endsWith('.jpg') || 
         url.endsWith('.svg');
}

function isApiRequest(url) {
  return url.includes('/api/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

async function handleStaticAsset(request) {
  try {
    // Cache first strategy for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset request failed:', error);
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const endpoint = url.pathname;

  try {
    if (NETWORK_FIRST_ENDPOINTS.some(path => endpoint.includes(path))) {
      return await handleNetworkFirst(request);
    } else if (CACHE_FIRST_ENDPOINTS.some(path => endpoint.includes(path))) {
      return await handleCacheFirst(request);
    } else if (CACHEABLE_API_ENDPOINTS.some(path => endpoint.includes(path))) {
      return await handleStaleWhileRevalidate(request);
    } else {
      // Network only for sensitive endpoints
      return await fetch(request);
    }
  } catch (error) {
    console.error('[SW] API request failed:', error);
    return await handleOfflineResponse(request);
  }
}

async function handleNavigationRequest(request) {
  try {
    // Always try network first for navigation
    const networkResponse = await fetch(request);
    
    // Cache successful navigation responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Navigation request failed:', error);
    
    // Try cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    return caches.match('/offline.html');
  }
}

async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

async function handleNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function handleCacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

async function handleStaleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background to update cache
  const networkResponse = fetch(request)
    .then(response => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(error => {
      console.error('[SW] Background fetch failed:', error);
    });

  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  return await networkResponse;
}

async function handleOfflineResponse(request) {
  const url = new URL(request.url);
  
  // Return cached API response if available
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Return offline data for common endpoints
  if (url.pathname.includes('/api/workspaces')) {
    return new Response(JSON.stringify({
      workspaces: [],
      message: 'Offline mode - limited data available'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (url.pathname.includes('/api/documents')) {
    return new Response(JSON.stringify({
      documents: [],
      message: 'Offline mode - please sync when online'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Generic offline response
  return new Response(JSON.stringify({
    error: 'Offline',
    message: 'You are currently offline. Some features may not be available.'
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function syncOfflineDocuments() {
  console.log('[SW] Syncing offline documents');
  
  try {
    // Get offline documents from IndexedDB
    const offlineDocuments = await getOfflineDocuments();
    
    for (const doc of offlineDocuments) {
      try {
        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doc)
        });
        
        if (response.ok) {
          await removeOfflineDocument(doc.id);
          console.log('[SW] Synced offline document:', doc.title);
        }
      } catch (error) {
        console.error('[SW] Failed to sync document:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Document sync failed:', error);
  }
}

async function syncOfflineComments() {
  console.log('[SW] Syncing offline comments');
  // Implementation would sync pending comments
}

async function syncOfflineAnalytics() {
  console.log('[SW] Syncing offline analytics');
  // Implementation would sync analytics events
}

// IndexedDB helpers (simplified - would need full implementation)
async function getOfflineDocuments() {
  // Return offline documents from IndexedDB
  return [];
}

async function removeOfflineDocument(id) {
  // Remove synced document from IndexedDB
}

async function handleCacheDocument(payload) {
  try {
    const cache = await caches.open(API_CACHE);
    const response = new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/api/documents/${payload.id}`, response);
    console.log('[SW] Document cached for offline access');
  } catch (error) {
    console.error('[SW] Failed to cache document:', error);
  }
}

async function handleCacheWorkspace(payload) {
  try {
    const cache = await caches.open(API_CACHE);
    const response = new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/api/workspaces/${payload.id}`, response);
    console.log('[SW] Workspace cached for offline access');
  } catch (error) {
    console.error('[SW] Failed to cache workspace:', error);
  }
}

async function handleClearCache(payload) {
  try {
    if (payload.type === 'all') {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    } else {
      await caches.delete(payload.cacheName);
    }
    console.log('[SW] Cache cleared');
  } catch (error) {
    console.error('[SW] Failed to clear cache:', error);
  }
}

async function handleGetCacheStatus(event) {
  try {
    const cacheNames = await caches.keys();
    const cacheStatus = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheStatus[cacheName] = keys.length;
    }
    
    event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: cacheStatus });
  } catch (error) {
    console.error('[SW] Failed to get cache status:', error);
  }
}

function handleUpdateAvailable(event) {
  event.ports[0].postMessage({ 
    type: 'UPDATE_AVAILABLE', 
    payload: 'A new version is available. Restart to update.' 
  });
}
import offlineStorageService from './offlineStorageService';

class PWAService {
  constructor() {
    this.serviceWorker = null;
    this.updateAvailable = false;
    this.offlineMode = !navigator.onLine;
    this.syncInProgress = false;
    this.eventListeners = new Map();
    
    this.init();
  }

  /**
   * Initialize PWA service
   */
  async init() {
    // Register service worker
    await this.registerServiceWorker();
    
    // Initialize offline storage
    await offlineStorageService.init();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Schedule periodic cleanup
    this.scheduleCleanup();
    
    console.log('PWA Service initialized');
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('Service Worker registered successfully:', registration.scope);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker available');
              this.updateAvailable = true;
              this.emit('updateAvailable');
            }
          });
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

        this.serviceWorker = registration;
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    } else {
      console.warn('Service Workers are not supported');
      throw new Error('Service Workers not supported');
    }
  }

  /**
   * Handle messages from service worker
   */
  handleServiceWorkerMessage(event) {
    const { type, payload } = event.data;
    
    console.log('Message from SW:', type, payload);
    
    switch (type) {
      case 'CACHE_STATUS':
        this.emit('cacheStatus', payload);
        break;
      case 'UPDATE_AVAILABLE':
        this.updateAvailable = true;
        this.emit('updateAvailable', payload);
        break;
      case 'SYNC_COMPLETE':
        this.emit('syncComplete', payload);
        break;
    }
  }

  /**
   * Set up online/offline event listeners
   */
  setupEventListeners() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  /**
   * Handle online event
   */
  async handleOnline() {
    console.log('App is now online');
    this.offlineMode = false;
    this.emit('online');
    
    // Start background sync
    await this.syncOfflineData();
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('App is now offline');
    this.offlineMode = true;
    this.emit('offline');
  }

  /**
   * Handle page unload
   */
  handleBeforeUnload() {
    // Save any pending data
    this.savePendingChanges();
  }

  /**
   * Install PWA update
   */
  async installUpdate() {
    if (!this.updateAvailable) return;

    try {
      if (this.serviceWorker?.waiting) {
        this.serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Reload the page to apply update
      window.location.reload();
    } catch (error) {
      console.error('Failed to install update:', error);
    }
  }

  /**
   * Check for updates manually
   */
  async checkForUpdates() {
    if (this.serviceWorker) {
      try {
        await this.serviceWorker.update();
      } catch (error) {
        console.error('Update check failed:', error);
      }
    }
  }

  /**
   * Cache document for offline access
   */
  async cacheDocument(document) {
    try {
      await offlineStorageService.saveDocument(document);
      
      // Notify service worker
      if (this.serviceWorker?.active) {
        this.serviceWorker.active.postMessage({
          type: 'CACHE_DOCUMENT',
          payload: document
        });
      }
      
      this.emit('documentCached', document);
    } catch (error) {
      console.error('Failed to cache document:', error);
      throw error;
    }
  }

  /**
   * Cache workspace for offline access
   */
  async cacheWorkspace(workspace) {
    try {
      await offlineStorageService.saveWorkspace(workspace);
      
      // Notify service worker
      if (this.serviceWorker?.active) {
        this.serviceWorker.active.postMessage({
          type: 'CACHE_WORKSPACE',
          payload: workspace
        });
      }
      
      this.emit('workspaceCached', workspace);
    } catch (error) {
      console.error('Failed to cache workspace:', error);
      throw error;
    }
  }

  /**
   * Save document for offline editing
   */
  async saveDocumentOffline(document, action = 'update') {
    try {
      await offlineStorageService.saveDocumentForSync(document, action);
      this.emit('documentSavedOffline', document);
    } catch (error) {
      console.error('Failed to save document offline:', error);
      throw error;
    }
  }

  /**
   * Get offline documents
   */
  async getOfflineDocuments(workspaceId = null) {
    try {
      return await offlineStorageService.getOfflineDocuments(workspaceId);
    } catch (error) {
      console.error('Failed to get offline documents:', error);
      return [];
    }
  }

  /**
   * Get offline workspaces
   */
  async getOfflineWorkspaces() {
    try {
      return await offlineStorageService.getOfflineWorkspaces();
    } catch (error) {
      console.error('Failed to get offline workspaces:', error);
      return [];
    }
  }

  /**
   * Sync offline data when back online
   */
  async syncOfflineData() {
    if (this.syncInProgress || this.offlineMode) return;

    try {
      this.syncInProgress = true;
      this.emit('syncStarted');

      // Get sync queue
      const syncQueue = await offlineStorageService.getSyncQueue();
      console.log(`Syncing ${syncQueue.length} items`);

      let successCount = 0;
      let errorCount = 0;

      for (const item of syncQueue) {
        try {
          await this.syncItem(item);
          await offlineStorageService.removeSyncItem(item.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          
          // Increment attempts
          await offlineStorageService.updateSyncItem(item.id, {
            attempts: item.attempts + 1,
            lastError: error.message
          });
          
          errorCount++;
        }
      }

      // Sync analytics events
      await this.syncAnalyticsEvents();

      console.log(`Sync complete: ${successCount} success, ${errorCount} errors`);
      this.emit('syncCompleted', { successCount, errorCount });

    } catch (error) {
      console.error('Sync failed:', error);
      this.emit('syncError', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync individual item
   */
  async syncItem(item) {
    const { type, action, data } = item;

    switch (type) {
      case 'document':
        return await this.syncDocument(action, data);
      case 'comment':
        return await this.syncComment(action, data);
      case 'analytics':
        return await this.syncAnalyticsEvent(data);
      default:
        throw new Error(`Unknown sync item type: ${type}`);
    }
  }

  /**
   * Sync document
   */
  async syncDocument(action, document) {
    const response = await fetch(`/api/documents/${document.id}`, {
      method: action === 'create' ? 'POST' : 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(document)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync document: ${response.statusText}`);
    }

    const syncedDocument = await response.json();
    
    // Update local storage with synced version
    await offlineStorageService.saveDocument(syncedDocument);
    
    return syncedDocument;
  }

  /**
   * Sync comment
   */
  async syncComment(action, comment) {
    const response = await fetch(`/api/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(comment)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync comment: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Sync analytics events
   */
  async syncAnalyticsEvents() {
    try {
      const events = await offlineStorageService.getUnsyncedAnalyticsEvents();
      
      if (events.length === 0) return;

      const response = await fetch('/api/analytics/events/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ events })
      });

      if (response.ok) {
        const eventIds = events.map(e => e.id);
        await offlineStorageService.markAnalyticsEventsSynced(eventIds);
        console.log(`Synced ${events.length} analytics events`);
      }
    } catch (error) {
      console.error('Failed to sync analytics events:', error);
    }
  }

  /**
   * Store analytics event offline
   */
  async storeAnalyticsEvent(event) {
    try {
      await offlineStorageService.storeAnalyticsEvent(event);
    } catch (error) {
      console.error('Failed to store analytics event:', error);
    }
  }

  /**
   * Clear cache
   */
  async clearCache(type = 'all') {
    try {
      if (this.serviceWorker?.active) {
        this.serviceWorker.active.postMessage({
          type: 'CLEAR_CACHE',
          payload: { type }
        });
      }

      // Clear IndexedDB
      if (type === 'all') {
        await offlineStorageService.clear('documents');
        await offlineStorageService.clear('workspaces');
        await offlineStorageService.clear('templates');
      }

      this.emit('cacheCleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache status
   */
  async getCacheStatus() {
    return new Promise((resolve) => {
      if (this.serviceWorker?.active) {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.addEventListener('message', (event) => {
          if (event.data.type === 'CACHE_STATUS') {
            resolve(event.data.payload);
          }
        });

        messageChannel.port1.start();

        this.serviceWorker.active.postMessage(
          { type: 'GET_CACHE_STATUS' },
          [messageChannel.port2]
        );
      } else {
        resolve({});
      }
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      return await offlineStorageService.getStorageStats();
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {};
    }
  }

  /**
   * Export offline data
   */
  async exportOfflineData() {
    try {
      const data = await offlineStorageService.exportData();
      
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `surge-offline-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export offline data:', error);
      throw error;
    }
  }

  /**
   * Import offline data
   */
  async importOfflineData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      await offlineStorageService.importData(data);
      this.emit('dataImported');
    } catch (error) {
      console.error('Failed to import offline data:', error);
      throw error;
    }
  }

  /**
   * Schedule periodic cleanup
   */
  scheduleCleanup() {
    // Clean up every 24 hours
    setInterval(async () => {
      try {
        await offlineStorageService.cleanup();
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Save any pending changes before page unload
   */
  savePendingChanges() {
    // This would be called by components to save any unsaved work
    this.emit('savePendingChanges');
  }

  /**
   * Check if app is in offline mode
   */
  isOffline() {
    return this.offlineMode;
  }

  /**
   * Check if update is available
   */
  isUpdateAvailable() {
    return this.updateAvailable;
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data = null) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Request persistent storage
   */
  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        console.log(`Persistent storage: ${persistent ? 'granted' : 'denied'}`);
        return persistent;
      } catch (error) {
        console.error('Failed to request persistent storage:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Get storage estimate
   */
  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        return await navigator.storage.estimate();
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
        return null;
      }
    }
    return null;
  }
}

export default new PWAService();
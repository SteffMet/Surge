class OfflineStorageService {
  constructor() {
    this.dbName = 'SurgeOfflineDB';
    this.version = 1;
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('Upgrading IndexedDB schema');
        this.createStores(db);
      };
    });
  }

  /**
   * Create object stores
   */
  createStores(db) {
    // Documents store
    if (!db.objectStoreNames.contains('documents')) {
      const documentsStore = db.createObjectStore('documents', { keyPath: 'id' });
      documentsStore.createIndex('workspaceId', 'workspaceId', { unique: false });
      documentsStore.createIndex('title', 'title', { unique: false });
      documentsStore.createIndex('lastModified', 'lastModified', { unique: false });
      documentsStore.createIndex('status', 'status', { unique: false });
    }

    // Workspaces store
    if (!db.objectStoreNames.contains('workspaces')) {
      const workspacesStore = db.createObjectStore('workspaces', { keyPath: 'id' });
      workspacesStore.createIndex('name', 'name', { unique: false });
      workspacesStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
    }

    // Templates store
    if (!db.objectStoreNames.contains('templates')) {
      const templatesStore = db.createObjectStore('templates', { keyPath: 'id' });
      templatesStore.createIndex('category', 'category', { unique: false });
      templatesStore.createIndex('name', 'name', { unique: false });
    }

    // Comments store (for offline comments)
    if (!db.objectStoreNames.contains('comments')) {
      const commentsStore = db.createObjectStore('comments', { keyPath: 'id' });
      commentsStore.createIndex('documentId', 'documentId', { unique: false });
      commentsStore.createIndex('status', 'status', { unique: false });
    }

    // Sync queue store
    if (!db.objectStoreNames.contains('syncQueue')) {
      const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      syncStore.createIndex('type', 'type', { unique: false });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('priority', 'priority', { unique: false });
    }

    // Analytics events store
    if (!db.objectStoreNames.contains('analyticsEvents')) {
      const analyticsStore = db.createObjectStore('analyticsEvents', { keyPath: 'id', autoIncrement: true });
      analyticsStore.createIndex('type', 'type', { unique: false });
      analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // User preferences store
    if (!db.objectStoreNames.contains('preferences')) {
      const prefsStore = db.createObjectStore('preferences', { keyPath: 'key' });
    }
  }

  /**
   * Generic method to add/update data
   */
  async set(storeName, data) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to get data by key
   */
  async get(storeName, key) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to get all data from store
   */
  async getAll(storeName, indexName = null, query = null) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      let source = store;
      if (indexName) {
        source = store.index(indexName);
      }
      
      const request = query ? source.getAll(query) : source.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to delete data
   */
  async delete(storeName, key) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data from a store
   */
  async clear(storeName) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Specific methods for documents

  /**
   * Save document for offline access
   */
  async saveDocument(document) {
    const offlineDoc = {
      ...document,
      id: document._id || document.id,
      lastModified: new Date().toISOString(),
      status: 'synced'
    };
    
    return await this.set('documents', offlineDoc);
  }

  /**
   * Save document as pending sync (for offline edits)
   */
  async saveDocumentForSync(document, action = 'update') {
    const pendingDoc = {
      ...document,
      id: document._id || document.id,
      lastModified: new Date().toISOString(),
      status: 'pending'
    };
    
    // Add to sync queue
    await this.addToSyncQueue({
      type: 'document',
      action: action,
      data: pendingDoc,
      priority: 1
    });
    
    return await this.set('documents', pendingDoc);
  }

  /**
   * Get offline documents
   */
  async getOfflineDocuments(workspaceId = null) {
    if (workspaceId) {
      return await this.getAll('documents', 'workspaceId', workspaceId);
    }
    return await this.getAll('documents');
  }

  /**
   * Get documents pending sync
   */
  async getPendingDocuments() {
    return await this.getAll('documents', 'status', 'pending');
  }

  // Specific methods for workspaces

  /**
   * Save workspace for offline access
   */
  async saveWorkspace(workspace) {
    const offlineWorkspace = {
      ...workspace,
      id: workspace._id || workspace.id,
      lastAccessed: new Date().toISOString()
    };
    
    return await this.set('workspaces', offlineWorkspace);
  }

  /**
   * Get offline workspaces
   */
  async getOfflineWorkspaces() {
    return await this.getAll('workspaces');
  }

  // Specific methods for templates

  /**
   * Save template for offline access
   */
  async saveTemplate(template) {
    const offlineTemplate = {
      ...template,
      id: template._id || template.id
    };
    
    return await this.set('templates', offlineTemplate);
  }

  /**
   * Get offline templates
   */
  async getOfflineTemplates(category = null) {
    if (category) {
      return await this.getAll('templates', 'category', category);
    }
    return await this.getAll('templates');
  }

  // Sync queue management

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(item) {
    const queueItem = {
      ...item,
      timestamp: new Date().toISOString(),
      priority: item.priority || 1,
      attempts: 0,
      maxAttempts: 3
    };
    
    return await this.set('syncQueue', queueItem);
  }

  /**
   * Get sync queue items
   */
  async getSyncQueue() {
    const items = await this.getAll('syncQueue');
    return items.sort((a, b) => {
      // Sort by priority (higher first) then by timestamp (older first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
  }

  /**
   * Remove item from sync queue
   */
  async removeSyncItem(id) {
    return await this.delete('syncQueue', id);
  }

  /**
   * Update sync item (e.g., increment attempts)
   */
  async updateSyncItem(id, updates) {
    const item = await this.get('syncQueue', id);
    if (item) {
      const updatedItem = { ...item, ...updates };
      return await this.set('syncQueue', updatedItem);
    }
  }

  // Analytics events

  /**
   * Store analytics event for offline tracking
   */
  async storeAnalyticsEvent(event) {
    const analyticsEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      synced: false
    };
    
    return await this.set('analyticsEvents', analyticsEvent);
  }

  /**
   * Get unsynced analytics events
   */
  async getUnsyncedAnalyticsEvents() {
    const events = await this.getAll('analyticsEvents');
    return events.filter(event => !event.synced);
  }

  /**
   * Mark analytics events as synced
   */
  async markAnalyticsEventsSynced(eventIds) {
    const promises = eventIds.map(async (id) => {
      const event = await this.get('analyticsEvents', id);
      if (event) {
        event.synced = true;
        return await this.set('analyticsEvents', event);
      }
    });
    
    return await Promise.all(promises);
  }

  // User preferences

  /**
   * Save user preference
   */
  async savePreference(key, value) {
    return await this.set('preferences', { key, value });
  }

  /**
   * Get user preference
   */
  async getPreference(key, defaultValue = null) {
    const pref = await this.get('preferences', key);
    return pref ? pref.value : defaultValue;
  }

  // Utility methods

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    await this.init();
    
    const stats = {
      documents: 0,
      workspaces: 0,
      templates: 0,
      comments: 0,
      syncQueue: 0,
      analyticsEvents: 0,
      preferences: 0
    };

    const stores = Object.keys(stats);
    
    for (const store of stores) {
      try {
        const items = await this.getAll(store);
        stats[store] = items.length;
      } catch (error) {
        console.warn(`Failed to get stats for ${store}:`, error);
      }
    }

    return stats;
  }

  /**
   * Clean up old data
   */
  async cleanup(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days default
    const cutoffDate = new Date(Date.now() - maxAge);

    // Clean old analytics events
    const events = await this.getAll('analyticsEvents');
    const oldEvents = events.filter(event => 
      new Date(event.timestamp) < cutoffDate && event.synced
    );
    
    for (const event of oldEvents) {
      await this.delete('analyticsEvents', event.id);
    }

    // Clean old sync queue items that have failed max attempts
    const syncItems = await this.getSyncQueue();
    const failedItems = syncItems.filter(item => 
      item.attempts >= item.maxAttempts &&
      new Date(item.timestamp) < cutoffDate
    );
    
    for (const item of failedItems) {
      await this.delete('syncQueue', item.id);
    }

    console.log(`Cleaned up ${oldEvents.length} old events and ${failedItems.length} failed sync items`);
  }

  /**
   * Export all offline data
   */
  async exportData() {
    const data = {
      documents: await this.getAll('documents'),
      workspaces: await this.getAll('workspaces'),
      templates: await this.getAll('templates'),
      preferences: await this.getAll('preferences'),
      exportDate: new Date().toISOString()
    };

    return data;
  }

  /**
   * Import offline data
   */
  async importData(data) {
    if (data.documents) {
      for (const doc of data.documents) {
        await this.set('documents', doc);
      }
    }

    if (data.workspaces) {
      for (const workspace of data.workspaces) {
        await this.set('workspaces', workspace);
      }
    }

    if (data.templates) {
      for (const template of data.templates) {
        await this.set('templates', template);
      }
    }

    if (data.preferences) {
      for (const pref of data.preferences) {
        await this.set('preferences', pref);
      }
    }

    console.log('Offline data imported successfully');
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default new OfflineStorageService();
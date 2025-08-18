import { useState, useEffect, useCallback } from 'react';
import pwaService from '../services/pwaService';
import offlineStorageService from '../services/offlineStorageService';

/**
 * Hook for managing offline state and functionality
 */
export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    // Listen to PWA service events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleSyncStarted = () => setSyncInProgress(true);
    const handleSyncCompleted = (status) => {
      setSyncInProgress(false);
      setSyncStatus(status);
    };
    const handleUpdateAvailable = () => setUpdateAvailable(true);

    pwaService.on('online', handleOnline);
    pwaService.on('offline', handleOffline);
    pwaService.on('syncStarted', handleSyncStarted);
    pwaService.on('syncCompleted', handleSyncCompleted);
    pwaService.on('updateAvailable', handleUpdateAvailable);

    return () => {
      pwaService.off('online', handleOnline);
      pwaService.off('offline', handleOffline);
      pwaService.off('syncStarted', handleSyncStarted);
      pwaService.off('syncCompleted', handleSyncCompleted);
      pwaService.off('updateAvailable', handleUpdateAvailable);
    };
  }, []);

  const installUpdate = useCallback(async () => {
    await pwaService.installUpdate();
    setUpdateAvailable(false);
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (!isOffline) {
      await pwaService.syncOfflineData();
    }
  }, [isOffline]);

  return {
    isOffline,
    syncInProgress,
    updateAvailable,
    syncStatus,
    installUpdate,
    syncOfflineData
  };
}

/**
 * Hook for offline document management
 */
export function useOfflineDocuments(workspaceId = null) {
  const [offlineDocuments, setOfflineDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOfflineDocuments();
  }, [workspaceId]);

  const loadOfflineDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const documents = await pwaService.getOfflineDocuments(workspaceId);
      setOfflineDocuments(documents);
    } catch (error) {
      console.error('Failed to load offline documents:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const saveDocumentOffline = useCallback(async (document, action = 'update') => {
    try {
      await pwaService.saveDocumentOffline(document, action);
      await loadOfflineDocuments();
    } catch (error) {
      console.error('Failed to save document offline:', error);
      throw error;
    }
  }, [loadOfflineDocuments]);

  const cacheDocument = useCallback(async (document) => {
    try {
      await pwaService.cacheDocument(document);
      await loadOfflineDocuments();
    } catch (error) {
      console.error('Failed to cache document:', error);
      throw error;
    }
  }, [loadOfflineDocuments]);

  return {
    offlineDocuments,
    loading,
    saveDocumentOffline,
    cacheDocument,
    refreshOfflineDocuments: loadOfflineDocuments
  };
}

/**
 * Hook for offline workspaces
 */
export function useOfflineWorkspaces() {
  const [offlineWorkspaces, setOfflineWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOfflineWorkspaces();
  }, []);

  const loadOfflineWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const workspaces = await pwaService.getOfflineWorkspaces();
      setOfflineWorkspaces(workspaces);
    } catch (error) {
      console.error('Failed to load offline workspaces:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const cacheWorkspace = useCallback(async (workspace) => {
    try {
      await pwaService.cacheWorkspace(workspace);
      await loadOfflineWorkspaces();
    } catch (error) {
      console.error('Failed to cache workspace:', error);
      throw error;
    }
  }, [loadOfflineWorkspaces]);

  return {
    offlineWorkspaces,
    loading,
    cacheWorkspace,
    refreshOfflineWorkspaces: loadOfflineWorkspaces
  };
}

/**
 * Hook for offline sync queue
 */
export function useSyncQueue() {
  const [syncQueue, setSyncQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSyncQueue();
    
    // Listen for sync events
    const handleSyncCompleted = () => loadSyncQueue();
    pwaService.on('syncCompleted', handleSyncCompleted);
    
    return () => {
      pwaService.off('syncCompleted', handleSyncCompleted);
    };
  }, []);

  const loadSyncQueue = useCallback(async () => {
    try {
      setLoading(true);
      const queue = await offlineStorageService.getSyncQueue();
      setSyncQueue(queue);
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    syncQueue,
    loading,
    refreshSyncQueue: loadSyncQueue
  };
}

/**
 * Hook for storage management
 */
export function useStorageManagement() {
  const [storageStats, setStorageStats] = useState({});
  const [cacheStatus, setCacheStatus] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = useCallback(async () => {
    try {
      setLoading(true);
      const [stats, status] = await Promise.all([
        pwaService.getStorageStats(),
        pwaService.getCacheStatus()
      ]);
      setStorageStats(stats);
      setCacheStatus(status);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(async (type = 'all') => {
    try {
      await pwaService.clearCache(type);
      await loadStorageInfo();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }, [loadStorageInfo]);

  const requestPersistentStorage = useCallback(async () => {
    return await pwaService.requestPersistentStorage();
  }, []);

  const getStorageEstimate = useCallback(async () => {
    return await pwaService.getStorageEstimate();
  }, []);

  const exportOfflineData = useCallback(async () => {
    try {
      await pwaService.exportOfflineData();
    } catch (error) {
      console.error('Failed to export offline data:', error);
      throw error;
    }
  }, []);

  const importOfflineData = useCallback(async (file) => {
    try {
      await pwaService.importOfflineData(file);
      await loadStorageInfo();
    } catch (error) {
      console.error('Failed to import offline data:', error);
      throw error;
    }
  }, [loadStorageInfo]);

  return {
    storageStats,
    cacheStatus,
    loading,
    clearCache,
    requestPersistentStorage,
    getStorageEstimate,
    exportOfflineData,
    importOfflineData,
    refreshStorageInfo: loadStorageInfo
  };
}

/**
 * Hook for offline analytics tracking
 */
export function useOfflineAnalytics() {
  const trackEvent = useCallback(async (event) => {
    try {
      await pwaService.storeAnalyticsEvent(event);
    } catch (error) {
      console.error('Failed to track offline event:', error);
    }
  }, []);

  const trackDocumentView = useCallback(async (documentId, workspaceId) => {
    await trackEvent({
      type: 'document_view',
      documentId,
      workspaceId,
      timestamp: new Date().toISOString(),
      offline: true
    });
  }, [trackEvent]);

  const trackDocumentEdit = useCallback(async (documentId, workspaceId, changes) => {
    await trackEvent({
      type: 'document_edit',
      documentId,
      workspaceId,
      metadata: { changes },
      timestamp: new Date().toISOString(),
      offline: true
    });
  }, [trackEvent]);

  const trackSearch = useCallback(async (query, workspaceId, results) => {
    await trackEvent({
      type: 'search',
      metadata: { query, resultCount: results?.length || 0 },
      workspaceId,
      timestamp: new Date().toISOString(),
      offline: true
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackDocumentView,
    trackDocumentEdit,
    trackSearch
  };
}

/**
 * Hook for PWA installation
 */
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    setIsInstalled(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = useCallback(async () => {
    if (installPrompt) {
      try {
        const result = await installPrompt.prompt();
        console.log('PWA install result:', result.outcome);
        setInstallPrompt(null);
        return result.outcome === 'accepted';
      } catch (error) {
        console.error('Failed to install PWA:', error);
        return false;
      }
    }
    return false;
  }, [installPrompt]);

  return {
    canInstall: !!installPrompt,
    isInstalled,
    installPWA
  };
}
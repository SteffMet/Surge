import React, { useState, useEffect } from 'react';
import { useStorageManagement, useSyncQueue, useOfflineDocuments } from '../../hooks/useOffline';
import './OfflineStorageManager.css';

const OfflineStorageManager = ({ isOpen, onClose }) => {
  const { 
    storageStats, 
    cacheStatus, 
    loading, 
    clearCache, 
    requestPersistentStorage,
    getStorageEstimate,
    exportOfflineData,
    importOfflineData,
    refreshStorageInfo 
  } = useStorageManagement();

  const { syncQueue } = useSyncQueue();
  const { offlineDocuments } = useOfflineDocuments();

  const [activeTab, setActiveTab] = useState('overview');
  const [storageEstimate, setStorageEstimate] = useState(null);
  const [persistentGranted, setPersistentGranted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStorageEstimate();
    }
  }, [isOpen]);

  const loadStorageEstimate = async () => {
    try {
      const estimate = await getStorageEstimate();
      setStorageEstimate(estimate);
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
    }
  };

  const handleRequestPersistentStorage = async () => {
    try {
      const granted = await requestPersistentStorage();
      setPersistentGranted(granted);
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
    }
  };

  const handleClearCache = async (type) => {
    if (window.confirm(`Are you sure you want to clear ${type === 'all' ? 'all' : type} cache?`)) {
      try {
        await clearCache(type);
        await refreshStorageInfo();
        await loadStorageEstimate();
      } catch (error) {
        console.error('Failed to clear cache:', error);
        alert('Failed to clear cache');
      }
    }
  };

  const handleExportData = async () => {
    try {
      await exportOfflineData();
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data');
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await importOfflineData(file);
      await refreshStorageInfo();
      alert('Data imported successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      alert('Failed to import data');
    }
    
    // Reset file input
    event.target.value = '';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercentage = () => {
    if (!storageEstimate || !storageEstimate.quota) return 0;
    return ((storageEstimate.usage || 0) / storageEstimate.quota) * 100;
  };

  if (!isOpen) return null;

  return (
    <div className="storage-manager-overlay">
      <div className="storage-manager">
        <div className="storage-header">
          <h2>Offline Storage Management</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="storage-tabs">
          <button 
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={activeTab === 'documents' ? 'active' : ''}
            onClick={() => setActiveTab('documents')}
          >
            Documents
          </button>
          <button 
            className={activeTab === 'sync' ? 'active' : ''}
            onClick={() => setActiveTab('sync')}
          >
            Sync Queue
          </button>
          <button 
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        <div className="storage-content">
          {loading ? (
            <div className="loading">Loading storage information...</div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <div className="storage-stats">
                    <h3>Storage Usage</h3>
                    {storageEstimate && (
                      <div className="usage-chart">
                        <div className="usage-bar">
                          <div 
                            className="usage-fill"
                            style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
                          ></div>
                        </div>
                        <div className="usage-text">
                          {formatBytes(storageEstimate.usage || 0)} / {formatBytes(storageEstimate.quota || 0)}
                          <span className="usage-percentage">({getUsagePercentage().toFixed(1)}%)</span>
                        </div>
                      </div>
                    )}

                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">Documents Cached</span>
                        <span className="stat-value">{storageStats.documentsCount || 0}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Workspaces Cached</span>
                        <span className="stat-value">{storageStats.workspacesCount || 0}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Templates Cached</span>
                        <span className="stat-value">{storageStats.templatesCount || 0}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Pending Sync</span>
                        <span className="stat-value">{syncQueue.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="cache-management">
                    <h3>Cache Management</h3>
                    <div className="cache-actions">
                      <button onClick={() => handleClearCache('documents')}>
                        Clear Documents Cache
                      </button>
                      <button onClick={() => handleClearCache('workspaces')}>
                        Clear Workspaces Cache
                      </button>
                      <button onClick={() => handleClearCache('all')} className="danger">
                        Clear All Cache
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="documents-tab">
                  <h3>Offline Documents ({offlineDocuments.length})</h3>
                  <div className="documents-list">
                    {offlineDocuments.map((doc) => (
                      <div key={doc.id} className="document-item">
                        <div className="document-info">
                          <h4>{doc.title}</h4>
                          <p className="document-meta">
                            Last modified: {new Date(doc.updatedAt).toLocaleDateString()}
                            <span className="document-size">
                              {formatBytes(new Blob([JSON.stringify(doc)]).size)}
                            </span>
                          </p>
                        </div>
                        <div className="document-status">
                          {doc.needsSync && <span className="sync-indicator">Needs Sync</span>}
                        </div>
                      </div>
                    ))}
                    {offlineDocuments.length === 0 && (
                      <div className="empty-state">
                        No documents cached for offline use
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'sync' && (
                <div className="sync-tab">
                  <h3>Sync Queue ({syncQueue.length} items)</h3>
                  <div className="sync-list">
                    {syncQueue.map((item) => (
                      <div key={item.id} className="sync-item">
                        <div className="sync-info">
                          <h4>{item.type} - {item.action}</h4>
                          <p className="sync-meta">
                            Created: {new Date(item.createdAt).toLocaleString()}
                            {item.attempts > 0 && (
                              <span className="sync-attempts">
                                Attempts: {item.attempts}
                              </span>
                            )}
                          </p>
                          {item.lastError && (
                            <p className="sync-error">Error: {item.lastError}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {syncQueue.length === 0 && (
                      <div className="empty-state">
                        No items waiting to sync
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="settings-tab">
                  <div className="settings-section">
                    <h3>Storage Permissions</h3>
                    <div className="permission-item">
                      <label>Persistent Storage</label>
                      <div className="permission-controls">
                        {persistentGranted ? (
                          <span className="granted">✓ Granted</span>
                        ) : (
                          <button onClick={handleRequestPersistentStorage}>
                            Request Permission
                          </button>
                        )}
                      </div>
                      <p className="permission-description">
                        Prevents browser from automatically clearing your offline data
                      </p>
                    </div>
                  </div>

                  <div className="settings-section">
                    <h3>Data Management</h3>
                    <div className="data-actions">
                      <button onClick={handleExportData}>
                        Export Offline Data
                      </button>
                      <div className="import-section">
                        <label htmlFor="import-file" className="import-btn">
                          Import Offline Data
                        </label>
                        <input
                          id="import-file"
                          type="file"
                          accept=".json"
                          onChange={handleImportData}
                          style={{ display: 'none' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineStorageManager;
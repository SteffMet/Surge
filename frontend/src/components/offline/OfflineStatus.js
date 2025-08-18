import React from 'react';
import { useOffline } from '../../hooks/useOffline';
import './OfflineStatus.css';

const OfflineStatus = () => {
  const { isOffline, syncInProgress, updateAvailable, syncStatus, installUpdate, syncOfflineData } = useOffline();

  if (!isOffline && !syncInProgress && !updateAvailable && !syncStatus) {
    return null;
  }

  return (
    <div className="offline-status">
      {isOffline && (
        <div className="status-banner offline">
          <div className="status-content">
            <span className="status-icon">📴</span>
            <span className="status-text">You are offline. Changes will be saved locally.</span>
          </div>
        </div>
      )}

      {syncInProgress && (
        <div className="status-banner syncing">
          <div className="status-content">
            <div className="sync-spinner"></div>
            <span className="status-text">Syncing offline changes...</span>
          </div>
        </div>
      )}

      {syncStatus && (
        <div className={`status-banner sync-result ${syncStatus.errorCount > 0 ? 'warning' : 'success'}`}>
          <div className="status-content">
            <span className="status-icon">
              {syncStatus.errorCount > 0 ? '⚠️' : '✅'}
            </span>
            <span className="status-text">
              Sync completed: {syncStatus.successCount} items synced
              {syncStatus.errorCount > 0 && `, ${syncStatus.errorCount} errors`}
            </span>
            <button 
              className="sync-retry-btn"
              onClick={syncOfflineData}
              disabled={isOffline}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {updateAvailable && (
        <div className="status-banner update-available">
          <div className="status-content">
            <span className="status-icon">🔄</span>
            <span className="status-text">App update available</span>
            <button className="update-btn" onClick={installUpdate}>
              Update Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineStatus;
import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/useOffline';
import './PWAInstallPrompt.css';

const PWAInstallPrompt = () => {
  const { canInstall, isInstalled, installPWA } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Don't show if already installed, dismissed, or can't install
  if (isInstalled || dismissed || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    try {
      setInstalling(true);
      const success = await installPWA();
      
      if (success) {
        console.log('PWA installed successfully');
      }
    } catch (error) {
      console.error('Failed to install PWA:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  return (
    <div className="pwa-install-prompt">
      <div className="install-card">
        <div className="install-header">
          <div className="install-icon">📱</div>
          <div className="install-title">
            <h3>Install Surge</h3>
            <p>Get the full app experience with offline access</p>
          </div>
          <button 
            className="dismiss-btn"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        
        <div className="install-features">
          <div className="feature">
            <span className="feature-icon">📴</span>
            <span>Work offline</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🚀</span>
            <span>Faster loading</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔔</span>
            <span>Push notifications</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📋</span>
            <span>Desktop shortcuts</span>
          </div>
        </div>
        
        <div className="install-actions">
          <button 
            className="install-btn"
            onClick={handleInstall}
            disabled={installing}
          >
            {installing ? (
              <>
                <div className="install-spinner"></div>
                Installing...
              </>
            ) : (
              'Install App'
            )}
          </button>
          <button 
            className="not-now-btn"
            onClick={handleDismiss}
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
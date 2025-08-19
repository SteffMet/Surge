// Simple analytics service for the BitSurge installer
class Analytics {
  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.events = [];
    this.startTime = Date.now();
  }

  async track(eventName, properties = {}) {
    const event = {
      sessionId: this.sessionId,
      event: eventName,
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        sessionDuration: Date.now() - this.startTime,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        url: window.location.href,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      }
    };

    this.events.push(event);

    try {
      // Try to send to your analytics endpoint
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      // Fallback: store in localStorage for later sync
      const stored = JSON.parse(localStorage.getItem('bitsurge_analytics') || '[]');
      stored.push(event);
      localStorage.setItem('bitsurge_analytics', JSON.stringify(stored.slice(-100))); // Keep last 100 events
      
      console.log('Analytics Event (offline):', event);
    }
  }

  // Get session summary
  getSessionSummary() {
    return {
      sessionId: this.sessionId,
      totalEvents: this.events.length,
      sessionDuration: Date.now() - this.startTime,
      events: this.events
    };
  }

  // Track page performance
  trackPerformance() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
      const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
      
      this.track('page_performance', {
        pageLoadTime,
        domReadyTime,
        dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
        serverResponse: timing.responseEnd - timing.requestStart
      });
    }
  }
}

// Create global analytics instance
const analytics = new Analytics();

// Track page load performance after page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => analytics.trackPerformance(), 1000);
  });
} else {
  setTimeout(() => analytics.trackPerformance(), 1000);
}

// Track page unload
window.addEventListener('beforeunload', () => {
  analytics.track('session_ended', analytics.getSessionSummary());
});

export default analytics;
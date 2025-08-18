/**
 * Centralized Logging and Monitoring Service
 * Provides structured logging, error tracking, performance monitoring, and analytics
 */

// Log levels with numeric values for filtering
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

// Error categories for better classification
export const ERROR_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NETWORK: 'network',
  VALIDATION: 'validation',
  SEARCH: 'search',
  DOCUMENT: 'document',
  WORKSPACE: 'workspace',
  TEMPLATE: 'template',
  API: 'api',
  UI: 'ui',
  SYSTEM: 'system'
};

// User action types for analytics
export const USER_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  SEARCH: 'search',
  DOCUMENT_CREATE: 'document_create',
  DOCUMENT_EDIT: 'document_edit',
  DOCUMENT_DELETE: 'document_delete',
  TEMPLATE_CREATE: 'template_create',
  WORKSPACE_ACCESS: 'workspace_access',
  WORKSPACE_CREATE: 'workspace_create',
  FILE_UPLOAD: 'file_upload',
  FILE_DOWNLOAD: 'file_download'
};

class LoggingService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = this.isProduction ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.workspaceId = null;
    this.startTime = Date.now();
    
    // Initialize performance monitoring
    this.performanceMetrics = {
      pageLoads: [],
      apiCalls: [],
      searchQueries: [],
      errors: []
    };

    // Initialize error tracking
    this.errorBuffer = [];
    this.maxErrorBuffer = 100;

    // Setup periodic metrics reporting
    this.setupPeriodicReporting();
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  setUser(userId) {
    this.userId = userId;
    this.log(LOG_LEVELS.INFO, 'User session initialized', { userId }, USER_ACTIONS.LOGIN);
  }

  setWorkspace(workspaceId) {
    this.workspaceId = workspaceId;
    this.log(LOG_LEVELS.INFO, 'Workspace context set', { workspaceId }, USER_ACTIONS.WORKSPACE_ACCESS);
  }

  /**
   * Core logging method with structured format
   */
  log(level, message, data = {}, action = null, category = null) {
    if (level < this.logLevel) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: Object.keys(LOG_LEVELS)[level],
      message,
      sessionId: this.sessionId,
      userId: this.userId,
      workspaceId: this.workspaceId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      action,
      category,
      data,
      stack: level >= LOG_LEVELS.ERROR ? new Error().stack : null
    };

    // Console output for development
    if (!this.isProduction) {
      const consoleMethod = this.getConsoleMethod(level);
      consoleMethod(
        `[${logEntry.level}] ${message}`,
        data,
        action ? `Action: ${action}` : '',
        category ? `Category: ${category}` : ''
      );
    }

    // Send to backend in production
    if (this.isProduction) {
      this.sendLogToBackend(logEntry);
    }

    // Track errors in buffer
    if (level >= LOG_LEVELS.ERROR) {
      this.addToErrorBuffer(logEntry);
    }

    return logEntry;
  }

  /**
   * Convenience methods for different log levels
   */
  debug(message, data, action, category) {
    return this.log(LOG_LEVELS.DEBUG, message, data, action, category);
  }

  info(message, data, action, category) {
    return this.log(LOG_LEVELS.INFO, message, data, action, category);
  }

  warn(message, data, action, category) {
    return this.log(LOG_LEVELS.WARN, message, data, action, category);
  }

  error(message, data, action, category) {
    return this.log(LOG_LEVELS.ERROR, message, data, action, category);
  }

  critical(message, data, action, category) {
    return this.log(LOG_LEVELS.CRITICAL, message, data, action, category);
  }

  /**
   * Track user actions for analytics
   */
  trackUserAction(action, data = {}) {
    const actionData = {
      ...data,
      timestamp: Date.now(),
      sessionDuration: Date.now() - this.startTime
    };

    this.info(`User action: ${action}`, actionData, action);

    // Store for analytics
    if (!this.userActions) this.userActions = [];
    this.userActions.push({
      action,
      data: actionData,
      timestamp: Date.now()
    });
  }

  /**
   * Performance monitoring methods
   */
  startTimer(label) {
    const startTime = performance.now();
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.debug(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
        return duration;
      }
    };
  }

  trackPageLoad(page, loadTime) {
    this.performanceMetrics.pageLoads.push({
      page,
      loadTime,
      timestamp: Date.now()
    });

    this.info('Page load tracked', { page, loadTime: `${loadTime.toFixed(2)}ms` });
  }

  trackApiCall(endpoint, method, duration, status, error = null) {
    const apiCall = {
      endpoint,
      method,
      duration,
      status,
      error,
      timestamp: Date.now()
    };

    this.performanceMetrics.apiCalls.push(apiCall);

    if (error || status >= 400) {
      this.error('API call failed', apiCall, null, ERROR_CATEGORIES.API);
    } else {
      this.debug('API call completed', apiCall);
    }
  }

  trackSearchQuery(query, results, duration, searchMode = 'ai') {
    const searchData = {
      query: query.substring(0, 100), // Limit query length for privacy
      resultsCount: results,
      duration,
      searchMode,
      timestamp: Date.now()
    };

    this.performanceMetrics.searchQueries.push(searchData);
    this.trackUserAction(USER_ACTIONS.SEARCH, searchData);
  }

  /**
   * Error handling and reporting
   */
  addToErrorBuffer(logEntry) {
    this.errorBuffer.push(logEntry);
    
    // Keep buffer size manageable
    if (this.errorBuffer.length > this.maxErrorBuffer) {
      this.errorBuffer = this.errorBuffer.slice(-this.maxErrorBuffer);
    }

    // Track in performance metrics
    this.performanceMetrics.errors.push({
      level: logEntry.level,
      category: logEntry.category,
      message: logEntry.message,
      timestamp: Date.now()
    });
  }

  getErrorSummary() {
    const errors = this.performanceMetrics.errors;
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    
    const recentErrors = errors.filter(e => e.timestamp > last24h);
    const categoryCounts = {};
    
    recentErrors.forEach(error => {
      if (error.category) {
        categoryCounts[error.category] = (categoryCounts[error.category] || 0) + 1;
      }
    });

    return {
      total: recentErrors.length,
      categories: categoryCounts,
      mostRecent: recentErrors.slice(-5)
    };
  }

  /**
   * Performance metrics and analytics
   */
  getPerformanceMetrics() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);

    return {
      sessionDuration: now - this.startTime,
      pageLoads: this.performanceMetrics.pageLoads.filter(p => p.timestamp > last24h),
      apiCalls: this.performanceMetrics.apiCalls.filter(a => a.timestamp > last24h),
      searchQueries: this.performanceMetrics.searchQueries.filter(s => s.timestamp > last24h),
      errors: this.getErrorSummary()
    };
  }

  /**
   * Backend communication
   */
  async sendLogToBackend(logEntry) {
    try {
      // Only send important logs to backend to avoid spam
      if (logEntry.level >= LOG_LEVELS.WARN) {
        const response = await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logEntry)
        });

        if (!response.ok) {
          console.error('Failed to send log to backend:', response.statusText);
        }
      }
    } catch (error) {
      console.error('Error sending log to backend:', error);
    }
  }

  async sendMetricsToBackend() {
    try {
      const metrics = this.getPerformanceMetrics();
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          userId: this.userId,
          workspaceId: this.workspaceId,
          metrics,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        console.error('Failed to send metrics to backend:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending metrics to backend:', error);
    }
  }

  /**
   * Utility methods
   */
  getConsoleMethod(level) {
    switch (level) {
      case LOG_LEVELS.DEBUG:
        return console.debug;
      case LOG_LEVELS.INFO:
        return console.info;
      case LOG_LEVELS.WARN:
        return console.warn;
      case LOG_LEVELS.ERROR:
      case LOG_LEVELS.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  setupPeriodicReporting() {
    // Send metrics every 5 minutes in production
    if (this.isProduction) {
      setInterval(() => {
        this.sendMetricsToBackend();
      }, 5 * 60 * 1000);
    }

    // Send metrics on page unload
    window.addEventListener('beforeunload', () => {
      if (this.isProduction) {
        // Use sendBeacon for reliable delivery on page unload
        const metrics = this.getPerformanceMetrics();
        const data = JSON.stringify({
          sessionId: this.sessionId,
          userId: this.userId,
          workspaceId: this.workspaceId,
          metrics,
          timestamp: Date.now()
        });

        navigator.sendBeacon('/api/metrics', data);
      }
    });
  }

  /**
   * Global error handler integration
   */
  setupGlobalErrorHandling() {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.critical('Unhandled JavaScript error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
      }, null, ERROR_CATEGORIES.SYSTEM);
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.critical('Unhandled promise rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      }, null, ERROR_CATEGORIES.SYSTEM);
    });
  }
}

// Create singleton instance
const loggingService = new LoggingService();

// Setup global error handling
loggingService.setupGlobalErrorHandling();

export default loggingService;

// Convenience exports
export const { 
  debug, 
  info, 
  warn, 
  error, 
  critical, 
  trackUserAction, 
  startTimer, 
  trackPageLoad, 
  trackApiCall, 
  trackSearchQuery,
  setUser,
  setWorkspace
} = loggingService;

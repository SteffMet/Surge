import api from './api';

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.realTimeData = null;
    this.subscribers = new Set();
  }

  /**
   * Get dashboard analytics data
   */
  async getDashboardData(workspaceId, params = {}) {
    try {
      const response = await api.get(`/analytics/dashboard/${workspaceId}`, { params });
      return response;
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get user productivity scores
   */
  async getUserProductivityScores(workspaceId, timeRange = '30') {
    try {
      const response = await api.get(`/analytics/productivity/${workspaceId}`, {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting productivity scores:', error);
      throw error;
    }
  }

  /**
   * Get document performance metrics
   */
  async getDocumentPerformance(workspaceId, timeRange = '30') {
    try {
      const response = await api.get(`/analytics/documents/${workspaceId}`, {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting document performance:', error);
      throw error;
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(workspaceId, timeRange = '30') {
    try {
      const response = await api.get(`/analytics/search/${workspaceId}`, {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting search analytics:', error);
      throw error;
    }
  }

  /**
   * Get workspace overview
   */
  async getWorkspaceOverview(workspaceId) {
    try {
      const cacheKey = `overview_${workspaceId}`;
      
      // Check cache (5 minutes)
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) {
          return cached.data;
        }
      }

      const response = await api.get(`/analytics/overview/${workspaceId}`);
      
      // Cache result
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });

      return response.data;
    } catch (error) {
      console.error('Error getting workspace overview:', error);
      throw error;
    }
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics(workspaceId) {
    try {
      const response = await api.get(`/analytics/realtime/${workspaceId}`);
      this.realTimeData = response.data;
      
      // Notify subscribers
      this.notifySubscribers(this.realTimeData);
      
      return response.data;
    } catch (error) {
      console.error('Error getting real-time analytics:', error);
      throw error;
    }
  }

  /**
   * Track custom event
   */
  async trackEvent(eventData) {
    try {
      await api.post('/analytics/track', eventData);
    } catch (error) {
      console.error('Error tracking event:', error);
      // Don't throw error for tracking failures
    }
  }

  /**
   * Get export analytics data
   */
  async exportAnalytics(workspaceId, format = 'csv', timeRange = '30') {
    try {
      const response = await api.get(`/analytics/export/${workspaceId}`, {
        params: { format, timeRange },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${workspaceId}-${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  }

  /**
   * Get activity timeline
   */
  async getActivityTimeline(workspaceId, timeRange = '30') {
    try {
      const response = await api.get(`/analytics/timeline/${workspaceId}`, {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting activity timeline:', error);
      throw error;
    }
  }

  /**
   * Get content insights
   */
  async getContentInsights(workspaceId) {
    try {
      const response = await api.get(`/analytics/content-insights/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting content insights:', error);
      throw error;
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(workspaceId, timeRange = '30') {
    try {
      const response = await api.get(`/analytics/user-engagement/${workspaceId}`, {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting user engagement:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers
   */
  notifySubscribers(data) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in analytics subscriber:', error);
      }
    });
  }

  /**
   * Format chart data for recharts
   */
  formatChartData(data, xKey, yKeys) {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => {
      const formatted = { [xKey]: item[xKey] };
      
      yKeys.forEach(key => {
        formatted[key] = Number(item[key]) || 0;
      });
      
      return formatted;
    });
  }

  /**
   * Calculate percentage change
   */
  calculateChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Format percentage
   */
  formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format large numbers
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  }

  /**
   * Get time-based greeting
   */
  getTimeBasedInsight(data) {
    const hour = new Date().getHours();
    const insights = [];

    if (hour < 12) {
      insights.push('Good morning! Here\'s your workspace activity from yesterday.');
    } else if (hour < 18) {
      insights.push('Good afternoon! Your team is actively collaborating today.');
    } else {
      insights.push('Good evening! Here\'s a summary of today\'s activity.');
    }

    // Add data-driven insights
    if (data?.trends?.growing) {
      insights.push('📈 Document views are trending upward this week.');
    }
    
    if (data?.collaboration?.high) {
      insights.push('👥 Team collaboration is at an all-time high.');
    }

    return insights;
  }

  /**
   * Generate AI-powered insights
   */
  generateInsights(dashboardData) {
    const insights = [];

    try {
      // Activity insights
      if (dashboardData.overview?.viewsGrowth > 20) {
        insights.push({
          type: 'success',
          title: 'High Engagement',
          message: `Document views increased by ${dashboardData.overview.viewsGrowth}% this period.`,
          action: 'Keep up the great content!'
        });
      }

      // User productivity insights
      if (dashboardData.overview?.activeUsers > 0) {
        const avgProductivity = dashboardData.overview.totalViews / dashboardData.overview.activeUsers;
        if (avgProductivity > 10) {
          insights.push({
            type: 'info',
            title: 'Productive Team',
            message: `Your team averages ${avgProductivity.toFixed(1)} document views per user.`,
            action: 'Consider creating more collaborative content.'
          });
        }
      }

      // Content freshness insights
      if (dashboardData.contentInsights) {
        const staleContent = dashboardData.contentInsights.filter(item => 
          item.category === 'stale'
        ).length;
        
        if (staleContent > 5) {
          insights.push({
            type: 'warning',
            title: 'Content Maintenance Needed',
            message: `${staleContent} documents haven't been updated recently.`,
            action: 'Review and update stale content to maintain relevance.'
          });
        }
      }

      // Search insights
      if (dashboardData.overview?.totalSearches === 0) {
        insights.push({
          type: 'info',
          title: 'Search Opportunity',
          message: 'No searches recorded. Consider improving content discoverability.',
          action: 'Add relevant tags and improve document titles.'
        });
      }

    } catch (error) {
      console.error('Error generating insights:', error);
    }

    return insights;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.clearCache();
    this.subscribers.clear();
    this.realTimeData = null;
  }
}

export default new AnalyticsService();
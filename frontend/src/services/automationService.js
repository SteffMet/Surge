import api from './api';

class AutomationService {
  constructor() {
    this.cache = new Map();
    this.analysisCallbacks = new Map();
    this.debounceTimers = new Map();
  }

  /**
   * Get content suggestions for a document
   */
  async getContentSuggestions(documentId) {
    try {
      const response = await api.get(`/automation/suggestions/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting content suggestions:', error);
      throw error;
    }
  }

  /**
   * Analyze content in real-time with debouncing
   */
  analyzeContentDebounced(content, documentId, callback, delay = 2000) {
    // Clear existing timer
    if (this.debounceTimers.has(documentId)) {
      clearTimeout(this.debounceTimers.get(documentId));
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        const suggestions = await this.analyzeContent(content, documentId);
        callback(suggestions);
      } catch (error) {
        console.error('Error in debounced content analysis:', error);
        callback({ suggestions: { improvements: [], relatedDocuments: [], missingLinks: [], outdatedContent: [], qualityScore: 0 } });
      }
      this.debounceTimers.delete(documentId);
    }, delay);

    this.debounceTimers.set(documentId, timer);
  }

  /**
   * Analyze content and get suggestions
   */
  async analyzeContent(content, documentId = null) {
    try {
      const response = await api.post('/automation/analyze-content', {
        content,
        documentId
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing content:', error);
      throw error;
    }
  }

  /**
   * Find related documents
   */
  async findRelatedDocuments(content, workspaceId, excludeDocumentId = null) {
    try {
      const response = await api.post('/automation/related-documents', {
        content,
        workspaceId,
        excludeDocumentId
      });
      return response.data;
    } catch (error) {
      console.error('Error finding related documents:', error);
      throw error;
    }
  }

  /**
   * Get content freshness report for workspace
   */
  async getContentFreshness(workspaceId) {
    try {
      const cacheKey = `freshness_${workspaceId}`;
      
      // Check cache (5 minutes)
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) {
          return cached.data;
        }
      }

      const response = await api.get(`/automation/freshness/${workspaceId}`);
      
      // Cache result
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });

      return response.data;
    } catch (error) {
      console.error('Error getting content freshness:', error);
      throw error;
    }
  }

  /**
   * Get workflow suggestions for user in workspace
   */
  async getWorkflowSuggestions(workspaceId) {
    try {
      const response = await api.get(`/automation/workflow-suggestions/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting workflow suggestions:', error);
      throw error;
    }
  }

  /**
   * Execute automated tasks for workspace
   */
  async executeAutomatedTasks(workspaceId) {
    try {
      const response = await api.post(`/automation/execute-tasks/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error('Error executing automated tasks:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive health check for workspace
   */
  async getWorkspaceHealthCheck(workspaceId) {
    try {
      const cacheKey = `health_${workspaceId}`;
      
      // Check cache (10 minutes)
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 600000) {
          return cached.data;
        }
      }

      const response = await api.get(`/automation/health-check/${workspaceId}`);
      
      // Cache result
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });

      return response.data;
    } catch (error) {
      console.error('Error getting workspace health check:', error);
      throw error;
    }
  }

  /**
   * Clear cache for specific workspace
   */
  clearWorkspaceCache(workspaceId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(workspaceId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Cancel any pending analysis for document
   */
  cancelAnalysis(documentId) {
    if (this.debounceTimers.has(documentId)) {
      clearTimeout(this.debounceTimers.get(documentId));
      this.debounceTimers.delete(documentId);
    }
  }

  /**
   * Get quality score color
   */
  getQualityScoreColor(score) {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  }

  /**
   * Get quality score label
   */
  getQualityScoreLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Work';
    return 'Poor';
  }

  /**
   * Get freshness score color
   */
  getFreshnessScoreColor(score) {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  }

  /**
   * Get freshness score label
   */
  getFreshnessScoreLabel(score) {
    if (score >= 90) return 'Very Fresh';
    if (score >= 80) return 'Fresh';
    if (score >= 70) return 'Mostly Fresh';
    if (score >= 60) return 'Aging';
    return 'Stale';
  }

  /**
   * Format improvement suggestions for display
   */
  formatImprovements(improvements) {
    return improvements.map(improvement => ({
      ...improvement,
      icon: this.getImprovementIcon(improvement.type),
      color: this.getImprovementColor(improvement.severity)
    }));
  }

  /**
   * Get icon for improvement type
   */
  getImprovementIcon(type) {
    const icons = {
      'length': '📏',
      'structure': '🏗️',
      'formatting': '✨',
      'references': '🔗',
      'visual': '🖼️',
      'version': '🔄',
      'date': '📅',
      'technology': '⚡'
    };
    return icons[type] || '💡';
  }

  /**
   * Get color for improvement severity
   */
  getImprovementColor(severity) {
    const colors = {
      'high': '#ef4444',
      'medium': '#f59e0b',
      'low': '#3b82f6'
    };
    return colors[severity] || '#6b7280';
  }

  /**
   * Generate smart linking suggestions
   */
  generateLinkingSuggestions(content, relatedDocuments) {
    const suggestions = [];
    
    relatedDocuments.forEach(doc => {
      // Find mentions of the document title in content
      const titleRegex = new RegExp(doc.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = content.match(titleRegex);
      
      if (matches && matches.length > 0) {
        suggestions.push({
          documentId: doc.id,
          title: doc.title,
          mentions: matches.length,
          relevanceScore: doc.relevanceScore,
          preview: doc.preview,
          suggestion: `Link "${doc.title}" to related document`
        });
      }
    });

    return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Apply automatic linking
   */
  applyAutomaticLinking(content, linkingSuggestions) {
    let updatedContent = content;
    
    linkingSuggestions.forEach(suggestion => {
      const titleRegex = new RegExp(
        `(?<!\\[.*?)\\b${suggestion.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(?!.*?\\])`,
        'gi'
      );
      
      // Only replace the first occurrence to avoid over-linking
      let replaced = false;
      updatedContent = updatedContent.replace(titleRegex, (match) => {
        if (!replaced) {
          replaced = true;
          return `[${match}](/documents/${suggestion.documentId})`;
        }
        return match;
      });
    });
    
    return updatedContent;
  }

  /**
   * Monitor content quality in real-time
   */
  startQualityMonitoring(documentId, onQualityChange) {
    this.analysisCallbacks.set(documentId, onQualityChange);
  }

  /**
   * Stop quality monitoring
   */
  stopQualityMonitoring(documentId) {
    this.analysisCallbacks.delete(documentId);
    this.cancelAnalysis(documentId);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    // Clear callbacks
    this.analysisCallbacks.clear();
    
    // Clear cache
    this.cache.clear();
  }
}

export default new AutomationService();
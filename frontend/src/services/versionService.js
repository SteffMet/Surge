import { versionsAPI } from './api';

class VersionService {
  /**
   * Get document version history
   */
  async getDocumentHistory(documentId, options = {}) {
    try {
      const params = {
        limit: options.limit || 50,
        page: options.page || 1,
        includeContent: options.includeContent || false
      };
      
      const response = await versionsAPI.getDocumentHistory(documentId, params);
      return response.data;
    } catch (error) {
      console.error('Get document history error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get document history');
    }
  }

  /**
   * Get specific version
   */
  async getVersion(versionId, includeContent = true) {
    try {
      const response = await versionsAPI.get(`/versions/${versionId}`, {
        params: { includeContent }
      });
      return response.data;
    } catch (error) {
      console.error('Get version error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get version');
    }
  }

  /**
   * Create new version
   */
  async createVersion(documentId, versionData) {
    try {
      const response = await versionsAPI.post(`/versions/document/${documentId}`, versionData);
      return response.data;
    } catch (error) {
      console.error('Create version error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create version');
    }
  }

  /**
   * Restore to specific version
   */
  async restoreToVersion(documentId, versionNumber) {
    try {
      const response = await versionsAPI.post(`/versions/document/${documentId}/restore/${versionNumber}`);
      return response.data;
    } catch (error) {
      console.error('Restore version error:', error);
      throw new Error(error.response?.data?.message || 'Failed to restore version');
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(documentId, fromVersion, toVersion) {
    try {
      const response = await versionsAPI.get(`/versions/compare/${documentId}/${fromVersion}/${toVersion}`);
      return response.data;
    } catch (error) {
      console.error('Compare versions error:', error);
      throw new Error(error.response?.data?.message || 'Failed to compare versions');
    }
  }

  /**
   * Get version statistics
   */
  async getVersionStats(documentId) {
    try {
      const response = await versionsAPI.get(`/versions/stats/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Get version stats error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get version statistics');
    }
  }

  /**
   * Get version tree for visualization
   */
  async getVersionTree(documentId) {
    try {
      const response = await versionsAPI.get(`/versions/tree/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Get version tree error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get version tree');
    }
  }

  /**
   * Delete version (admin only)
   */
  async deleteVersion(versionId) {
    try {
      const response = await versionsAPI.delete(`/versions/${versionId}`);
      return response.data;
    } catch (error) {
      console.error('Delete version error:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete version');
    }
  }

  /**
   * Create a save as version functionality
   */
  async saveAsVersion(documentId, title, content, tags = [], isAutoSave = false) {
    return this.createVersion(documentId, {
      title,
      content,
      tags,
      isAutoSave
    });
  }

  /**
   * Create auto-save version
   */
  async autoSave(documentId, content, title) {
    return this.createVersion(documentId, {
      title,
      content,
      isAutoSave: true
    });
  }

  /**
   * Format version for display
   */
  formatVersion(version) {
    return {
      ...version,
      formattedDate: new Date(version.createdAt).toLocaleString(),
      relativeTime: this.getRelativeTime(version.createdAt),
      changesSummary: version.changesSummary || this.generateChangesSummary(version)
    };
  }

  /**
   * Generate changes summary from metadata
   */
  generateChangesSummary(version) {
    if (!version.metadata) return 'No changes recorded';
    
    const { wordsAdded = 0, wordsRemoved = 0 } = version.metadata;
    
    if (wordsAdded === 0 && wordsRemoved === 0) {
      return 'Minor changes';
    }
    
    const parts = [];
    if (wordsAdded > 0) parts.push(`+${wordsAdded} words`);
    if (wordsRemoved > 0) parts.push(`-${wordsRemoved} words`);
    
    return parts.join(', ');
  }

  /**
   * Get relative time string
   */
  getRelativeTime(date) {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return past.toLocaleDateString();
  }
}

export default new VersionService();

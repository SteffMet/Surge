import api from './api';

class TemplateService {
  /**
   * Get all templates
   */
  async getTemplates(params = {}) {
    try {
      const response = await api.get('/templates', { params });
      return response.data;
    } catch (error) {
      console.error('Get templates error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get templates');
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId) {
    try {
      const response = await api.get(`/templates/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('Get template error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get template');
    }
  }

  /**
   * Create new template
   */
  async createTemplate(templateData) {
    try {
      const response = await api.post('/templates', templateData);
      return response.data;
    } catch (error) {
      console.error('Create template error:', error);
      throw new Error(error.response?.data?.error || 'Failed to create template');
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, templateData) {
    try {
      const response = await api.put(`/templates/${templateId}`, templateData);
      return response.data;
    } catch (error) {
      console.error('Update template error:', error);
      throw new Error(error.response?.data?.error || 'Failed to update template');
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId) {
    try {
      const response = await api.delete(`/templates/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('Delete template error:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete template');
    }
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(templateId, newData) {
    try {
      const response = await api.post(`/templates/${templateId}/duplicate`, newData);
      return response.data;
    } catch (error) {
      console.error('Duplicate template error:', error);
      throw new Error(error.response?.data?.error || 'Failed to duplicate template');
    }
  }

  /**
   * Create document from template
   */
  async createDocumentFromTemplate(templateId, documentData, variables = {}) {
    try {
      const response = await api.post(`/templates/${templateId}/use`, {
        documentData,
        variables
      });
      return response.data;
    } catch (error) {
      console.error('Create document from template error:', error);
      throw new Error(error.response?.data?.error || 'Failed to create document from template');
    }
  }

  /**
   * Rate template
   */
  async rateTemplate(templateId, rating) {
    try {
      const response = await api.post(`/templates/${templateId}/rate`, { rating });
      return response.data;
    } catch (error) {
      console.error('Rate template error:', error);
      throw new Error(error.response?.data?.error || 'Failed to rate template');
    }
  }

  /**
   * Get workspace templates
   */
  async getWorkspaceTemplates(workspaceId) {
    try {
      const response = await api.get(`/templates/workspace/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error('Get workspace templates error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get workspace templates');
    }
  }

  /**
   * Search templates
   */
  async searchTemplates(query, options = {}) {
    try {
      const params = { search: query, ...options };
      const response = await api.get('/templates', { params });
      return response.data;
    } catch (error) {
      console.error('Search templates error:', error);
      throw new Error(error.response?.data?.error || 'Failed to search templates');
    }
  }

  /**
   * Get template categories
   */
  async getCategories() {
    try {
      const response = await api.get('/templates/categories');
      return response.data.categories;
    } catch (error) {
      console.error('Get categories error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get categories');
    }
  }

  /**
   * Get template statistics
   */
  async getStatistics(workspaceId = null) {
    try {
      const params = workspaceId ? { workspace: workspaceId } : {};
      const response = await api.get('/templates/statistics', { params });
      return response.data;
    } catch (error) {
      console.error('Get template statistics error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get template statistics');
    }
  }

  /**
   * Initialize system templates (Admin only)
   */
  async initializeSystemTemplates() {
    try {
      const response = await api.post('/templates/initialize-system');
      return response.data;
    } catch (error) {
      console.error('Initialize system templates error:', error);
      throw new Error(error.response?.data?.error || 'Failed to initialize system templates');
    }
  }

  /**
   * Process template variables
   */
  processTemplateVariables(content, variables) {
    if (!content || !variables) return content;
    
    let processedContent = typeof content === 'string' 
      ? content 
      : JSON.stringify(content);
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, value || '');
    });
    
    return typeof content === 'string' 
      ? processedContent 
      : JSON.parse(processedContent);
  }

  /**
   * Extract variables from template content
   */
  extractVariables(content) {
    const variables = new Set();
    const contentStr = typeof content === 'string' 
      ? content 
      : JSON.stringify(content);
    
    const matches = contentStr.match(/{{([^}]+)}}/g);
    if (matches) {
      matches.forEach(match => {
        const variable = match.replace(/[{}]/g, '');
        variables.add(variable);
      });
    }
    
    return Array.from(variables);
  }

  /**
   * Validate template data
   */
  validateTemplate(templateData) {
    const errors = [];
    
    if (!templateData.name || templateData.name.trim().length === 0) {
      errors.push('Template name is required');
    }
    
    if (templateData.name && templateData.name.length > 200) {
      errors.push('Template name must be less than 200 characters');
    }
    
    if (!templateData.category) {
      errors.push('Template category is required');
    }
    
    if (!templateData.content) {
      errors.push('Template content is required');
    }
    
    if (templateData.description && templateData.description.length > 1000) {
      errors.push('Template description must be less than 1000 characters');
    }
    
    return errors;
  }

  /**
   * Format template for display
   */
  formatTemplate(template) {
    return {
      ...template,
      createdDate: new Date(template.createdAt).toLocaleDateString(),
      updatedDate: new Date(template.updatedAt).toLocaleDateString(),
      lastUsedDate: template.usage?.lastUsed 
        ? new Date(template.usage.lastUsed).toLocaleDateString() 
        : 'Never',
      popularityScore: Math.round(template.popularityScore || 0),
      ratingDisplay: template.rating?.average 
        ? `${template.rating.average.toFixed(1)} (${template.rating.count} reviews)`
        : 'Not rated',
      usageCount: template.usage?.count || 0,
      categoryIcon: this.getCategoryIcon(template.category),
      categoryName: this.getCategoryName(template.category)
    };
  }

  /**
   * Get category icon
   */
  getCategoryIcon(category) {
    const icons = {
      IT_PROCEDURE: '🔧',
      DOCUMENTATION: '📋',
      INCIDENT_REPORT: '🚨',
      CHANGE_REQUEST: '🔄',
      KNOWLEDGE_BASE: '💡',
      TROUBLESHOOTING: '🔍',
      MAINTENANCE: '⚙️',
      SECURITY_POLICY: '🔒',
      USER_GUIDE: '👤',
      PROJECT_PLAN: '📊',
      CUSTOM: '🎨'
    };
    return icons[category] || '📄';
  }

  /**
   * Get category display name
   */
  getCategoryName(category) {
    const names = {
      IT_PROCEDURE: 'IT Procedures',
      DOCUMENTATION: 'Documentation',
      INCIDENT_REPORT: 'Incident Reports',
      CHANGE_REQUEST: 'Change Requests',
      KNOWLEDGE_BASE: 'Knowledge Base',
      TROUBLESHOOTING: 'Troubleshooting',
      MAINTENANCE: 'Maintenance',
      SECURITY_POLICY: 'Security Policies',
      USER_GUIDE: 'User Guides',
      PROJECT_PLAN: 'Project Plans',
      CUSTOM: 'Custom'
    };
    return names[category] || category;
  }

  /**
   * Export template as JSON
   */
  exportTemplate(template) {
    const exportData = {
      name: template.name,
      description: template.description,
      category: template.category,
      content: template.content,
      structure: template.structure,
      variables: template.variables,
      tags: template.tags,
      version: template.version,
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${template.name.replace(/[^\w-]/g, '_')}_template.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  /**
   * Import template from JSON
   */
  async importTemplate(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const templateData = JSON.parse(e.target.result);
          
          // Validate imported data
          const errors = this.validateTemplate(templateData);
          if (errors.length > 0) {
            reject(new Error(`Invalid template data: ${errors.join(', ')}`));
            return;
          }
          
          // Add import metadata
          templateData.name = `${templateData.name} (Imported)`;
          templateData.type = 'custom';
          templateData.isPublic = false;
          
          resolve(templateData);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

export default new TemplateService();
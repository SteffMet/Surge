const Template = require('../models/Template');
const Document = require('../models/Document');
const { Workspace } = require('../models/Workspace');

class TemplateService {
  /**
   * Create a new template
   */
  async createTemplate(templateData, userId) {
    try {
      const template = new Template({
        ...templateData,
        createdBy: userId
      });
      
      await template.save();
      return await this.populateTemplate(template);
    } catch (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId, userId = null) {
    try {
      const template = await this.populateTemplate(
        await Template.findById(templateId)
      );
      
      if (!template) {
        throw new Error('Template not found');
      }

      // Check access permissions
      if (userId && !template.canUserAccess(userId, 'view')) {
        throw new Error('Access denied');
      }

      // Increment view count
      template.analytics.views += 1;
      await template.save();

      return template;
    } catch (error) {
      throw new Error(`Failed to get template: ${error.message}`);
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, updateData, userId) {
    try {
      const template = await Template.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Check edit permissions
      if (!template.canUserAccess(userId, 'edit')) {
        throw new Error('Access denied');
      }

      Object.assign(template, updateData);
      await template.save();
      
      return await this.populateTemplate(template);
    } catch (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId, userId) {
    try {
      const template = await Template.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Check permissions - only creator or admin can delete
      if (template.createdBy.toString() !== userId && template.type !== 'custom') {
        throw new Error('Access denied');
      }

      // Soft delete by setting isActive to false
      template.isActive = false;
      await template.save();

      return { success: true, message: 'Template deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Get templates for workspace
   */
  async getWorkspaceTemplates(workspaceId, userId = null) {
    try {
      const templates = await Template.getWorkspaceTemplates(workspaceId);
      const populatedTemplates = await Promise.all(
        templates.map(template => this.populateTemplate(template))
      );

      // Filter by user permissions
      if (userId) {
        return populatedTemplates.filter(template => 
          template.canUserAccess(userId, 'view')
        );
      }

      return populatedTemplates;
    } catch (error) {
      throw new Error(`Failed to get workspace templates: ${error.message}`);
    }
  }

  /**
   * Get public templates
   */
  async getPublicTemplates(options = {}) {
    try {
      let query = Template.getPublicTemplates();

      if (options.category) {
        query = query.where('category', options.category);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.skip) {
        query = query.skip(options.skip);
      }

      const templates = await query.exec();
      return await Promise.all(
        templates.map(template => this.populateTemplate(template))
      );
    } catch (error) {
      throw new Error(`Failed to get public templates: ${error.message}`);
    }
  }

  /**
   * Search templates
   */
  async searchTemplates(query, options = {}) {
    try {
      const templates = await Template.searchTemplates(query, options);
      return await Promise.all(
        templates.map(template => this.populateTemplate(template))
      );
    } catch (error) {
      throw new Error(`Failed to search templates: ${error.message}`);
    }
  }

  /**
   * Create document from template
   */
  async createDocumentFromTemplate(templateId, documentData, variables = {}, userId) {
    try {
      const template = await this.getTemplate(templateId, userId);
      
      if (!template.canUserAccess(userId, 'use')) {
        throw new Error('Access denied to use this template');
      }

      // Process template variables
      const processedContent = template.processVariables(variables);

      // Create document with processed content
      const document = new Document({
        title: documentData.title || template.name,
        content: processedContent,
        description: documentData.description || template.description,
        tags: [...(documentData.tags || []), ...(template.tags || [])],
        workspace: documentData.workspace,
        createdBy: userId,
        template: {
          id: template._id,
          name: template.name,
          version: template.version,
          variables: variables
        },
        metadata: {
          ...documentData.metadata,
          templateUsed: true,
          templateId: template._id
        }
      });

      await document.save();

      // Increment template usage
      await template.incrementUsage();

      return document;
    } catch (error) {
      throw new Error(`Failed to create document from template: ${error.message}`);
    }
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(templateId, newData, userId) {
    try {
      const originalTemplate = await this.getTemplate(templateId, userId);
      
      if (!originalTemplate.canUserAccess(userId, 'view')) {
        throw new Error('Access denied');
      }

      const duplicateData = {
        name: newData.name || `${originalTemplate.name} (Copy)`,
        description: newData.description || originalTemplate.description,
        category: originalTemplate.category,
        content: originalTemplate.content,
        structure: originalTemplate.structure,
        variables: originalTemplate.variables,
        tags: [...(originalTemplate.tags || []), 'duplicate'],
        workspace: newData.workspace || originalTemplate.workspace,
        type: 'custom',
        isPublic: false
      };

      return await this.createTemplate(duplicateData, userId);
    } catch (error) {
      throw new Error(`Failed to duplicate template: ${error.message}`);
    }
  }

  /**
   * Rate template
   */
  async rateTemplate(templateId, rating, userId) {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const template = await Template.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // For simplicity, we'll just update the average rating
      // In a real implementation, you'd track individual ratings
      const newCount = template.rating.count + 1;
      const newAverage = ((template.rating.average * template.rating.count) + rating) / newCount;

      template.rating.average = Math.round(newAverage * 10) / 10; // Round to 1 decimal
      template.rating.count = newCount;

      await template.save();
      return await this.populateTemplate(template);
    } catch (error) {
      throw new Error(`Failed to rate template: ${error.message}`);
    }
  }

  /**
   * Get template categories
   */
  getTemplateCategories() {
    return [
      {
        key: 'IT_PROCEDURE',
        name: 'IT Procedures',
        description: 'Step-by-step IT operational procedures',
        icon: '🔧'
      },
      {
        key: 'DOCUMENTATION',
        name: 'Documentation',
        description: 'General documentation templates',
        icon: '📋'
      },
      {
        key: 'INCIDENT_REPORT',
        name: 'Incident Reports',
        description: 'Templates for incident documentation',
        icon: '🚨'
      },
      {
        key: 'CHANGE_REQUEST',
        name: 'Change Requests',
        description: 'Change management documentation',
        icon: '🔄'
      },
      {
        key: 'KNOWLEDGE_BASE',
        name: 'Knowledge Base',
        description: 'Knowledge articles and FAQs',
        icon: '💡'
      },
      {
        key: 'TROUBLESHOOTING',
        name: 'Troubleshooting',
        description: 'Problem resolution guides',
        icon: '🔍'
      },
      {
        key: 'MAINTENANCE',
        name: 'Maintenance',
        description: 'System maintenance procedures',
        icon: '⚙️'
      },
      {
        key: 'SECURITY_POLICY',
        name: 'Security Policies',
        description: 'Security-related documentation',
        icon: '🔒'
      },
      {
        key: 'USER_GUIDE',
        name: 'User Guides',
        description: 'End-user documentation',
        icon: '👤'
      },
      {
        key: 'PROJECT_PLAN',
        name: 'Project Plans',
        description: 'Project planning and tracking',
        icon: '📊'
      },
      {
        key: 'CUSTOM',
        name: 'Custom',
        description: 'Custom templates',
        icon: '🎨'
      }
    ];
  }

  /**
   * Initialize default system templates
   */
  async initializeSystemTemplates() {
    try {
      const systemTemplates = await this.getDefaultSystemTemplates();
      
      for (const templateData of systemTemplates) {
        const existingTemplate = await Template.findOne({
          name: templateData.name,
          type: 'system'
        });

        if (!existingTemplate) {
          await Template.create({
            ...templateData,
            type: 'system',
            createdBy: null, // System templates have no specific creator
            isPublic: true
          });
        }
      }
    } catch (error) {
      console.error('Failed to initialize system templates:', error);
    }
  }

  /**
   * Get default system templates
   */
  async getDefaultSystemTemplates() {
    return [
      {
        name: 'IT Incident Report',
        description: 'Standard template for documenting IT incidents',
        category: 'INCIDENT_REPORT',
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Incident Report: {{incident_title}}' }]
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Incident Details' }]
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Incident ID: ' },
                { type: 'text', text: '{{incident_id}}' }
              ]
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Date/Time: ' },
                { type: 'text', text: '{{incident_date}}' }
              ]
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: 'Severity: ' },
                { type: 'text', text: '{{severity}}' }
              ]
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Description' }]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '{{description}}' }]
            }
          ]
        },
        variables: [
          { key: 'incident_title', label: 'Incident Title', type: 'text', required: true },
          { key: 'incident_id', label: 'Incident ID', type: 'text', required: true },
          { key: 'incident_date', label: 'Date/Time', type: 'date', required: true },
          { key: 'severity', label: 'Severity', type: 'select', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
          { key: 'description', label: 'Description', type: 'text', required: true }
        ],
        tags: ['incident', 'report', 'IT', 'system']
      },
      {
        name: 'Standard Operating Procedure',
        description: 'Template for creating standard operating procedures',
        category: 'IT_PROCEDURE',
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: '{{procedure_title}}' }]
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Purpose' }]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '{{purpose}}' }]
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Prerequisites' }]
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: '{{prerequisite_1}}' }] }]
                }
              ]
            }
          ]
        },
        variables: [
          { key: 'procedure_title', label: 'Procedure Title', type: 'text', required: true },
          { key: 'purpose', label: 'Purpose', type: 'text', required: true },
          { key: 'prerequisite_1', label: 'Primary Prerequisite', type: 'text', required: false }
        ],
        tags: ['SOP', 'procedure', 'IT', 'operations']
      }
    ];
  }

  /**
   * Populate template with related data
   */
  async populateTemplate(template) {
    if (!template) return null;
    
    return await Template.populate(template, [
      { path: 'createdBy', select: 'username email avatar' },
      { path: 'workspace', select: 'name description type' }
    ]);
  }

  /**
   * Get template statistics
   */
  async getTemplateStatistics(workspaceId = null) {
    try {
      const matchStage = workspaceId 
        ? { workspace: workspaceId, isActive: true }
        : { isActive: true };

      const stats = await Template.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalTemplates: { $sum: 1 },
            publicTemplates: { $sum: { $cond: ['$isPublic', 1, 0] } },
            totalUsage: { $sum: '$usage.count' },
            averageRating: { $avg: '$rating.average' },
            categoryCounts: {
              $push: '$category'
            }
          }
        },
        {
          $project: {
            totalTemplates: 1,
            publicTemplates: 1,
            totalUsage: 1,
            averageRating: { $round: ['$averageRating', 1] },
            categories: '$categoryCounts'
          }
        }
      ]);

      const categoryStats = await Template.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalUsage: { $sum: '$usage.count' },
            averageRating: { $avg: '$rating.average' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        overview: stats[0] || {
          totalTemplates: 0,
          publicTemplates: 0,
          totalUsage: 0,
          averageRating: 0
        },
        byCategory: categoryStats
      };
    } catch (error) {
      throw new Error(`Failed to get template statistics: ${error.message}`);
    }
  }
}

module.exports = new TemplateService();
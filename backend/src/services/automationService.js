const Document = require('../models/Document');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const mongoose = require('mongoose');

class AutomationService {
  constructor() {
    this.contentAnalysisCache = new Map();
    this.linkingCache = new Map();
    this.automationRules = new Map();
  }

  /**
   * Analyze document content and generate suggestions
   */
  async analyzeContentForSuggestions(documentId, content) {
    try {
      // Check cache first
      const cacheKey = `${documentId}-${this.hashContent(content)}`;
      if (this.contentAnalysisCache.has(cacheKey)) {
        return this.contentAnalysisCache.get(cacheKey);
      }

      const suggestions = {
        improvements: [],
        relatedDocuments: [],
        missingLinks: [],
        outdatedContent: [],
        qualityScore: 0
      };

      // Analyze content quality
      const qualityAnalysis = await this.analyzeContentQuality(content);
      suggestions.improvements = qualityAnalysis.improvements;
      suggestions.qualityScore = qualityAnalysis.score;

      // Find related documents
      const relatedDocs = await this.findRelatedDocuments(documentId, content);
      suggestions.relatedDocuments = relatedDocs;

      // Detect missing internal links
      const missingLinks = await this.detectMissingLinks(content, documentId);
      suggestions.missingLinks = missingLinks;

      // Check for outdated content
      const outdatedContent = await this.detectOutdatedContent(content);
      suggestions.outdatedContent = outdatedContent;

      // Cache results for 1 hour
      this.contentAnalysisCache.set(cacheKey, suggestions);
      setTimeout(() => {
        this.contentAnalysisCache.delete(cacheKey);
      }, 3600000); // 1 hour

      return suggestions;
    } catch (error) {
      console.error('Content analysis error:', error);
      return {
        improvements: [],
        relatedDocuments: [],
        missingLinks: [],
        outdatedContent: [],
        qualityScore: 0
      };
    }
  }

  /**
   * Analyze content quality and suggest improvements
   */
  async analyzeContentQuality(content) {
    const improvements = [];
    let score = 100;

    // Check content length
    if (content.length < 100) {
      improvements.push({
        type: 'length',
        severity: 'medium',
        message: 'Content is quite short. Consider adding more detailed information.',
        suggestion: 'Expand with examples, explanations, or additional context.'
      });
      score -= 15;
    }

    // Check for headings structure
    const headingMatches = content.match(/#{1,6}\s+.+/g) || [];
    if (headingMatches.length === 0) {
      improvements.push({
        type: 'structure',
        severity: 'medium',
        message: 'No headings found. Document structure could be improved.',
        suggestion: 'Add headings to organize content into sections.'
      });
      score -= 10;
    }

    // Check for code blocks in technical content
    const codeIndicators = ['function', 'class', 'import', 'const', 'var', 'let', '$', 'SELECT', 'UPDATE'];
    const hasCodeIndicators = codeIndicators.some(indicator => 
      content.toLowerCase().includes(indicator.toLowerCase())
    );
    const hasCodeBlocks = content.includes('```') || content.includes('`');
    
    if (hasCodeIndicators && !hasCodeBlocks) {
      improvements.push({
        type: 'formatting',
        severity: 'low',
        message: 'Code snippets detected but not properly formatted.',
        suggestion: 'Use code blocks (```) to format code snippets for better readability.'
      });
      score -= 5;
    }

    // Check for lists where appropriate
    const listIndicators = ['steps', 'requirements', 'features', 'benefits', 'items'];
    const hasListIndicators = listIndicators.some(indicator => 
      content.toLowerCase().includes(indicator)
    );
    const hasLists = content.includes('- ') || content.includes('* ') || /\d+\.\s/.test(content);
    
    if (hasListIndicators && !hasLists) {
      improvements.push({
        type: 'formatting',
        severity: 'low',
        message: 'Consider using bullet points or numbered lists for better organization.',
        suggestion: 'Format enumerated items as lists for improved readability.'
      });
      score -= 5;
    }

    // Check for external links
    const urlPattern = /https?:\/\/[^\s]+/g;
    const externalLinks = content.match(urlPattern) || [];
    if (externalLinks.length === 0 && content.length > 500) {
      improvements.push({
        type: 'references',
        severity: 'low',
        message: 'No external references found.',
        suggestion: 'Consider adding links to relevant external resources or documentation.'
      });
      score -= 3;
    }

    // Check for images/diagrams
    const imagePattern = /!\[.*?\]\(.*?\)/g;
    const hasImages = content.match(imagePattern);
    if (!hasImages && content.length > 1000) {
      improvements.push({
        type: 'visual',
        severity: 'low',
        message: 'Long content without visual elements.',
        suggestion: 'Consider adding diagrams, screenshots, or images to illustrate concepts.'
      });
      score -= 5;
    }

    return {
      score: Math.max(score, 0),
      improvements
    };
  }

  /**
   * Find documents related to the current content
   */
  async findRelatedDocuments(documentId, content) {
    try {
      // Extract keywords from content
      const keywords = this.extractKeywords(content);
      
      if (keywords.length === 0) return [];

      // Get current document to exclude it and get its workspace
      const currentDoc = await Document.findById(documentId);
      if (!currentDoc) return [];

      // Search for related documents in the same workspace
      const relatedDocs = await Document.aggregate([
        {
          $match: {
            _id: { $ne: new mongoose.Types.ObjectId(documentId) },
            workspaceId: currentDoc.workspaceId,
            $text: { $search: keywords.slice(0, 5).join(' ') }
          }
        },
        {
          $addFields: {
            score: { $meta: 'textScore' }
          }
        },
        {
          $sort: { score: -1 }
        },
        {
          $limit: 5
        },
        {
          $project: {
            title: 1,
            content: { $substr: ['$content', 0, 200] },
            updatedAt: 1,
            score: 1
          }
        }
      ]);

      return relatedDocs.map(doc => ({
        id: doc._id,
        title: doc.title,
        preview: doc.content,
        updatedAt: doc.updatedAt,
        relevanceScore: doc.score || 0
      }));
    } catch (error) {
      console.error('Error finding related documents:', error);
      return [];
    }
  }

  /**
   * Detect missing internal links
   */
  async detectMissingLinks(content, documentId) {
    try {
      const currentDoc = await Document.findById(documentId);
      if (!currentDoc) return [];

      // Get all documents in the same workspace
      const workspaceDocs = await Document.find(
        { 
          workspaceId: currentDoc.workspaceId,
          _id: { $ne: documentId }
        },
        { title: 1, content: 1 }
      );

      const missingLinks = [];

      for (const doc of workspaceDocs) {
        // Check if document title is mentioned in content but not linked
        const titleRegex = new RegExp(doc.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const titleMatches = content.match(titleRegex);
        
        if (titleMatches && titleMatches.length > 0) {
          // Check if it's already linked
          const linkPattern = new RegExp(`\\[.*?${doc.title}.*?\\]\\(.*?\\)`, 'gi');
          const isLinked = linkPattern.test(content);
          
          if (!isLinked) {
            missingLinks.push({
              documentId: doc._id,
              title: doc.title,
              mentions: titleMatches.length,
              suggestion: `Link "${doc.title}" to related document`
            });
          }
        }
      }

      // Sort by number of mentions
      return missingLinks
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 10);
    } catch (error) {
      console.error('Error detecting missing links:', error);
      return [];
    }
  }

  /**
   * Detect outdated content based on patterns and timestamps
   */
  async detectOutdatedContent(content) {
    const outdatedIndicators = [];

    // Check for old version references
    const versionPatterns = [
      /version\s+[\d.]+/gi,
      /v[\d.]+/gi,
      /\d{4}(?:\s+|-)(?:edition|version|release)/gi
    ];

    for (const pattern of versionPatterns) {
      const matches = content.match(pattern) || [];
      for (const match of matches) {
        const numbers = match.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          const majorVersion = parseInt(numbers[0]);
          const year = numbers.find(n => parseInt(n) > 2000 && parseInt(n) < 2030);
          
          if (year && parseInt(year) < new Date().getFullYear() - 2) {
            outdatedIndicators.push({
              type: 'version',
              text: match,
              severity: 'medium',
              message: `Version reference "${match}" may be outdated`,
              suggestion: 'Update to current version information'
            });
          }
        }
      }
    }

    // Check for date references
    const datePatterns = [
      /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}/g,
      /\d{4}-\d{2}-\d{2}/g
    ];

    for (const pattern of datePatterns) {
      const matches = content.match(pattern) || [];
      for (const match of matches) {
        const year = match.match(/\d{4}/)?.[0];
        if (year && parseInt(year) < new Date().getFullYear() - 1) {
          outdatedIndicators.push({
            type: 'date',
            text: match,
            severity: 'low',
            message: `Date reference "${match}" may be outdated`,
            suggestion: 'Review and update date if necessary'
          });
        }
      }
    }

    // Check for technology-specific outdated patterns
    const techPatterns = [
      { pattern: /internet explorer/gi, message: 'Internet Explorer is deprecated' },
      { pattern: /jquery\s+[\d.]+/gi, message: 'jQuery version may be outdated' },
      { pattern: /python\s+2/gi, message: 'Python 2 is end-of-life' },
      { pattern: /node\.?js\s+[\d.]+/gi, message: 'Node.js version may be outdated' }
    ];

    for (const tech of techPatterns) {
      const matches = content.match(tech.pattern) || [];
      for (const match of matches) {
        outdatedIndicators.push({
          type: 'technology',
          text: match,
          severity: 'medium',
          message: tech.message,
          suggestion: 'Consider updating to current technology stack'
        });
      }
    }

    return outdatedIndicators.slice(0, 10);
  }

  /**
   * Monitor content freshness across workspace
   */
  async monitorContentFreshness(workspaceId) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const freshnessReport = await Document.aggregate([
        {
          $match: {
            workspaceId: new mongoose.Types.ObjectId(workspaceId)
          }
        },
        {
          $addFields: {
            freshness: {
              $cond: {
                if: { $gte: ['$updatedAt', thirtyDaysAgo] },
                then: 'fresh',
                else: {
                  $cond: {
                    if: { $gte: ['$updatedAt', ninetyDaysAgo] },
                    then: 'aging',
                    else: 'stale'
                  }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: '$freshness',
            count: { $sum: 1 },
            documents: {
              $push: {
                id: '$_id',
                title: '$title',
                updatedAt: '$updatedAt',
                viewCount: { $ifNull: ['$viewCount', 0] }
              }
            }
          }
        }
      ]);

      // Calculate freshness score
      const total = freshnessReport.reduce((sum, group) => sum + group.count, 0);
      let freshnessScore = 0;

      freshnessReport.forEach(group => {
        const weight = group._id === 'fresh' ? 1 : (group._id === 'aging' ? 0.5 : 0.1);
        freshnessScore += (group.count / total) * weight * 100;
      });

      return {
        score: Math.round(freshnessScore),
        total,
        breakdown: freshnessReport.reduce((acc, group) => {
          acc[group._id] = {
            count: group.count,
            documents: group.documents.slice(0, 10) // Limit to top 10
          };
          return acc;
        }, {}),
        recommendations: this.generateFreshnessRecommendations(freshnessReport)
      };
    } catch (error) {
      console.error('Error monitoring content freshness:', error);
      return {
        score: 0,
        total: 0,
        breakdown: {},
        recommendations: []
      };
    }
  }

  /**
   * Generate automated workflow suggestions
   */
  async generateWorkflowSuggestions(workspaceId, userId) {
    try {
      const user = await User.findById(userId);
      const workspace = await Workspace.findById(workspaceId);

      if (!user || !workspace) return [];

      const suggestions = [];

      // Analyze user activity patterns
      const userActivity = await Analytics.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              action: '$action',
              hour: { $hour: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Suggest optimal work times
      const activityByHour = {};
      userActivity.forEach(activity => {
        const hour = activity._id.hour;
        activityByHour[hour] = (activityByHour[hour] || 0) + activity.count;
      });

      const peakHours = Object.entries(activityByHour)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => hour);

      if (peakHours.length > 0) {
        suggestions.push({
          type: 'schedule',
          title: 'Optimal Work Schedule',
          description: `You're most productive during hours ${peakHours.join(', ')}`,
          action: 'Consider scheduling important documentation work during these peak hours',
          priority: 'medium'
        });
      }

      // Suggest document templates based on patterns
      const documentPatterns = await this.analyzeDocumentPatterns(workspaceId, userId);
      if (documentPatterns.length > 0) {
        suggestions.push({
          type: 'template',
          title: 'Create Custom Templates',
          description: 'Based on your document creation patterns',
          action: `Create templates for: ${documentPatterns.slice(0, 3).join(', ')}`,
          priority: 'high'
        });
      }

      // Suggest automation rules
      const automationRules = await this.suggestAutomationRules(workspaceId, userId);
      suggestions.push(...automationRules);

      return suggestions.slice(0, 10);
    } catch (error) {
      console.error('Error generating workflow suggestions:', error);
      return [];
    }
  }

  /**
   * Execute automated tasks based on rules
   */
  async executeAutomatedTasks(workspaceId) {
    try {
      const results = [];

      // Auto-update stale document alerts
      const staleDocuments = await Document.find({
        workspaceId,
        updatedAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      }).limit(10);

      for (const doc of staleDocuments) {
        // Create analytics event for stale content
        await Analytics.create({
          type: 'content_alert',
          action: 'stale_content_detected',
          documentId: doc._id,
          workspaceId,
          metadata: {
            lastUpdated: doc.updatedAt,
            title: doc.title,
            automated: true
          }
        });

        results.push({
          type: 'alert',
          documentId: doc._id,
          message: `Stale content detected: ${doc.title}`
        });
      }

      // Auto-generate content suggestions
      const recentDocuments = await Document.find({
        workspaceId,
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).limit(5);

      for (const doc of recentDocuments) {
        const suggestions = await this.analyzeContentForSuggestions(doc._id, doc.content);
        if (suggestions.improvements.length > 0) {
          results.push({
            type: 'suggestion',
            documentId: doc._id,
            suggestions: suggestions.improvements.slice(0, 3)
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error executing automated tasks:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */
  extractKeywords(content) {
    // Remove common words and extract meaningful terms
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'can', 'may', 'might', 'this', 'that', 'these', 'those'
    ]);

    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});
  }

  hashContent(content) {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  generateFreshnessRecommendations(freshnessData) {
    const recommendations = [];

    freshnessData.forEach(group => {
      if (group._id === 'stale' && group.count > 0) {
        recommendations.push({
          type: 'update',
          priority: 'high',
          message: `${group.count} documents need updating`,
          action: 'Review and update stale content',
          documents: group.documents.slice(0, 5)
        });
      } else if (group._id === 'aging' && group.count > 5) {
        recommendations.push({
          type: 'review',
          priority: 'medium',
          message: `${group.count} documents are aging`,
          action: 'Schedule content review',
          documents: group.documents.slice(0, 3)
        });
      }
    });

    return recommendations;
  }

  async analyzeDocumentPatterns(workspaceId, userId) {
    // Analyze common document structures and suggest templates
    const documents = await Document.find({
      workspaceId,
      createdBy: userId
    }, { title: 1, content: 1 }).limit(20);

    const patterns = {};

    documents.forEach(doc => {
      // Extract title patterns
      const titleWords = doc.title.toLowerCase().split(' ');
      titleWords.forEach(word => {
        if (word.length > 3) {
          patterns[word] = (patterns[word] || 0) + 1;
        }
      });

      // Extract content structure patterns
      const hasCodeBlocks = doc.content.includes('```');
      const hasLists = doc.content.includes('- ') || doc.content.includes('* ');
      const hasHeadings = doc.content.includes('#');

      if (hasCodeBlocks) patterns['code-heavy'] = (patterns['code-heavy'] || 0) + 1;
      if (hasLists) patterns['list-format'] = (patterns['list-format'] || 0) + 1;
      if (hasHeadings) patterns['structured'] = (patterns['structured'] || 0) + 1;
    });

    return Object.entries(patterns)
      .filter(([, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)
      .map(([pattern]) => pattern)
      .slice(0, 5);
  }

  async suggestAutomationRules(workspaceId, userId) {
    const suggestions = [];

    // Analyze repetitive tasks
    const recentActivity = await Analytics.find({
      workspaceId,
      userId,
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }, { action: 1, metadata: 1 }).limit(100);

    const actionCounts = {};
    recentActivity.forEach(activity => {
      actionCounts[activity.action] = (actionCounts[activity.action] || 0) + 1;
    });

    // Suggest automation for frequent actions
    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count > 10) {
        switch (action) {
          case 'document_create':
            suggestions.push({
              type: 'automation',
              title: 'Auto-apply Templates',
              description: `You create ${count} documents monthly`,
              action: 'Set up automatic template application for new documents',
              priority: 'medium'
            });
            break;
          case 'document_edit':
            suggestions.push({
              type: 'automation',
              title: 'Auto-save Drafts',
              description: `You edit documents frequently (${count} times)`,
              action: 'Enable automatic draft saving every 30 seconds',
              priority: 'low'
            });
            break;
        }
      }
    });

    return suggestions;
  }
}

module.exports = new AutomationService();
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { checkWorkspaceAccess } = require('../../middleware/workspaceAuth');
const exportService = require('../../services/exportService');
const { Document } = require('../../models/Document');
const { Workspace } = require('../../models/Workspace');
const rateLimit = require('express-rate-limit');

// Rate limiting for export operations (resource intensive)
const exportRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 exports per 15 minutes per user
  message: { error: 'Too many export requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/export/document/:id/pdf
 * @desc    Export single document to PDF
 * @access  Private
 */
router.post('/document/:id/pdf', [auth, exportRateLimit], async (req, res) => {
  try {
    const documentId = req.params.id;
    const options = req.body || {};

    // Verify document access
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check workspace access
    const workspace = await Workspace.findById(document.workspace);
    if (!workspace || !workspace.members.some(m => m.user.toString() === req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await exportService.exportToPdf(documentId, options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    
    return res.send(result.buffer);

  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/export/document/:id/word
 * @desc    Export single document to Word
 * @access  Private
 */
router.post('/document/:id/word', [auth, exportRateLimit], async (req, res) => {
  try {
    const documentId = req.params.id;
    const options = req.body || {};

    // Verify document access
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check workspace access
    const workspace = await Workspace.findById(document.workspace);
    if (!workspace || !workspace.members.some(m => m.user.toString() === req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await exportService.exportToWord(documentId, options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    
    return res.send(result.buffer);

  } catch (error) {
    console.error('Word export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/export/document/:id/markdown
 * @desc    Export single document to Markdown
 * @access  Private
 */
router.post('/document/:id/markdown', [auth, exportRateLimit], async (req, res) => {
  try {
    const documentId = req.params.id;
    const options = req.body || {};

    // Verify document access
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check workspace access
    const workspace = await Workspace.findById(document.workspace);
    if (!workspace || !workspace.members.some(m => m.user.toString() === req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await exportService.exportToMarkdown(documentId, options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    
    return res.send(result.buffer);

  } catch (error) {
    console.error('Markdown export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/export/documents/bulk
 * @desc    Export multiple documents as ZIP
 * @access  Private
 */
router.post('/documents/bulk', [auth, exportRateLimit], async (req, res) => {
  try {
    const { documentIds, format, options = {} } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Document IDs are required' });
    }

    if (!format) {
      return res.status(400).json({ error: 'Export format is required' });
    }

    // Verify access to all documents
    const documents = await Document.find({ _id: { $in: documentIds } });
    if (documents.length !== documentIds.length) {
      return res.status(404).json({ error: 'Some documents not found' });
    }

    // Check workspace access for all documents
    const workspaceIds = [...new Set(documents.map(doc => doc.workspace.toString()))];
    const workspaces = await Workspace.find({ _id: { $in: workspaceIds } });
    
    for (const workspace of workspaces) {
      if (!workspace.members.some(m => m.user.toString() === req.user.id)) {
        return res.status(403).json({ error: 'Access denied to one or more documents' });
      }
    }

    const result = await exportService.exportToZip(documentIds, format, options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    
    return res.send(result.buffer);

  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/export/workspace/:id/:format
 * @desc    Export entire workspace documentation
 * @access  Private
 */
router.post('/workspace/:id/:format', [auth, checkWorkspaceAccess, exportRateLimit], async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const format = req.params.format;
    const options = req.body || {};

    // Workspace access is already verified by workspaceAuth middleware
    const result = await exportService.exportWorkspace(workspaceId, format, options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    
    return res.send(result.buffer);

  } catch (error) {
    console.error('Workspace export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/export/preview/document/:id
 * @desc    Get export preview information for a document
 * @access  Private
 */
router.get('/preview/document/:id', [auth], async (req, res) => {
  try {
    const documentId = req.params.id;

    // Verify document access
    const document = await Document.findById(documentId)
      .populate('workspace', 'name branding')
      .populate('createdBy', 'username email');
      
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check workspace access
    const workspace = await Workspace.findById(document.workspace);
    if (!workspace || !workspace.members.some(m => m.user.toString() === req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate content statistics
    const contentLength = typeof document.content === 'string' 
      ? document.content.length 
      : JSON.stringify(document.content).length;

    const wordCount = typeof document.content === 'string'
      ? document.content.split(/\s+/).length
      : 0;

    const preview = {
      id: document._id,
      title: document.title,
      description: document.description,
      contentLength,
      wordCount,
      estimatedPages: Math.ceil(wordCount / 250), // Rough estimate: 250 words per page
      tags: document.tags || [],
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      author: document.createdBy ? {
        username: document.createdBy.username,
        email: document.createdBy.email
      } : null,
      workspace: {
        id: document.workspace._id,
        name: document.workspace.name,
        branding: document.workspace.branding
      },
      supportedFormats: ['pdf', 'word', 'markdown'],
      exportOptions: {
        pdf: {
          formats: ['A4', 'Letter', 'A3'],
          includeHeader: true,
          includeFooter: true,
          includeBranding: true
        },
        word: {
          includeBranding: true,
          includeMetadata: true,
          includeTableOfContents: false
        },
        markdown: {
          includeFrontmatter: true,
          includeMetadata: true
        }
      }
    };

    res.json(preview);

  } catch (error) {
    console.error('Export preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/export/preview/workspace/:id
 * @desc    Get export preview information for a workspace
 * @access  Private
 */
router.get('/preview/workspace/:id', [auth, checkWorkspaceAccess], async (req, res) => {
  try {
    const workspaceId = req.params.id;

    const workspace = await Workspace.findById(workspaceId);
    const documents = await Document.find({ workspace: workspaceId })
      .select('title description tags createdAt updatedAt content')
      .sort({ title: 1 });

    // Calculate statistics
    const totalContentLength = documents.reduce((sum, doc) => {
      const length = typeof doc.content === 'string' 
        ? doc.content.length 
        : JSON.stringify(doc.content).length;
      return sum + length;
    }, 0);

    const totalWordCount = documents.reduce((sum, doc) => {
      const words = typeof doc.content === 'string'
        ? doc.content.split(/\s+/).length
        : 0;
      return sum + words;
    }, 0);

    const preview = {
      id: workspace._id,
      name: workspace.name,
      description: workspace.description,
      documentCount: documents.length,
      totalContentLength,
      totalWordCount,
      estimatedPages: Math.ceil(totalWordCount / 250),
      branding: workspace.branding,
      documents: documents.map(doc => ({
        id: doc._id,
        title: doc.title,
        description: doc.description,
        tags: doc.tags || [],
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        wordCount: typeof doc.content === 'string' ? doc.content.split(/\s+/).length : 0
      })),
      supportedFormats: ['pdf', 'word', 'markdown'],
      exportOptions: {
        includeTableOfContents: true,
        includeBranding: true,
        includeMetadata: true,
        organizeByCategories: false,
        includeWorkspaceInfo: true
      }
    };

    res.json(preview);

  } catch (error) {
    console.error('Workspace export preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/export/formats
 * @desc    Get available export formats and options
 * @access  Private
 */
router.get('/formats', [auth], async (req, res) => {
  try {
    const formats = {
      pdf: {
        name: 'PDF Document',
        description: 'Portable Document Format with professional formatting',
        extension: '.pdf',
        mimeType: 'application/pdf',
        features: [
          'Professional formatting',
          'Headers and footers',
          'Page numbers',
          'Branding support',
          'Embedded images',
          'Mathematical equations',
          'Syntax highlighting'
        ],
        options: {
          format: {
            type: 'select',
            label: 'Page Format',
            options: ['A4', 'Letter', 'A3', 'Legal'],
            default: 'A4'
          },
          includeHeader: {
            type: 'boolean',
            label: 'Include Header',
            default: true
          },
          includeFooter: {
            type: 'boolean',
            label: 'Include Footer',
            default: true
          },
          includeBranding: {
            type: 'boolean',
            label: 'Include Workspace Branding',
            default: true
          }
        }
      },
      word: {
        name: 'Microsoft Word',
        description: 'Editable Word document format',
        extension: '.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        features: [
          'Fully editable',
          'Maintains formatting',
          'Headers and footers',
          'Document properties',
          'Collaborative editing ready'
        ],
        options: {
          includeBranding: {
            type: 'boolean',
            label: 'Include Workspace Branding',
            default: true
          },
          includeMetadata: {
            type: 'boolean',
            label: 'Include Document Metadata',
            default: true
          },
          includeTableOfContents: {
            type: 'boolean',
            label: 'Generate Table of Contents',
            default: false
          }
        }
      },
      markdown: {
        name: 'Markdown',
        description: 'Plain text format with markdown syntax',
        extension: '.md',
        mimeType: 'text/markdown',
        features: [
          'Universal compatibility',
          'Version control friendly',
          'Lightweight',
          'Human readable',
          'Platform independent'
        ],
        options: {
          includeFrontmatter: {
            type: 'boolean',
            label: 'Include YAML Frontmatter',
            default: true
          },
          includeMetadata: {
            type: 'boolean',
            label: 'Include Document Metadata',
            default: true
          }
        }
      }
    };

    res.json({ formats });

  } catch (error) {
    console.error('Export formats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/export/status/:jobId
 * @desc    Check export job status (for async exports)
 * @access  Private
 */
router.get('/status/:jobId', [auth], async (req, res) => {
  try {
    // This would integrate with a job queue system like Bull/Redis
    // For now, return a simple response
    res.json({
      jobId: req.params.jobId,
      status: 'completed',
      progress: 100,
      message: 'Export completed successfully'
    });

  } catch (error) {
    console.error('Export status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
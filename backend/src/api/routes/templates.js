const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { checkWorkspaceAccess } = require('../../middleware/workspaceAuth');
const templateService = require('../../services/templateService');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting for template creation
const createTemplateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 template creations per 15 minutes
  message: { error: 'Too many template creation requests' },
});

// Validation middleware
const validateTemplate = [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Name is required and must be less than 200 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('category').isIn([
    'IT_PROCEDURE', 'DOCUMENTATION', 'INCIDENT_REPORT', 'CHANGE_REQUEST',
    'KNOWLEDGE_BASE', 'TROUBLESHOOTING', 'MAINTENANCE', 'SECURITY_POLICY',
    'USER_GUIDE', 'PROJECT_PLAN', 'CUSTOM'
  ]).withMessage('Invalid category'),
  body('content').notEmpty().withMessage('Content is required'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('variables').optional().isArray().withMessage('Variables must be an array'),
];

const validateTemplateUpdate = [
  body('name').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isLength({ max: 1000 }),
  body('tags').optional().isArray(),
  body('variables').optional().isArray(),
];

const validateRating = [
  body('rating').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
];

/**
 * @route   GET /api/templates
 * @desc    Get all templates (public and accessible)
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { category, search, workspace, limit = 20, skip = 0 } = req.query;
    
    let templates;
    if (search) {
      templates = await templateService.searchTemplates(search, {
        category,
        workspace,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });
    } else if (workspace) {
      templates = await templateService.getWorkspaceTemplates(workspace, req.user.id);
    } else {
      templates = await templateService.getPublicTemplates({
        category,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });
    }

    res.json({
      templates,
      total: templates.length,
      categories: templateService.getTemplateCategories()
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/templates/categories
 * @desc    Get template categories
 * @access  Private
 */
router.get('/categories', auth, (req, res) => {
  try {
    const categories = templateService.getTemplateCategories();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/templates/statistics
 * @desc    Get template statistics
 * @access  Private
 */
router.get('/statistics', auth, async (req, res) => {
  try {
    const { workspace } = req.query;
    const statistics = await templateService.getTemplateStatistics(workspace);
    res.json(statistics);
  } catch (error) {
    console.error('Template statistics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/templates
 * @desc    Create a new template
 * @access  Private
 */
router.post('/', [auth, createTemplateLimit, ...validateTemplate], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = await templateService.createTemplate(req.body, req.user.id);
    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/templates/:id
 * @desc    Get template by ID
 * @access  Private
 */
router.get('/:id', [auth, param('id').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = await templateService.getTemplate(req.params.id, req.user.id);
    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('Access denied')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @route   PUT /api/templates/:id
 * @desc    Update template
 * @access  Private
 */
router.put('/:id', [auth, param('id').isMongoId(), ...validateTemplateUpdate], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = await templateService.updateTemplate(req.params.id, req.body, req.user.id);
    res.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('Access denied')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @route   DELETE /api/templates/:id
 * @desc    Delete template
 * @access  Private
 */
router.delete('/:id', [auth, param('id').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await templateService.deleteTemplate(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Delete template error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('Access denied')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @route   POST /api/templates/:id/duplicate
 * @desc    Duplicate template
 * @access  Private
 */
router.post('/:id/duplicate', [auth, param('id').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, workspace } = req.body;
    const template = await templateService.duplicateTemplate(
      req.params.id, 
      { name, description, workspace }, 
      req.user.id
    );
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Duplicate template error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('Access denied')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @route   POST /api/templates/:id/use
 * @desc    Create document from template
 * @access  Private
 */
router.post('/:id/use', [auth, param('id').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentData, variables } = req.body;
    
    if (!documentData || !documentData.title || !documentData.workspace) {
      return res.status(400).json({ 
        error: 'Document data with title and workspace is required' 
      });
    }

    const document = await templateService.createDocumentFromTemplate(
      req.params.id,
      documentData,
      variables || {},
      req.user.id
    );
    
    res.status(201).json(document);
  } catch (error) {
    console.error('Create document from template error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('Access denied')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @route   POST /api/templates/:id/rate
 * @desc    Rate template
 * @access  Private
 */
router.post('/:id/rate', [auth, param('id').isMongoId(), ...validateRating], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating } = req.body;
    const template = await templateService.rateTemplate(req.params.id, rating, req.user.id);
    
    res.json({
      success: true,
      message: 'Template rated successfully',
      rating: {
        average: template.rating.average,
        count: template.rating.count
      }
    });
  } catch (error) {
    console.error('Rate template error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @route   GET /api/templates/workspace/:workspaceId
 * @desc    Get templates for specific workspace
 * @access  Private
 */
router.get('/workspace/:workspaceId', [auth, checkWorkspaceAccess, param('workspaceId').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const templates = await templateService.getWorkspaceTemplates(req.params.workspaceId, req.user.id);
    const statistics = await templateService.getTemplateStatistics(req.params.workspaceId);
    
    res.json({
      templates,
      statistics,
      categories: templateService.getTemplateCategories()
    });
  } catch (error) {
    console.error('Get workspace templates error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/templates/initialize-system
 * @desc    Initialize system templates (Admin only)
 * @access  Private (Admin)
 */
router.post('/initialize-system', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await templateService.initializeSystemTemplates();
    res.json({ success: true, message: 'System templates initialized successfully' });
  } catch (error) {
    console.error('Initialize system templates error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
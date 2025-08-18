const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { checkWorkspaceAccess } = require('../../middleware/workspaceAuth');
const Branding = require('../../models/Branding');
const { body, param, validationResult } = require('express-validator');

// Validation middleware
const validateBranding = [
  body('colors.primary').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid primary color format'),
  body('colors.secondary').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid secondary color format'),
  body('colors.accent').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid accent color format'),
  body('typography.fontSize.base').optional().isInt({ min: 12, max: 24 }).withMessage('Base font size must be between 12 and 24'),
  body('layout.borderRadius').optional().isInt({ min: 0, max: 20 }).withMessage('Border radius must be between 0 and 20'),
];

/**
 * @route   GET /api/branding/workspace/:workspaceId
 * @desc    Get branding for workspace
 * @access  Private (Workspace member)
 */
router.get('/workspace/:workspaceId', [auth, checkWorkspaceAccess, param('workspaceId').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let branding = await Branding.findByWorkspace(req.params.workspaceId);
    
    // If no branding exists, create default branding
    if (!branding) {
      branding = new Branding({
        workspace: req.params.workspaceId,
        modifiedBy: req.user.id
      });
      await branding.save();
    }

    res.json(branding);
  } catch (error) {
    console.error('Get branding error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/branding/workspace/:workspaceId
 * @desc    Update branding for workspace
 * @access  Private (Workspace admin)
 */
router.put('/workspace/:workspaceId', [auth, checkWorkspaceAccess, param('workspaceId').isMongoId(), ...validateBranding], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user has admin access to workspace
    if (req.workspace.role !== 'admin' && req.workspace.owner?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Admin access required to modify branding' });
    }

    let branding = await Branding.findByWorkspace(req.params.workspaceId);
    
    if (!branding) {
      branding = new Branding({
        workspace: req.params.workspaceId,
        ...req.body,
        modifiedBy: req.user.id
      });
    } else {
      // Create backup before updating
      await branding.createBackup('Pre-update backup', req.user.id);
      
      Object.assign(branding, req.body);
      branding.modifiedBy = req.user.id;
    }

    await branding.save();
    res.json(branding);
  } catch (error) {
    console.error('Update branding error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/branding/workspace/:workspaceId/css
 * @desc    Get generated CSS for workspace branding
 * @access  Public (for white-label support)
 */
router.get('/workspace/:workspaceId/css', [param('workspaceId').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const branding = await Branding.findByWorkspace(req.params.workspaceId);
    
    if (!branding) {
      return res.status(404).json({ error: 'Branding not found' });
    }

    const css = branding.generateCustomCSS();
    
    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(css);
  } catch (error) {
    console.error('Get branding CSS error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/branding/workspace/:workspaceId/theme
 * @desc    Get Material-UI theme configuration
 * @access  Private (Workspace member)
 */
router.get('/workspace/:workspaceId/theme', [auth, checkWorkspaceAccess, param('workspaceId').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const branding = await Branding.findByWorkspace(req.params.workspaceId);
    
    if (!branding) {
      return res.status(404).json({ error: 'Branding not found' });
    }

    const themeConfig = branding.themeConfig;
    res.json(themeConfig);
  } catch (error) {
    console.error('Get theme config error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/branding/workspace/:workspaceId/backup
 * @desc    Create branding backup
 * @access  Private (Workspace admin)
 */
router.post('/workspace/:workspaceId/backup', [auth, checkWorkspaceAccess, param('workspaceId').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.workspace.role !== 'admin' && req.workspace.owner?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const branding = await Branding.findByWorkspace(req.params.workspaceId);
    
    if (!branding) {
      return res.status(404).json({ error: 'Branding not found' });
    }

    const { description } = req.body;
    await branding.createBackup(description, req.user.id);

    res.json({ 
      success: true, 
      message: 'Backup created successfully',
      backups: branding.backups
    });
  } catch (error) {
    console.error('Create branding backup error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/branding/workspace/:workspaceId/backups
 * @desc    Get branding backups
 * @access  Private (Workspace admin)
 */
router.get('/workspace/:workspaceId/backups', [auth, checkWorkspaceAccess, param('workspaceId').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.workspace.role !== 'admin' && req.workspace.owner?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const branding = await Branding.findByWorkspace(req.params.workspaceId)
      .populate('backups.createdBy', 'username email');
    
    if (!branding) {
      return res.status(404).json({ error: 'Branding not found' });
    }

    res.json({ backups: branding.backups });
  } catch (error) {
    console.error('Get branding backups error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/branding/workspace/:workspaceId/restore/:backupId
 * @desc    Restore branding from backup
 * @access  Private (Workspace admin)
 */
router.post('/workspace/:workspaceId/restore/:backupId', [auth, checkWorkspaceAccess, param('workspaceId').isMongoId(), param('backupId').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.workspace.role !== 'admin' && req.workspace.owner?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const branding = await Branding.findByWorkspace(req.params.workspaceId);
    
    if (!branding) {
      return res.status(404).json({ error: 'Branding not found' });
    }

    await branding.restoreFromBackup(req.params.backupId);

    res.json({ 
      success: true, 
      message: 'Branding restored successfully',
      branding
    });
  } catch (error) {
    console.error('Restore branding error:', error);
    if (error.message === 'Backup not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @route   POST /api/branding/workspace/:workspaceId/reset
 * @desc    Reset branding to defaults
 * @access  Private (Workspace admin)
 */
router.post('/workspace/:workspaceId/reset', [auth, checkWorkspaceAccess, param('workspaceId').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.workspace.role !== 'admin' && req.workspace.owner?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const branding = await Branding.findByWorkspace(req.params.workspaceId);
    
    if (!branding) {
      return res.status(404).json({ error: 'Branding not found' });
    }

    // Create backup before reset
    await branding.createBackup('Pre-reset backup', req.user.id);

    // Reset to default values
    const defaultBranding = new Branding({
      workspace: req.params.workspaceId,
      modifiedBy: req.user.id
    });

    // Copy default values
    branding.colors = defaultBranding.colors;
    branding.typography = defaultBranding.typography;
    branding.layout = defaultBranding.layout;
    branding.customCSS = defaultBranding.customCSS;
    branding.whiteLabel = defaultBranding.whiteLabel;
    branding.features = defaultBranding.features;
    branding.modifiedBy = req.user.id;

    await branding.save();

    res.json({ 
      success: true, 
      message: 'Branding reset to defaults',
      branding
    });
  } catch (error) {
    console.error('Reset branding error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/branding/white-label
 * @desc    Get white-label workspaces
 * @access  Private (Admin only)
 */
router.get('/white-label', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const whiteLabelWorkspaces = await Branding.getWhiteLabelWorkspaces();
    res.json({ workspaces: whiteLabelWorkspaces });
  } catch (error) {
    console.error('Get white-label workspaces error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/branding/workspace/:workspaceId/preview
 * @desc    Generate branding preview
 * @access  Private (Workspace member)
 */
router.post('/workspace/:workspaceId/preview', [auth, checkWorkspaceAccess, param('workspaceId').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { previewData } = req.body;
    
    // Create temporary branding object with preview data
    const tempBranding = new Branding({
      workspace: req.params.workspaceId,
      ...previewData
    });

    const preview = {
      css: tempBranding.generateCustomCSS(),
      theme: tempBranding.themeConfig,
      variables: tempBranding.cssVariables
    };

    res.json(preview);
  } catch (error) {
    console.error('Generate branding preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
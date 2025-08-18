const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const { checkDocumentAccess } = require('../../middleware/workspaceAuth');
const automationService = require('../../services/automationService');

/**
 * @route GET /api/automation/suggestions/:documentId
 * @desc Get content suggestions for a document
 * @access Private
 */
router.get(
  '/suggestions/:documentId',
  [
    param('documentId').isMongoId().withMessage('Invalid document ID'),
    auth,
    checkDocumentAccess
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { documentId } = req.params;
      const document = req.document; // From workspaceAuth middleware

      const suggestions = await automationService.analyzeContentForSuggestions(
        documentId,
        document.content
      );

      res.json({
        success: true,
        data: {
          documentId,
          suggestions,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error getting content suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate content suggestions'
      });
    }
  }
);

/**
 * @route GET /api/automation/freshness/:workspaceId
 * @desc Monitor content freshness for a workspace
 * @access Private
 */
router.get(
  '/freshness/:workspaceId',
  [
    param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
    auth
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { workspaceId } = req.params;

      // Check workspace access
      const hasAccess = req.user.workspaces?.some(ws => 
        ws.workspaceId.toString() === workspaceId
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to workspace'
        });
      }

      const freshnessReport = await automationService.monitorContentFreshness(workspaceId);

      res.json({
        success: true,
        data: {
          workspaceId,
          freshness: freshnessReport,
          analyzedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error monitoring content freshness:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze content freshness'
      });
    }
  }
);

/**
 * @route GET /api/automation/workflow-suggestions/:workspaceId
 * @desc Get workflow suggestions for a user in a workspace
 * @access Private
 */
router.get(
  '/workflow-suggestions/:workspaceId',
  [
    param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
    auth
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { workspaceId } = req.params;
      const userId = req.user.id;

      // Check workspace access
      const hasAccess = req.user.workspaces?.some(ws => 
        ws.workspaceId.toString() === workspaceId
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to workspace'
        });
      }

      const suggestions = await automationService.generateWorkflowSuggestions(
        workspaceId,
        userId
      );

      res.json({
        success: true,
        data: {
          workspaceId,
          userId,
          suggestions,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error generating workflow suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate workflow suggestions'
      });
    }
  }
);

/**
 * @route POST /api/automation/execute-tasks/:workspaceId
 * @desc Execute automated tasks for a workspace
 * @access Private
 */
router.post(
  '/execute-tasks/:workspaceId',
  [
    param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
    auth
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { workspaceId } = req.params;

      // Check if user is admin of the workspace
      const userWorkspace = req.user.workspaces?.find(ws => 
        ws.workspaceId.toString() === workspaceId
      );

      if (!userWorkspace || userWorkspace.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required to execute automated tasks'
        });
      }

      const results = await automationService.executeAutomatedTasks(workspaceId);

      res.json({
        success: true,
        data: {
          workspaceId,
          executedTasks: results.length,
          results,
          executedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error executing automated tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute automated tasks'
      });
    }
  }
);

/**
 * @route POST /api/automation/analyze-content
 * @desc Analyze content and get suggestions (for real-time analysis)
 * @access Private
 */
router.post(
  '/analyze-content',
  [
    body('content')
      .isString()
      .isLength({ min: 10 })
      .withMessage('Content must be at least 10 characters long'),
    body('documentId')
      .optional()
      .isMongoId()
      .withMessage('Invalid document ID'),
    auth
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { content, documentId } = req.body;

      const suggestions = await automationService.analyzeContentForSuggestions(
        documentId || 'temp',
        content
      );

      res.json({
        success: true,
        data: {
          suggestions,
          analyzedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error analyzing content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze content'
      });
    }
  }
);

/**
 * @route GET /api/automation/related-documents
 * @desc Get related documents based on content
 * @access Private
 */
router.post(
  '/related-documents',
  [
    body('content')
      .isString()
      .isLength({ min: 50 })
      .withMessage('Content must be at least 50 characters long'),
    body('workspaceId')
      .isMongoId()
      .withMessage('Invalid workspace ID'),
    body('excludeDocumentId')
      .optional()
      .isMongoId()
      .withMessage('Invalid document ID to exclude'),
    auth
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { content, workspaceId, excludeDocumentId } = req.body;

      // Check workspace access
      const hasAccess = req.user.workspaces?.some(ws => 
        ws.workspaceId.toString() === workspaceId
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to workspace'
        });
      }

      const relatedDocs = await automationService.findRelatedDocuments(
        excludeDocumentId || 'temp',
        content
      );

      res.json({
        success: true,
        data: {
          relatedDocuments: relatedDocs,
          analyzedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error finding related documents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to find related documents'
      });
    }
  }
);

/**
 * @route GET /api/automation/health-check/:workspaceId
 * @desc Get comprehensive workspace automation health check
 * @access Private
 */
router.get(
  '/health-check/:workspaceId',
  [
    param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
    auth
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { workspaceId } = req.params;
      const userId = req.user.id;

      // Check workspace access
      const hasAccess = req.user.workspaces?.some(ws => 
        ws.workspaceId.toString() === workspaceId
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to workspace'
        });
      }

      // Get comprehensive health check data
      const [freshnessReport, workflowSuggestions] = await Promise.all([
        automationService.monitorContentFreshness(workspaceId),
        automationService.generateWorkflowSuggestions(workspaceId, userId)
      ]);

      const healthScore = Math.round(
        (freshnessReport.score * 0.6) + 
        (workflowSuggestions.length > 0 ? 40 : 80) * 0.4
      );

      res.json({
        success: true,
        data: {
          workspaceId,
          healthScore,
          freshness: freshnessReport,
          workflowSuggestions: workflowSuggestions.slice(0, 5),
          checkedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error getting health check:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform health check'
      });
    }
  }
);

module.exports = router;
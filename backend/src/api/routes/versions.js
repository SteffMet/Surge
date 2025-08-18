const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { checkDocumentAccess } = require('../../middleware/workspaceAuth');
const versioningService = require('../../services/versioningService');
const DocumentVersion = require('../../models/DocumentVersion');
const Document = require('../../models/Document');
const { AnalyticsEvent } = require('../../models/Analytics');

// Get document version history
router.get('/document/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { limit = 50, page = 1, includeContent = false } = req.query;

    // Verify user has access to document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const history = await versioningService.getDocumentHistory(documentId, {
      limit: parseInt(limit),
      page: parseInt(page),
      includeContent: includeContent === 'true'
    });

    // Log analytics event
    await AnalyticsEvent.logEvent({
      eventType: 'document_view',
      user: req.user.userId,
      document: documentId,
      metadata: { viewType: 'version_history' }
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching version history:', error);
    res.status(500).json({ message: 'Failed to fetch version history' });
  }
});

// Get specific version
router.get('/:versionId', auth, async (req, res) => {
  try {
    const { versionId } = req.params;
    const { includeContent = true } = req.query;

    const version = await versioningService.getVersion(versionId, includeContent === 'true');
    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    res.json(version);
  } catch (error) {
    console.error('Error fetching version:', error);
    res.status(500).json({ message: 'Failed to fetch version' });
  }
});

// Compare two versions
router.get('/compare/:documentId/:fromVersion/:toVersion', auth, async (req, res) => {
  try {
    const { documentId, fromVersion, toVersion } = req.params;

    const comparison = await versioningService.compareVersions(
      documentId,
      parseInt(fromVersion),
      parseInt(toVersion)
    );

    res.json(comparison);
  } catch (error) {
    console.error('Error comparing versions:', error);
    res.status(500).json({ message: 'Failed to compare versions' });
  }
});

// Create new version
router.post('/document/:documentId', [auth, checkDocumentAccess], async (req, res) => {
  try {
    const { documentId } = req.params;
    const { content, title, tags, isAutoSave = false } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const version = await versioningService.createVersion(
      documentId,
      content,
      title,
      req.user.userId,
      req.workspace._id,
      { tags, isAutoSave }
    );

    // Log analytics event
    await AnalyticsEvent.logEvent({
      eventType: 'document_edit',
      user: req.user.userId,
      document: documentId,
      workspace: req.workspace._id,
      metadata: {
        version: version.version,
        isAutoSave,
        contentLength: content.length
      }
    });

    res.status(201).json(version);
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({ message: 'Failed to create version' });
  }
});

// Restore to specific version
router.post('/document/:documentId/restore/:versionNumber', [auth, checkDocumentAccess], async (req, res) => {
  try {
    const { documentId, versionNumber } = req.params;

    // Check if user has edit permissions
    if (!req.workspace.canUserPerformAction(req.user.userId, 'edit_bookmark')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const restoredVersion = await versioningService.restoreToVersion(
      documentId,
      parseInt(versionNumber),
      req.user.userId,
      req.workspace._id
    );

    // Log analytics event
    await AnalyticsEvent.logEvent({
      eventType: 'document_edit',
      user: req.user.userId,
      document: documentId,
      workspace: req.workspace._id,
      metadata: {
        action: 'restore',
        restoredFromVersion: versionNumber,
        newVersion: restoredVersion.version
      }
    });

    res.json(restoredVersion);
  } catch (error) {
    console.error('Error restoring version:', error);
    res.status(500).json({ message: 'Failed to restore version' });
  }
});

// Get version statistics
router.get('/stats/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params;

    const stats = await versioningService.getDocumentVersionStats(documentId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching version stats:', error);
    res.status(500).json({ message: 'Failed to fetch version statistics' });
  }
});

// Get version tree for visualization
router.get('/tree/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params;

    const tree = await versioningService.getVersionTree(documentId);
    res.json(tree);
  } catch (error) {
    console.error('Error fetching version tree:', error);
    res.status(500).json({ message: 'Failed to fetch version tree' });
  }
});

// Delete specific version (admin only)
router.delete('/:versionId', auth, async (req, res) => {
  try {
    const { versionId } = req.params;

    // Only allow admins to delete versions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const version = await DocumentVersion.findById(versionId);
    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    // Don't allow deletion of version 1 (initial version)
    if (version.version === 1) {
      return res.status(400).json({ message: 'Cannot delete initial version' });
    }

    await DocumentVersion.findByIdAndDelete(versionId);

    res.json({ message: 'Version deleted successfully' });
  } catch (error) {
    console.error('Error deleting version:', error);
    res.status(500).json({ message: 'Failed to delete version' });
  }
});

module.exports = router;
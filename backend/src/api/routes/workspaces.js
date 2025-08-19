const express = require('express');
const router = express.Router();
const { body, validationResult, param, query } = require('express-validator');
const Workspace = require('../../models/Workspace');
const Bookmark = require('../../models/Bookmark');
const User = require('../../models/User');
const Document = require('../../models/Document');
const auth = require('../../middleware/auth');
const {
  checkWorkspaceAccess,
  requireWorkspacePermission,
  requireWorkspaceOwner,
  requireCollaboratorManagement,
  checkBookmarkAccess,
  requireBookmarkEdit,
  requireWorkspaceType,
  getUserAccessibleWorkspaces
} = require('../../middleware/workspaceAuth');

// =============================================================================
// WORKSPACE ROUTES
// =============================================================================

/**
 * @route   GET /api/workspaces
 * @desc    Get all workspaces user has access to
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { type, search, limit = 50, offset = 0 } = req.query;
    
    let query = {
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id }
      ],
      isActive: true
    };

    // Filter by type if specified
    if (type && ['private', 'collaborative'].includes(type)) {
      query.type = type;
    }

    // Add search functionality
    if (search) {
      query.$text = { $search: search };
    }

    const workspaces = await Workspace.find(query)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email')
      .populate('bookmarks', null, null, { limit: 5 }) // Populate first 5 bookmarks
      .sort(search ? { score: { $meta: 'textScore' } } : { updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Workspace.countDocuments(query);

    res.json({
      workspaces,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   POST /api/workspaces
 * @desc    Create a new workspace
 * @access  Private
 */
router.post('/', [
  auth,
  body('name', 'Workspace name is required').trim().isLength({ min: 1, max: 100 }),
  body('description', 'Description too long').optional().isLength({ max: 500 }),
  body('type', 'Invalid workspace type').isIn(['private', 'collaborative']),
  body('tags', 'Tags must be an array').optional().isArray(),
  body('settings', 'Settings must be an object').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if demo mode is enabled
    if (process.env.DEMO_MODE === 'true' && req.user.role !== 'superuser') {
      return res.status(403).json({ errors: [{ msg: 'Workspace creation is disabled in demo mode' }] });
    }

    const { name, description, type, tags, settings } = req.body;

    // Check if user already has a workspace with this name
    const existingWorkspace = await Workspace.findOne({
      owner: req.user.id,
      name: name.trim(),
      isActive: true
    });

    if (existingWorkspace) {
      return res.status(400).json({
        errors: [{ msg: 'You already have a workspace with this name' }]
      });
    }

    const workspace = new Workspace({
      name: name.trim(),
      description: description?.trim() || '',
      type,
      owner: req.user.id,
      tags: tags || [],
      settings: {
        allowPublicBookmarks: settings?.allowPublicBookmarks || false,
        defaultBookmarkPrivacy: settings?.defaultBookmarkPrivacy || 'workspace',
        requireApprovalForBookmarks: settings?.requireApprovalForBookmarks || false
      }
    });

    await workspace.save();
    
    // Populate owner information and ensure it's fully loaded
    await workspace.populate('owner', 'username email');
    
    // Ensure the workspace is immediately accessible by re-fetching it
    const savedWorkspace = await Workspace.findById(workspace._id)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');

    res.status(201).json(savedWorkspace);
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId
 * @desc    Get workspace details
 * @access  Private
 */
router.get('/:workspaceId', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId(),
  checkWorkspaceAccess
], async (req, res) => {
  try {
    // Get bookmark count and recent bookmarks
    const bookmarkCount = await Bookmark.countDocuments({ 
      workspace: req.workspace._id 
    });
    
    const recentBookmarks = await Bookmark.find({ 
      workspace: req.workspace._id 
    })
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(10);

    const workspaceData = {
      ...req.workspace.toObject(),
      bookmarkCount,
      recentBookmarks,
      userRole: req.userRole
    };

    res.json(workspaceData);
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   PUT /api/workspaces/:workspaceId
 * @desc    Update workspace
 * @access  Private
 */
router.put('/:workspaceId', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId(),
  checkWorkspaceAccess,
  requireWorkspacePermission('edit_workspace'),
  body('name', 'Workspace name is required').optional().trim().isLength({ min: 1, max: 100 }),
  body('description', 'Description too long').optional().isLength({ max: 500 }),
  body('tags', 'Tags must be an array').optional().isArray(),
  body('settings', 'Settings must be an object').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, tags, settings } = req.body;
    const workspace = req.workspace;

    // Check for name conflicts if name is being changed
    if (name && name.trim() !== workspace.name) {
      const existingWorkspace = await Workspace.findOne({
        owner: workspace.owner,
        name: name.trim(),
        isActive: true,
        _id: { $ne: workspace._id }
      });

      if (existingWorkspace) {
        return res.status(400).json({
          errors: [{ msg: 'You already have a workspace with this name' }]
        });
      }
      workspace.name = name.trim();
    }

    if (description !== undefined) workspace.description = description.trim();
    if (tags) workspace.tags = tags;
    if (settings) {
      workspace.settings = {
        ...workspace.settings,
        ...settings
      };
    }

    await workspace.save();
    res.json(workspace);
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   DELETE /api/workspaces/:workspaceId
 * @desc    Delete workspace (soft delete)
 * @access  Private
 */
router.delete('/:workspaceId', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId(),
  checkWorkspaceAccess,
  requireWorkspaceOwner
], async (req, res) => {
  try {
    const workspace = req.workspace;
    
    // Soft delete by setting isActive to false
    workspace.isActive = false;
    await workspace.save();

    res.json({ msg: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId/debug
 * @desc    Debug workspace access issues (development only)
 * @access  Private
 */
router.get('/:workspaceId/debug', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId()
], async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.user.id;
    
    // Get workspace without access check
    const workspace = await Workspace.findById(workspaceId)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');

    if (!workspace) {
      return res.json({
        debug: true,
        workspaceId,
        userId,
        error: 'Workspace not found',
        exists: false
      });
    }

    // Detailed access debugging
    const debugInfo = {
      debug: true,
      workspaceId,
      userId: userId.toString(),
      workspace: {
        id: workspace._id.toString(),
        name: workspace.name,
        type: workspace.type,
        isActive: workspace.isActive,
        owner: {
          id: workspace.owner._id.toString(),
          username: workspace.owner.username,
          email: workspace.owner.email
        },
        collaborators: workspace.collaborators.map(c => ({
          id: c.user._id.toString(),
          username: c.user.username,
          email: c.user.email,
          role: c.role,
          addedAt: c.addedAt
        }))
      },
      accessCheck: {
        isOwner: workspace.owner._id.toString() === userId.toString(),
        isCollaborator: workspace.collaborators.some(c => c.user._id.toString() === userId.toString()),
        hasAccess: workspace.hasAccess(userId),
        userRole: workspace.getUserRole(userId)
      },
      typeCheck: {
        userIdType: typeof userId,
        ownerIdType: typeof workspace.owner._id,
        userIdString: userId.toString(),
        ownerIdString: workspace.owner._id.toString(),
        idsMatch: workspace.owner._id.toString() === userId.toString()
      }
    };

    res.json(debugInfo);
  } catch (error) {
    console.error('Debug workspace error:', error);
    res.status(500).json({ 
      debug: true,
      error: error.message,
      stack: error.stack
    });
  }
});

// =============================================================================
// COLLABORATOR MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   POST /api/workspaces/:workspaceId/collaborators
 * @desc    Add collaborator to workspace
 * @access  Private
 */
router.post('/:workspaceId/collaborators', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId(),
  checkWorkspaceAccess,
  requireWorkspaceType(['collaborative']),
  requireCollaboratorManagement,
  body('email', 'Valid email is required').isEmail(),
  body('role', 'Invalid role').isIn(['viewer', 'editor', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, role } = req.body;
    const workspace = req.workspace;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        errors: [{ msg: 'User not found' }]
      });
    }

    // Check if user is the owner
    if (user._id.toString() === workspace.owner._id.toString()) {
      return res.status(400).json({
        errors: [{ msg: 'Cannot add workspace owner as collaborator' }]
      });
    }

    // Check if user is already a collaborator
    const existingCollaborator = workspace.collaborators.find(
      collab => collab.user.toString() === user._id.toString()
    );

    if (existingCollaborator) {
      return res.status(400).json({
        errors: [{ msg: 'User is already a collaborator' }]
      });
    }

    // Add collaborator
    workspace.collaborators.push({
      user: user._id,
      role,
      addedBy: req.user.id
    });

    await workspace.save();
    await workspace.populate('collaborators.user', 'username email');

    res.status(201).json({
      msg: 'Collaborator added successfully',
      collaborator: workspace.collaborators[workspace.collaborators.length - 1]
    });
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   PUT /api/workspaces/:workspaceId/collaborators/:userId
 * @desc    Update collaborator role
 * @access  Private
 */
router.put('/:workspaceId/collaborators/:userId', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId(),
  param('userId', 'Invalid user ID').isMongoId(),
  checkWorkspaceAccess,
  requireCollaboratorManagement,
  body('role', 'Invalid role').isIn(['viewer', 'editor', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role } = req.body;
    const workspace = req.workspace;
    const userId = req.params.userId;

    // Find collaborator
    const collaborator = workspace.collaborators.find(
      collab => collab.user.toString() === userId
    );

    if (!collaborator) {
      return res.status(404).json({
        errors: [{ msg: 'Collaborator not found' }]
      });
    }

    collaborator.role = role;
    await workspace.save();

    res.json({
      msg: 'Collaborator role updated successfully',
      collaborator
    });
  } catch (error) {
    console.error('Update collaborator error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   DELETE /api/workspaces/:workspaceId/collaborators/:userId
 * @desc    Remove collaborator from workspace
 * @access  Private
 */
router.delete('/:workspaceId/collaborators/:userId', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId(),
  param('userId', 'Invalid user ID').isMongoId(),
  checkWorkspaceAccess,
  requireCollaboratorManagement
], async (req, res) => {
  try {
    const workspace = req.workspace;
    const userId = req.params.userId;

    // Find and remove collaborator
    const collaboratorIndex = workspace.collaborators.findIndex(
      collab => collab.user.toString() === userId
    );

    if (collaboratorIndex === -1) {
      return res.status(404).json({
        errors: [{ msg: 'Collaborator not found' }]
      });
    }

    workspace.collaborators.splice(collaboratorIndex, 1);
    await workspace.save();

    res.json({ msg: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

// =============================================================================
// BOOKMARK ROUTES
// =============================================================================

/**
 * @route   GET /api/workspaces/:workspaceId/bookmarks
 * @desc    Get bookmarks in workspace
 * @access  Private
 */
router.get('/:workspaceId/bookmarks', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId(),
  checkWorkspaceAccess,
  query('type', 'Invalid bookmark type').optional().isIn(['document', 'search_result', 'external_link', 'folder']),
  query('parentFolder', 'Invalid parent folder ID').optional().isMongoId(),
  query('search', 'Search query too long').optional().isLength({ max: 100 }),
  query('tags', 'Tags must be comma-separated').optional(),
  query('limit', 'Limit must be a number').optional().isInt({ min: 1, max: 100 }),
  query('offset', 'Offset must be a number').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      type,
      parentFolder,
      search,
      tags,
      isFavorite,
      limit = 50,
      offset = 0
    } = req.query;

    let query = { workspace: req.workspace._id };

    // Apply filters
    if (type) query.type = type;
    if (parentFolder) query.parentFolder = parentFolder;
    if (isFavorite === 'true') query.isFavorite = true;
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Add search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Filter private bookmarks for non-creators
    const userRole = req.workspace.getUserRole(req.user.id);
    if (userRole !== 'admin') {
      query.$or = [
        { isPrivate: false },
        { createdBy: req.user.id }
      ];
    }

    const bookmarks = await Bookmark.find(query)
      .populate('createdBy', 'username email')
      .populate('parentFolder', 'title type')
      .sort(search ? { score: { $meta: 'textScore' } } : { position: 1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Bookmark.countDocuments(query);

    res.json({
      bookmarks,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   POST /api/workspaces/:workspaceId/bookmarks
 * @desc    Create bookmark in workspace
 * @access  Private
 */
router.post('/:workspaceId/bookmarks', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId(),
  checkWorkspaceAccess,
  requireWorkspacePermission('create_bookmark'),
  body('title', 'Title is required').trim().isLength({ min: 1, max: 200 }),
  body('type', 'Invalid bookmark type').isIn(['document', 'search_result', 'external_link', 'folder']),
  body('description', 'Description too long').optional().isLength({ max: 1000 }),
  body('url', 'Invalid URL').optional().isURL(),
  body('resourceId', 'Invalid resource ID').optional().isMongoId(),
  body('tags', 'Tags must be an array').optional().isArray(),
  body('parentFolder', 'Invalid parent folder ID').optional().isMongoId(),
  body('isPrivate', 'isPrivate must be boolean').optional().isBoolean(),
  body('notes', 'Notes too long').optional().isLength({ max: 2000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      type,
      url,
      resourceId,
      tags,
      parentFolder,
      isPrivate,
      notes,
      metadata
    } = req.body;

    // Validate type-specific requirements
    if (type === 'external_link' && !url) {
      return res.status(400).json({
        errors: [{ msg: 'URL is required for external links' }]
      });
    }

    if (type === 'document' && !resourceId) {
      return res.status(400).json({
        errors: [{ msg: 'Resource ID is required for document bookmarks' }]
      });
    }

    // Validate parent folder exists and is in same workspace
    if (parentFolder) {
      const folder = await Bookmark.findOne({
        _id: parentFolder,
        workspace: req.workspace._id,
        type: 'folder'
      });
      if (!folder) {
        return res.status(400).json({
          errors: [{ msg: 'Invalid parent folder' }]
        });
      }
    }

    // Validate document exists if resourceId provided
    if (resourceId && type === 'document') {
      const document = await Document.findById(resourceId);
      if (!document) {
        return res.status(400).json({
          errors: [{ msg: 'Referenced document not found' }]
        });
      }
    }

    const bookmark = new Bookmark({
      title: title.trim(),
      description: description?.trim() || '',
      type,
      workspace: req.workspace._id,
      createdBy: req.user.id,
      url,
      resourceId,
      tags: tags || [],
      parentFolder,
      isPrivate: isPrivate || false,
      notes: notes?.trim() || '',
      metadata: metadata || {}
    });

    await bookmark.save();
    await bookmark.populate('createdBy', 'username email');
    await bookmark.populate('parentFolder', 'title type');

    // Add bookmark to workspace bookmarks array
    req.workspace.bookmarks.push(bookmark._id);
    await req.workspace.save();

    res.status(201).json(bookmark);
  } catch (error) {
    console.error('Create bookmark error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId/bookmarks/:bookmarkId
 * @desc    Get bookmark details
 * @access  Private
 */
router.get('/:workspaceId/bookmarks/:bookmarkId', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId(),
  param('bookmarkId', 'Invalid bookmark ID').isMongoId(),
  checkWorkspaceAccess,
  checkBookmarkAccess
], async (req, res) => {
  try {
    // Record access
    await req.bookmark.recordAccess();
    
    res.json(req.bookmark);
  } catch (error) {
    console.error('Get bookmark error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   PUT /api/workspaces/:workspaceId/bookmarks/:bookmarkId
 * @desc    Update bookmark
 * @access  Private
 */
router.put('/:workspaceId/bookmarks/:bookmarkId', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId(),
  param('bookmarkId', 'Invalid bookmark ID').isMongoId(),
  checkWorkspaceAccess,
  checkBookmarkAccess,
  requireBookmarkEdit,
  body('title', 'Title too long').optional().trim().isLength({ min: 1, max: 200 }),
  body('description', 'Description too long').optional().isLength({ max: 1000 }),
  body('tags', 'Tags must be an array').optional().isArray(),
  body('notes', 'Notes too long').optional().isLength({ max: 2000 }),
  body('isPrivate', 'isPrivate must be boolean').optional().isBoolean(),
  body('isFavorite', 'isFavorite must be boolean').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      tags,
      notes,
      isPrivate,
      isFavorite,
      parentFolder
    } = req.body;

    const bookmark = req.bookmark;

    if (title) bookmark.title = title.trim();
    if (description !== undefined) bookmark.description = description.trim();
    if (tags) bookmark.tags = tags;
    if (notes !== undefined) bookmark.notes = notes.trim();
    if (isPrivate !== undefined) bookmark.isPrivate = isPrivate;
    if (isFavorite !== undefined) bookmark.isFavorite = isFavorite;
    
    // Validate parent folder if being changed
    if (parentFolder !== undefined) {
      if (parentFolder) {
        const folder = await Bookmark.findOne({
          _id: parentFolder,
          workspace: req.workspace._id,
          type: 'folder'
        });
        if (!folder) {
          return res.status(400).json({
            errors: [{ msg: 'Invalid parent folder' }]
          });
        }
      }
      bookmark.parentFolder = parentFolder;
    }

    await bookmark.save();
    res.json(bookmark);
  } catch (error) {
    console.error('Update bookmark error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   DELETE /api/workspaces/:workspaceId/bookmarks/:bookmarkId
 * @desc    Delete bookmark
 * @access  Private
 */
router.delete('/:workspaceId/bookmarks/:bookmarkId', [
  auth,
  param('workspaceId', 'Invalid workspace ID').isMongoId(),
  param('bookmarkId', 'Invalid bookmark ID').isMongoId(),
  checkWorkspaceAccess,
  checkBookmarkAccess,
  requireBookmarkEdit
], async (req, res) => {
  try {
    const bookmark = req.bookmark;
    
    // Remove bookmark from workspace bookmarks array
    req.workspace.bookmarks.pull(bookmark._id);
    await req.workspace.save();
    
    // Delete the bookmark
    await bookmark.remove();

    res.json({ msg: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

module.exports = router;
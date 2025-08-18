const Workspace = require('../models/Workspace');
const Bookmark = require('../models/Bookmark');
const Document = require('../models/Document');

/**
 * Middleware to check if user has access to a workspace
 * Attaches workspace object to req.workspace if access is granted
 */
const checkWorkspaceAccess = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    
    if (!workspaceId) {
      console.warn('Workspace access check failed: No workspace ID provided');
      return res.status(400).json({ 
        errors: [{ msg: 'Workspace ID is required' }] 
      });
    }

    // Validate workspace ID format
    if (!workspaceId.match(/^[0-9a-fA-F]{24}$/)) {
      console.warn(`Workspace access check failed: Invalid workspace ID format: ${workspaceId}`);
      return res.status(400).json({ 
        errors: [{ msg: 'Invalid workspace ID format' }] 
      });
    }

    const workspace = await Workspace.findById(workspaceId)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');

    if (!workspace) {
      console.warn(`Workspace access check failed: Workspace not found: ${workspaceId}`);
      return res.status(404).json({ 
        errors: [{ msg: 'Workspace not found' }] 
      });
    }

    if (!workspace.isActive) {
      console.warn(`Workspace access check failed: Workspace not active: ${workspaceId}`);
      return res.status(403).json({ 
        errors: [{ msg: 'Workspace is not active' }] 
      });
    }

    // Enhanced logging for debugging access issues
    const userId = req.user.id;
    const userIdStr = userId ? userId.toString() : 'undefined';
    const ownerIdStr = workspace.owner?._id ? workspace.owner._id.toString() : 'undefined';
    
    console.log(`Workspace access check for user ${userIdStr} on workspace ${workspaceId}:`);
    console.log(`- Workspace owner: ${ownerIdStr}`);
    console.log(`- User ID type: ${typeof userId}, Owner ID type: ${typeof workspace.owner?._id}`);
    console.log(`- Collaborators count: ${workspace.collaborators?.length || 0}`);
    
    // Check if user has access to workspace
    const hasAccess = workspace.hasAccess(userId);
    
    if (!hasAccess) {
      console.error(`Access denied to workspace ${workspaceId} for user ${userIdStr}`);
      console.error(`- Owner: ${ownerIdStr} (${workspace.owner?.username})`);
      console.error(`- Collaborators: ${workspace.collaborators?.map(c => c.user._id.toString()).join(', ')}`);
      console.error(`- User role: ${workspace.getUserRole(userId)}`);
      
      return res.status(403).json({ 
        errors: [{ msg: 'Access denied. You do not have permission to view this workspace.' }] 
      });
    }

    // Attach workspace and user role to request
    req.workspace = workspace;
    req.userRole = workspace.getUserRole(userId);
    
    console.log(`Workspace access granted for user ${userIdStr} with role: ${req.userRole}`);
    next();
  } catch (error) {
    console.error('Workspace access check error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      errors: [{ msg: 'Server error checking workspace access' }] 
    });
  }
};

/**
 * Middleware to check if user can perform specific action in workspace
 * @param {string} action - The action to check permission for
 */
const requireWorkspacePermission = (action) => {
  return async (req, res, next) => {
    try {
      if (!req.workspace) {
        return res.status(500).json({ 
          errors: [{ msg: 'Workspace not loaded. Use checkWorkspaceAccess middleware first.' }] 
        });
      }

      if (!req.workspace.canUserPerformAction(req.user.id, action)) {
        return res.status(403).json({ 
          errors: [{ msg: `Insufficient permissions to ${action}` }] 
        });
      }

      next();
    } catch (error) {
      console.error('Workspace permission check error:', error);
      res.status(500).json({ 
        errors: [{ msg: 'Server error checking workspace permissions' }] 
      });
    }
  };
};

/**
 * Middleware to check if user is workspace owner
 */
const requireWorkspaceOwner = async (req, res, next) => {
  try {
    if (!req.workspace) {
      return res.status(500).json({ 
        errors: [{ msg: 'Workspace not loaded. Use checkWorkspaceAccess middleware first.' }] 
      });
    }

    if (req.workspace.owner._id.toString() !== req.user.id) {
      return res.status(403).json({ 
        errors: [{ msg: 'Only workspace owner can perform this action' }] 
      });
    }

    next();
  } catch (error) {
    console.error('Workspace owner check error:', error);
    res.status(500).json({ 
      errors: [{ msg: 'Server error checking workspace ownership' }] 
    });
  }
};

/**
 * Middleware to check if user can manage collaborators
 */
const requireCollaboratorManagement = async (req, res, next) => {
  try {
    if (!req.workspace) {
      return res.status(500).json({ 
        errors: [{ msg: 'Workspace not loaded. Use checkWorkspaceAccess middleware first.' }] 
      });
    }

    const userRole = req.workspace.getUserRole(req.user.id);
    if (userRole !== 'admin') {
      return res.status(403).json({ 
        errors: [{ msg: 'Only workspace admins can manage collaborators' }] 
      });
    }

    next();
  } catch (error) {
    console.error('Collaborator management check error:', error);
    res.status(500).json({ 
      errors: [{ msg: 'Server error checking collaborator management permissions' }] 
    });
  }
};

/**
 * Middleware to check bookmark access and permissions
 * Attaches bookmark object to req.bookmark if access is granted
 */
const checkBookmarkAccess = async (req, res, next) => {
  try {
    const bookmarkId = req.params.bookmarkId || req.body.bookmarkId;
    
    if (!bookmarkId) {
      return res.status(400).json({ 
        errors: [{ msg: 'Bookmark ID is required' }] 
      });
    }

    const bookmark = await Bookmark.findById(bookmarkId)
      .populate('createdBy', 'username email')
      .populate('workspace', 'name type owner collaborators')
      .populate('parentFolder', 'title type');

    if (!bookmark) {
      return res.status(404).json({ 
        errors: [{ msg: 'Bookmark not found' }] 
      });
    }

    // Check if user has access to the workspace containing this bookmark
    if (!bookmark.workspace.hasAccess(req.user.id)) {
      return res.status(403).json({ 
        errors: [{ msg: 'Access denied to bookmark workspace' }] 
      });
    }

    // Check if user can access this specific bookmark
    const userRole = bookmark.workspace.getUserRole(req.user.id);
    if (!bookmark.canUserAccess(req.user.id, userRole)) {
      return res.status(403).json({ 
        errors: [{ msg: 'Access denied to bookmark' }] 
      });
    }

    // Attach bookmark and user role to request
    req.bookmark = bookmark;
    req.userRole = userRole;
    
    next();
  } catch (error) {
    console.error('Bookmark access check error:', error);
    res.status(500).json({ 
      errors: [{ msg: 'Server error checking bookmark access' }] 
    });
  }
};

/**
 * Middleware to check if user can edit bookmark
 */
const requireBookmarkEdit = async (req, res, next) => {
  try {
    if (!req.bookmark) {
      return res.status(500).json({ 
        errors: [{ msg: 'Bookmark not loaded. Use checkBookmarkAccess middleware first.' }] 
      });
    }

    if (!req.bookmark.canUserEdit(req.user.id, req.userRole)) {
      return res.status(403).json({ 
        errors: [{ msg: 'Insufficient permissions to edit bookmark' }] 
      });
    }

    next();
  } catch (error) {
    console.error('Bookmark edit check error:', error);
    res.status(500).json({ 
      errors: [{ msg: 'Server error checking bookmark edit permissions' }] 
    });
  }
};

/**
 * Middleware to validate workspace type for certain operations
 * @param {string[]} allowedTypes - Array of allowed workspace types
 */
const requireWorkspaceType = (allowedTypes) => {
  return async (req, res, next) => {
    try {
      if (!req.workspace) {
        return res.status(500).json({ 
          errors: [{ msg: 'Workspace not loaded. Use checkWorkspaceAccess middleware first.' }] 
        });
      }

      if (!allowedTypes.includes(req.workspace.type)) {
        return res.status(403).json({ 
          errors: [{ msg: `Operation not allowed for ${req.workspace.type} workspaces` }] 
        });
      }

      next();
    } catch (error) {
      console.error('Workspace type check error:', error);
      res.status(500).json({ 
        errors: [{ msg: 'Server error checking workspace type' }] 
      });
    }
  };
};

/**
 * Middleware to check document access and permissions
 * Attaches document and workspace object to req if access is granted
 */
const checkDocumentAccess = async (req, res, next) => {
  try {
    const documentId = req.params.documentId || req.body.documentId;
    
    if (!documentId) {
      return res.status(400).json({ 
        errors: [{ msg: 'Document ID is required' }] 
      });
    }

    const document = await Document.findById(documentId)
      .populate({
          path: 'workspace',
          populate: [
              { path: 'owner', select: 'username email' },
              { path: 'collaborators.user', select: 'username email' }
          ]
      });

    if (!document) {
      return res.status(404).json({ 
        errors: [{ msg: 'Document not found' }] 
      });
    }

    const workspace = document.workspace;

    if (!workspace) {
        return res.status(404).json({ 
            errors: [{ msg: 'Workspace not found for this document' }] 
        });
    }

    if (!workspace.isActive) {
      return res.status(403).json({ 
        errors: [{ msg: 'Workspace is not active' }] 
      });
    }

    // Check if user has access to workspace
    if (!workspace.hasAccess(req.user.id)) {
      return res.status(403).json({ 
        errors: [{ msg: 'Access denied to workspace' }] 
      });
    }

    // Attach document, workspace and user role to request
    req.document = document;
    req.workspace = workspace;
    req.userRole = workspace.getUserRole(req.user.id);
    
    next();
  } catch (error) {
    console.error('Document access check error:', error);
    res.status(500).json({ 
      errors: [{ msg: 'Server error checking document access' }] 
    });
  }
};

/**
 * Helper function to get user's accessible workspaces
 */
const getUserAccessibleWorkspaces = async (userId) => {
  try {
    return await Workspace.findUserWorkspaces(userId);
  } catch (error) {
    console.error('Error fetching user workspaces:', error);
    throw error;
  }
};

module.exports = {
  checkWorkspaceAccess,
  requireWorkspacePermission,
  requireWorkspaceOwner,
  requireCollaboratorManagement,
  checkBookmarkAccess,
  requireBookmarkEdit,
  requireWorkspaceType,
  getUserAccessibleWorkspaces,
  checkDocumentAccess
};
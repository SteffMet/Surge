const mongoose = require('mongoose');

const CollaboratorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['viewer', 'editor', 'admin'],
    default: 'viewer'
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const WorkspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    type: {
      type: String,
      enum: ['private', 'collaborative'],
      default: 'private',
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    collaborators: [CollaboratorSchema],
    bookmarks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bookmark'
    }],
    settings: {
      allowPublicBookmarks: {
        type: Boolean,
        default: false
      },
      defaultBookmarkPrivacy: {
        type: String,
        enum: ['private', 'workspace'],
        default: 'workspace'
      },
      requireApprovalForBookmarks: {
        type: Boolean,
        default: false
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tags: {
      type: [String],
      default: [],
      index: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
WorkspaceSchema.index({ owner: 1, type: 1 });
WorkspaceSchema.index({ 'collaborators.user': 1 });
WorkspaceSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Virtual for total collaborator count
WorkspaceSchema.virtual('collaboratorCount').get(function() {
  return this.collaborators ? this.collaborators.length : 0;
});

// Virtual for bookmark count
WorkspaceSchema.virtual('bookmarkCount').get(function() {
  return this.bookmarks ? this.bookmarks.length : 0;
});

// Instance method to check if user has access to workspace
WorkspaceSchema.methods.hasAccess = function(userId) {
  if (!userId) {
    console.warn('hasAccess called with null/undefined userId');
    return false;
  }
  
  // Convert userId to string for comparison
  const userIdStr = userId.toString();
  
  // Handle owner comparison - owner could be ObjectId or populated User object
  let ownerIdStr = null;
  if (this.owner) {
    // If owner is populated (has _id property), use _id, otherwise use owner directly
    ownerIdStr = (this.owner._id || this.owner).toString();
  }
  
  // Debug logging
  console.log(`hasAccess check: userId=${userIdStr}, ownerId=${ownerIdStr}`);
  
  // Owner always has access
  if (ownerIdStr && ownerIdStr === userIdStr) {
    console.log('Access granted: User is owner');
    return true;
  }
  
  // Check if user is a collaborator
  if (!this.collaborators || this.collaborators.length === 0) {
    console.log('Access denied: No collaborators and user is not owner');
    return false;
  }
  
  const isCollaborator = this.collaborators.some(collab => {
    if (!collab.user) {
      console.warn('Collaborator found with null user:', collab);
      return false;
    }
    // Handle populated vs non-populated collaborator user
    const collabIdStr = (collab.user._id || collab.user).toString();
    console.log(`Checking collaborator: ${collabIdStr} vs ${userIdStr}`);
    return collabIdStr === userIdStr;
  });
  
  if (isCollaborator) {
    console.log('Access granted: User is collaborator');
  } else {
    console.log('Access denied: User is not collaborator');
  }
  
  return isCollaborator;
};

// Instance method to get user's role in workspace
WorkspaceSchema.methods.getUserRole = function(userId) {
  if (!userId) {
    console.warn('getUserRole called with null/undefined userId');
    return null;
  }
  
  // Convert to strings for comparison
  const userIdStr = userId.toString();
  const ownerIdStr = this.owner ? this.owner.toString() : null;
  
  // Owner has admin role
  if (ownerIdStr && ownerIdStr === userIdStr) {
    return 'admin';
  }
  
  // Find collaborator role
  if (!this.collaborators || this.collaborators.length === 0) {
    return null;
  }
  
  const collaborator = this.collaborators.find(collab => {
    if (!collab.user) return false;
    return collab.user.toString() === userIdStr;
  });
  
  return collaborator ? collaborator.role : null;
};

// Instance method to check if user can perform specific action
WorkspaceSchema.methods.canUserPerformAction = function(userId, action) {
  const role = this.getUserRole(userId);
  if (!role) return false;
  
  const permissions = {
    viewer: ['read'],
    editor: ['read', 'create_bookmark', 'edit_bookmark', 'delete_own_bookmark'],
    admin: ['read', 'create_bookmark', 'edit_bookmark', 'delete_bookmark', 'manage_collaborators', 'edit_workspace', 'delete_workspace']
  };
  
  return permissions[role] && permissions[role].includes(action);
};

// Static method to find workspaces user has access to
WorkspaceSchema.statics.findUserWorkspaces = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'collaborators.user': userId }
    ],
    isActive: true
  }).populate('owner', 'username email')
    .populate('collaborators.user', 'username email')
    .sort({ updatedAt: -1 });
};

// Pre-save middleware to ensure owner is not in collaborators array
WorkspaceSchema.pre('save', function(next) {
  if (this.collaborators && this.owner) {
    this.collaborators = this.collaborators.filter(collab => 
      collab.user.toString() !== this.owner.toString()
    );
  }
  next();
});

// Pre-remove middleware to clean up bookmarks when workspace is deleted
WorkspaceSchema.pre('remove', async function(next) {
  try {
    // Remove all bookmarks associated with this workspace
    await mongoose.model('Bookmark').deleteMany({ workspace: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Workspace', WorkspaceSchema);
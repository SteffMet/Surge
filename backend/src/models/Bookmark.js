const mongoose = require('mongoose');

const BookmarkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    type: {
      type: String,
      enum: ['document', 'search_result', 'external_link', 'folder'],
      required: true,
      index: true
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // Reference to the actual resource being bookmarked
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    // For external links or custom resources
    url: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          // URL is required for external_link type, optional for others
          if (this.type === 'external_link') {
            return v && v.length > 0;
          }
          return true;
        },
        message: 'URL is required for external links'
      }
    },
    // Metadata specific to bookmark type
    metadata: {
      // For document bookmarks
      documentInfo: {
        originalName: String,
        mimeType: String,
        size: Number,
        path: String
      },
      // For search result bookmarks
      searchInfo: {
        query: String,
        searchType: String,
        resultCount: Number,
        searchDate: Date,
        filters: mongoose.Schema.Types.Mixed
      },
      // For external link bookmarks
      linkInfo: {
        domain: String,
        favicon: String,
        preview: String,
        lastChecked: Date,
        isAccessible: Boolean
      },
      // For folder bookmarks (organizing other bookmarks)
      folderInfo: {
        color: String,
        icon: String,
        parentFolder: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Bookmark'
        }
      }
    },
    tags: {
      type: [String],
      default: [],
      index: true,
      validate: {
        validator: function(tags) {
          return tags.length <= 20; // Limit number of tags
        },
        message: 'Maximum 20 tags allowed'
      }
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },
    isPrivate: {
      type: Boolean,
      default: false,
      index: true
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true
    },
    position: {
      type: Number,
      default: 0,
      index: true
    },
    // For organizing bookmarks in folders
    parentFolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bookmark',
      index: true
    },
    // Access tracking
    accessCount: {
      type: Number,
      default: 0
    },
    lastAccessedAt: {
      type: Date,
      default: null
    },
    // Status for validation/verification
    status: {
      type: String,
      enum: ['active', 'broken', 'pending_verification'],
      default: 'active',
      index: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for performance
BookmarkSchema.index({ workspace: 1, createdBy: 1 });
BookmarkSchema.index({ workspace: 1, type: 1 });
BookmarkSchema.index({ workspace: 1, isFavorite: 1 });
BookmarkSchema.index({ workspace: 1, parentFolder: 1, position: 1 });
BookmarkSchema.index({ title: 'text', description: 'text', notes: 'text', tags: 'text' });

// Virtual for checking if bookmark is a folder
BookmarkSchema.virtual('isFolder').get(function() {
  return this.type === 'folder';
});

// Virtual for getting child bookmarks count (for folders)
BookmarkSchema.virtual('childCount', {
  ref: 'Bookmark',
  localField: '_id',
  foreignField: 'parentFolder',
  count: true
});

// Instance method to check if user can access this bookmark
BookmarkSchema.methods.canUserAccess = function(userId, userRole) {
  // Private bookmarks can only be accessed by creator
  if (this.isPrivate && this.createdBy.toString() !== userId.toString()) {
    return false;
  }
  
  // Non-private bookmarks can be accessed by workspace members
  return true;
};

// Instance method to check if user can edit this bookmark
BookmarkSchema.methods.canUserEdit = function(userId, userRole) {
  // Creator can always edit their bookmarks
  if (this.createdBy.toString() === userId.toString()) {
    return true;
  }
  
  // Workspace admins can edit any bookmark
  if (userRole === 'admin') {
    return true;
  }
  
  // Editors can edit non-private bookmarks
  if (userRole === 'editor' && !this.isPrivate) {
    return true;
  }
  
  return false;
};

// Instance method to increment access count
BookmarkSchema.methods.recordAccess = function() {
  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

// Static method to find bookmarks in workspace with filters
BookmarkSchema.statics.findInWorkspace = function(workspaceId, filters = {}) {
  const query = { workspace: workspaceId, ...filters };
  return this.find(query)
    .populate('createdBy', 'username email')
    .populate('parentFolder', 'title type')
    .sort({ position: 1, createdAt: -1 });
};

// Static method to find user's bookmarks across workspaces
BookmarkSchema.statics.findUserBookmarks = function(userId, filters = {}) {
  const query = { createdBy: userId, ...filters };
  return this.find(query)
    .populate('workspace', 'name type')
    .populate('parentFolder', 'title type')
    .sort({ createdAt: -1 });
};

// Pre-save middleware to set metadata based on type
BookmarkSchema.pre('save', async function(next) {
  // Auto-populate document metadata if resourceId points to a document
  if (this.type === 'document' && this.resourceId && this.isModified('resourceId')) {
    try {
      const Document = mongoose.model('Document');
      const doc = await Document.findById(this.resourceId);
      if (doc) {
        this.metadata.documentInfo = {
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          size: doc.size,
          path: doc.path
        };
        // Set title from document name if not provided
        if (!this.title || this.title.trim() === '') {
          this.title = doc.originalName;
        }
      }
    } catch (error) {
      // Continue without metadata if document not found
    }
  }
  
  // Extract domain for external links
  if (this.type === 'external_link' && this.url && this.isModified('url')) {
    try {
      const urlObj = new URL(this.url);
      if (!this.metadata.linkInfo) {
        this.metadata.linkInfo = {};
      }
      this.metadata.linkInfo.domain = urlObj.hostname;
      this.metadata.linkInfo.lastChecked = new Date();
      this.metadata.linkInfo.isAccessible = true; // Assume accessible initially
    } catch (error) {
      // Invalid URL, mark as potentially broken
      this.status = 'pending_verification';
    }
  }
  
  next();
});

// Pre-remove middleware to handle folder deletion
BookmarkSchema.pre('remove', async function(next) {
  try {
    if (this.type === 'folder') {
      // Move child bookmarks to parent folder or root
      await this.constructor.updateMany(
        { parentFolder: this._id },
        { parentFolder: this.parentFolder || null }
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Bookmark', BookmarkSchema);
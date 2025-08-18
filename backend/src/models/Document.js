const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String },
    originalName: { type: String, required: true },          // Original filename
    storedName: { type: String, required: true, index: true }, // Name on disk
    path: { type: String, required: true },                   // Absolute or storage-relative path
    folder: { type: String, default: '/' },                   // Virtual folder for UI organisation
    mimeType: { type: String, required: true, index: true },
    size: { type: Number, required: true },
    tags: { type: [String], default: [], index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    extractedText: { type: String, default: '' },             // Text extracted for search
    ocrApplied: { type: Boolean, default: false },
    checksum: { type: String, index: true },                  // For dedupe if needed
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
      index: true
    },
    error: { type: String, default: '' },                     // Processing error, if any
    embedding: { type: [Number], default: null },            // Optional vector embedding for semantic search
    
    // Workspace-related fields
    bookmarkCount: {
      type: Number,
      default: 0,
      index: true
    },
    lastBookmarked: {
      type: Date,
      default: null
    },
    // Track which workspaces have bookmarked this document
    bookmarkedInWorkspaces: [{
      workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace'
      },
      bookmarkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      bookmarkedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Full-text index for search
DocumentSchema.index({ extractedText: 'text', originalName: 'text', tags: 'text' });

// Index for workspace bookmarking
DocumentSchema.index({ 'bookmarkedInWorkspaces.workspace': 1 });
DocumentSchema.index({ bookmarkCount: -1 });

// Virtual for checking if document is bookmarked
DocumentSchema.virtual('isBookmarked').get(function() {
  return this.bookmarkCount > 0;
});

// Instance method to add bookmark reference
DocumentSchema.methods.addBookmark = function(workspaceId, userId) {
  // Check if already bookmarked in this workspace
  const existingBookmark = this.bookmarkedInWorkspaces.find(
    bookmark => bookmark.workspace.toString() === workspaceId.toString()
  );
  
  if (!existingBookmark) {
    this.bookmarkedInWorkspaces.push({
      workspace: workspaceId,
      bookmarkedBy: userId,
      bookmarkedAt: new Date()
    });
    this.bookmarkCount += 1;
    this.lastBookmarked = new Date();
  }
  
  return this.save();
};

// Instance method to remove bookmark reference
DocumentSchema.methods.removeBookmark = function(workspaceId) {
  const bookmarkIndex = this.bookmarkedInWorkspaces.findIndex(
    bookmark => bookmark.workspace.toString() === workspaceId.toString()
  );
  
  if (bookmarkIndex !== -1) {
    this.bookmarkedInWorkspaces.splice(bookmarkIndex, 1);
    this.bookmarkCount = Math.max(0, this.bookmarkCount - 1);
    
    // Update lastBookmarked to the most recent remaining bookmark
    if (this.bookmarkedInWorkspaces.length > 0) {
      const mostRecent = this.bookmarkedInWorkspaces.reduce((latest, current) =>
        current.bookmarkedAt > latest.bookmarkedAt ? current : latest
      );
      this.lastBookmarked = mostRecent.bookmarkedAt;
    } else {
      this.lastBookmarked = null;
    }
  }
  
  return this.save();
};

// Instance method to check if document is bookmarked in specific workspace
DocumentSchema.methods.isBookmarkedInWorkspace = function(workspaceId) {
  return this.bookmarkedInWorkspaces.some(
    bookmark => bookmark.workspace.toString() === workspaceId.toString()
  );
};

// Static method to find documents bookmarked in workspace
DocumentSchema.statics.findBookmarkedInWorkspace = function(workspaceId) {
  return this.find({
    'bookmarkedInWorkspaces.workspace': workspaceId
  }).populate('uploadedBy', 'username email')
    .sort({ lastBookmarked: -1 });
};

// Static method to find most bookmarked documents
DocumentSchema.statics.findMostBookmarked = function(limit = 10) {
  return this.find({
    bookmarkCount: { $gt: 0 }
  }).populate('uploadedBy', 'username email')
    .sort({ bookmarkCount: -1 })
    .limit(limit);
};

// Static method to get document bookmark statistics
DocumentSchema.statics.getBookmarkStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        bookmarkedDocuments: {
          $sum: { $cond: [{ $gt: ['$bookmarkCount', 0] }, 1, 0] }
        },
        totalBookmarks: { $sum: '$bookmarkCount' },
        avgBookmarksPerDoc: { $avg: '$bookmarkCount' }
      }
    }
  ]);
  
  return stats[0] || {
    totalDocuments: 0,
    bookmarkedDocuments: 0,
    totalBookmarks: 0,
    avgBookmarksPerDoc: 0
  };
};

module.exports = mongoose.model('Document', DocumentSchema);

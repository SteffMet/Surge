const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    notified: {
      type: Boolean,
      default: false
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const CommentSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  // Position in the document for contextual comments
  position: {
    type: {
      type: String,
      enum: ['selection', 'line', 'general'],
      default: 'general'
    },
    startOffset: Number,
    endOffset: Number,
    selectedText: String,
    lineNumber: Number
  },
  status: {
    type: String,
    enum: ['open', 'resolved', 'pending'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  type: {
    type: String,
    enum: ['comment', 'suggestion', 'question', 'issue'],
    default: 'comment'
  },
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    notified: {
      type: Boolean,
      default: false
    }
  }],
  replies: [ReplySchema],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  // For threaded discussions
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  threadLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
CommentSchema.index({ document: 1, createdAt: -1 });
CommentSchema.index({ workspace: 1, status: 1 });
CommentSchema.index({ author: 1, createdAt: -1 });
CommentSchema.index({ 'mentions.user': 1 });
CommentSchema.index({ parentComment: 1, createdAt: 1 });

// Virtual for reply count
CommentSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for total reactions
CommentSchema.virtual('reactionCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

// Virtual for unresolved status
CommentSchema.virtual('isUnresolved').get(function() {
  return this.status !== 'resolved';
});

// Static method to get document comments with replies
CommentSchema.statics.getDocumentComments = function(documentId, options = {}) {
  const {
    status = null,
    author = null,
    includeResolved = false,
    limit = 50,
    page = 1
  } = options;

  const query = { 
    document: documentId,
    parentComment: null // Only top-level comments
  };

  if (status) query.status = status;
  if (author) query.author = author;
  if (!includeResolved) query.status = { $ne: 'resolved' };

  return this.find(query)
    .populate('author', 'username email')
    .populate('replies.author', 'username email')
    .populate('mentions.user', 'username email')
    .populate('resolvedBy', 'username email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// Static method to get comment statistics
CommentSchema.statics.getCommentStats = async function(documentId) {
  const stats = await this.aggregate([
    { $match: { document: mongoose.Types.ObjectId(documentId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    open: 0,
    resolved: 0,
    pending: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Instance method to resolve comment
CommentSchema.methods.resolve = function(userId) {
  this.status = 'resolved';
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  return this.save();
};

// Instance method to add reaction
CommentSchema.methods.addReaction = function(userId, emoji) {
  const existingReaction = this.reactions.find(
    r => r.user.toString() === userId.toString() && r.emoji === emoji
  );

  if (!existingReaction) {
    this.reactions.push({
      user: userId,
      emoji,
      createdAt: new Date()
    });
  }

  return this.save();
};

// Instance method to remove reaction
CommentSchema.methods.removeReaction = function(userId, emoji) {
  this.reactions = this.reactions.filter(
    r => !(r.user.toString() === userId.toString() && r.emoji === emoji)
  );
  return this.save();
};

// Instance method to add reply
CommentSchema.methods.addReply = function(replyData) {
  this.replies.push(replyData);
  return this.save();
};

// Pre-save middleware to extract mentions
CommentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(this.content)) !== null) {
      const username = match[1];
      if (!mentions.find(m => m.username === username)) {
        mentions.push({
          username,
          notified: false
        });
      }
    }

    // Only update mentions if they've changed
    if (JSON.stringify(mentions) !== JSON.stringify(this.mentions)) {
      this.mentions = mentions;
    }
  }
  next();
});

module.exports = mongoose.model('Comment', CommentSchema);
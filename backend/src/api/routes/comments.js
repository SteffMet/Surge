const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { checkDocumentAccess } = require('../../middleware/workspaceAuth');
const Comment = require('../../models/Comment');
const User = require('../../models/User');
const Document = require('../../models/Document');
const { AnalyticsEvent } = require('../../models/Analytics');
const { body, validationResult } = require('express-validator');

// Get comments for a document
router.get('/document/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { 
      status, 
      author, 
      includeResolved = false, 
      limit = 50, 
      page = 1,
      type
    } = req.query;

    // Verify document exists and user has access
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const options = {
      status,
      author,
      includeResolved: includeResolved === 'true',
      limit: parseInt(limit),
      page: parseInt(page),
      type
    };

    const comments = await Comment.getDocumentComments(documentId, options);
    const stats = await Comment.getCommentStats(documentId);

    res.json({
      comments,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: comments.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

// Create new comment
router.post('/document/:documentId', [
  auth,
  checkDocumentAccess,
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be 1-5000 characters'),
  body('position.type').optional().isIn(['selection', 'line', 'general']),
  body('type').optional().isIn(['comment', 'suggestion', 'question', 'issue']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentId } = req.params;
    const {
      content,
      position,
      type = 'comment',
      priority = 'medium',
      tags = [],
      parentComment = null
    } = req.body;

    // Verify document exists and user has access
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check permissions
    if (!req.workspace.canUserPerformAction(req.user.userId, 'create_bookmark')) {
      return res.status(403).json({ message: 'Insufficient permissions to comment' });
    }

    // Determine thread level for nested comments
    let threadLevel = 0;
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (parent) {
        threadLevel = Math.min(parent.threadLevel + 1, 5); // Max 5 levels deep
      }
    }

    const commentData = {
      document: documentId,
      workspace: req.workspace._id,
      author: req.user.userId,
      content,
      position,
      type,
      priority,
      tags,
      parentComment,
      threadLevel
    };

    const comment = new Comment(commentData);
    await comment.save();

    // Populate author info
    await comment.populate('author', 'username email');

    // Process mentions and send notifications
    if (comment.mentions.length > 0) {
      await this.processMentions(comment, req.workspace._id);
    }

    // Log analytics event
    await AnalyticsEvent.logEvent({
      eventType: 'comment_create',
      user: req.user.userId,
      document: documentId,
      workspace: req.workspace._id,
      metadata: {
        commentType: type,
        priority,
        hasPosition: !!position,
        threadLevel,
        mentionCount: comment.mentions.length
      }
    });

    res.status(201).json(comment);

  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Failed to create comment' });
  }
});

// Get specific comment with replies
router.get('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId)
      .populate('author', 'username email')
      .populate('replies.author', 'username email')
      .populate('mentions.user', 'username email')
      .populate('resolvedBy', 'username email');

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.json(comment);

  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({ message: 'Failed to fetch comment' });
  }
});

// Update comment
router.put('/:commentId', [
  auth,
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be 1-5000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { commentId } = req.params;
    const { content, priority, tags } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user can edit (author or admin)
    if (comment.author.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Can only edit your own comments' });
    }

    // Update comment
    comment.content = content;
    if (priority) comment.priority = priority;
    if (tags) comment.tags = tags;
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();
    await comment.populate('author', 'username email');

    // Process new mentions if any
    if (comment.mentions.length > 0) {
      await this.processMentions(comment, comment.workspace);
    }

    res.json(comment);

  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'Failed to update comment' });
  }
});

// Add reply to comment
router.post('/:commentId/reply', [
  auth,
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Reply must be 1-2000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const replyData = {
      content,
      author: req.user.userId,
      createdAt: new Date()
    };

    await comment.addReply(replyData);
    await comment.populate('replies.author', 'username email');

    // Log analytics event
    await AnalyticsEvent.logEvent({
      eventType: 'comment_reply',
      user: req.user.userId,
      document: comment.document,
      workspace: comment.workspace,
      metadata: { parentCommentId: commentId }
    });

    res.status(201).json(comment.replies[comment.replies.length - 1]);

  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ message: 'Failed to add reply' });
  }
});

// Resolve/unresolve comment
router.patch('/:commentId/resolve', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { resolved = true } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (resolved) {
      await comment.resolve(req.user.userId);
    } else {
      comment.status = 'open';
      comment.resolvedBy = null;
      comment.resolvedAt = null;
      await comment.save();
    }

    await comment.populate('resolvedBy', 'username email');

    // Log analytics event
    await AnalyticsEvent.logEvent({
      eventType: 'comment_resolve',
      user: req.user.userId,
      document: comment.document,
      workspace: comment.workspace,
      metadata: { action: resolved ? 'resolve' : 'unresolve' }
    });

    res.json(comment);

  } catch (error) {
    console.error('Error resolving comment:', error);
    res.status(500).json({ message: 'Failed to resolve comment' });
  }
});

// Add/remove reaction
router.post('/:commentId/reaction', [
  auth,
  body('emoji').isLength({ min: 1, max: 10 }).withMessage('Invalid emoji'),
  body('action').isIn(['add', 'remove']).withMessage('Action must be add or remove')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { commentId } = req.params;
    const { emoji, action } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (action === 'add') {
      await comment.addReaction(req.user.userId, emoji);
    } else {
      await comment.removeReaction(req.user.userId, emoji);
    }

    res.json({ 
      message: `Reaction ${action}ed successfully`,
      reactions: comment.reactions 
    });

  } catch (error) {
    console.error('Error managing reaction:', error);
    res.status(500).json({ message: 'Failed to manage reaction' });
  }
});

// Delete comment
router.delete('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user can delete (author or admin)
    if (comment.author.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Can only delete your own comments' });
    }

    await Comment.findByIdAndDelete(commentId);

    res.json({ message: 'Comment deleted successfully' });

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

// Get user mentions
router.get('/mentions/user', auth, async (req, res) => {
  try {
    const { limit = 20, page = 1, unreadOnly = false } = req.query;

    const query = {
      'mentions.user': req.user.userId
    };

    if (unreadOnly === 'true') {
      query['mentions.notified'] = false;
    }

    const comments = await Comment.find(query)
      .populate('author', 'username email')
      .populate('document', 'originalName')
      .populate('workspace', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Comment.countDocuments(query);

    res.json({
      mentions: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching mentions:', error);
    res.status(500).json({ message: 'Failed to fetch mentions' });
  }
});

// Mark mentions as read
router.patch('/mentions/mark-read', auth, async (req, res) => {
  try {
    const { commentIds = [] } = req.body;

    let query = { 'mentions.user': req.user.userId };
    if (commentIds.length > 0) {
      query._id = { $in: commentIds };
    }

    await Comment.updateMany(
      query,
      { $set: { 'mentions.$.notified': true } }
    );

    res.json({ message: 'Mentions marked as read' });

  } catch (error) {
    console.error('Error marking mentions as read:', error);
    res.status(500).json({ message: 'Failed to mark mentions as read' });
  }
});

// Helper method to process mentions
async function processMentions(comment, workspaceId) {
  for (const mention of comment.mentions) {
    try {
      const user = await User.findOne({ username: mention.username });
      if (user) {
        mention.user = user._id;
        
        // Here you would typically send notifications
        // This could be email, push notification, or WebSocket event
        console.log(`Mention notification: ${user.username} mentioned in comment ${comment._id}`);
      }
    } catch (error) {
      console.error('Error processing mention:', error);
    }
  }
  
  await comment.save();
}

module.exports = router;
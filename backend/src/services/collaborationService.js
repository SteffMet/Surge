const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Document = require('../models/Document');
const Workspace = require('../models/Workspace');
const { AnalyticsEvent } = require('../models/Analytics');

class CollaborationService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true
      }
    });

    this.activeUsers = new Map(); // userId -> { socketId, documentId, workspace, cursor }
    this.documentSessions = new Map(); // documentId -> Set of userIds
    this.documentLocks = new Map(); // documentId -> { userId, timestamp, section }

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user || !user.active) {
          return next(new Error('Invalid or inactive user'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.username} connected: ${socket.id}`);
      
      // User presence events
      socket.on('join-document', this.handleJoinDocument.bind(this, socket));
      socket.on('leave-document', this.handleLeaveDocument.bind(this, socket));
      socket.on('cursor-move', this.handleCursorMove.bind(this, socket));
      socket.on('user-typing', this.handleUserTyping.bind(this, socket));
      socket.on('user-idle', this.handleUserIdle.bind(this, socket));

      // Document editing events
      socket.on('document-change', this.handleDocumentChange.bind(this, socket));
      socket.on('request-lock', this.handleRequestLock.bind(this, socket));
      socket.on('release-lock', this.handleReleaseLock.bind(this, socket));
      socket.on('save-document', this.handleSaveDocument.bind(this, socket));

      // Comment events
      socket.on('comment-add', this.handleAddComment.bind(this, socket));
      socket.on('comment-reply', this.handleCommentReply.bind(this, socket));
      socket.on('comment-resolve', this.handleCommentResolve.bind(this, socket));
      socket.on('comment-reaction', this.handleCommentReaction.bind(this, socket));

      // Notification events
      socket.on('mention-user', this.handleMentionUser.bind(this, socket));
      socket.on('request-review', this.handleRequestReview.bind(this, socket));

      // Disconnect handling
      socket.on('disconnect', this.handleDisconnect.bind(this, socket));
    });
  }

  async handleJoinDocument(socket, { documentId, workspaceId }) {
    try {
      // Verify user has access to document/workspace
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace || !workspace.hasAccess(socket.userId)) {
        socket.emit('error', { message: 'Access denied to workspace' });
        return;
      }

      const document = await Document.findById(documentId);
      if (!document) {
        socket.emit('error', { message: 'Document not found' });
        return;
      }

      // Join document room
      socket.join(`document:${documentId}`);
      socket.currentDocument = documentId;
      socket.currentWorkspace = workspaceId;

      // Track active user
      this.activeUsers.set(socket.userId, {
        socketId: socket.id,
        documentId,
        workspaceId,
        username: socket.user.username,
        avatar: socket.user.avatar,
        cursor: null,
        lastActivity: new Date(),
        status: 'active'
      });

      // Track document session
      if (!this.documentSessions.has(documentId)) {
        this.documentSessions.set(documentId, new Set());
      }
      this.documentSessions.get(documentId).add(socket.userId);

      // Get current active users for this document
      const activeUsers = Array.from(this.documentSessions.get(documentId))
        .map(userId => this.activeUsers.get(userId))
        .filter(user => user && user.documentId === documentId);

      // Notify user of current active users
      socket.emit('document-joined', {
        documentId,
        activeUsers,
        locks: this.getDocumentLocks(documentId)
      });

      // Notify other users of new joiner
      socket.to(`document:${documentId}`).emit('user-joined', {
        userId: socket.userId,
        username: socket.user.username,
        avatar: socket.user.avatar
      });

      // Log analytics event
      await AnalyticsEvent.logEvent({
        eventType: 'collaboration_start',
        user: socket.userId,
        document: documentId,
        workspace: workspaceId,
        sessionId: socket.id,
        metadata: { activeUserCount: activeUsers.length }
      });

    } catch (error) {
      console.error('Error joining document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  }

  async handleLeaveDocument(socket) {
    if (!socket.currentDocument) return;

    const documentId = socket.currentDocument;
    const userId = socket.userId;

    // Remove from document session
    if (this.documentSessions.has(documentId)) {
      this.documentSessions.get(documentId).delete(userId);
      if (this.documentSessions.get(documentId).size === 0) {
        this.documentSessions.delete(documentId);
      }
    }

    // Release any locks held by user
    this.releaseLocks(userId, documentId);

    // Leave document room
    socket.leave(`document:${documentId}`);

    // Notify other users
    socket.to(`document:${documentId}`).emit('user-left', {
      userId,
      username: socket.user.username
    });

    // Clear current document
    socket.currentDocument = null;
    socket.currentWorkspace = null;

    // Log analytics event
    await AnalyticsEvent.logEvent({
      eventType: 'collaboration_end',
      user: userId,
      document: documentId,
      workspace: socket.currentWorkspace,
      sessionId: socket.id
    });
  }

  handleCursorMove(socket, { position, selection }) {
    if (!socket.currentDocument) return;

    const userInfo = this.activeUsers.get(socket.userId);
    if (userInfo) {
      userInfo.cursor = { position, selection };
      userInfo.lastActivity = new Date();
      userInfo.status = 'active';
    }

    socket.to(`document:${socket.currentDocument}`).emit('cursor-moved', {
      userId: socket.userId,
      username: socket.user.username,
      position,
      selection
    });
  }

  handleUserTyping(socket, { section }) {
    if (!socket.currentDocument) return;

    socket.to(`document:${socket.currentDocument}`).emit('user-typing', {
      userId: socket.userId,
      username: socket.user.username,
      section
    });

    // Update user activity
    const userInfo = this.activeUsers.get(socket.userId);
    if (userInfo) {
      userInfo.lastActivity = new Date();
      userInfo.status = 'typing';
    }
  }

  handleUserIdle(socket) {
    const userInfo = this.activeUsers.get(socket.userId);
    if (userInfo) {
      userInfo.status = 'idle';
    }

    if (socket.currentDocument) {
      socket.to(`document:${socket.currentDocument}`).emit('user-idle', {
        userId: socket.userId,
        username: socket.user.username
      });
    }
  }

  async handleDocumentChange(socket, { changes, version, section }) {
    if (!socket.currentDocument) return;

    try {
      // Broadcast changes to other users
      socket.to(`document:${socket.currentDocument}`).emit('document-changed', {
        userId: socket.userId,
        username: socket.user.username,
        changes,
        version,
        section,
        timestamp: new Date()
      });

      // Log analytics event
      await AnalyticsEvent.logEvent({
        eventType: 'document_edit',
        user: socket.userId,
        document: socket.currentDocument,
        workspace: socket.currentWorkspace,
        sessionId: socket.id,
        metadata: { section, changeSize: JSON.stringify(changes).length }
      });

    } catch (error) {
      console.error('Error handling document change:', error);
      socket.emit('error', { message: 'Failed to process document change' });
    }
  }

  handleRequestLock(socket, { section, type = 'edit' }) {
    if (!socket.currentDocument) return;

    const documentId = socket.currentDocument;
    const lockKey = `${documentId}:${section}`;
    
    // Check if section is already locked
    if (this.documentLocks.has(lockKey)) {
      const existingLock = this.documentLocks.get(lockKey);
      if (existingLock.userId !== socket.userId) {
        socket.emit('lock-denied', {
          section,
          lockedBy: existingLock.username,
          lockType: existingLock.type
        });
        return;
      }
    }

    // Grant lock
    this.documentLocks.set(lockKey, {
      userId: socket.userId,
      username: socket.user.username,
      section,
      type,
      timestamp: new Date(),
      documentId
    });

    socket.emit('lock-granted', { section, type });
    socket.to(`document:${documentId}`).emit('section-locked', {
      section,
      lockedBy: socket.user.username,
      userId: socket.userId,
      type
    });
  }

  handleReleaseLock(socket, { section }) {
    if (!socket.currentDocument) return;

    const documentId = socket.currentDocument;
    const lockKey = `${documentId}:${section}`;

    if (this.documentLocks.has(lockKey)) {
      const lock = this.documentLocks.get(lockKey);
      if (lock.userId === socket.userId) {
        this.documentLocks.delete(lockKey);
        
        socket.emit('lock-released', { section });
        socket.to(`document:${documentId}`).emit('section-unlocked', {
          section,
          releasedBy: socket.user.username
        });
      }
    }
  }

  async handleSaveDocument(socket, { content, title, metadata }) {
    if (!socket.currentDocument) return;

    try {
      const document = await Document.findById(socket.currentDocument);
      if (!document) {
        socket.emit('error', { message: 'Document not found' });
        return;
      }

      // Update document (this would integrate with your document versioning system)
      document.extractedText = content;
      if (title) document.originalName = title;
      if (metadata) document.metadata = { ...document.metadata, ...metadata };
      
      await document.save();

      // Notify all users in document
      this.io.to(`document:${socket.currentDocument}`).emit('document-saved', {
        savedBy: socket.user.username,
        timestamp: new Date(),
        version: document.version || 1
      });

    } catch (error) {
      console.error('Error saving document:', error);
      socket.emit('error', { message: 'Failed to save document' });
    }
  }

  async handleAddComment(socket, commentData) {
    // This would integrate with your Comment model
    socket.to(`document:${socket.currentDocument}`).emit('comment-added', {
      ...commentData,
      author: {
        _id: socket.userId,
        username: socket.user.username
      },
      timestamp: new Date()
    });
  }

  async handleCommentReply(socket, replyData) {
    socket.to(`document:${socket.currentDocument}`).emit('comment-replied', {
      ...replyData,
      author: {
        _id: socket.userId,
        username: socket.user.username
      },
      timestamp: new Date()
    });
  }

  async handleCommentResolve(socket, { commentId }) {
    socket.to(`document:${socket.currentDocument}`).emit('comment-resolved', {
      commentId,
      resolvedBy: {
        _id: socket.userId,
        username: socket.user.username
      },
      timestamp: new Date()
    });
  }

  async handleCommentReaction(socket, { commentId, emoji, action }) {
    socket.to(`document:${socket.currentDocument}`).emit('comment-reaction', {
      commentId,
      emoji,
      action, // 'add' or 'remove'
      user: {
        _id: socket.userId,
        username: socket.user.username
      }
    });
  }

  async handleMentionUser(socket, { username, commentId, content }) {
    // Find mentioned user and send notification
    const mentionedUser = await User.findOne({ username });
    if (mentionedUser) {
      const mentionedUserSocket = Array.from(this.activeUsers.entries())
        .find(([userId, userData]) => userId === mentionedUser._id.toString());

      if (mentionedUserSocket) {
        this.io.to(mentionedUserSocket[1].socketId).emit('mentioned', {
          by: socket.user.username,
          document: socket.currentDocument,
          workspace: socket.currentWorkspace,
          commentId,
          content
        });
      }
    }
  }

  async handleRequestReview(socket, { reviewers, message }) {
    // Send review requests to specified users
    for (const reviewerId of reviewers) {
      const reviewerSocket = Array.from(this.activeUsers.entries())
        .find(([userId]) => userId === reviewerId);

      if (reviewerSocket) {
        this.io.to(reviewerSocket[1].socketId).emit('review-requested', {
          from: socket.user.username,
          document: socket.currentDocument,
          workspace: socket.currentWorkspace,
          message
        });
      }
    }
  }

  async handleDisconnect(socket) {
    console.log(`User ${socket.user.username} disconnected: ${socket.id}`);
    
    // Clean up user presence
    if (socket.currentDocument) {
      await this.handleLeaveDocument(socket);
    }

    // Remove from active users
    this.activeUsers.delete(socket.userId);

    // Clean up any locks held by this user
    this.releaseLocks(socket.userId);
  }

  // Utility methods
  getDocumentLocks(documentId) {
    const locks = [];
    for (const [lockKey, lock] of this.documentLocks.entries()) {
      if (lock.documentId === documentId) {
        locks.push({
          section: lock.section,
          type: lock.type,
          lockedBy: lock.username,
          userId: lock.userId,
          timestamp: lock.timestamp
        });
      }
    }
    return locks;
  }

  releaseLocks(userId, documentId = null) {
    for (const [lockKey, lock] of this.documentLocks.entries()) {
      if (lock.userId === userId && (!documentId || lock.documentId === documentId)) {
        this.documentLocks.delete(lockKey);
        
        // Notify others about lock release
        this.io.to(`document:${lock.documentId}`).emit('section-unlocked', {
          section: lock.section,
          releasedBy: lock.username
        });
      }
    }
  }

  // API for getting collaboration status
  getCollaborationStatus(documentId) {
    const activeUsers = this.documentSessions.get(documentId);
    const locks = this.getDocumentLocks(documentId);
    
    return {
      activeUserCount: activeUsers ? activeUsers.size : 0,
      activeUsers: activeUsers ? Array.from(activeUsers).map(userId => {
        const userData = this.activeUsers.get(userId);
        return userData ? {
          userId,
          username: userData.username,
          status: userData.status,
          lastActivity: userData.lastActivity
        } : null;
      }).filter(Boolean) : [],
      locks
    };
  }
}

module.exports = CollaborationService;
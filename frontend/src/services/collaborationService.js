import io from 'socket.io-client';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

class CollaborationService {
  constructor() {
    this.socket = null;
    this.provider = null;
    this.doc = null;
    this.isConnected = false;
    this.callbacks = new Map();
    this.currentUser = null;
    this.activeUsers = new Map();
  }

  // Initialize collaboration for a document
  async connect(documentId, workspaceId, user, token) {
    try {
      // Disconnect existing connection
      if (this.socket) {
        this.disconnect();
      }

      this.currentUser = user;

      // Connect to WebSocket server
      this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: {
          token
        },
        transports: ['websocket']
      });

      // Set up event listeners
      this.setupEventListeners();

      // Join document room
      this.socket.emit('join-document', { documentId, workspaceId });

      // Initialize Y.js document for collaborative editing
      this.doc = new Y.Doc();
      
      // Set up WebSocket provider for Y.js (if using separate Y.js WebSocket)
      // this.provider = new WebsocketProvider('ws://localhost:1234', documentId, this.doc);
      
      this.isConnected = true;

      return {
        doc: this.doc,
        provider: this.provider,
        socket: this.socket
      };

    } catch (error) {
      console.error('Failed to connect to collaboration service:', error);
      throw error;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to collaboration service');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from collaboration service');
      this.isConnected = false;
      this.emit('disconnected');
    });

    // Document events
    this.socket.on('document-joined', (data) => {
      this.activeUsers.clear();
      data.activeUsers.forEach(user => {
        this.activeUsers.set(user.userId, user);
      });
      this.emit('document-joined', data);
    });

    this.socket.on('user-joined', (data) => {
      this.activeUsers.set(data.userId, data);
      this.emit('user-joined', data);
    });

    this.socket.on('user-left', (data) => {
      this.activeUsers.delete(data.userId);
      this.emit('user-left', data);
    });

    // Editing events
    this.socket.on('document-changed', (data) => {
      this.emit('document-changed', data);
    });

    this.socket.on('cursor-moved', (data) => {
      this.emit('cursor-moved', data);
    });

    this.socket.on('user-typing', (data) => {
      this.emit('user-typing', data);
    });

    this.socket.on('user-idle', (data) => {
      this.emit('user-idle', data);
    });

    // Lock events
    this.socket.on('section-locked', (data) => {
      this.emit('section-locked', data);
    });

    this.socket.on('section-unlocked', (data) => {
      this.emit('section-unlocked', data);
    });

    this.socket.on('lock-granted', (data) => {
      this.emit('lock-granted', data);
    });

    this.socket.on('lock-denied', (data) => {
      this.emit('lock-denied', data);
    });

    // Comment events
    this.socket.on('comment-added', (data) => {
      this.emit('comment-added', data);
    });

    this.socket.on('comment-replied', (data) => {
      this.emit('comment-replied', data);
    });

    this.socket.on('comment-resolved', (data) => {
      this.emit('comment-resolved', data);
    });

    this.socket.on('comment-reaction', (data) => {
      this.emit('comment-reaction', data);
    });

    // Notification events
    this.socket.on('mentioned', (data) => {
      this.emit('mentioned', data);
    });

    this.socket.on('review-requested', (data) => {
      this.emit('review-requested', data);
    });

    // Document save events
    this.socket.on('document-saved', (data) => {
      this.emit('document-saved', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Collaboration error:', error);
      this.emit('error', error);
    });
  }

  // Send cursor position
  moveCursor(position, selection) {
    if (this.socket && this.isConnected) {
      this.socket.emit('cursor-move', { position, selection });
    }
  }

  // Send typing indicator
  startTyping(section) {
    if (this.socket && this.isConnected) {
      this.socket.emit('user-typing', { section });
    }
  }

  // Send idle status
  setIdle() {
    if (this.socket && this.isConnected) {
      this.socket.emit('user-idle');
    }
  }

  // Send document changes
  sendChange(changes, version, section) {
    if (this.socket && this.isConnected) {
      this.socket.emit('document-change', { changes, version, section });
    }
  }

  // Request section lock
  requestLock(section, type = 'edit') {
    if (this.socket && this.isConnected) {
      this.socket.emit('request-lock', { section, type });
    }
  }

  // Release section lock
  releaseLock(section) {
    if (this.socket && this.isConnected) {
      this.socket.emit('release-lock', { section });
    }
  }

  // Save document
  saveDocument(content, title, metadata) {
    if (this.socket && this.isConnected) {
      this.socket.emit('save-document', { content, title, metadata });
    }
  }

  // Add comment
  addComment(commentData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('comment-add', commentData);
    }
  }

  // Reply to comment
  replyToComment(commentId, content) {
    if (this.socket && this.isConnected) {
      this.socket.emit('comment-reply', { commentId, content });
    }
  }

  // Resolve comment
  resolveComment(commentId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('comment-resolve', { commentId });
    }
  }

  // Add reaction to comment
  addCommentReaction(commentId, emoji, action = 'add') {
    if (this.socket && this.isConnected) {
      this.socket.emit('comment-reaction', { commentId, emoji, action });
    }
  }

  // Mention user
  mentionUser(username, commentId, content) {
    if (this.socket && this.isConnected) {
      this.socket.emit('mention-user', { username, commentId, content });
    }
  }

  // Request review
  requestReview(reviewers, message) {
    if (this.socket && this.isConnected) {
      this.socket.emit('request-review', { reviewers, message });
    }
  }

  // Event system
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event).add(callback);
  }

  off(event, callback) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Callback error:', error);
        }
      });
    }
  }

  // Get active users
  getActiveUsers() {
    return Array.from(this.activeUsers.values());
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      activeUserCount: this.activeUsers.size,
      currentUser: this.currentUser
    };
  }

  // Leave document
  leaveDocument() {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-document');
    }
  }

  // Disconnect from collaboration service
  disconnect() {
    try {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      if (this.provider) {
        this.provider.destroy();
        this.provider = null;
      }

      if (this.doc) {
        this.doc.destroy();
        this.doc = null;
      }

      this.isConnected = false;
      this.activeUsers.clear();
      this.callbacks.clear();
      this.currentUser = null;

    } catch (error) {
      console.error('Error disconnecting from collaboration service:', error);
    }
  }

  // Utility method to generate user color
  static generateUserColor(userId) {
    const colors = [
      '#f783ac', '#a855f7', '#3b82f6', '#10b981',
      '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
      '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    
    // Generate consistent color based on user ID
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }
}

// Export singleton instance
export default new CollaborationService();
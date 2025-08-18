const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      'document_view', 'document_edit', 'document_create', 'document_delete',
      'search_query', 'bookmark_create', 'bookmark_remove',
      'comment_create', 'comment_resolve', 'comment_reply',
      'workspace_join', 'workspace_leave', 'workspace_create',
      'user_login', 'user_logout', 'export_pdf', 'export_word',
      'collaboration_start', 'collaboration_end', 'template_use',
      'ai_suggestion_accept', 'ai_suggestion_reject'
    ],
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    index: true
  },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  duration: {
    type: Number, // Duration in milliseconds
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: String,
  userAgent: String,
  referrer: String
}, {
  timestamps: false // Using custom timestamp field
});

// Document Usage Analytics Schema
const DocumentAnalyticsSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    unique: true,
    index: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  metrics: {
    totalViews: {
      type: Number,
      default: 0
    },
    uniqueViewers: {
      type: Number,
      default: 0
    },
    totalEdits: {
      type: Number,
      default: 0
    },
    totalComments: {
      type: Number,
      default: 0
    },
    totalBookmarks: {
      type: Number,
      default: 0
    },
    avgReadTime: {
      type: Number,
      default: 0
    },
    avgEditTime: {
      type: Number,
      default: 0
    },
    searchAppearances: {
      type: Number,
      default: 0
    },
    searchClicks: {
      type: Number,
      default: 0
    },
    collaboratorCount: {
      type: Number,
      default: 0
    }
  },
  dailyStats: [{
    date: {
      type: Date,
      required: true
    },
    views: { type: Number, default: 0 },
    edits: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    avgEngagementTime: { type: Number, default: 0 }
  }],
  topViewers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewCount: Number,
    lastViewed: Date,
    totalTime: Number
  }],
  popularSearchTerms: [{
    term: String,
    count: Number,
    clickRate: Number
  }],
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// User Analytics Schema
const UserAnalyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  metrics: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalSessionTime: {
      type: Number,
      default: 0
    },
    avgSessionDuration: {
      type: Number,
      default: 0
    },
    documentsViewed: {
      type: Number,
      default: 0
    },
    documentsEdited: {
      type: Number,
      default: 0
    },
    documentsCreated: {
      type: Number,
      default: 0
    },
    commentsPosted: {
      type: Number,
      default: 0
    },
    searchesPerformed: {
      type: Number,
      default: 0
    },
    bookmarksCreated: {
      type: Number,
      default: 0
    },
    collaborationTime: {
      type: Number,
      default: 0
    }
  },
  activityPattern: {
    mostActiveHour: Number,
    mostActiveDay: String,
    peakActivityTime: String
  },
  preferredContent: {
    topCategories: [String],
    frequentSearchTerms: [String],
    favoriteWorkspaces: [String]
  },
  productivityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Workspace Analytics Schema
const WorkspaceAnalyticsSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    unique: true,
    index: true
  },
  metrics: {
    totalDocuments: {
      type: Number,
      default: 0
    },
    activeDocuments: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    totalEdits: {
      type: Number,
      default: 0
    },
    totalComments: {
      type: Number,
      default: 0
    },
    activeUsers: {
      type: Number,
      default: 0
    },
    avgDocumentEngagement: {
      type: Number,
      default: 0
    },
    collaborationEvents: {
      type: Number,
      default: 0
    },
    knowledgeGrowthRate: {
      type: Number,
      default: 0
    }
  },
  trends: {
    documentCreationTrend: String, // 'increasing', 'decreasing', 'stable'
    userEngagementTrend: String,
    collaborationTrend: String
  },
  topContributors: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    contributions: Number,
    type: String // 'creator', 'editor', 'commenter'
  }],
  contentHealth: {
    outdatedDocuments: Number,
    uncommentedDocuments: Number,
    lowEngagementDocuments: Number,
    highPerformingDocuments: Number
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
AnalyticsEventSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ user: 1, timestamp: -1 });
AnalyticsEventSchema.index({ workspace: 1, eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ document: 1, eventType: 1, timestamp: -1 });

DocumentAnalyticsSchema.index({ workspace: 1, 'metrics.totalViews': -1 });
DocumentAnalyticsSchema.index({ 'dailyStats.date': 1 });

UserAnalyticsSchema.index({ 'metrics.totalSessions': -1 });
UserAnalyticsSchema.index({ productivityScore: -1 });

WorkspaceAnalyticsSchema.index({ 'metrics.activeUsers': -1 });
WorkspaceAnalyticsSchema.index({ 'metrics.totalDocuments': -1 });

// Static methods for AnalyticsEvent
AnalyticsEventSchema.statics.logEvent = function(eventData) {
  return this.create(eventData);
};

AnalyticsEventSchema.statics.getEventsByUser = function(userId, limit = 100) {
  return this.find({ user: userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

AnalyticsEventSchema.statics.getEventsByDocument = function(documentId, limit = 100) {
  return this.find({ document: documentId })
    .populate('user', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit);
};

AnalyticsEventSchema.statics.getWorkspaceActivity = function(workspaceId, timeRange = '7d') {
  const startDate = new Date();
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        workspace: mongoose.Types.ObjectId(workspaceId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          eventType: '$eventType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
};

// Static methods for DocumentAnalytics
DocumentAnalyticsSchema.statics.updateDocumentMetrics = async function(documentId, eventType, metadata = {}) {
  const doc = await this.findOneAndUpdate(
    { document: documentId },
    {},
    { upsert: true, new: true }
  );

  const today = new Date().toISOString().split('T')[0];
  const todayIndex = doc.dailyStats.findIndex(stat => 
    stat.date.toISOString().split('T')[0] === today
  );

  switch (eventType) {
    case 'document_view':
      doc.metrics.totalViews += 1;
      if (todayIndex >= 0) {
        doc.dailyStats[todayIndex].views += 1;
      } else {
        doc.dailyStats.push({ date: new Date(), views: 1 });
      }
      break;
    case 'document_edit':
      doc.metrics.totalEdits += 1;
      if (todayIndex >= 0) {
        doc.dailyStats[todayIndex].edits += 1;
      } else {
        doc.dailyStats.push({ date: new Date(), edits: 1 });
      }
      break;
    case 'comment_create':
      doc.metrics.totalComments += 1;
      if (todayIndex >= 0) {
        doc.dailyStats[todayIndex].comments += 1;
      } else {
        doc.dailyStats.push({ date: new Date(), comments: 1 });
      }
      break;
  }

  return doc.save();
};

DocumentAnalyticsSchema.statics.getTopDocuments = function(workspaceId, metric = 'totalViews', limit = 10) {
  return this.find({ workspace: workspaceId })
    .populate('document', 'originalName')
    .sort({ [`metrics.${metric}`]: -1 })
    .limit(limit);
};

// Static methods for UserAnalytics
UserAnalyticsSchema.statics.calculateProductivityScore = async function(userId) {
  const events = await mongoose.model('AnalyticsEvent').find({ 
    user: userId,
    timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });

  let score = 0;
  const weights = {
    document_create: 10,
    document_edit: 5,
    comment_create: 3,
    search_query: 1,
    document_view: 1
  };

  events.forEach(event => {
    score += weights[event.eventType] || 0;
  });

  // Normalize to 0-100 scale
  score = Math.min(100, Math.max(0, score / 10));

  return this.findOneAndUpdate(
    { user: userId },
    { productivityScore: score, lastCalculated: new Date() },
    { upsert: true, new: true }
  );
};

// Create models
const AnalyticsEvent = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);
const DocumentAnalytics = mongoose.model('DocumentAnalytics', DocumentAnalyticsSchema);
const UserAnalytics = mongoose.model('UserAnalytics', UserAnalyticsSchema);
const WorkspaceAnalytics = mongoose.model('WorkspaceAnalytics', WorkspaceAnalyticsSchema);

module.exports = {
  AnalyticsEvent,
  DocumentAnalytics,
  UserAnalytics,
  WorkspaceAnalytics
};
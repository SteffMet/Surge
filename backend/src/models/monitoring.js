/**
 * MongoDB Models for Logging and Monitoring
 */

const mongoose = require('mongoose');

// Log Schema for storing frontend and backend logs
const logSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  serverTimestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  level: {
    type: String,
    required: true,
    enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'],
    index: true
  },
  message: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    index: true
  },
  url: String,
  userAgent: String,
  action: {
    type: String,
    index: true
  },
  category: {
    type: String,
    enum: [
      'authentication',
      'authorization', 
      'network',
      'validation',
      'search',
      'document',
      'workspace',
      'template',
      'api',
      'ui',
      'system'
    ],
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  stack: String,
  ip: String,
  requestId: String
}, {
  timestamps: true
});

// Create TTL index to automatically delete old logs (keep for 30 days)
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Metric Schema for storing performance and usage metrics
const metricSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  serverTimestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    index: true
  },
  metrics: {
    sessionDuration: Number,
    pageLoads: [{
      page: String,
      loadTime: Number,
      timestamp: Date
    }],
    apiCalls: [{
      endpoint: String,
      method: String,
      duration: Number,
      status: Number,
      error: String,
      timestamp: Date
    }],
    searchQueries: [{
      query: String,
      resultsCount: Number,
      duration: Number,
      searchMode: String,
      timestamp: Date
    }],
    errors: {
      total: Number,
      categories: {
        type: Map,
        of: Number
      },
      mostRecent: [mongoose.Schema.Types.Mixed]
    }
  },
  ip: String
}, {
  timestamps: true
});

// Create TTL index to automatically delete old metrics (keep for 90 days)
metricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Error tracking schema for aggregated error analysis
const errorTrackingSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  hour: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  level: {
    type: String,
    required: true,
    enum: ['WARN', 'ERROR', 'CRITICAL']
  },
  count: {
    type: Number,
    default: 1
  },
  samples: [{
    message: String,
    userId: mongoose.Schema.Types.ObjectId,
    workspaceId: mongoose.Schema.Types.ObjectId,
    timestamp: Date,
    data: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Compound index for efficient querying
errorTrackingSchema.index({ date: 1, hour: 1, category: 1, level: 1 }, { unique: true });

// Create TTL index (keep for 180 days)
errorTrackingSchema.index({ date: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

// Performance tracking schema for API endpoint analysis
const performanceTrackingSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  hour: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  },
  endpoint: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  stats: {
    count: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    avgDuration: { type: Number, default: 0 },
    minDuration: { type: Number, default: Number.MAX_VALUE },
    maxDuration: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
performanceTrackingSchema.index({ date: 1, hour: 1, endpoint: 1, method: 1 }, { unique: true });

// Create TTL index (keep for 180 days)
performanceTrackingSchema.index({ date: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

// User activity tracking schema
const userActivitySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    index: true
  },
  actions: {
    type: Map,
    of: Number,
    default: new Map()
  },
  sessionDuration: {
    type: Number,
    default: 0
  },
  pageViews: {
    type: Number,
    default: 0
  },
  searchQueries: {
    type: Number,
    default: 0
  },
  documentsCreated: {
    type: Number,
    default: 0
  },
  documentsEdited: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
userActivitySchema.index({ date: 1, userId: 1 }, { unique: true });

// Create TTL index (keep for 365 days)
userActivitySchema.index({ date: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Add static methods for common operations
logSchema.statics.getRecentErrors = function(minutes = 5) {
  return this.find({
    timestamp: { $gte: new Date(Date.now() - minutes * 60 * 1000) },
    level: { $in: ['ERROR', 'CRITICAL'] }
  }).sort({ timestamp: -1 });
};

logSchema.statics.getErrorsByCategory = function(start, end) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: start, $lte: end },
        level: { $in: ['ERROR', 'CRITICAL'] },
        category: { $exists: true }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

metricSchema.statics.getPerformanceStats = function(start, end) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: start, $lte: end }
      }
    },
    { $unwind: '$metrics.apiCalls' },
    {
      $group: {
        _id: '$metrics.apiCalls.endpoint',
        avgDuration: { $avg: '$metrics.apiCalls.duration' },
        maxDuration: { $max: '$metrics.apiCalls.duration' },
        minDuration: { $min: '$metrics.apiCalls.duration' },
        count: { $sum: 1 },
        errorCount: {
          $sum: {
            $cond: [{ $gte: ['$metrics.apiCalls.status', 400] }, 1, 0]
          }
        }
      }
    },
    { $sort: { avgDuration: -1 } }
  ]);
};

const Log = mongoose.model('Log', logSchema);
const Metric = mongoose.model('Metric', metricSchema);
const ErrorTracking = mongoose.model('ErrorTracking', errorTrackingSchema);
const PerformanceTracking = mongoose.model('PerformanceTracking', performanceTrackingSchema);
const UserActivity = mongoose.model('UserActivity', userActivitySchema);

module.exports = {
  Log,
  Metric,
  ErrorTracking,
  PerformanceTracking,
  UserActivity
};

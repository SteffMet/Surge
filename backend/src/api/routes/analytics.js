const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { checkWorkspaceAccess, checkDocumentAccess } = require('../../middleware/workspaceAuth');
const { 
  AnalyticsEvent, 
  DocumentAnalytics, 
  UserAnalytics, 
  WorkspaceAnalytics 
} = require('../../models/Analytics');
const User = require('../../models/User');
const Document = require('../../models/Document');
const Workspace = require('../../models/Workspace');

// Log analytics event
router.post('/event', auth, async (req, res) => {
  try {
    const {
      eventType,
      workspace,
      document,
      metadata = {},
      duration
    } = req.body;

    const eventData = {
      eventType,
      user: req.user.userId,
      workspace,
      document,
      metadata,
      duration,
      sessionId: req.sessionID || req.headers['session-id'],
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referrer')
    };

    await AnalyticsEvent.logEvent(eventData);

    // Update real-time analytics if needed
    if (document && ['document_view', 'document_edit', 'comment_create'].includes(eventType)) {
      await DocumentAnalytics.updateDocumentMetrics(document, eventType, metadata);
    }

    res.status(201).json({ message: 'Event logged successfully' });

  } catch (error) {
    console.error('Error logging analytics event:', error);
    res.status(500).json({ message: 'Failed to log analytics event' });
  }
});

// Get user activity dashboard
router.get('/user/dashboard/:userId?', auth, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;

    // Only allow users to view their own analytics unless admin
    if (userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const timeRange = req.query.range || '7d';
    const startDate = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    startDate.setDate(startDate.getDate() - days);

    // Get recent activity
    const recentActivity = await AnalyticsEvent.getEventsByUser(userId, 50);

    // Get user analytics summary
    const userAnalytics = await UserAnalytics.findOne({ user: userId }) || {
      metrics: {
        totalSessions: 0,
        documentsViewed: 0,
        documentsEdited: 0,
        commentsPosted: 0,
        searchesPerformed: 0
      },
      productivityScore: 0
    };

    // Get activity by event type
    const activityStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get daily activity pattern
    const dailyActivity = await AnalyticsEvent.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            hour: { $hour: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1, '_id.hour': 1 }
      }
    ]);

    res.json({
      user: { _id: userId },
      timeRange,
      summary: userAnalytics.metrics,
      productivityScore: userAnalytics.productivityScore,
      recentActivity: recentActivity.slice(0, 20),
      activityStats,
      dailyActivity
    });

  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ message: 'Failed to fetch user analytics' });
  }
});

// Get document analytics
router.get('/document/:documentId', [auth, checkDocumentAccess], async (req, res) => {
  try {
    const { documentId } = req.params;
    const timeRange = req.query.range || '30d';

    // Verify document exists and user has access
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Get document analytics
    const docAnalytics = await DocumentAnalytics.findOne({ document: documentId }) || {
      metrics: {
        totalViews: 0,
        uniqueViewers: 0,
        totalEdits: 0,
        totalComments: 0,
        avgReadTime: 0
      },
      dailyStats: [],
      topViewers: [],
      popularSearchTerms: []
    };

    // Get recent activity
    const recentActivity = await AnalyticsEvent.getEventsByDocument(documentId, 50);

    // Get viewer statistics
    const viewerStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          document: require('mongoose').Types.ObjectId(documentId),
          eventType: 'document_view'
        }
      },
      {
        $group: {
          _id: '$user',
          viewCount: { $sum: 1 },
          lastViewed: { $max: '$timestamp' },
          totalTime: { $sum: '$duration' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $sort: { viewCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      document: {
        _id: documentId,
        name: document.originalName
      },
      metrics: docAnalytics.metrics,
      dailyStats: docAnalytics.dailyStats.slice(-30), // Last 30 days
      topViewers: viewerStats,
      popularSearchTerms: docAnalytics.popularSearchTerms,
      recentActivity: recentActivity.slice(0, 20)
    });

  } catch (error) {
    console.error('Error fetching document analytics:', error);
    res.status(500).json({ message: 'Failed to fetch document analytics' });
  }
});

// Get workspace analytics
router.get('/workspace/:workspaceId', [auth, checkWorkspaceAccess], async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const timeRange = req.query.range || '30d';

    // Check if user has admin access to workspace
    if (!req.workspace.canUserPerformAction(req.user.userId, 'manage_collaborators')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Get workspace analytics
    const workspaceAnalytics = await WorkspaceAnalytics.findOne({ workspace: workspaceId }) || {
      metrics: {
        totalDocuments: 0,
        activeDocuments: 0,
        totalViews: 0,
        totalEdits: 0,
        activeUsers: 0,
        collaborationEvents: 0
      },
      topContributors: [],
      contentHealth: {}
    };

    // Get recent workspace activity
    const recentActivity = await AnalyticsEvent.getWorkspaceActivity(workspaceId, timeRange);

    // Get user engagement stats
    const userEngagement = await AnalyticsEvent.aggregate([
      {
        $match: {
          workspace: require('mongoose').Types.ObjectId(workspaceId),
          timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$user',
          totalEvents: { $sum: 1 },
          eventTypes: { $addToSet: '$eventType' },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $sort: { totalEvents: -1 }
      }
    ]);

    // Get document performance
    const documentPerformance = await DocumentAnalytics.find({ workspace: workspaceId })
      .populate('document', 'originalName')
      .sort({ 'metrics.totalViews': -1 })
      .limit(20);

    res.json({
      workspace: {
        _id: workspaceId,
        name: req.workspace.name
      },
      metrics: workspaceAnalytics.metrics,
      trends: workspaceAnalytics.trends,
      topContributors: workspaceAnalytics.topContributors,
      contentHealth: workspaceAnalytics.contentHealth,
      userEngagement,
      documentPerformance,
      activityTimeline: recentActivity
    });

  } catch (error) {
    console.error('Error fetching workspace analytics:', error);
    res.status(500).json({ message: 'Failed to fetch workspace analytics' });
  }
});

// Get system-wide analytics (admin only)
router.get('/system/overview', auth, async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const timeRange = req.query.range || '30d';
    const startDate = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    startDate.setDate(startDate.getDate() - days);

    // Get system overview stats
    const totalUsers = await User.countDocuments({ active: true });
    const totalDocuments = await Document.countDocuments();
    const totalWorkspaces = await Workspace.countDocuments({ isActive: true });

    // Get activity overview
    const activityOverview = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get daily activity
    const dailyActivity = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          events: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      },
      {
        $project: {
          uniqueUsers: 0
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get top users by activity
    const topUsers = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$user',
          totalEvents: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $sort: { totalEvents: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get workspace activity
    const workspaceActivity = await AnalyticsEvent.aggregate([
      {
        $match: {
          workspace: { $ne: null },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$workspace',
          totalEvents: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      },
      {
        $lookup: {
          from: 'workspaces',
          localField: '_id',
          foreignField: '_id',
          as: 'workspace'
        }
      },
      {
        $unwind: '$workspace'
      },
      {
        $sort: { totalEvents: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      overview: {
        totalUsers,
        totalDocuments,
        totalWorkspaces,
        timeRange
      },
      activityOverview,
      dailyActivity,
      topUsers,
      topWorkspaces: workspaceActivity
    });

  } catch (error) {
    console.error('Error fetching system analytics:', error);
    res.status(500).json({ message: 'Failed to fetch system analytics' });
  }
});

// Calculate user productivity scores
router.post('/calculate/productivity', auth, async (req, res) => {
  try {
    // Check admin permissions or allow users to calculate their own score
    const { userId } = req.body;
    if (userId && userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const targetUserId = userId || req.user.userId;
    const result = await UserAnalytics.calculateProductivityScore(targetUserId);

    res.json({
      userId: targetUserId,
      productivityScore: result.productivityScore,
      lastCalculated: result.lastCalculated
    });

  } catch (error) {
    console.error('Error calculating productivity score:', error);
    res.status(500).json({ message: 'Failed to calculate productivity score' });
  }
});

// Get search analytics
router.get('/search/insights', auth, async (req, res) => {
  try {
    const timeRange = req.query.range || '30d';
    const startDate = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    startDate.setDate(startDate.getDate() - days);

    // Get search query analytics
    const searchAnalytics = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'search_query',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$metadata.query',
          count: { $sum: 1 },
          avgResultsReturned: { $avg: '$metadata.resultsCount' },
          clickThroughRate: { 
            $avg: { 
              $cond: [
                { $gt: ['$metadata.clickedResults', 0] }, 
                { $divide: ['$metadata.clickedResults', '$metadata.resultsCount'] }, 
                0
              ]
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 50
      }
    ]);

    // Get search trends
    const searchTrends = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'search_query',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          searchCount: { $sum: 1 },
          uniqueSearchers: { $addToSet: '$user' }
        }
      },
      {
        $addFields: {
          uniqueSearcherCount: { $size: '$uniqueSearchers' }
        }
      },
      {
        $project: {
          uniqueSearchers: 0
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      timeRange,
      popularQueries: searchAnalytics,
      searchTrends,
      summary: {
        totalSearches: searchAnalytics.reduce((sum, item) => sum + item.count, 0),
        uniqueQueries: searchAnalytics.length,
        avgClickThroughRate: searchAnalytics.reduce((sum, item) => sum + (item.clickThroughRate || 0), 0) / searchAnalytics.length
      }
    });

  } catch (error) {
    console.error('Error fetching search analytics:', error);
    res.status(500).json({ message: 'Failed to fetch search analytics' });
  }
});

// Export analytics data
router.get('/export/:type', auth, async (req, res) => {
  try {
    const { type } = req.params; // 'user', 'workspace', 'document', 'system'
    const { format = 'json', startDate, endDate } = req.query;

    // Check permissions
    if (type === 'system' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required for system exports' });
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let data = [];
    const matchFilter = Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {};

    switch (type) {
      case 'user':
        matchFilter.user = require('mongoose').Types.ObjectId(req.user.userId);
        data = await AnalyticsEvent.find(matchFilter).lean();
        break;
      case 'workspace':
        if (!req.query.workspaceId) {
          return res.status(400).json({ message: 'Workspace ID required' });
        }
        matchFilter.workspace = require('mongoose').Types.ObjectId(req.query.workspaceId);
        data = await AnalyticsEvent.find(matchFilter).lean();
        break;
      case 'system':
        data = await AnalyticsEvent.find(matchFilter).lean();
        break;
      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = data.map(event => ({
        timestamp: event.timestamp,
        eventType: event.eventType,
        userId: event.user,
        workspaceId: event.workspace,
        documentId: event.document,
        duration: event.duration,
        metadata: JSON.stringify(event.metadata)
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${type}-${Date.now()}.csv`);
      
      // Simple CSV conversion (you might want to use a proper CSV library)
      const headers = Object.keys(csv[0] || {}).join(',');
      const rows = csv.map(row => Object.values(row).map(val => `"${val}"`).join(','));
      res.send([headers, ...rows].join('\n'));
    } else {
      res.json(data);
    }

  } catch (error) {
    console.error('Error exporting analytics data:', error);
    res.status(500).json({ message: 'Failed to export analytics data' });
  }
});

// Get comprehensive dashboard data
router.get('/dashboard/:workspaceId', [auth, checkWorkspaceAccess], async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { timeRange = '30', startDate, endDate } = req.query;

    // Check workspace access
    const hasAccess = req.user.workspaces?.some(ws =>
      ws.workspaceId.toString() === workspaceId
    );

    if (!hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied to workspace' });
    }

    // Calculate date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get overview metrics
    const [totalViews, totalEdits, totalSearches, activeUsers, totalDocuments] = await Promise.all([
      AnalyticsEvent.countDocuments({
        workspace: workspaceId,
        eventType: 'document_view',
        timestamp: { $gte: start, $lte: end }
      }),
      AnalyticsEvent.countDocuments({
        workspace: workspaceId,
        eventType: 'document_edit',
        timestamp: { $gte: start, $lte: end }
      }),
      AnalyticsEvent.countDocuments({
        workspace: workspaceId,
        eventType: 'search_query',
        timestamp: { $gte: start, $lte: end }
      }),
      AnalyticsEvent.distinct('user', {
        workspace: workspaceId,
        timestamp: { $gte: start, $lte: end }
      }).then(users => users.length),
      Document.countDocuments({ workspaceId })
    ]);

    // Get activity timeline
    const activityTimeline = await AnalyticsEvent.aggregate([
      {
        $match: {
          workspace: require('mongoose').Types.ObjectId(workspaceId),
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          views: { $sum: { $cond: [{ $eq: ['$eventType', 'document_view'] }, 1, 0] } },
          edits: { $sum: { $cond: [{ $eq: ['$eventType', 'document_edit'] }, 1, 0] } },
          searches: { $sum: { $cond: [{ $eq: ['$eventType', 'search_query'] }, 1, 0] } }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: '$_id',
          views: 1,
          edits: 1,
          searches: 1,
          _id: 0
        }
      }
    ]);

    // Get activity distribution
    const activityDistribution = await AnalyticsEvent.aggregate([
      {
        $match: {
          workspace: require('mongoose').Types.ObjectId(workspaceId),
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$eventType',
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          name: '$_id',
          value: 1,
          _id: 0
        }
      }
    ]);

    // Get top documents
    const topDocuments = await AnalyticsEvent.aggregate([
      {
        $match: {
          workspace: require('mongoose').Types.ObjectId(workspaceId),
          document: { $ne: null },
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$document',
          views: { $sum: { $cond: [{ $eq: ['$eventType', 'document_view'] }, 1, 0] } },
          edits: { $sum: { $cond: [{ $eq: ['$eventType', 'document_edit'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'documents',
          localField: '_id',
          foreignField: '_id',
          as: 'doc'
        }
      },
      {
        $unwind: '$doc'
      },
      {
        $project: {
          title: '$doc.title',
          views: 1,
          edits: 1
        }
      },
      {
        $sort: { views: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get user activity patterns
    const userActivity = await AnalyticsEvent.aggregate([
      {
        $match: {
          workspace: require('mongoose').Types.ObjectId(workspaceId),
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          active_users: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          hour: '$_id',
          active_users: { $size: '$active_users' }
        }
      },
      {
        $sort: { hour: 1 }
      }
    ]);

    // Get top users
    const topUsers = await AnalyticsEvent.aggregate([
      {
        $match: {
          workspace: require('mongoose').Types.ObjectId(workspaceId),
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$user',
          actions: { $sum: 1 },
          score: { $sum: 1 } // Simple scoring, could be more complex
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          id: '$_id',
          username: '$user.username',
          actions: 1,
          score: 1
        }
      },
      {
        $sort: { actions: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get search trends
    const searchTrends = await AnalyticsEvent.aggregate([
      {
        $match: {
          workspace: require('mongoose').Types.ObjectId(workspaceId),
          eventType: 'search_query',
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          searches: { $sum: 1 },
          unique_queries: { $addToSet: '$metadata.query' }
        }
      },
      {
        $project: {
          date: '$_id',
          searches: 1,
          unique_queries: { $size: '$unique_queries' }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Get popular searches
    const popularSearches = await AnalyticsEvent.aggregate([
      {
        $match: {
          workspace: require('mongoose').Types.ObjectId(workspaceId),
          eventType: 'search_query',
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$metadata.query',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          query: '$_id',
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get content insights (placeholder - would be more complex in reality)
    const contentInsights = [
      { category: 'Technical Docs', engagement_score: 85, quality_score: 90 },
      { category: 'User Guides', engagement_score: 70, quality_score: 80 },
      { category: 'API Docs', engagement_score: 95, quality_score: 85 },
      { category: 'Tutorials', engagement_score: 60, quality_score: 75 }
    ];

    // Calculate growth rates (simplified)
    const previousPeriodStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    const [prevViews, prevUsers, prevDocs, prevSearches] = await Promise.all([
      AnalyticsEvent.countDocuments({
        workspace: workspaceId,
        eventType: 'document_view',
        timestamp: { $gte: previousPeriodStart, $lt: start }
      }),
      AnalyticsEvent.distinct('user', {
        workspace: workspaceId,
        timestamp: { $gte: previousPeriodStart, $lt: start }
      }).then(users => users.length),
      Document.countDocuments({
        workspaceId,
        createdAt: { $gte: previousPeriodStart, $lt: start }
      }),
      AnalyticsEvent.countDocuments({
        workspace: workspaceId,
        eventType: 'search_query',
        timestamp: { $gte: previousPeriodStart, $lt: start }
      })
    ]);

    const calculateGrowth = (current, previous) =>
      previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

    const dashboardData = {
      overview: {
        totalViews,
        totalDocuments,
        activeUsers,
        totalSearches,
        viewsGrowth: calculateGrowth(totalViews, prevViews),
        usersGrowth: calculateGrowth(activeUsers, prevUsers),
        documentsGrowth: calculateGrowth(totalDocuments, prevDocs),
        searchesGrowth: calculateGrowth(totalSearches, prevSearches)
      },
      activityTimeline,
      activityDistribution,
      topDocuments,
      userActivity,
      topUsers,
      searchTrends,
      popularSearches,
      contentInsights,
      documentStats: {
        avgViews: totalViews / Math.max(totalDocuments, 1),
        peakHour: userActivity.length > 0 ?
          userActivity.reduce((max, curr) => curr.active_users > max.active_users ? curr : max).hour : 0,
        created: await Document.countDocuments({
          workspaceId,
          createdAt: { $gte: start, $lte: end }
        }),
        updated: await Document.countDocuments({
          workspaceId,
          updatedAt: { $gte: start, $lte: end }
        })
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
});

// Bulk analytics events endpoint
router.post('/events/bulk', auth, async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Events array is required'
      });
    }

    // Process events
    const processedEvents = events.map(event => ({
      ...event,
      user: req.user.id,
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      sessionId: req.sessionID || req.headers['session-id'],
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }));

    await AnalyticsEvent.insertMany(processedEvents);

    res.json({
      success: true,
      message: `${events.length} events logged successfully`
    });

  } catch (error) {
    console.error('Error logging bulk events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log events'
    });
  }
});

module.exports = router;
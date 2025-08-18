/**
 * Backend Logging and Monitoring Routes
 * Provides API endpoints for receiving frontend logs and serving monitoring data
 */

const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const Metric = require('../models/Metric');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Store logs from frontend
router.post('/logs', requireAuth, async (req, res) => {
  try {
    const logEntry = req.body;
    
    // Add server-side information
    logEntry.serverTimestamp = new Date();
    logEntry.ip = req.ip;
    logEntry.requestId = req.requestId; // Assuming request ID middleware
    
    // Create log document
    const log = new Log(logEntry);
    await log.save();
    
    // For critical errors, send immediate notifications
    if (logEntry.level === 'CRITICAL') {
      // TODO: Implement notification system (email, Slack, etc.)
      console.error('CRITICAL ERROR:', logEntry.message, logEntry.data);
    }
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving log:', error);
    res.status(500).json({ error: 'Failed to save log' });
  }
});

// Store metrics from frontend
router.post('/metrics', requireAuth, async (req, res) => {
  try {
    const metricsData = req.body;
    
    // Add server-side information
    metricsData.serverTimestamp = new Date();
    metricsData.ip = req.ip;
    
    // Create metrics document
    const metric = new Metric(metricsData);
    await metric.save();
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving metrics:', error);
    res.status(500).json({ error: 'Failed to save metrics' });
  }
});

// Admin routes for monitoring dashboard
router.get('/admin/logs', requireAdmin, async (req, res) => {
  try {
    const {
      start = new Date(Date.now() - 24 * 60 * 60 * 1000),
      end = new Date(),
      level = 'ALL',
      category = 'ALL',
      page = 1,
      limit = 100
    } = req.query;

    // Build query
    const query = {
      timestamp: {
        $gte: new Date(start),
        $lte: new Date(end)
      }
    };

    if (level !== 'ALL') {
      query.level = level;
    }

    if (category !== 'ALL') {
      query.category = category;
    }

    // Execute query with pagination
    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Log.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Download logs as JSON
router.get('/admin/logs/download', requireAdmin, async (req, res) => {
  try {
    const {
      start = new Date(Date.now() - 24 * 60 * 60 * 1000),
      end = new Date(),
      level = 'ALL',
      category = 'ALL'
    } = req.query;

    // Build query
    const query = {
      timestamp: {
        $gte: new Date(start),
        $lte: new Date(end)
      }
    };

    if (level !== 'ALL') {
      query.level = level;
    }

    if (category !== 'ALL') {
      query.category = category;
    }

    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .limit(10000) // Limit to prevent huge downloads
      .exec();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=surge-logs-${start.split('T')[0]}-${end.split('T')[0]}.json`);
    res.json(logs);
  } catch (error) {
    console.error('Error downloading logs:', error);
    res.status(500).json({ error: 'Failed to download logs' });
  }
});

// Get aggregated metrics
router.get('/admin/metrics', requireAdmin, async (req, res) => {
  try {
    const {
      start = new Date(Date.now() - 24 * 60 * 60 * 1000),
      end = new Date()
    } = req.query;

    // Aggregate metrics from the database
    const metrics = await Metric.aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date(start),
            $lte: new Date(end)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          avgSessionDuration: { $avg: '$metrics.sessionDuration' },
          totalPageLoads: { $sum: { $size: '$metrics.pageLoads' } },
          totalApiCalls: { $sum: { $size: '$metrics.apiCalls' } },
          totalSearchQueries: { $sum: { $size: '$metrics.searchQueries' } },
          totalErrors: { $sum: '$metrics.errors.total' },
          sessions: { $push: '$$ROOT' }
        }
      }
    ]);

    // Get error trends
    const errorTrends = await Log.aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date(start),
            $lte: new Date(end)
          },
          level: { $in: ['ERROR', 'CRITICAL'] }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            category: '$category'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.hour',
          categories: {
            $push: {
              category: '$_id.category',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get performance trends
    const performanceTrends = await Metric.aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date(start),
            $lte: new Date(end)
          }
        }
      },
      { $unwind: '$metrics.apiCalls' },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            endpoint: '$metrics.apiCalls.endpoint'
          },
          avgDuration: { $avg: '$metrics.apiCalls.duration' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.hour',
          endpoints: {
            $push: {
              endpoint: '$_id.endpoint',
              avgDuration: '$avgDuration',
              count: '$count'
            }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get user activity patterns
    const userActivity = await Log.aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date(start),
            $lte: new Date(end)
          },
          action: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          users: { $addToSet: '$userId' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      summary: metrics[0] || {
        totalSessions: 0,
        avgSessionDuration: 0,
        totalPageLoads: 0,
        totalApiCalls: 0,
        totalSearchQueries: 0,
        totalErrors: 0
      },
      errorTrends,
      performanceTrends,
      userActivity
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get system health status
router.get('/admin/health', requireAdmin, async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await checkDatabaseHealth();
    
    // Check recent error rates
    const recentErrors = await Log.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
      level: { $in: ['ERROR', 'CRITICAL'] }
    });

    // Check API performance
    const recentApiMetrics = await Metric.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
        }
      },
      { $unwind: '$metrics.apiCalls' },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$metrics.apiCalls.duration' },
          count: { $sum: 1 }
        }
      }
    ]);

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      database: dbStatus,
      errors: {
        recent: recentErrors,
        threshold: 10, // Alert if more than 10 errors in 5 minutes
        status: recentErrors > 10 ? 'warning' : 'ok'
      },
      performance: {
        avgApiDuration: recentApiMetrics[0]?.avgDuration || 0,
        apiCallCount: recentApiMetrics[0]?.count || 0,
        threshold: 1000, // Alert if avg > 1000ms
        status: (recentApiMetrics[0]?.avgDuration || 0) > 1000 ? 'warning' : 'ok'
      }
    };

    // Determine overall status
    if (health.errors.status === 'warning' || health.performance.status === 'warning') {
      health.status = 'warning';
    }

    res.json(health);
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date(),
      error: 'Health check failed'
    });
  }
});

// Helper function to check database health
async function checkDatabaseHealth() {
  try {
    const mongoose = require('mongoose');
    const readyState = mongoose.connection.readyState;
    
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      status: states[readyState],
      state: readyState
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

module.exports = router;

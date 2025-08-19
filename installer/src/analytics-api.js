const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Simple file-based analytics storage
const ANALYTICS_DIR = path.join(__dirname, '../analytics-data');
const EVENTS_FILE = path.join(ANALYTICS_DIR, 'events.jsonl');
const SUMMARY_FILE = path.join(ANALYTICS_DIR, 'daily-summary.json');

// Ensure analytics directory exists
const ensureAnalyticsDir = async () => {
  try {
    await fs.mkdir(ANALYTICS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create analytics directory:', error);
  }
};

// Track analytics event
router.post('/track', async (req, res) => {
  try {
    await ensureAnalyticsDir();
    
    const event = {
      ...req.body,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      headers: {
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
        acceptLanguage: req.headers['accept-language']
      }
    };

    // Append to events file (JSONL format)
    const eventLine = JSON.stringify(event) + '\n';
    await fs.appendFile(EVENTS_FILE, eventLine);

    // Update daily summary
    await updateDailySummary(event);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get analytics dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const summary = await getDashboardData();
    res.json(summary);
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Update daily summary
const updateDailySummary = async (event) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let summary = {};
    
    try {
      const summaryData = await fs.readFile(SUMMARY_FILE, 'utf8');
      summary = JSON.parse(summaryData);
    } catch {
      // File doesn't exist yet
    }

    if (!summary[today]) {
      summary[today] = {
        totalEvents: 0,
        uniqueSessions: new Set(),
        completedInstallations: 0,
        aiProviders: {},
        steps: {},
        errors: 0
      };
    }

    const dayData = summary[today];
    dayData.totalEvents++;
    dayData.uniqueSessions.add(event.sessionId);

    // Track specific events
    switch (event.event) {
      case 'docker_compose_downloaded':
        dayData.completedInstallations++;
        break;
      case 'config_changed':
        if (event.properties?.configKey === 'aiProvider') {
          dayData.aiProviders[event.properties.configValue] = 
            (dayData.aiProviders[event.properties.configValue] || 0) + 1;
        }
        break;
      case 'step_viewed':
        dayData.steps[event.properties?.stepName] = 
          (dayData.steps[event.properties?.stepName] || 0) + 1;
        break;
    }

    // Convert Set to array for JSON serialization
    const summaryToSave = {
      ...summary,
      [today]: {
        ...dayData,
        uniqueSessions: Array.from(dayData.uniqueSessions)
      }
    };

    await fs.writeFile(SUMMARY_FILE, JSON.stringify(summaryToSave, null, 2));
  } catch (error) {
    console.error('Failed to update daily summary:', error);
  }
};

// Get dashboard data
const getDashboardData = async () => {
  try {
    const summaryData = await fs.readFile(SUMMARY_FILE, 'utf8');
    const summary = JSON.parse(summaryData);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push({
        date: dateStr,
        ...summary[dateStr] || { totalEvents: 0, uniqueSessions: [], completedInstallations: 0 }
      });
    }

    // Calculate totals
    const totals = last7Days.reduce((acc, day) => ({
      totalEvents: acc.totalEvents + day.totalEvents,
      uniqueSessions: acc.uniqueSessions + (day.uniqueSessions?.length || 0),
      completedInstallations: acc.completedInstallations + day.completedInstallations
    }), { totalEvents: 0, uniqueSessions: 0, completedInstallations: 0 });

    // Get AI provider preferences
    const aiProviders = {};
    last7Days.forEach(day => {
      if (day.aiProviders) {
        Object.entries(day.aiProviders).forEach(([provider, count]) => {
          aiProviders[provider] = (aiProviders[provider] || 0) + count;
        });
      }
    });

    return {
      last7Days,
      totals,
      aiProviders,
      conversionRate: totals.uniqueSessions > 0 ? 
        ((totals.completedInstallations / totals.uniqueSessions) * 100).toFixed(1) : '0.0'
    };
  } catch (error) {
    return {
      last7Days: [],
      totals: { totalEvents: 0, uniqueSessions: 0, completedInstallations: 0 },
      aiProviders: {},
      conversionRate: '0.0'
    };
  }
};

module.exports = router;
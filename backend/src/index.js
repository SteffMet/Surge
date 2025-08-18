const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const http = require('http');
const User = require('./models/User');
const loadBalancer = require('./services/loadBalancer');
const logger = require('./utils/logger');
const CollaborationService = require('./services/collaborationService');
const { createSuperUser } = require('./utils/createSuperUser');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Determine worker type from environment
const workerType = process.env.WORKER_TYPE || 'main';
logger.info(`Starting application as ${workerType} worker`);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create storage directory if it doesn't exist
const storagePath = process.env.STORAGE_PATH || path.join(__dirname, '../storage');
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
  console.log(`Created storage directory at ${storagePath}`);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/surge')
  .then(async () => {
    console.log('Connected to MongoDB');
    // Create default admin user if it doesn't exist
    await createDefaultAdmin();
    // Create super user account
    await createSuperUser();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Function to create default admin and demo users
const createDefaultAdmin = async () => {
  try {
    // Create default admin user
    const existingAdmin = await User.findOne({ email: 'admin@surge.local' });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      const adminUser = new User({
        username: 'admin',
        email: 'admin@surge.local',
        password: hashedPassword,
        role: 'admin',
        active: true
      });

      await adminUser.save();
      console.log('Default admin user created:');
      console.log('Email: admin@surge.local');
      console.log('Password: admin123');
      console.log('IMPORTANT: Change the default password after first login!');
    }

    // Create demo user if demo mode is enabled
    if (process.env.DEMO_MODE === 'true') {
      const existingUser = await User.findOne({ email: 'user@surge.local' });
      if (!existingUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('user123', salt);
        
        const demoUser = new User({
          username: 'demouser',
          email: 'user@surge.local',
          password: hashedPassword,
          role: 'basic-upload',
          active: true
        });

        await demoUser.save();
        console.log('Demo user created:');
        console.log('Email: user@surge.local');
        console.log('Password: user123');
      }
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
};

// Import routes
const authRoutes = require('./api/routes/auth');
const userRoutes = require('./api/routes/users');
const documentRoutes = require('./api/routes/documents');
const searchRoutes = require('./api/routes/search');
const workspaceRoutes = require('./api/routes/workspaces');
const versionRoutes = require('./api/routes/versions');
const commentRoutes = require('./api/routes/comments');
const analyticsRoutes = require('./api/routes/analytics');
const vaultRoutes = require('./api/routes/vault');
const exportRoutes = require('./api/routes/export');
const templateRoutes = require('./api/routes/templates');
const brandingRoutes = require('./api/routes/branding');
const automationRoutes = require('./api/routes/automation');
const testRoutes = require('./api/routes/test');
const ollamaService = require('./services/ollamaService');
const Document = require('./models/Document');
const Workspace = require('./models/Workspace');
const Bookmark = require('./models/Bookmark');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/branding', brandingRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/test', testRoutes);

// Load balancer status endpoint
app.get('/api/loadbalancer/status', (req, res) => {
  try {
    const status = loadBalancer.getStatus();
    res.json({
      ...status,
      timestamp: new Date().toISOString(),
      workerType: workerType
    });
  } catch (error) {
    logger.error('Load balancer status error:', error);
    res.status(500).json({ error: 'Failed to get load balancer status' });
  }
});

// Enhanced search endpoint with load balancing
app.post('/api/search/enhanced', async (req, res) => {
  try {
    const result = await loadBalancer.proxySearchRequest('/api/search/enhanced', req.body);
    res.json(result);
  } catch (error) {
    logger.error('Enhanced search error:', error);
    res.status(500).json({ error: 'Search operation failed' });
  }
});

// Semantic search endpoint with load balancing
app.post('/api/search/semantic', async (req, res) => {
  try {
    const result = await loadBalancer.proxySearchRequest('/api/search/semantic', req.body);
    res.json(result);
  } catch (error) {
    logger.error('Semantic search error:', error);
    res.status(500).json({ error: 'Semantic search operation failed' });
  }
});

// Workspace search endpoint with load balancing
app.post('/api/search/workspace', async (req, res) => {
  try {
    const result = await loadBalancer.proxySearchRequest('/api/search/workspace', req.body);
    res.json(result);
  } catch (error) {
    logger.error('Workspace search error:', error);
    res.status(500).json({ error: 'Workspace search operation failed' });
  }
});

// Search suggestions endpoint with load balancing
app.post('/api/search/suggestions', async (req, res) => {
  try {
    const result = await loadBalancer.proxySearchRequest('/api/search/suggestions', req.body, 5000);
    res.json(result);
  } catch (error) {
    logger.error('Search suggestions error:', error);
    res.status(500).json({ error: 'Failed to get search suggestions' });
  }
});

// Embedding queue endpoints with load balancing
app.post('/api/embedding/queue/document', async (req, res) => {
  try {
    const result = await loadBalancer.proxyEmbeddingRequest('/api/queue/document', req.body);
    res.json(result);
  } catch (error) {
    logger.error('Document queue error:', error);
    res.status(500).json({ error: 'Failed to queue document for processing' });
  }
});

app.post('/api/embedding/queue/embedding', async (req, res) => {
  try {
    const result = await loadBalancer.proxyEmbeddingRequest('/api/queue/embedding', req.body);
    res.json(result);
  } catch (error) {
    logger.error('Embedding queue error:', error);
    res.status(500).json({ error: 'Failed to queue embedding generation' });
  }
});

app.post('/api/embedding/queue/batch', async (req, res) => {
  try {
    const result = await loadBalancer.proxyEmbeddingRequest('/api/queue/batch-embedding', req.body);
    res.json(result);
  } catch (error) {
    logger.error('Batch embedding queue error:', error);
    res.status(500).json({ error: 'Failed to queue batch embeddings' });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const totalDocs = await Document.countDocuments();
    const processedDocs = await Document.countDocuments({ status: 'processed' });
    const totalWorkspaces = await Workspace.countDocuments({ isActive: true });
    const totalBookmarks = await Bookmark.countDocuments();
    const documentBookmarkStats = await Document.getBookmarkStats();
    
    let models = [];
    try { models = await ollamaService.getAvailableModels(); } catch {}
    
    // Get load balancer status
    const loadBalancerStatus = loadBalancer.getStatus();
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      workerType: workerType,
      documents: {
        total: totalDocs,
        processed: processedDocs,
        bookmarked: documentBookmarkStats.bookmarkedDocuments,
        totalBookmarks: documentBookmarkStats.totalBookmarks
      },
      workspaces: {
        total: totalWorkspaces,
        bookmarks: totalBookmarks
      },
      ai: {
        configuredModel: process.env.OLLAMA_MODEL || 'mistral',
        availableModels: models.map(m => m.name || m.model),
        hasConfiguredModel: models.some(m => (m.name||m.model) === (process.env.OLLAMA_MODEL || 'mistral')),
        embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
        hasEmbeddingModel: models.some(m => (m.name||m.model) === (process.env.EMBEDDING_MODEL || 'nomic-embed-text'))
      },
      performance: {
        loadBalancer: loadBalancerStatus,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Create HTTP server and setup collaboration
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize collaboration service (WebSocket)
let collaborationService;
if (workerType === 'main') {
  collaborationService = new CollaborationService(server);
  logger.info('Collaboration service initialized');
}

server.listen(PORT, () => {
  logger.info(`${workerType} worker started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Signal PM2 that the app is ready
  if (process.send) {
    process.send('ready');
  }
  
  // Only main workers should handle Ollama model setup
  if (workerType === 'main') {
    // Attempt to ensure the configured Ollama model is available
    (async () => {
      const model = process.env.OLLAMA_MODEL || 'mistral';
      const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
      try {
        const available = await ollamaService.getAvailableModels();
        const hasModel = available.some(m => m.name === model || m.model === model);
        if (!hasModel) {
          logger.info(`[ollama] Model "${model}" not found locally. Pulling...`);
          await ollamaService.pullModel(model);
          logger.info(`[ollama] Model "${model}" pulled successfully.`);
        } else {
          logger.info(`[ollama] Model "${model}" already present.`);
        }
        const hasEmbed = available.some(m => m.name === embeddingModel || m.model === embeddingModel);
        if (!hasEmbed) {
          logger.info(`[ollama] Embedding model "${embeddingModel}" not found. Pulling...`);
          try {
            await ollamaService.pullModel(embeddingModel);
            logger.info(`[ollama] Embedding model "${embeddingModel}" pulled.`);
          } catch (e) {
            logger.warn(`[ollama] Failed to pull embedding model ${embeddingModel}: ${e.message}`);
          }
        } else {
          logger.info(`[ollama] Embedding model "${embeddingModel}" present.`);
        }
      } catch (e) {
        logger.warn(`[ollama] Could not verify/pull model "${model}": ${e.message}`);
      }
    })();
  }
});

// Graceful shutdown handling for PM2
process.on('SIGINT', async () => {
  logger.info(`${workerType} worker: Shutting down gracefully...`);
  
  server.close(async () => {
    try {
      await mongoose.connection.close();
      logger.info(`${workerType} worker: Database connection closed`);
      process.exit(0);
    } catch (error) {
      logger.error(`${workerType} worker: Error during shutdown:`, error);
      process.exit(1);
    }
  });
});

process.on('SIGTERM', async () => {
  logger.info(`${workerType} worker: Received SIGTERM, shutting down gracefully...`);
  
  server.close(async () => {
    try {
      await mongoose.connection.close();
      logger.info(`${workerType} worker: Database connection closed`);
      process.exit(0);
    } catch (error) {
      logger.error(`${workerType} worker: Error during shutdown:`, error);
      process.exit(1);
    }
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Don't crash the server in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();

// Import models
const Document = require('../models/Document');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Bookmark = require('../models/Bookmark');

// Import services
const embeddingService = require('../services/embeddingService');
const ollamaService = require('../services/ollamaService');

const app = express();
const PORT = process.env.SEARCH_WORKER_PORT || 0;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/surge', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  logger.info('Search Worker: Connected to MongoDB');
})
.catch((error) => {
  logger.error('Search Worker: MongoDB connection error:', error);
  process.exit(1);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    worker: 'search',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Enhanced search endpoint with performance optimizations
app.post('/api/search/enhanced', async (req, res) => {
  try {
    const startTime = Date.now();
    const { query, filters = {}, userId, limit = 20, offset = 0 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    logger.info(`Search Worker: Processing search query: "${query}" for user: ${userId}`);

    // Build search pipeline with optimizations
    const searchPipeline = [];

    // Text search stage
    searchPipeline.push({
      $match: {
        $text: { $search: query },
        ...(filters.fileType && { fileType: { $in: filters.fileType } }),
        ...(filters.tags && { tags: { $in: filters.tags } }),
        ...(filters.dateRange && {
          createdAt: {
            $gte: new Date(filters.dateRange.start),
            $lte: new Date(filters.dateRange.end)
          }
        })
      }
    });

    // Add text score for relevance
    searchPipeline.push({
      $addFields: {
        score: { $meta: 'textScore' }
      }
    });

    // Permission filtering (if userId provided)
    if (userId) {
      searchPipeline.push({
        $match: {
          $or: [
            { isPublic: true },
            { uploadedBy: new mongoose.Types.ObjectId(userId) },
            { 'permissions.users': new mongoose.Types.ObjectId(userId) }
          ]
        }
      });
    }

    // Sort by relevance and date
    searchPipeline.push({
      $sort: { score: { $meta: 'textScore' }, createdAt: -1 }
    });

    // Pagination
    searchPipeline.push({ $skip: offset });
    searchPipeline.push({ $limit: limit });

    // Populate user information
    searchPipeline.push({
      $lookup: {
        from: 'users',
        localField: 'uploadedBy',
        foreignField: '_id',
        as: 'uploadedBy',
        pipeline: [{ $project: { username: 1, email: 1 } }]
      }
    });

    searchPipeline.push({
      $unwind: { path: '$uploadedBy', preserveNullAndEmptyArrays: true }
    });

    // Execute search
    const documents = await Document.aggregate(searchPipeline);

    // Get total count for pagination
    const countPipeline = searchPipeline.slice(0, -3); // Remove pagination and lookup stages
    countPipeline.push({ $count: 'total' });
    const countResult = await Document.aggregate(countPipeline);
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;

    const searchTime = Date.now() - startTime;
    logger.info(`Search Worker: Search completed in ${searchTime}ms, found ${documents.length} results`);

    res.json({
      results: documents,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + documents.length < totalCount
      },
      searchTime,
      query
    });

  } catch (error) {
    logger.error('Search Worker: Search error:', error);
    res.status(500).json({ error: 'Search operation failed' });
  }
});

// Semantic search endpoint using embeddings
app.post('/api/search/semantic', async (req, res) => {
  try {
    const startTime = Date.now();
    const { query, userId, limit = 10, threshold = 0.7 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    logger.info(`Search Worker: Processing semantic search: "${query}"`);

    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    if (!queryEmbedding) {
      return res.status(500).json({ error: 'Failed to generate query embedding' });
    }

    // Build aggregation pipeline for vector search
    const pipeline = [
      {
        $addFields: {
          similarity: {
            $let: {
              vars: {
                dotProduct: {
                  $reduce: {
                    input: { $range: [0, { $size: '$embedding' }] },
                    initialValue: 0,
                    in: {
                      $add: [
                        '$$value',
                        {
                          $multiply: [
                            { $arrayElemAt: ['$embedding', '$$this'] },
                            { $arrayElemAt: [queryEmbedding, '$$this'] }
                          ]
                        }
                      ]
                    }
                  }
                }
              },
              in: '$$dotProduct'
            }
          }
        }
      },
      {
        $match: {
          similarity: { $gte: threshold },
          embedding: { $exists: true, $ne: null }
        }
      }
    ];

    // Add permission filtering
    if (userId) {
      pipeline.push({
        $match: {
          $or: [
            { isPublic: true },
            { uploadedBy: new mongoose.Types.ObjectId(userId) },
            { 'permissions.users': new mongoose.Types.ObjectId(userId) }
          ]
        }
      });
    }

    // Sort by similarity
    pipeline.push({ $sort: { similarity: -1 } });
    pipeline.push({ $limit: limit });

    // Populate user information
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'uploadedBy',
        foreignField: '_id',
        as: 'uploadedBy',
        pipeline: [{ $project: { username: 1, email: 1 } }]
      }
    });

    pipeline.push({
      $unwind: { path: '$uploadedBy', preserveNullAndEmptyArrays: true }
    });

    const results = await Document.aggregate(pipeline);

    const searchTime = Date.now() - startTime;
    logger.info(`Search Worker: Semantic search completed in ${searchTime}ms, found ${results.length} results`);

    res.json({
      results,
      searchTime,
      query,
      threshold
    });

  } catch (error) {
    logger.error('Search Worker: Semantic search error:', error);
    res.status(500).json({ error: 'Semantic search operation failed' });
  }
});

// Workspace search endpoint
app.post('/api/search/workspace', async (req, res) => {
  try {
    const startTime = Date.now();
    const { query, workspaceId, userId, limit = 20, offset = 0 } = req.body;

    if (!query || !workspaceId) {
      return res.status(400).json({ error: 'Query and workspace ID are required' });
    }

    // Verify user has access to workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.hasAccess(userId)) {
      return res.status(403).json({ error: 'Access denied to workspace' });
    }

    // Get bookmarked document IDs from workspace
    const bookmarks = await Bookmark.find({
      workspace: workspaceId,
      resourceType: 'document'
    }).select('resourceId');

    const documentIds = bookmarks.map(b => b.resourceId);

    // Search within bookmarked documents
    const pipeline = [
      {
        $match: {
          _id: { $in: documentIds },
          $text: { $search: query }
        }
      },
      {
        $addFields: {
          score: { $meta: 'textScore' }
        }
      },
      { $sort: { score: { $meta: 'textScore' }, createdAt: -1 } },
      { $skip: offset },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'uploadedBy',
          foreignField: '_id',
          as: 'uploadedBy',
          pipeline: [{ $project: { username: 1, email: 1 } }]
        }
      },
      {
        $unwind: { path: '$uploadedBy', preserveNullAndEmptyArrays: true }
      }
    ];

    const results = await Document.aggregate(pipeline);

    const searchTime = Date.now() - startTime;
    logger.info(`Search Worker: Workspace search completed in ${searchTime}ms`);

    res.json({
      results,
      searchTime,
      query,
      workspaceId
    });

  } catch (error) {
    logger.error('Search Worker: Workspace search error:', error);
    res.status(500).json({ error: 'Workspace search operation failed' });
  }
});

// Real-time search suggestions endpoint
app.post('/api/search/suggestions', async (req, res) => {
  try {
    const { query, userId, limit = 5 } = req.body;

    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Get search suggestions from document titles and tags
    const suggestions = await Document.aggregate([
      {
        $match: {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { tags: { $regex: query, $options: 'i' } }
          ],
          ...(userId && {
            $or: [
              { isPublic: true },
              { uploadedBy: new mongoose.Types.ObjectId(userId) }
            ]
          })
        }
      },
      {
        $project: {
          suggestion: '$title',
          type: 'document',
          tags: 1
        }
      },
      { $limit: limit }
    ]);

    // Add tag suggestions
    const tagSuggestions = await Document.aggregate([
      { $unwind: '$tags' },
      {
        $match: {
          tags: { $regex: query, $options: 'i' }
        }
      },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          suggestion: '$_id',
          type: 'tag',
          count: 1
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    const allSuggestions = [...suggestions, ...tagSuggestions];

    res.json({ suggestions: allSuggestions.slice(0, limit) });

  } catch (error) {
    logger.error('Search Worker: Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Search Worker: Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the search worker
const server = app.listen(PORT, () => {
  const assignedPort = server.address().port;
  logger.info(`Search Worker started on port ${assignedPort}`);
  
  // Signal PM2 that the app is ready
  if (process.send) {
    process.send('ready');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Search Worker: Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Search Worker: Received SIGTERM, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
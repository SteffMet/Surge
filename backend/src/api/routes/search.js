const express = require('express');
const router = express.Router();
const { body, validationResult, query: vquery } = require('express-validator');

const auth = require('../../middleware/auth');
const Document = require('../../models/Document');
const RecentSearch = require('../../models/RecentSearch');
const User = require('../../models/User');
const { AnalyticsEvent } = require('../../models/Analytics');
const ollamaService = require('../../services/ollamaService');
const embeddingService = require('../../services/embeddingService');
const logger = require('../../utils/logger');

// In-memory simple cache for AI responses (query + top doc ids) => { response, ts }
const aiCache = new Map();
const AI_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * @route   POST /api/search
 * @desc    Search documents and get AI-powered responses
 * @access  Private
 */
router.post('/',
  auth,
  [
    body('query', 'Search query is required').not().isEmpty().trim(),
    body('limit').optional().isInt({ min: 1, max: 50 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

  const {
    query,
    limit = 10,
    page = 1,
    minScore = 0,
    aiOnly = false,
    folder,
    filters = {}
  } = req.body;
  
    logger.info(`Search query from user ${req.user.id}: "${query}" (aiOnly: ${aiOnly}, folder: ${folder}, filters: ${JSON.stringify(filters)})`);

    let documentResults = [];
    let totalAvailable = 0;
    if (!aiOnly) {
      try {
        logger.debug(`Starting document search for query: "${query}"`);
        const searchResult = await searchDocuments(query, limit, page, minScore, folder, filters);
        documentResults = searchResult.results;
        totalAvailable = searchResult.total;
        logger.debug(`Document search completed: ${documentResults.length} results found`);
      } catch (searchError) {
        logger.error('Error in searchDocuments function:', {
          error: searchError.message,
          stack: searchError.stack,
          query: query.substring(0, 100),
          userId: req.user.id
        });
        throw searchError; // Re-throw to be caught by outer try-catch
      }
    }
      
      // Get user settings (req.user is a plain object from JWT middleware, so we must fetch User doc)
      let user = null;
      try {
        // externalAiApiKey is select:false so we explicitly select it
        user = await User.findById(req.user.id)
          .select('externalAiProviderEnabled externalAiApiKey externalAiSystemPrompt externalAiProviderType');
      } catch (e) {
        logger.warn('Unable to load user settings for AI search context:', e.message);
      }
      const userSettings = user ? {
        externalAiProviderEnabled: user.externalAiProviderEnabled,
        externalAiApiKey: user.externalAiApiKey,
  externalAiSystemPrompt: user.externalAiSystemPrompt,
  externalAiProviderType: user.externalAiProviderType
      } : {};
      
      let aiResponse = null;
      
      // Call Ollama service to generate AI response
      try {
        aiResponse = await ollamaService.generateSearchResponse(query, documentResults, {}, userSettings);
        logger.info(`AI response generated in ${aiResponse.tookMs}ms`);
      } catch (aiError) {
        logger.warn('Failed to generate AI response:', aiError.message);
        aiResponse = {
          response: documentResults.length > 0
            ? `AI summarization failed: ${aiError.message}`
            : 'No documents found and AI response generation failed.',
          model: 'error',
          hasDocumentContext: documentResults.length > 0,
          error: `AI Error: ${aiError.message}`,
          tookMs: 0
        };
      }

      // Log search for analytics
      logger.info(`Search completed: ${documentResults.length} documents found, AI response: ${aiResponse ? 'yes' : 'no'}`);

      // Log analytics event
      try {
        await AnalyticsEvent.logEvent({
          eventType: 'search_query',
          user: req.user.id,
          workspace: filters.workspace,
          metadata: {
            query,
            resultsCount: documentResults.length,
            hasAIResponse: !!aiResponse,
            aiResponseTime: aiResponse?.tookMs,
            filters: Object.keys(filters).length > 0 ? filters : null,
            folder,
            minScore,
            page,
            limit
          }
        });
      } catch (analyticsErr) {
        logger.warn('Failed to log search analytics:', analyticsErr.message);
      }

      // Persist recent search (dedupe same query within last 5 minutes)
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existing = await RecentSearch.findOne({ user: req.user.id, query, createdAt: { $gte: fiveMinutesAgo } });
        if (!existing) {
          await RecentSearch.create({
            user: req.user.id,
            query,
            results: documentResults.length,
            hasDocumentContext: documentResults.length > 0
          });
        }
      } catch (persistErr) {
        logger.warn('Failed to persist recent search', persistErr.message);
      }

      res.json({
        query,
        documents: documentResults,
        aiResponse,
        totalDocuments: totalAvailable,
        page,
        pageSize: limit,
        returned: documentResults.length,
        minScore,
        searchTime: new Date().toISOString()
      });

  } catch (error) {
    logger.error('Search error:', error);
    
    // Enhanced error response with retry information
    const errorResponse = {
      errors: [{ msg: 'Search failed' }],
      retryable: false,
      errorType: 'unknown'
    };
    
    // Classify errors for better client handling
    if (error.name === 'MongoTimeoutError' || error.code === 'ETIMEDOUT') {
      errorResponse.errors[0].msg = 'Search timed out. Please try a simpler query.';
      errorResponse.retryable = true;
      errorResponse.errorType = 'timeout';
      res.status(408).json(errorResponse);
    } else if (error.name === 'MongoNetworkError' || error.code === 'ECONNREFUSED') {
      errorResponse.errors[0].msg = 'Database connection issue. Please try again.';
      errorResponse.retryable = true;
      errorResponse.errorType = 'network';
      res.status(503).json(errorResponse);
    } else if (error.name === 'ValidationError') {
      errorResponse.errors[0].msg = 'Invalid search parameters.';
      errorResponse.retryable = false;
      errorResponse.errorType = 'validation';
      res.status(400).json(errorResponse);
    } else {
      // Generic server error
      errorResponse.errors[0].msg = 'Internal server error during search.';
      errorResponse.retryable = true;
      errorResponse.errorType = 'server';
      res.status(500).json(errorResponse);
    }
  }
  }
);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions based on document content
 * @access  Private
 */
router.get('/suggestions', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Get suggestions from document names and tags
    const suggestions = await Document.aggregate([
      {
        $match: {
          status: 'processed',
          $or: [
            { originalName: { $regex: q, $options: 'i' } },
            { tags: { $regex: q, $options: 'i' } }
          ]
        }
      },
      {
        $project: {
          suggestion: '$originalName',
          type: 'document'
        }
      },
      {
        $limit: 10
      }
    ]);

    // Add common IT search terms if query matches
    const commonTerms = [
      'password reset', 'user account', 'network troubleshooting', 'server maintenance',
      'backup procedures', 'security policies', 'software installation', 'hardware setup',
      'email configuration', 'VPN setup', 'database management', 'system monitoring'
    ];

    const matchingTerms = commonTerms
      .filter(term => term.toLowerCase().includes(q.toLowerCase()))
      .map(term => ({ suggestion: term, type: 'common' }))
      .slice(0, 5);

    const allSuggestions = [...suggestions, ...matchingTerms]
      .slice(0, 10)
      .map(item => item.suggestion);

    res.json({ suggestions: allSuggestions });

  } catch (error) {
    logger.error('Error getting search suggestions:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to get suggestions' }] });
  }
});

/**
 * @route   GET /api/search/recent
 * @desc    Get recent searches (if we implement search history)
 * @access  Private
 */
router.get('/recent', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const searches = await RecentSearch.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(searches.map(s => ({
      query: s.query,
      results: s.results,
      hasDocumentContext: s.hasDocumentContext,
      timestamp: s.createdAt
    })));
  } catch (error) {
    logger.error('Error getting recent searches:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to get recent searches' }] });
  }
});

/**
 * @route   DELETE /api/search/recent
 * @desc    Clear all recent searches for current user
 * @access  Private
 */
router.delete('/recent', auth, async (req, res) => {
  try {
    await RecentSearch.deleteMany({ user: req.user.id });
    res.json({ message: 'Recent searches cleared' });
  } catch (error) {
    logger.error('Error clearing recent searches:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to clear recent searches' }] });
  }
});

/**
 * @route   GET /api/search/popular
 * @desc    Get popular search terms
 * @access  Private
 */
router.get('/popular', auth, async (req, res) => {
  try {
    // Get most common tags as popular terms
    const popularTags = await Document.aggregate([
      { $match: { status: 'processed' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { query: '$_id', count: 1, _id: 0 } }
    ]);

    res.json(popularTags);

  } catch (error) {
    logger.error('Error getting popular searches:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to get popular searches' }] });
  }
});

/**
 * @route   POST /api/search/feedback
 * @desc    Submit feedback on search results
 * @access  Private
 */
router.post('/feedback',
  auth,
  [
    body('query', 'Query is required').not().isEmpty(),
    body('helpful', 'Helpful flag is required').isBoolean(),
    body('comment').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { query, helpful, comment } = req.body;

      // Log feedback for analysis
      logger.info('Search feedback received:', {
        userId: req.user.id,
        query,
        helpful,
        comment,
        timestamp: new Date()
      });

      // In a full implementation, you'd store this in a feedback collection
      // for analysis and improving search results

      res.json({ message: 'Feedback received successfully' });

    } catch (error) {
      logger.error('Error submitting search feedback:', error);
      res.status(500).json({ errors: [{ msg: 'Failed to submit feedback' }] });
    }
  }
);



module.exports = router;

/**
 * @route GET /api/search/debug/scores
 * @desc  Debug scoring breakdown (admin only)
 */
router.get('/debug/scores', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ errors: [{ msg: 'Forbidden' }] });
  const { q } = req.query;
  if (!q) return res.status(400).json({ errors: [{ msg: 'q required' }] });
  try {
  const { results } = await searchDocuments(q, 50, 1, 0);
  res.json(results);
  } catch (e) {
    res.status(500).json({ errors: [{ msg: e.message }] });
  }
});

/**
 * @route GET /api/search/health/ollama
 * @desc  Get Ollama service health status
 * @access Private (admin only)
 */
router.get('/health/ollama', auth, async (req, res) => {
  try {
    // Only allow admin users to check health
    if (req.user.role !== 'admin') {
      return res.status(403).json({ errors: [{ msg: 'Admin access required' }] });
    }
    
    const healthStatus = await ollamaService.getHealthStatus();
    
    // Set appropriate HTTP status based on health
    const httpStatus = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'unhealthy' ? 503 : 500;
    
    res.status(httpStatus).json(healthStatus);
  } catch (error) {
    logger.error('Error checking Ollama health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check Ollama health',
      timestamp: new Date().toISOString()
    });
  }
});
/**
 * @route POST /api/search/advanced
 * @desc Advanced search with faceted filtering and AI insights
 * @access Private
 */
router.post('/advanced', auth, async (req, res) => {
  try {
    const {
      query,
      filters = {},
      facets = [],
      sortBy = 'relevance',
      sortOrder = 'desc',
      limit = 20,
      page = 1
    } = req.body;

    // Build search query with filters
    const searchResult = await searchDocuments(query, limit, page, 0, filters.folder, filters);

    // Get facet data if requested
    const facetData = {};
    if (facets.includes('fileTypes')) {
      facetData.fileTypes = await Document.aggregate([
        { $match: { status: 'processed' } },
        { $group: { _id: '$mimeType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);
    }

    if (facets.includes('authors')) {
      facetData.authors = await Document.aggregate([
        { $match: { status: 'processed' } },
        { $lookup: { from: 'users', localField: 'uploadedBy', foreignField: '_id', as: 'author' } },
        { $unwind: '$author' },
        { $group: { _id: '$author._id', name: { $first: '$author.username' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);
    }

    if (facets.includes('tags')) {
      facetData.tags = await Document.aggregate([
        { $match: { status: 'processed' } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]);
    }

    // Generate AI insights for the search results
    let aiInsights = null;
    if (searchResult.results.length > 0) {
      try {
        aiInsights = await ollamaService.generateSearchInsights(query, searchResult.results);
      } catch (error) {
        logger.warn('Failed to generate AI insights:', error.message);
      }
    }

    // Log analytics
    await AnalyticsEvent.logEvent({
      eventType: 'search_query',
      user: req.user.id,
      workspace: filters.workspace,
      metadata: {
        query,
        searchType: 'advanced',
        resultsCount: searchResult.results.length,
        filters: Object.keys(filters).length > 0 ? filters : null,
        facets,
        sortBy,
        hasAIInsights: !!aiInsights
      }
    });

    res.json({
      query,
      results: searchResult.results,
      total: searchResult.total,
      facets: facetData,
      aiInsights,
      pagination: {
        page,
        limit,
        total: searchResult.total,
        pages: Math.ceil(searchResult.total / limit)
      },
      sortBy,
      sortOrder
    });

  } catch (error) {
    logger.error('Advanced search error:', error);
    res.status(500).json({ message: 'Advanced search failed' });
  }
});

/**
 * @route POST /api/search/semantic
 * @desc Semantic search using embeddings
 * @access Private
 */
router.post('/semantic', auth, async (req, res) => {
  try {
    const { query, limit = 10, threshold = 0.7 } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Generate query embedding
    const queryEmbedding = await embeddingService.generate(query);
    
    if (!queryEmbedding) {
      return res.status(503).json({ message: 'Embedding service unavailable' });
    }

    // Find documents with embeddings
    const documents = await Document.find({
      status: 'processed',
      embedding: { $exists: true, $ne: null }
    }).limit(100); // Limit for performance

    // Calculate semantic similarity
    const semanticResults = documents
      .map(doc => {
        const similarity = embeddingService.cosine(queryEmbedding, doc.embedding);
        return {
          document: doc,
          similarity
        };
      })
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(result => ({
        id: result.document._id,
        originalName: result.document.originalName,
        folder: result.document.folder,
        mimeType: result.document.mimeType,
        size: result.document.size,
        tags: result.document.tags,
        createdAt: result.document.createdAt,
        extractedText: result.document.extractedText.substring(0, 500) + '...',
        semanticScore: Number(result.similarity.toFixed(4))
      }));

    // Log analytics
    await AnalyticsEvent.logEvent({
      eventType: 'search_query',
      user: req.user.id,
      metadata: {
        query,
        searchType: 'semantic',
        resultsCount: semanticResults.length,
        threshold
      }
    });

    res.json({
      query,
      results: semanticResults,
      total: semanticResults.length,
      threshold,
      searchType: 'semantic'
    });

  } catch (error) {
    logger.error('Semantic search error:', error);
    res.status(500).json({ message: 'Semantic search failed' });
  }
});

/**
 * @route POST /api/search/ai-suggestions
 * @desc Get AI-powered content suggestions and optimizations
 * @access Private
 */
router.post('/ai-suggestions', auth, async (req, res) => {
  try {
    const { documentId, type = 'tags' } = req.body;

    if (!documentId) {
      return res.status(400).json({ message: 'Document ID is required' });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    let suggestions = {};

    switch (type) {
      case 'tags':
        // Generate suggested tags based on content
        suggestions.tags = await ollamaService.generateTagSuggestions(document.extractedText);
        break;
        
      case 'summary':
        // Generate content summary
        suggestions.summary = await ollamaService.generateSummary(document.extractedText);
        break;
        
      case 'related':
        // Find related documents
        if (document.embedding) {
          const relatedDocs = await Document.find({
            _id: { $ne: documentId },
            status: 'processed',
            embedding: { $exists: true }
          }).limit(50);

          const related = relatedDocs
            .map(doc => ({
              document: doc,
              similarity: embeddingService.cosine(document.embedding, doc.embedding)
            }))
            .filter(r => r.similarity > 0.5)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5)
            .map(r => ({
              id: r.document._id,
              name: r.document.originalName,
              similarity: r.similarity
            }));

          suggestions.related = related;
        }
        break;
        
      case 'optimization':
        // Suggest content optimizations
        suggestions.optimization = await ollamaService.generateOptimizationSuggestions(document.extractedText);
        break;
    }

    // Log analytics
    await AnalyticsEvent.logEvent({
      eventType: 'ai_suggestion_request',
      user: req.user.id,
      document: documentId,
      metadata: { suggestionType: type }
    });

    res.json({
      documentId,
      type,
      suggestions
    });

  } catch (error) {
    logger.error('AI suggestions error:', error);
    res.status(500).json({ message: 'Failed to generate AI suggestions' });
  }
});

/**
 * @route GET /api/search/filters/options
 * @desc Get available filter options for advanced search
 * @access Private
 */
router.get('/filters/options', auth, async (req, res) => {
  try {
    // Get unique file types
    const fileTypes = await Document.distinct('mimeType', { status: 'processed' });
    
    // Get unique tags
    const tags = await Document.distinct('tags', { status: 'processed' });
    
    // Get authors
    const authors = await Document.aggregate([
      { $match: { status: 'processed' } },
      { $lookup: { from: 'users', localField: 'uploadedBy', foreignField: '_id', as: 'author' } },
      { $unwind: '$author' },
      { $group: { _id: '$author._id', name: { $first: '$author.username' } } },
      { $sort: { name: 1 } }
    ]);

    // Get folders
    const folders = await Document.distinct('folder', { status: 'processed' });

    // Get size ranges (predefined)
    const sizeRanges = [
      { label: 'Small (< 1MB)', min: 0, max: 1024 * 1024 },
      { label: 'Medium (1-10MB)', min: 1024 * 1024, max: 10 * 1024 * 1024 },
      { label: 'Large (10-100MB)', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
      { label: 'Extra Large (> 100MB)', min: 100 * 1024 * 1024 }
    ];

    res.json({
      fileTypes: fileTypes.sort(),
      tags: tags.sort(),
      authors,
      folders: folders.sort(),
      sizeRanges
    });

  } catch (error) {
    logger.error('Error fetching filter options:', error);
    res.status(500).json({ message: 'Failed to fetch filter options' });
  }
});

// Helper function to build match conditions for document search
function buildMatchConditions(folder, filters = {}) {
  const matchConditions = {
    status: 'processed'
  };
  
  // Apply folder filter
  if (folder) {
    matchConditions.folder = folder;
  }
  
  // Apply advanced filters
  if (filters.dateRange) {
    const { start, end } = filters.dateRange;
    if (start || end) {
      matchConditions.createdAt = {};
      if (start) matchConditions.createdAt.$gte = new Date(start);
      if (end) matchConditions.createdAt.$lte = new Date(end);
    }
  }
  
  if (filters.fileTypes && filters.fileTypes.length > 0) {
    matchConditions.mimeType = { $in: filters.fileTypes };
  }
  
  if (filters.tags && filters.tags.length > 0) {
    matchConditions.tags = { $in: filters.tags };
  }
  
  if (filters.authors && filters.authors.length > 0) {
    matchConditions.uploadedBy = { $in: filters.authors };
  }
  
  if (filters.sizeRange) {
    const { min, max } = filters.sizeRange;
    if (min !== undefined || max !== undefined) {
      matchConditions.size = {};
      if (min !== undefined) matchConditions.size.$gte = min;
      if (max !== undefined) matchConditions.size.$lte = max;
    }
  }
  
  if (filters.hasComments !== undefined) {
    // This would require joining with comments collection or maintaining a comment count
    // For now, we'll add this as a TODO for future enhancement
  }
  
  if (filters.workspace) {
    // Filter by documents bookmarked in specific workspace
    matchConditions['bookmarkedInWorkspaces.workspace'] = filters.workspace;
  }
  
  return matchConditions;
}

// Helper function to perform text search (MongoDB text search and regex fallback)
async function performTextSearch(query, matchConditions, limit) {
  // First try MongoDB text search
  let documents = await Document.find(
    {
      $text: { $search: query },
      ...matchConditions
    },
    { score: { $meta: 'textScore' } }
  )
  .populate('uploadedBy', 'username')
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit);

  // If no results from text search, try regex search on key fields
  if (documents.length === 0) {
    const regexQuery = new RegExp(query.split(' ').join('|'), 'i');
    
    documents = await Document.find({
      ...matchConditions,
      $or: [
        { originalName: regexQuery },
        { extractedText: regexQuery },
        { tags: regexQuery }
      ]
    })
    .populate('uploadedBy', 'username')
    .sort({ createdAt: -1 })
    .limit(limit);
  }
  
  return documents;
}

// Helper function to calculate base scores (term frequency)
function calculateBaseScores(query, documents) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = documents.map(doc => {
    let tf = 0;
    const haystack = (doc.extractedText || '').toLowerCase();
    for (const t of terms) {
      const occurrences = haystack.split(t).length - 1;
      tf += occurrences;
    }
    const baseScore = doc.score || tf; // textScore from Mongo if available else tf
    return { doc, baseScore };
  });
  const maxBase = scored.reduce((m, s) => s.baseScore > m ? s.baseScore : m, 0) || 1;
  return { scored, maxBase };
}

// Helper function to perform semantic search
async function performSemanticSearch(query, scored) {
  // Optional semantic (embedding) similarity (lightweight local hash embedding)
  let queryEmbedding = null;
  try {
    queryEmbedding = await embeddingService.generate(query);
  } catch {}

  const withSemantic = scored.map(s => {
    let semantic = 0;
    if (queryEmbedding && Array.isArray(s.doc.embedding) && s.doc.embedding.length === queryEmbedding.length) {
      semantic = embeddingService.cosine(queryEmbedding, s.doc.embedding);
    }
    return { ...s, semantic };
  });
  const maxSemantic = withSemantic.reduce((m, s) => s.semantic > m ? s.semantic : m, 0) || 1;
  
  return { withSemantic, maxSemantic };
}

// Helper function to generate LLM scores
async function generateLLMScores(query, scored) {
  // Prepare lightweight objects for potential LLM re-ranking
  const llmInput = scored.slice(0, Math.min(scored.length, 8)).map(s => ({
    id: s.doc._id.toString(),
    originalName: s.doc.originalName,
    excerpt: s.doc.extractedText.substring(0, 400)
  }));

  let llmScores = {};
  try {
    // Attempt re-ranking with a more generous timeout
    // This timeout should be less than the Ollama service's internal timeout (120s)
    // but long enough to allow for processing.
    llmScores = await Promise.race([
      ollamaService.generateRelevanceScores(query, llmInput),
      new Promise(res => setTimeout(() => {
        logger.warn('LLM re-ranking timed out after 30 seconds, applying fallback scoring.');
        res({});
      }, 30000)) // 30 second timeout
    ]);
  } catch (err) {
    logger.warn('LLM re-ranking failed, applying fallback scoring:', err.message);
  }

  // Fallback re-ranking based on term density if LLM scoring fails or is empty
  if (Object.keys(llmScores).length === 0 && llmInput.length > 0) {
    logger.info('Applying fallback term-density re-ranking');
    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    llmInput.forEach(doc => {
      const content = (doc.excerpt || '').toLowerCase();
      let termCount = 0;
      queryTerms.forEach(term => {
        termCount += (content.split(term).length - 1);
      });
      // Score based on term density (0-100)
      llmScores[doc.id] = Math.min(100, (termCount / content.length) * 10000);
    });
  }
  
  return llmScores;
}

// Helper function to combine all scores into final relevance scores
function combineScores(withSemantic, maxBase, maxSemantic, llmScores) {
  let finalList = withSemantic.map(s => {
    const llm = llmScores[s.doc._id.toString()];
    // Combine base normalized (0-1) with llm (0-100) if available
    const normalizedBase = s.baseScore / maxBase;
    const normalizedSemantic = s.semantic / maxSemantic; // 0-1
    // Weight: 40% lexical, 30% semantic, 30% LLM (if present)
    let combined = 0.4 * normalizedBase + 0.3 * normalizedSemantic;
    if (llm !== undefined) {
      combined += 0.3 * (llm / 100);
    } else {
      // Rebalance if no llm score
      combined = 0.6 * normalizedBase + 0.4 * normalizedSemantic;
    }
    return {
      id: s.doc._id,
      originalName: s.doc.originalName,
      folder: s.doc.folder,
      mimeType: s.doc.mimeType,
      size: s.doc.size,
      tags: s.doc.tags,
      uploadedBy: s.doc.uploadedBy,
      createdAt: s.doc.createdAt,
      extractedText: s.doc.extractedText.substring(0, 500) + (s.doc.extractedText.length > 500 ? '...' : ''),
      relevanceScore: Number(combined.toFixed(4)),
      baseScore: Number(normalizedBase.toFixed(4)),
      llmScore: llm !== undefined ? llm : null,
      semanticScore: Number(normalizedSemantic.toFixed(4))
    };
  }).sort((a,b) => b.relevanceScore - a.relevanceScore);
  
  return finalList;
}

// Helper function to paginate results
function paginateResults(finalList, page, limit, minScore) {
  if (minScore > 0) {
    finalList = finalList.filter(d => d.relevanceScore >= minScore);
  }

  // Pagination (client passes page starting at 1)
  const start = (page - 1) * limit;
  const paged = finalList.slice(start, start + limit);
  return { results: paged, total: finalList.length };
}

// Refactored helper function to search documents using modular functions
async function searchDocuments(query, limit = 10, page = 1, minScore = 0, folder, filters = {}) {
  try {
    logger.debug('searchDocuments: Starting search process', {
      query: query.substring(0, 100),
      limit,
      page,
      minScore,
      folder,
      filters
    });

    // Build match conditions
    const matchConditions = buildMatchConditions(folder, filters);
    logger.debug('searchDocuments: Match conditions built', { matchConditions });
    
    // Perform text search
    const documents = await performTextSearch(query, matchConditions, limit);
    logger.debug('searchDocuments: Text search completed', { documentCount: documents.length });
    
    // Calculate base scores
    const { scored, maxBase } = calculateBaseScores(query, documents);
    logger.debug('searchDocuments: Base scores calculated', { maxBase, scoredCount: scored.length });
    
    // Perform semantic search
    const { withSemantic, maxSemantic } = await performSemanticSearch(query, scored);
    logger.debug('searchDocuments: Semantic search completed', { maxSemantic });
    
    // Generate LLM scores
    const llmScores = await generateLLMScores(query, scored);
    logger.debug('searchDocuments: LLM scores generated', { llmScoreCount: Object.keys(llmScores).length });
    
    // Combine all scores
    const finalList = combineScores(withSemantic, maxBase, maxSemantic, llmScores);
    logger.debug('searchDocuments: Scores combined', { finalListCount: finalList.length });
    
    // Paginate results
    const result = paginateResults(finalList, page, limit, minScore);
    logger.debug('searchDocuments: Results paginated', { 
      resultCount: result.results.length, 
      total: result.total 
    });
    
    return result;

  } catch (error) {
    logger.error('Error in searchDocuments function:', {
      error: error.message,
      stack: error.stack,
      query: query.substring(0, 100),
      limit,
      page,
      minScore,
      folder,
      filters
    });
    throw error;
  }
}

module.exports = router;
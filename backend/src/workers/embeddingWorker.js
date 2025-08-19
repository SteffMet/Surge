const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();

// Import models and services
const Document = require('../models/Document');
const embeddingService = require('../services/embeddingService');
const documentProcessor = require('../services/documentProcessor');

const app = express();
const PORT = process.env.EMBEDDING_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/surge', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Embedding Worker: Connected to MongoDB');
})
.catch((error) => {
  logger.error('Embedding Worker: MongoDB connection error:', error);
  process.exit(1);
});

// In-memory job queue for simplicity (can be replaced with Redis later)
const jobQueue = [];
const processingJobs = new Map();
let isProcessing = false;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    worker: 'embedding',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    queue: {
      pending: jobQueue.length,
      processing: processingJobs.size
    }
  });
});

// Queue status endpoint
app.get('/api/queue/status', (req, res) => {
  res.json({
    pending: jobQueue.length,
    processing: processingJobs.size,
    timestamp: new Date().toISOString()
  });
});

// Add document to processing queue
app.post('/api/queue/document', async (req, res) => {
  try {
    const { documentId, priority = 'normal' } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    const job = {
      id: Date.now() + Math.random(),
      type: 'process-document',
      documentId,
      priority,
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: 3
    };

    // Insert job based on priority
    if (priority === 'high') {
      jobQueue.unshift(job);
    } else {
      jobQueue.push(job);
    }

    logger.info(`Embedding Worker: Added document ${documentId} to processing queue with job ID ${job.id}`);

    // Start processing if not already running
    if (!isProcessing) {
      processQueue();
    }

    res.json({
      jobId: job.id,
      documentId,
      priority,
      status: 'queued',
      queuePosition: jobQueue.length
    });

  } catch (error) {
    logger.error('Embedding Worker: Queue document error:', error);
    res.status(500).json({ error: 'Failed to queue document' });
  }
});

// Add embedding generation to queue
app.post('/api/queue/embedding', async (req, res) => {
  try {
    const { documentId, text, priority = 'normal' } = req.body;

    if (!documentId || !text) {
      return res.status(400).json({ error: 'Document ID and text are required' });
    }

    const job = {
      id: Date.now() + Math.random(),
      type: 'generate-embedding',
      documentId,
      text: text.substring(0, 8000), // Limit text length
      priority,
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: 3
    };

    // Insert job based on priority
    if (priority === 'high') {
      jobQueue.unshift(job);
    } else {
      jobQueue.push(job);
    }

    logger.info(`Embedding Worker: Added embedding generation for document ${documentId} with job ID ${job.id}`);

    // Start processing if not already running
    if (!isProcessing) {
      processQueue();
    }

    res.json({
      jobId: job.id,
      documentId,
      priority,
      status: 'queued',
      queuePosition: jobQueue.length
    });

  } catch (error) {
    logger.error('Embedding Worker: Queue embedding error:', error);
    res.status(500).json({ error: 'Failed to queue embedding' });
  }
});

// Batch embedding generation
app.post('/api/queue/batch-embedding', async (req, res) => {
  try {
    const { documents, priority = 'normal' } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: 'Documents array is required' });
    }

    const jobs = documents.map(doc => ({
      id: Date.now() + Math.random(),
      type: 'generate-embedding',
      documentId: doc.documentId,
      text: doc.text ? doc.text.substring(0, 8000) : '',
      priority,
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: 3
    }));

    // Add all jobs to queue
    if (priority === 'high') {
      jobQueue.unshift(...jobs);
    } else {
      jobQueue.push(...jobs);
    }

    logger.info(`Embedding Worker: Added ${jobs.length} embedding jobs to queue`);

    // Start processing if not already running
    if (!isProcessing) {
      processQueue();
    }

    res.json({
      jobIds: jobs.map(j => j.id),
      count: jobs.length,
      priority,
      status: 'queued'
    });

  } catch (error) {
    logger.error('Embedding Worker: Batch embedding error:', error);
    res.status(500).json({ error: 'Failed to queue batch embeddings' });
  }
});

// Process job queue
async function processQueue() {
  if (isProcessing || jobQueue.length === 0) {
    return;
  }

  isProcessing = true;
  logger.info(`Embedding Worker: Starting queue processing with ${jobQueue.length} jobs`);

  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    processingJobs.set(job.id, job);

    try {
      logger.info(`Embedding Worker: Processing job ${job.id} (${job.type})`);

      if (job.type === 'process-document') {
        await processDocument(job);
      } else if (job.type === 'generate-embedding') {
        await generateEmbedding(job);
      }

      processingJobs.delete(job.id);
      logger.info(`Embedding Worker: Completed job ${job.id}`);

    } catch (error) {
      logger.error(`Embedding Worker: Job ${job.id} failed:`, error);
      
      job.retries++;
      if (job.retries < job.maxRetries) {
        // Retry job
        logger.info(`Embedding Worker: Retrying job ${job.id} (attempt ${job.retries + 1})`);
        jobQueue.push(job);
      } else {
        logger.error(`Embedding Worker: Job ${job.id} failed after ${job.maxRetries} attempts`);
        processingJobs.delete(job.id);
      }
    }

    // Small delay between jobs to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  isProcessing = false;
  logger.info('Embedding Worker: Queue processing completed');
}

// Process document job
async function processDocument(job) {
  const { documentId } = job;
  
  const document = await Document.findById(documentId);
  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  // Extract text content if not already done
  if (!document.content || document.content.trim().length === 0) {
    logger.info(`Embedding Worker: Extracting content for document ${documentId}`);
    
    const filePath = document.filePath;
    if (filePath) {
      const extractedContent = await documentProcessor.extractText(filePath, document.fileType);
      document.content = extractedContent;
      await document.save();
    }
  }

  // Generate embedding if content exists
  if (document.content && document.content.trim().length > 0) {
    logger.info(`Embedding Worker: Generating embedding for document ${documentId}`);
    
    const embedding = await embeddingService.generate(document.content);
    if (embedding) {
      document.embedding = embedding;
      document.embeddingGenerated = true;
      await document.save();
      logger.info(`Embedding Worker: Successfully generated embedding for document ${documentId}`);
    }
  }
}

// Generate embedding job
async function generateEmbedding(job) {
  const { documentId, text } = job;
  
  if (!text || text.trim().length === 0) {
    throw new Error('No text provided for embedding generation');
  }

  const embedding = await embeddingService.generate(text);
  if (!embedding) {
    throw new Error('Failed to generate embedding');
  }

  // Update document with embedding
  await Document.findByIdAndUpdate(documentId, {
    embedding: embedding,
    embeddingGenerated: true,
    lastEmbeddingUpdate: new Date()
  });

  logger.info(`Embedding Worker: Generated embedding for document ${documentId}`);
}

// Get job status
app.get('/api/job/:jobId', (req, res) => {
  const { jobId } = req.params;
  const numericJobId = parseFloat(jobId);

  // Check if job is currently processing
  if (processingJobs.has(numericJobId)) {
    return res.json({
      jobId: numericJobId,
      status: 'processing',
      timestamp: new Date().toISOString()
    });
  }

  // Check if job is in queue
  const queuedJob = jobQueue.find(job => job.id === numericJobId);
  if (queuedJob) {
    const position = jobQueue.indexOf(queuedJob) + 1;
    return res.json({
      jobId: numericJobId,
      status: 'queued',
      position,
      timestamp: new Date().toISOString()
    });
  }

  // Job not found (completed or failed)
  res.json({
    jobId: numericJobId,
    status: 'completed',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Embedding Worker: Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the embedding worker
app.listen(PORT, () => {
  logger.info(`Embedding Worker started on port ${PORT}`);
  
  // Signal PM2 that the app is ready
  if (process.send) {
    process.send('ready');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Embedding Worker: Shutting down gracefully...');
  isProcessing = false;
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Embedding Worker: Received SIGTERM, shutting down gracefully...');
  isProcessing = false;
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;


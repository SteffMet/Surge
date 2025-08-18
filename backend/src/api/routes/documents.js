const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult, param } = require('express-validator');

const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/auth');
const Document = require('../../models/Document');
const documentProcessor = require('../../services/documentProcessor');
const embeddingService = require('../../services/embeddingService');
const logger = require('../../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(process.env.STORAGE_PATH || './storage', 'uploads');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB default
  },
  fileFilter: (req, file, cb) => {
    const supportedTypes = documentProcessor.getSupportedTypes();
    if (supportedTypes.includes(file.mimetype) || file.mimetype === 'application/zip') {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

/**
 * @route   GET /api/documents
 * @desc    Get all documents (with pagination and filtering)
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Filter by folder
    if (req.query.folder) {
      filter.folder = req.query.folder;
    }
    
    // Filter by file type
    if (req.query.type) {
      filter.mimeType = new RegExp(req.query.type, 'i');
    }
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Search by name or tags
    if (req.query.search) {
      filter.$or = [
        { originalName: new RegExp(req.query.search, 'i') },
        { tags: new RegExp(req.query.search, 'i') }
      ];
    }

    const documents = await Document.find(filter)
      .populate('uploadedBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Document.countDocuments(filter);

    res.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   POST /api/documents/upload
 * @desc    Upload single document
 * @access  Private (basic-upload or admin)
 */
router.post('/upload',
  auth,
  requireRole(['basic', 'basic-upload', 'admin']),
  (req, res, next) => {
    upload.single('document')(req, res, (err) => {
      if (err) {
        logger.error('Multer upload error:', err);
        return res.status(400).json({ errors: [{ msg: err.message }] });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      console.log('Upload request received');
      console.log('File:', req.file);
      console.log('Body:', req.body);
      console.log('Headers:', req.headers);

      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ errors: [{ msg: 'No file uploaded. Please select a file.' }] });
      }

      const { folder = '/', tags = '', title = req.file.originalname } = req.body;
      const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

      // Create document record
      const document = new Document({
        title, // Use provided title or fall back to original filename
        originalName: req.file.originalname,
        storedName: req.file.filename,
        path: req.file.path,
        folder,
        mimeType: req.file.mimetype,
        size: req.file.size,
        tags: tagsArray,
        uploadedBy: req.user.id,
        status: 'pending'
      });

      await document.save();

      // Process document asynchronously
      processDocumentAsync(document);

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: await document.populate('uploadedBy', 'username email')
      });
    } catch (error) {
      logger.error('Error uploading document:', error);
      
      // Clean up uploaded file if document creation failed
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.error('Error cleaning up uploaded file:', unlinkError);
        }
      }
      
      res.status(500).json({ errors: [{ msg: 'Upload failed' }] });
    }
  }
);

/**
 * @route   POST /api/documents/upload-zip
 * @desc    Upload and extract ZIP file
 * @access  Private (basic-upload or admin)
 */
router.post('/upload-zip',
  auth,
  requireRole(['basic', 'basic-upload', 'admin']),
  upload.single('zipfile'),
  async (req, res) => {
    try {
      if (!req.file || req.file.mimetype !== 'application/zip') {
        return res.status(400).json({ errors: [{ msg: 'Please upload a ZIP file' }] });
      }

      const { folder = '/' } = req.body;
      const extractPath = path.join(path.dirname(req.file.path), 'extracted', uuidv4());
      
      // Create extraction directory
      await fs.mkdir(extractPath, { recursive: true });

      // Extract ZIP file
      const zip = new AdmZip(req.file.path);
      zip.extractAllTo(extractPath, true);

      // Process extracted files
      const results = await processExtractedFiles(extractPath, folder, req.user.id);

      // Clean up ZIP file and extraction directory
      await fs.unlink(req.file.path);
      await fs.rmdir(extractPath, { recursive: true });

      res.status(201).json({
        message: `ZIP file processed successfully. ${results.success} files uploaded, ${results.failed} failed.`,
        results
      });
    } catch (error) {
      logger.error('Error processing ZIP upload:', error);
      res.status(500).json({ errors: [{ msg: 'ZIP processing failed' }] });
    }
  }
);

/**
 * @route   GET /api/documents/:id
 * @desc    Get single document
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'username email');

    if (!document) {
      return res.status(404).json({ errors: [{ msg: 'Document not found' }] });
    }

    res.json(document);
  } catch (error) {
    logger.error('Error fetching document:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   GET /api/documents/:id/download
 * @desc    Download document file
 * @access  Private
 */
router.get('/:id/download', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ errors: [{ msg: 'Document not found' }] });
    }

    // Check if file exists
    try {
      await fs.access(document.path);
    } catch {
      return res.status(404).json({ errors: [{ msg: 'File not found on disk' }] });
    }

    res.download(document.path, document.originalName);
  } catch (error) {
    logger.error('Error downloading document:', error);
    res.status(500).json({ errors: [{ msg: 'Download failed' }] });
  }
});

/**
 * @route   PUT /api/documents/:id
 * @desc    Update document metadata 
 * @access  Private (admin or uploader) 
 */
router.put('/:documentId', [
  auth,
  param('documentId').isMongoId(),
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('content').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Find the document by id
    const doc = await Document.findById(req.params.documentId);

    if (!doc) {
        return res.status(404).json({ errors: [{ msg: 'Document not found' }] });
    }

    // Check permissions (admin or original uploader)
    if (req.user.role !== 'admin' && doc.uploadedBy.toString() !== req.user.id) {
        return res.status(403).json({ errors: [{ msg: 'Not authorised to update this document' }] });
    }

    if (req.body.title) doc.title = req.body.title;
    if (req.body.description) doc.description = req.body.description;
    if (req.body.content) doc.content = req.body.content;

    await doc.save();
    res.json(doc);
  } catch (error) {
    logger.error('Error updating document:', error);
    res.status(500).json({ errors: [{ msg: 'Update failed' }] });
  }
});

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document
 * @access  Private (admin or uploader)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ errors: [{ msg: 'Document not found' }] });
    }

    // Check permissions (admin or original uploader)
    if (req.user.role !== 'admin' && document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ errors: [{ msg: 'Not authorised to delete this document' }] });
    }

    // Delete file from disk
    try {
      await fs.unlink(document.path);
    } catch (error) {
      logger.warn(`Could not delete file from disk: ${document.path}`, error);
    }

    // Delete document record
    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({ errors: [{ msg: 'Delete failed' }] });
  }
});

/**
 * @route   GET /api/documents/folders/list
 * @desc    Get list of all folders
 * @access  Private
 */
router.get('/folders/list', auth, async (req, res) => {
  try {
    const folders = await Document.distinct('folder');
    res.json(folders.sort());
  } catch (error) {
    logger.error('Error fetching folders:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   POST /api/documents/reembed
 * @desc    Recompute embeddings for processed documents (admin only)
 */
router.post('/reembed', auth, requireRole(['admin']), async (req, res) => {
  try {
    const limit = parseInt(req.body.limit) || 100;
    const docs = await Document.find({ status: 'processed' }).limit(limit);
    let updated = 0;
    for (const d of docs) {
      try {
        d.embedding = await embeddingService.generate((d.extractedText || '').substring(0, 8000));
        await d.save();
        updated++;
      } catch (e) {
        logger.warn('Re-embed failed for doc', d._id.toString(), e.message);
      }
    }
    res.json({ message: 'Re-embedding complete', updated });
  } catch (e) {
    res.status(500).json({ errors: [{ msg: e.message }] });
  }
});

// Helper function to process document asynchronously
async function processDocumentAsync(document) {
  try {
    logger.info(`Starting async processing for document: ${document.originalName}`);
    
    const result = await documentProcessor.processDocument(document.path, document.mimeType);
    
    document.extractedText = result.text;
    document.metadata = result.metadata;
    document.ocrApplied = result.ocrApplied;
    document.status = 'processed';
    try {
      document.embedding = await embeddingService.generate((document.extractedText || '').substring(0, 5000));
    } catch (embErr) {
      logger.warn('Embedding generation failed:', embErr.message);
    }
    
    await document.save();
    
    logger.info(`Successfully processed document: ${document.originalName}`);
  } catch (error) {
    logger.error(`Error processing document ${document.originalName}:`, error);
    
    document.status = 'failed';
    document.error = error.message;
    await document.save();
  }
}

// Helper function to process extracted files from ZIP
async function processExtractedFiles(extractPath, folder, userId) {
  const results = { success: 0, failed: 0, files: [] };
  
  async function processDirectory(dirPath, currentFolder) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        const subFolder = path.join(currentFolder, entry.name).replace(/\\/g, '/');
        await processDirectory(fullPath, subFolder);
      } else {
        try {
          const stats = await fs.stat(fullPath);
          const mimeType = getMimeType(entry.name);
          
          if (documentProcessor.isSupported(mimeType)) {
            // Move file to uploads directory
            const storedName = `${uuidv4()}-${Date.now()}${path.extname(entry.name)}`;
            const uploadPath = path.join(process.env.STORAGE_PATH || './storage', 'uploads');
            const newPath = path.join(uploadPath, storedName);
            
            await fs.mkdir(uploadPath, { recursive: true });
            await fs.copyFile(fullPath, newPath);
            
            // Create document record
            const document = new Document({
              originalName: entry.name,
              storedName,
              path: newPath,
              folder: currentFolder,
              mimeType,
              size: stats.size,
              uploadedBy: userId,
              status: 'pending'
            });
            
            await document.save();
            
            // Process document asynchronously
            processDocumentAsync(document);
            
            results.success++;
            results.files.push({ name: entry.name, status: 'success' });
          } else {
            results.failed++;
            results.files.push({ name: entry.name, status: 'unsupported' });
          }
        } catch (error) {
          logger.error(`Error processing file ${entry.name}:`, error);
          results.failed++;
          results.files.push({ name: entry.name, status: 'error', error: error.message });
        }
      }
    }
  }
  
  await processDirectory(extractPath, folder);
  return results;
}

// Helper function to determine MIME type from file extension
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.bmp': 'image/bmp'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = router;
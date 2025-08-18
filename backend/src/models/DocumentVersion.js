const mongoose = require('mongoose');

const DocumentVersionSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  version: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  contentHash: {
    type: String,
    required: true,
    index: true
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  changesSummary: {
    type: String,
    default: ''
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  metadata: {
    wordsAdded: {
      type: Number,
      default: 0
    },
    wordsRemoved: {
      type: Number,
      default: 0
    },
    charactersAdded: {
      type: Number,
      default: 0
    },
    charactersRemoved: {
      type: Number,
      default: 0
    },
    sectionsAdded: {
      type: Number,
      default: 0
    },
    sectionsRemoved: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String
  }],
  isAutoSave: {
    type: Boolean,
    default: false
  },
  parentVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentVersion',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for efficient version queries
DocumentVersionSchema.index({ document: 1, version: -1 });
DocumentVersionSchema.index({ document: 1, createdAt: -1 });
DocumentVersionSchema.index({ workspace: 1, createdAt: -1 });

// Virtual for change statistics
DocumentVersionSchema.virtual('changeStats').get(function() {
  return {
    totalWordsChanged: this.metadata.wordsAdded + this.metadata.wordsRemoved,
    totalCharactersChanged: this.metadata.charactersAdded + this.metadata.charactersRemoved,
    netWordsChange: this.metadata.wordsAdded - this.metadata.wordsRemoved,
    netCharactersChange: this.metadata.charactersAdded - this.metadata.charactersRemoved
  };
});

// Static method to get version history for document
DocumentVersionSchema.statics.getDocumentHistory = function(documentId, limit = 50) {
  return this.find({ document: documentId })
    .populate('author', 'username email')
    .sort({ version: -1 })
    .limit(limit);
};

// Static method to get latest version
DocumentVersionSchema.statics.getLatestVersion = function(documentId) {
  return this.findOne({ document: documentId })
    .populate('author', 'username email')
    .sort({ version: -1 });
};

// Static method to compare versions
DocumentVersionSchema.statics.compareVersions = async function(documentId, fromVersion, toVersion) {
  const versions = await this.find({
    document: documentId,
    version: { $in: [fromVersion, toVersion] }
  }).sort({ version: 1 });
  
  if (versions.length !== 2) {
    throw new Error('One or both versions not found');
  }
  
  return {
    from: versions[0],
    to: versions[1],
    diff: versions[1].changes
  };
};

// Instance method to create diff with previous version
DocumentVersionSchema.methods.generateDiff = async function(previousContent) {
  const diff = require('diff');
  const textDiff = diff.createPatch(
    `Version ${this.version - 1}`,
    previousContent || '',
    this.content,
    `Version ${this.version - 1}`,
    `Version ${this.version}`
  );
  
  this.changes = {
    textDiff,
    wordCount: this.content.split(/\s+/).length,
    characterCount: this.content.length
  };
  
  return this.save();
};

module.exports = mongoose.model('DocumentVersion', DocumentVersionSchema);
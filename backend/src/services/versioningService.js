const DocumentVersion = require('../models/DocumentVersion');
const Document = require('../models/Document');
const { diff } = require('diff');
const crypto = require('crypto');

class VersioningService {
  constructor() {
    this.autoSaveInterval = 30000; // 30 seconds
    this.maxVersionsPerDocument = 100;
  }

  /**
   * Create a new version of a document
   */
  async createVersion(documentId, content, title, authorId, workspaceId, options = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Get the latest version to determine the next version number
      const latestVersion = await DocumentVersion.findOne({ document: documentId })
        .sort({ version: -1 });

      const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

      // Create content hash for deduplication
      const contentHash = crypto.createHash('sha256').update(content).digest('hex');

      // Check if content has actually changed
      if (latestVersion && latestVersion.contentHash === contentHash && !options.forceNewVersion) {
        return latestVersion; // No changes, return existing version
      }

      // Calculate changes from previous version
      const changes = latestVersion ? this.calculateChanges(latestVersion.content, content) : null;

      // Create version record
      const versionData = {
        document: documentId,
        version: nextVersion,
        title: title || document.originalName,
        content,
        contentHash,
        author: authorId,
        workspace: workspaceId,
        changes: changes ? changes.diff : null,
        changesSummary: changes ? changes.summary : 'Initial version',
        metadata: changes ? changes.metadata : {},
        isAutoSave: options.isAutoSave || false,
        parentVersion: latestVersion ? latestVersion._id : null,
        tags: options.tags || []
      };

      const version = new DocumentVersion(versionData);
      await version.save();

      // Update document with latest content and version info
      await Document.findByIdAndUpdate(documentId, {
        extractedText: content,
        originalName: title || document.originalName,
        $inc: { version: 1 }
      });

      // Clean up old versions if necessary
      await this.cleanupOldVersions(documentId);

      return version;

    } catch (error) {
      console.error('Error creating document version:', error);
      throw error;
    }
  }

  /**
   * Calculate changes between two versions
   */
  calculateChanges(oldContent, newContent) {
    const textDiff = diff.createPatch(
      'previous',
      oldContent || '',
      newContent,
      'Previous Version',
      'Current Version'
    );

    const wordDiff = diff.diffWords(oldContent || '', newContent);
    const charDiff = diff.diffChars(oldContent || '', newContent);

    // Calculate statistics
    let wordsAdded = 0, wordsRemoved = 0;
    let charactersAdded = 0, charactersRemoved = 0;

    wordDiff.forEach(part => {
      const wordCount = part.value.split(/\s+/).filter(word => word.length > 0).length;
      if (part.added) {
        wordsAdded += wordCount;
      } else if (part.removed) {
        wordsRemoved += wordCount;
      }
    });

    charDiff.forEach(part => {
      if (part.added) {
        charactersAdded += part.value.length;
      } else if (part.removed) {
        charactersRemoved += part.value.length;
      }
    });

    // Generate summary
    const summary = this.generateChangeSummary({
      wordsAdded,
      wordsRemoved,
      charactersAdded,
      charactersRemoved
    });

    return {
      diff: {
        textDiff,
        wordDiff,
        charDiff
      },
      metadata: {
        wordsAdded,
        wordsRemoved,
        charactersAdded,
        charactersRemoved,
        sectionsAdded: this.countSections(newContent) - this.countSections(oldContent || ''),
        sectionsRemoved: Math.max(0, this.countSections(oldContent || '') - this.countSections(newContent))
      },
      summary
    };
  }

  /**
   * Generate a human-readable summary of changes
   */
  generateChangeSummary(stats) {
    const { wordsAdded, wordsRemoved, charactersAdded, charactersRemoved } = stats;
    
    if (wordsAdded === 0 && wordsRemoved === 0) {
      return 'No content changes';
    }

    const parts = [];
    
    if (wordsAdded > 0) {
      parts.push(`+${wordsAdded} words`);
    }
    
    if (wordsRemoved > 0) {
      parts.push(`-${wordsRemoved} words`);
    }

    const netChange = wordsAdded - wordsRemoved;
    const changeType = netChange > 0 ? 'expansion' : netChange < 0 ? 'reduction' : 'modification';
    
    return `${parts.join(', ')} (${changeType})`;
  }

  /**
   * Count sections in content (basic implementation based on headers)
   */
  countSections(content) {
    const headerRegex = /^#{1,6}\s+/gm;
    const matches = content.match(headerRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Get version history for a document
   */
  async getDocumentHistory(documentId, options = {}) {
    const {
      limit = 50,
      page = 1,
      includeContent = false,
      authorId = null
    } = options;

    const query = { document: documentId };
    if (authorId) {
      query.author = authorId;
    }

    const projection = includeContent ? {} : { content: 0 };

    const versions = await DocumentVersion.find(query, projection)
      .populate('author', 'username email')
      .sort({ version: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await DocumentVersion.countDocuments(query);

    return {
      versions,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        limit,
        count: total
      }
    };
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId, includeContent = false) {
    const projection = includeContent ? {} : { content: 0 };
    
    return await DocumentVersion.findById(versionId, projection)
      .populate('author', 'username email')
      .populate('document', 'originalName');
  }

  /**
   * Compare two versions
   */
  async compareVersions(documentId, fromVersion, toVersion) {
    const versions = await DocumentVersion.find({
      document: documentId,
      version: { $in: [fromVersion, toVersion] }
    }).sort({ version: 1 });

    if (versions.length !== 2) {
      throw new Error('One or both versions not found');
    }

    const [fromVer, toVer] = versions;
    const changes = this.calculateChanges(fromVer.content, toVer.content);

    return {
      from: {
        version: fromVer.version,
        author: fromVer.author,
        createdAt: fromVer.createdAt,
        title: fromVer.title
      },
      to: {
        version: toVer.version,
        author: toVer.author,
        createdAt: toVer.createdAt,
        title: toVer.title
      },
      changes: changes.diff,
      metadata: changes.metadata,
      summary: changes.summary
    };
  }

  /**
   * Restore document to a specific version
   */
  async restoreToVersion(documentId, versionNumber, restoredBy, workspaceId) {
    const targetVersion = await DocumentVersion.findOne({
      document: documentId,
      version: versionNumber
    });

    if (!targetVersion) {
      throw new Error('Version not found');
    }

    // Create a new version with the restored content
    const restoredVersion = await this.createVersion(
      documentId,
      targetVersion.content,
      targetVersion.title,
      restoredBy,
      workspaceId,
      {
        tags: ['restored'],
        forceNewVersion: true
      }
    );

    // Update version with restore information
    restoredVersion.changesSummary = `Restored from version ${versionNumber}`;
    restoredVersion.metadata.restoredFrom = {
      version: versionNumber,
      versionId: targetVersion._id,
      restoredAt: new Date()
    };
    await restoredVersion.save();

    return restoredVersion;
  }

  /**
   * Get document statistics
   */
  async getDocumentVersionStats(documentId) {
    const stats = await DocumentVersion.aggregate([
      { $match: { document: documentId } },
      {
        $group: {
          _id: null,
          totalVersions: { $sum: 1 },
          totalWordsAdded: { $sum: '$metadata.wordsAdded' },
          totalWordsRemoved: { $sum: '$metadata.wordsRemoved' },
          totalCharactersAdded: { $sum: '$metadata.charactersAdded' },
          totalCharactersRemoved: { $sum: '$metadata.charactersRemoved' },
          contributors: { $addToSet: '$author' },
          firstVersion: { $min: '$createdAt' },
          lastVersion: { $max: '$createdAt' },
          autoSaveCount: {
            $sum: { $cond: [{ $eq: ['$isAutoSave', true] }, 1, 0] }
          },
          manualSaveCount: {
            $sum: { $cond: [{ $eq: ['$isAutoSave', false] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalVersions: 0,
      totalWordsAdded: 0,
      totalWordsRemoved: 0,
      totalCharactersAdded: 0,
      totalCharactersRemoved: 0,
      contributors: [],
      firstVersion: null,
      lastVersion: null,
      autoSaveCount: 0,
      manualSaveCount: 0
    };

    result.contributorCount = result.contributors.length;
    result.netWordChange = result.totalWordsAdded - result.totalWordsRemoved;
    result.netCharacterChange = result.totalCharactersAdded - result.totalCharactersRemoved;
    
    if (result.firstVersion && result.lastVersion) {
      result.developmentDuration = result.lastVersion - result.firstVersion;
    }

    return result;
  }

  /**
   * Clean up old versions to prevent database bloat
   */
  async cleanupOldVersions(documentId) {
    const totalVersions = await DocumentVersion.countDocuments({ document: documentId });
    
    if (totalVersions > this.maxVersionsPerDocument) {
      const versionsToDelete = totalVersions - this.maxVersionsPerDocument;
      
      // Keep the most recent versions and delete the oldest ones
      // But always keep the first version as historical record
      const oldVersions = await DocumentVersion.find({ document: documentId })
        .sort({ version: 1 })
        .skip(1) // Skip first version
        .limit(versionsToDelete);

      const versionIds = oldVersions.map(v => v._id);
      await DocumentVersion.deleteMany({ _id: { $in: versionIds } });
      
      console.log(`Cleaned up ${versionIds.length} old versions for document ${documentId}`);
    }
  }

  /**
   * Setup auto-save for a document
   */
  setupAutoSave(documentId, getContentCallback, authorId, workspaceId) {
    const intervalId = setInterval(async () => {
      try {
        const content = await getContentCallback();
        if (content) {
          await this.createVersion(documentId, content, null, authorId, workspaceId, {
            isAutoSave: true
          });
        }
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    }, this.autoSaveInterval);

    return intervalId;
  }

  /**
   * Clear auto-save interval
   */
  clearAutoSave(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }

  /**
   * Get version tree for visualization
   */
  async getVersionTree(documentId) {
    const versions = await DocumentVersion.find({ document: documentId })
      .populate('author', 'username')
      .sort({ version: 1 });

    // Build tree structure
    const tree = versions.map(version => ({
      id: version._id,
      version: version.version,
      title: version.title,
      author: version.author,
      createdAt: version.createdAt,
      isAutoSave: version.isAutoSave,
      changesSummary: version.changesSummary,
      parentVersion: version.parentVersion,
      metadata: {
        wordsAdded: version.metadata.wordsAdded || 0,
        wordsRemoved: version.metadata.wordsRemoved || 0,
        netChange: (version.metadata.wordsAdded || 0) - (version.metadata.wordsRemoved || 0)
      }
    }));

    return tree;
  }
}

module.exports = new VersioningService();
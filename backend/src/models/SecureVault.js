const mongoose = require('mongoose');
const crypto = require('crypto');

const PasswordEntrySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  username: {
    type: String,
    trim: true,
    maxlength: 100
  },
  encryptedPassword: {
    type: String,
    required: true
  },
  url: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  category: {
    type: String,
    enum: ['server', 'database', 'application', 'network', 'email', 'cloud', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  iv: {
    type: String,
    required: true // Initialization vector for encryption
  },
  lastAccessed: {
    type: Date,
    default: null
  },
  accessCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const SecureVaultSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    index: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  passwords: [PasswordEntrySchema],
  
  // Access control
  accessPolicy: {
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowedUsers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permissions: [{
        type: String,
        enum: ['read', 'write', 'delete', 'share']
      }],
      grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      grantedAt: {
        type: Date,
        default: Date.now
      },
      expiresAt: {
        type: Date,
        default: null
      }
    }],
    allowedRoles: [{
      type: String,
      enum: ['admin', 'editor', 'viewer']
    }],
    ipWhitelist: [{
      type: String // IP addresses or CIDR blocks
    }],
    timeRestrictions: {
      startTime: String, // HH:MM format
      endTime: String,   // HH:MM format
      timezone: {
        type: String,
        default: 'UTC'
      },
      weekdays: [{
        type: Number, // 0-6 (Sunday-Saturday)
        min: 0,
        max: 6
      }]
    }
  },

  // Security settings
  security: {
    encryptionVersion: {
      type: String,
      default: 'v1'
    },
    rotationPolicy: {
      enabled: {
        type: Boolean,
        default: false
      },
      intervalDays: {
        type: Number,
        default: 90
      },
      lastRotation: Date
    },
    auditSettings: {
      logAccess: {
        type: Boolean,
        default: true
      },
      logModifications: {
        type: Boolean,
        default: true
      },
      alertOnSuspiciousActivity: {
        type: Boolean,
        default: true
      }
    }
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and security
SecureVaultSchema.index({ workspace: 1, owner: 1 });
SecureVaultSchema.index({ 'accessPolicy.allowedUsers.user': 1 });
SecureVaultSchema.index({ 'passwords.category': 1 });
SecureVaultSchema.index({ 'passwords.expiresAt': 1 });

// Virtual for active passwords count
SecureVaultSchema.virtual('activePasswordCount').get(function() {
  return this.passwords.filter(p => p.isActive && (!p.expiresAt || p.expiresAt > new Date())).length;
});

// Virtual for expired passwords count
SecureVaultSchema.virtual('expiredPasswordCount').get(function() {
  return this.passwords.filter(p => p.expiresAt && p.expiresAt <= new Date()).length;
});

// Instance method to check if user has access
SecureVaultSchema.methods.hasAccess = function(userId, permission = 'read') {
  // Owner always has full access
  if (this.owner.toString() === userId.toString()) {
    return true;
  }

  // Check if user is in allowed users list
  const userAccess = this.accessPolicy.allowedUsers.find(
    access => access.user.toString() === userId.toString() &&
              (!access.expiresAt || access.expiresAt > new Date())
  );

  if (userAccess && userAccess.permissions.includes(permission)) {
    return true;
  }

  return false;
};

// Instance method to check time-based access
SecureVaultSchema.methods.isAccessTimeAllowed = function() {
  const restrictions = this.accessPolicy.timeRestrictions;
  if (!restrictions.startTime || !restrictions.endTime) {
    return true;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentWeekday = now.getDay();

  // Check weekday restrictions
  if (restrictions.weekdays && restrictions.weekdays.length > 0) {
    if (!restrictions.weekdays.includes(currentWeekday)) {
      return false;
    }
  }

  // Check time restrictions
  const [startHour, startMinute] = restrictions.startTime.split(':').map(Number);
  const [endHour, endMinute] = restrictions.endTime.split(':').map(Number);

  const currentTime = currentHour * 60 + currentMinute;
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  if (startTime <= endTime) {
    // Same day range
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Overnight range
    return currentTime >= startTime || currentTime <= endTime;
  }
};

// Instance method to check IP access
SecureVaultSchema.methods.isIPAllowed = function(clientIP) {
  if (!this.accessPolicy.ipWhitelist || this.accessPolicy.ipWhitelist.length === 0) {
    return true;
  }

  // Basic IP checking (would need more sophisticated CIDR matching in production)
  return this.accessPolicy.ipWhitelist.some(allowedIP => {
    if (allowedIP.includes('/')) {
      // CIDR notation - simplified check
      const [network, prefixLength] = allowedIP.split('/');
      return clientIP.startsWith(network.split('.').slice(0, Math.floor(prefixLength / 8)).join('.'));
    } else {
      return clientIP === allowedIP;
    }
  });
};

// Instance method to add password entry
SecureVaultSchema.methods.addPassword = function(passwordData, encryptionKey) {
  const { password, ...otherData } = passwordData;
  
  // Generate random IV for this entry
  const iv = crypto.randomBytes(16);
  
  // Encrypt the password
  const cipher = crypto.createCipher('aes-256-gcm', encryptionKey);
  cipher.setAAD(Buffer.from(this._id.toString()));
  
  let encryptedPassword = cipher.update(password, 'utf8', 'hex');
  encryptedPassword += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  const passwordEntry = {
    ...otherData,
    encryptedPassword: encryptedPassword + ':' + authTag.toString('hex'),
    iv: iv.toString('hex')
  };

  this.passwords.push(passwordEntry);
  return this.save();
};

// Instance method to decrypt password
SecureVaultSchema.methods.decryptPassword = function(passwordId, encryptionKey) {
  const passwordEntry = this.passwords.id(passwordId);
  if (!passwordEntry) {
    throw new Error('Password entry not found');
  }

  try {
    const [encryptedData, authTagHex] = passwordEntry.encryptedPassword.split(':');
    const authTag = Buffer.from(authTagHex, 'hex');
    const iv = Buffer.from(passwordEntry.iv, 'hex');

    const decipher = crypto.createDecipher('aes-256-gcm', encryptionKey);
    decipher.setAAD(Buffer.from(this._id.toString()));
    decipher.setAuthTag(authTag);

    let decryptedPassword = decipher.update(encryptedData, 'hex', 'utf8');
    decryptedPassword += decipher.final('utf8');

    // Update access tracking
    passwordEntry.lastAccessed = new Date();
    passwordEntry.accessCount += 1;
    
    return decryptedPassword;
  } catch (error) {
    throw new Error('Failed to decrypt password');
  }
};

// Instance method to grant access to user
SecureVaultSchema.methods.grantAccess = function(userId, permissions, grantedBy, expiresAt = null) {
  // Remove existing access for this user
  this.accessPolicy.allowedUsers = this.accessPolicy.allowedUsers.filter(
    access => access.user.toString() !== userId.toString()
  );

  // Add new access
  this.accessPolicy.allowedUsers.push({
    user: userId,
    permissions,
    grantedBy,
    grantedAt: new Date(),
    expiresAt
  });

  return this.save();
};

// Instance method to revoke access
SecureVaultSchema.methods.revokeAccess = function(userId) {
  this.accessPolicy.allowedUsers = this.accessPolicy.allowedUsers.filter(
    access => access.user.toString() !== userId.toString()
  );
  return this.save();
};

// Static method to find accessible vaults for user
SecureVaultSchema.statics.findAccessibleVaults = function(userId, workspaceId = null) {
  const query = {
    $or: [
      { owner: userId },
      { 'accessPolicy.allowedUsers.user': userId }
    ],
    isActive: true
  };

  if (workspaceId) {
    query.workspace = workspaceId;
  }

  return this.find(query)
    .populate('owner', 'username email')
    .populate('workspace', 'name')
    .populate('accessPolicy.allowedUsers.user', 'username email')
    .sort({ updatedAt: -1 });
};

// Static method to get vault statistics
SecureVaultSchema.statics.getVaultStats = async function(workspaceId) {
  const stats = await this.aggregate([
    { $match: { workspace: mongoose.Types.ObjectId(workspaceId), isActive: true } },
    {
      $group: {
        _id: null,
        totalVaults: { $sum: 1 },
        totalPasswords: { $sum: { $size: '$passwords' } },
        avgPasswordsPerVault: { $avg: { $size: '$passwords' } }
      }
    }
  ]);

  return stats[0] || {
    totalVaults: 0,
    totalPasswords: 0,
    avgPasswordsPerVault: 0
  };
};

module.exports = mongoose.model('SecureVault', SecureVaultSchema);
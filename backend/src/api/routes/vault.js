const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { checkWorkspaceAccess } = require('../../middleware/workspaceAuth');
const SecureVault = require('../../models/SecureVault');
const { AnalyticsEvent } = require('../../models/Analytics');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Rate limiting for sensitive operations
const vaultAccessLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many vault access attempts, please try again later'
});

const passwordDecryptLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 password decryptions per windowMs
  message: 'Too many password decrypt attempts, please try again later'
});

// Middleware to validate vault access
const validateVaultAccess = async (req, res, next) => {
  try {
    const { vaultId } = req.params;
    const vault = await SecureVault.findById(vaultId);
    
    if (!vault) {
      return res.status(404).json({ message: 'Vault not found' });
    }

    if (!vault.hasAccess(req.user.userId, req.method === 'GET' ? 'read' : 'write')) {
      return res.status(403).json({ message: 'Access denied to vault' });
    }

    // Check time-based access restrictions
    if (!vault.isAccessTimeAllowed()) {
      return res.status(403).json({ 
        message: 'Access denied: Outside allowed time window',
        allowedTime: vault.accessPolicy.timeRestrictions
      });
    }

    // Check IP restrictions
    if (!vault.isIPAllowed(req.ip)) {
      return res.status(403).json({ 
        message: 'Access denied: IP address not whitelisted' 
      });
    }

    req.vault = vault;
    next();
  } catch (error) {
    console.error('Vault access validation error:', error);
    res.status(500).json({ message: 'Vault access validation failed' });
  }
};

// Get accessible vaults for user
router.get('/', auth, vaultAccessLimit, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    
    const vaults = await SecureVault.findAccessibleVaults(req.user.userId, workspaceId);
    
    // Remove sensitive data from response
    const sanitizedVaults = vaults.map(vault => ({
      _id: vault._id,
      name: vault.name,
      description: vault.description,
      workspace: vault.workspace,
      owner: vault.owner,
      activePasswordCount: vault.activePasswordCount,
      expiredPasswordCount: vault.expiredPasswordCount,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
      hasFullAccess: vault.owner.toString() === req.user.userId
    }));

    res.json(sanitizedVaults);
  } catch (error) {
    console.error('Error fetching vaults:', error);
    res.status(500).json({ message: 'Failed to fetch vaults' });
  }
});

// Get specific vault
router.get('/:vaultId', auth, vaultAccessLimit, validateVaultAccess, async (req, res) => {
  try {
    const vault = req.vault;
    
    // Sanitize passwords - don't include encrypted data in basic view
    const sanitizedPasswords = vault.passwords
      .filter(p => p.isActive)
      .map(password => ({
        _id: password._id,
        title: password.title,
        username: password.username,
        url: password.url,
        category: password.category,
        tags: password.tags,
        lastAccessed: password.lastAccessed,
        accessCount: password.accessCount,
        expiresAt: password.expiresAt,
        createdAt: password.createdAt,
        isExpired: password.expiresAt && password.expiresAt <= new Date()
      }));

    // Log vault access
    await AnalyticsEvent.logEvent({
      eventType: 'vault_access',
      user: req.user.userId,
      workspace: vault.workspace,
      metadata: {
        vaultId: vault._id,
        action: 'view',
        passwordCount: sanitizedPasswords.length
      }
    });

    res.json({
      _id: vault._id,
      name: vault.name,
      description: vault.description,
      workspace: vault.workspace,
      owner: vault.owner,
      passwords: sanitizedPasswords,
      accessPolicy: {
        requireApproval: vault.accessPolicy.requireApproval,
        allowedUsers: vault.accessPolicy.allowedUsers,
        timeRestrictions: vault.accessPolicy.timeRestrictions
      },
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
      hasFullAccess: vault.owner.toString() === req.user.userId
    });

  } catch (error) {
    console.error('Error fetching vault:', error);
    res.status(500).json({ message: 'Failed to fetch vault' });
  }
});

// Create new vault
router.post('/', [
  auth,
  checkWorkspaceAccess,
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, accessPolicy = {} } = req.body;

    const vault = new SecureVault({
      name,
      description,
      workspace: req.workspace._id,
      owner: req.user.userId,
      accessPolicy: {
        requireApproval: accessPolicy.requireApproval || false,
        allowedUsers: [],
        allowedRoles: accessPolicy.allowedRoles || [],
        ipWhitelist: accessPolicy.ipWhitelist || [],
        timeRestrictions: accessPolicy.timeRestrictions || {}
      }
    });

    await vault.save();

    // Log vault creation
    await AnalyticsEvent.logEvent({
      eventType: 'vault_create',
      user: req.user.userId,
      workspace: req.workspace._id,
      metadata: {
        vaultId: vault._id,
        vaultName: name
      }
    });

    res.status(201).json({
      _id: vault._id,
      name: vault.name,
      description: vault.description,
      workspace: vault.workspace,
      owner: vault.owner,
      createdAt: vault.createdAt
    });

  } catch (error) {
    console.error('Error creating vault:', error);
    res.status(500).json({ message: 'Failed to create vault' });
  }
});

// Add password to vault
router.post('/:vaultId/passwords', [
  auth,
  validateVaultAccess,
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
  body('username').optional().isLength({ max: 100 }).withMessage('Username too long'),
  body('category').optional().isIn(['server', 'database', 'application', 'network', 'email', 'cloud', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.vault.hasAccess(req.user.userId, 'write')) {
      return res.status(403).json({ message: 'Write access required' });
    }

    const { title, password, username, url, notes, category, tags, expiresAt } = req.body;

    // Generate vault-specific encryption key (in production, use proper key management)
    const masterKey = process.env.VAULT_MASTER_KEY || 'default-key-change-in-production';
    const vaultKey = crypto.createHash('sha256').update(masterKey + req.vault._id.toString()).digest();

    const passwordData = {
      title,
      password,
      username,
      url,
      notes,
      category: category || 'other',
      tags: tags || [],
      expiresAt: expiresAt ? new Date(expiresAt) : null
    };

    await req.vault.addPassword(passwordData, vaultKey);

    // Log password addition
    await AnalyticsEvent.logEvent({
      eventType: 'vault_password_add',
      user: req.user.userId,
      workspace: req.vault.workspace,
      metadata: {
        vaultId: req.vault._id,
        category: category || 'other'
      }
    });

    res.status(201).json({ message: 'Password added successfully' });

  } catch (error) {
    console.error('Error adding password:', error);
    res.status(500).json({ message: 'Failed to add password' });
  }
});

// Decrypt and retrieve password
router.get('/:vaultId/passwords/:passwordId/decrypt', [
  auth,
  passwordDecryptLimit,
  validateVaultAccess
], async (req, res) => {
  try {
    const { passwordId } = req.params;

    if (!req.vault.hasAccess(req.user.userId, 'read')) {
      return res.status(403).json({ message: 'Read access required' });
    }

    // Generate vault-specific encryption key
    const masterKey = process.env.VAULT_MASTER_KEY || 'default-key-change-in-production';
    const vaultKey = crypto.createHash('sha256').update(masterKey + req.vault._id.toString()).digest();

    try {
      const decryptedPassword = req.vault.decryptPassword(passwordId, vaultKey);
      await req.vault.save(); // Save access tracking updates

      // Log password access
      await AnalyticsEvent.logEvent({
        eventType: 'vault_password_access',
        user: req.user.userId,
        workspace: req.vault.workspace,
        metadata: {
          vaultId: req.vault._id,
          passwordId,
          accessMethod: 'decrypt'
        }
      });

      res.json({ 
        password: decryptedPassword,
        accessedAt: new Date()
      });

    } catch (decryptError) {
      // Log failed decryption attempt
      await AnalyticsEvent.logEvent({
        eventType: 'vault_password_access_failed',
        user: req.user.userId,
        workspace: req.vault.workspace,
        metadata: {
          vaultId: req.vault._id,
          passwordId,
          error: 'decryption_failed'
        }
      });

      res.status(400).json({ message: 'Failed to decrypt password' });
    }

  } catch (error) {
    console.error('Error decrypting password:', error);
    res.status(500).json({ message: 'Failed to decrypt password' });
  }
});

// Update password in vault
router.put('/:vaultId/passwords/:passwordId', [
  auth,
  validateVaultAccess,
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('password').optional().isLength({ min: 1 }),
  body('username').optional().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.vault.hasAccess(req.user.userId, 'write')) {
      return res.status(403).json({ message: 'Write access required' });
    }

    const { passwordId } = req.params;
    const passwordEntry = req.vault.passwords.id(passwordId);
    
    if (!passwordEntry) {
      return res.status(404).json({ message: 'Password entry not found' });
    }

    const { title, password, username, url, notes, category, tags, expiresAt } = req.body;

    // Update non-encrypted fields
    if (title) passwordEntry.title = title;
    if (username !== undefined) passwordEntry.username = username;
    if (url !== undefined) passwordEntry.url = url;
    if (notes !== undefined) passwordEntry.notes = notes;
    if (category) passwordEntry.category = category;
    if (tags) passwordEntry.tags = tags;
    if (expiresAt !== undefined) {
      passwordEntry.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    // Re-encrypt password if provided
    if (password) {
      const masterKey = process.env.VAULT_MASTER_KEY || 'default-key-change-in-production';
      const vaultKey = crypto.createHash('sha256').update(masterKey + req.vault._id.toString()).digest();
      
      // Generate new IV
      const iv = crypto.randomBytes(16);
      
      // Encrypt the new password
      const cipher = crypto.createCipher('aes-256-gcm', vaultKey);
      cipher.setAAD(Buffer.from(req.vault._id.toString()));
      
      let encryptedPassword = cipher.update(password, 'utf8', 'hex');
      encryptedPassword += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      passwordEntry.encryptedPassword = encryptedPassword + ':' + authTag.toString('hex');
      passwordEntry.iv = iv.toString('hex');
    }

    await req.vault.save();

    // Log password update
    await AnalyticsEvent.logEvent({
      eventType: 'vault_password_update',
      user: req.user.userId,
      workspace: req.vault.workspace,
      metadata: {
        vaultId: req.vault._id,
        passwordId,
        fieldsUpdated: Object.keys(req.body)
      }
    });

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Failed to update password' });
  }
});

// Delete password from vault
router.delete('/:vaultId/passwords/:passwordId', auth, validateVaultAccess, async (req, res) => {
  try {
    if (!req.vault.hasAccess(req.user.userId, 'delete')) {
      return res.status(403).json({ message: 'Delete access required' });
    }

    const { passwordId } = req.params;
    const passwordEntry = req.vault.passwords.id(passwordId);
    
    if (!passwordEntry) {
      return res.status(404).json({ message: 'Password entry not found' });
    }

    passwordEntry.isActive = false; // Soft delete for audit trail
    await req.vault.save();

    // Log password deletion
    await AnalyticsEvent.logEvent({
      eventType: 'vault_password_delete',
      user: req.user.userId,
      workspace: req.vault.workspace,
      metadata: {
        vaultId: req.vault._id,
        passwordId,
        passwordTitle: passwordEntry.title
      }
    });

    res.json({ message: 'Password deleted successfully' });

  } catch (error) {
    console.error('Error deleting password:', error);
    res.status(500).json({ message: 'Failed to delete password' });
  }
});

// Grant access to vault
router.post('/:vaultId/access/grant', [
  auth,
  validateVaultAccess,
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('permissions').isArray().withMessage('Permissions must be an array'),
  body('expiresAt').optional().isISO8601().withMessage('Valid expiration date required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only owner can grant access
    if (req.vault.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only vault owner can grant access' });
    }

    const { userId, permissions, expiresAt } = req.body;
    const validPermissions = ['read', 'write', 'delete', 'share'];
    
    if (!permissions.every(p => validPermissions.includes(p))) {
      return res.status(400).json({ message: 'Invalid permissions' });
    }

    await req.vault.grantAccess(
      userId,
      permissions,
      req.user.userId,
      expiresAt ? new Date(expiresAt) : null
    );

    // Log access grant
    await AnalyticsEvent.logEvent({
      eventType: 'vault_access_grant',
      user: req.user.userId,
      workspace: req.vault.workspace,
      metadata: {
        vaultId: req.vault._id,
        grantedTo: userId,
        permissions,
        expiresAt
      }
    });

    res.json({ message: 'Access granted successfully' });

  } catch (error) {
    console.error('Error granting access:', error);
    res.status(500).json({ message: 'Failed to grant access' });
  }
});

// Revoke access to vault
router.post('/:vaultId/access/revoke', [
  auth,
  validateVaultAccess,
  body('userId').isMongoId().withMessage('Valid user ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only owner can revoke access
    if (req.vault.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only vault owner can revoke access' });
    }

    const { userId } = req.body;
    await req.vault.revokeAccess(userId);

    // Log access revocation
    await AnalyticsEvent.logEvent({
      eventType: 'vault_access_revoke',
      user: req.user.userId,
      workspace: req.vault.workspace,
      metadata: {
        vaultId: req.vault._id,
        revokedFrom: userId
      }
    });

    res.json({ message: 'Access revoked successfully' });

  } catch (error) {
    console.error('Error revoking access:', error);
    res.status(500).json({ message: 'Failed to revoke access' });
  }
});

// Get vault statistics
router.get('/:vaultId/stats', auth, validateVaultAccess, async (req, res) => {
  try {
    const vault = req.vault;
    
    // Calculate password statistics
    const activePasswords = vault.passwords.filter(p => p.isActive);
    const expiredPasswords = activePasswords.filter(p => p.expiresAt && p.expiresAt <= new Date());
    const expiringPasswords = activePasswords.filter(p => 
      p.expiresAt && 
      p.expiresAt > new Date() && 
      p.expiresAt <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    );

    const categoryStats = activePasswords.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});

    const accessStats = activePasswords.reduce((acc, p) => {
      acc.totalAccess += p.accessCount;
      if (p.lastAccessed) {
        if (!acc.lastAccessed || p.lastAccessed > acc.lastAccessed) {
          acc.lastAccessed = p.lastAccessed;
        }
      }
      return acc;
    }, { totalAccess: 0, lastAccessed: null });

    res.json({
      vaultId: vault._id,
      totalPasswords: activePasswords.length,
      expiredPasswords: expiredPasswords.length,
      expiringPasswords: expiringPasswords.length,
      categoryBreakdown: categoryStats,
      accessStats,
      securityHealth: {
        expiredPercentage: activePasswords.length > 0 ? (expiredPasswords.length / activePasswords.length) * 100 : 0,
        accessControlled: vault.accessPolicy.allowedUsers.length > 0,
        timeRestricted: !!(vault.accessPolicy.timeRestrictions.startTime && vault.accessPolicy.timeRestrictions.endTime),
        ipRestricted: vault.accessPolicy.ipWhitelist.length > 0
      }
    });

  } catch (error) {
    console.error('Error fetching vault stats:', error);
    res.status(500).json({ message: 'Failed to fetch vault statistics' });
  }
});

module.exports = router;
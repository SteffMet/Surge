const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/auth');
const User = require('../../models/User');
const logger = require('../../utils/logger');
const { shouldEnforceDemoMode } = require('../../utils/superUser');

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Filter by role
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    // Filter by active status
    if (req.query.active !== undefined) {
      filter.active = req.query.active === 'true';
    }

    // Search by username or email
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { username: searchRegex },
        { email: searchRegex }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   POST /api/users
 * @desc    Create new user (admin only)
 * @access  Private (Admin)
 */
router.post('/',
  auth,
  requireRole(['admin']),
  [
    body('username', 'Username is required').not().isEmpty().trim(),
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    body('role', 'Role is required').isIn(['basic', 'basic-upload', 'admin', 'super'])
  ],
  async (req, res) => {
    try {
      // Check if demo mode is enabled (unless user is super user)
      if (shouldEnforceDemoMode(req.user)) {
        return res.status(403).json({ 
          errors: [{ msg: 'User creation is disabled in demo mode' }] 
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({
          errors: [{ msg: 'User with this email or username already exists' }]
        });
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        role
      });

      // Hash password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();

      logger.info(`New user created by admin ${req.user.id}: ${username} (${email})`);

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          active: user.active,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      logger.error('Error creating user:', error);
      res.status(500).json({ errors: [{ msg: 'Failed to create user' }] });
    }
  }
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin or own profile)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin or requesting their own profile
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ errors: [{ msg: 'Not authorised to view this profile' }] });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ errors: [{ msg: 'User not found' }] });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin or own profile)
 */
router.put('/:id',
  auth,
  [
    body('username').optional().trim().isLength({ min: 2 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['basic', 'basic-upload', 'admin']),
    body('active').optional().isBoolean(),
    body('externalAiProviderEnabled').optional().isBoolean(),
    body('externalAiApiKey').optional().isString(),
  body('externalAiSystemPrompt').optional().isString(),
  body('externalAiProviderType').optional().isIn(['openai','google','anthropic','azure-openai'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ errors: [{ msg: 'User not found' }] });
      }

      // Check permissions
      const isAdmin = req.user.role === 'admin';
      const isOwnProfile = req.user.id === req.params.id;

      if (!isAdmin && !isOwnProfile) {
        return res.status(403).json({ errors: [{ msg: 'Not authorised to update this profile' }] });
      }

      const { username, email, role, active } = req.body;

      // Only admins can change role and active status
      if ((role !== undefined || active !== undefined) && !isAdmin) {
        return res.status(403).json({ errors: [{ msg: 'Only admins can change role or active status' }] });
      }

  const { externalAiProviderEnabled, externalAiApiKey, externalAiSystemPrompt, externalAiProviderType } = req.body;

      // Check for duplicate username/email
      if (username || email) {
        const duplicateUser = await User.findOne({
          _id: { $ne: req.params.id },
          $or: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : [])
          ]
        });

        if (duplicateUser) {
          return res.status(400).json({
            errors: [{ msg: 'Username or email already exists' }]
          });
        }
      }

      // Update fields
      if (username !== undefined) user.username = username;
      if (email !== undefined) user.email = email;
      if (role !== undefined) user.role = role;
      if (active !== undefined) user.active = active;
      if (externalAiProviderEnabled !== undefined) user.externalAiProviderEnabled = externalAiProviderEnabled;
      if (externalAiApiKey !== undefined) user.externalAiApiKey = externalAiApiKey;
      if (externalAiSystemPrompt !== undefined) user.externalAiSystemPrompt = externalAiSystemPrompt;
  if (externalAiProviderType !== undefined) user.externalAiProviderType = externalAiProviderType;

      await user.save();

      logger.info(`User ${user.username} updated by ${isAdmin ? 'admin' : 'self'} ${req.user.id}`);

      res.json({
        message: 'User updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          active: user.active,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({ errors: [{ msg: 'Update failed' }] });
    }
  }
);

/**
 * @route   PUT /api/users/:id/password
 * @desc    Change user password
 * @access  Private (Admin or own profile)
 */
router.put('/:id/password',
  auth,
  [
    body('currentPassword').if((value, { req }) => req.user.id === req.params.id).notEmpty(),
    body('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      // Check if demo mode is enabled (unless user is super user)
      if (shouldEnforceDemoMode(req.user)) {
        return res.status(403).json({ 
          errors: [{ msg: 'Password changes are disabled in demo mode' }] 
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ errors: [{ msg: 'User not found' }] });
      }

      // Check permissions
      const isAdmin = req.user.role === 'admin';
      const isOwnProfile = req.user.id === req.params.id;

      if (!isAdmin && !isOwnProfile) {
        return res.status(403).json({ errors: [{ msg: 'Not authorised to change this password' }] });
      }

      const { currentPassword, newPassword } = req.body;

      // If user is changing their own password, verify current password
      if (isOwnProfile && !isAdmin) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ errors: [{ msg: 'Current password is incorrect' }] });
        }
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

      await user.save();

      logger.info(`Password changed for user ${user.username} by ${isAdmin ? 'admin' : 'self'} ${req.user.id}`);

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      logger.error('Error changing password:', error);
      res.status(500).json({ errors: [{ msg: 'Password change failed' }] });
    }
  }
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ errors: [{ msg: 'User not found' }] });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({ errors: [{ msg: 'Cannot delete your own account' }] });
    }

    await User.findByIdAndDelete(req.params.id);

    logger.info(`User ${user.username} deleted by admin ${req.user.id}`);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ errors: [{ msg: 'Delete failed' }] });
  }
});

/**
 * @route   GET /api/users/stats/overview
 * @desc    Get user statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats/overview', auth, requireRole(['admin']), async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$active', 1, 0] } },
          basicUsers: { $sum: { $cond: [{ $eq: ['$role', 'basic'] }, 1, 0] } },
          uploadUsers: { $sum: { $cond: [{ $eq: ['$role', 'basic-upload'] }, 1, 0] } },
          adminUsers: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      basicUsers: 0,
      uploadUsers: 0,
      adminUsers: 0
    };

    res.json(result);
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to fetch statistics' }] });
  }
});

module.exports = router;
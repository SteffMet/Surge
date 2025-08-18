const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/auth');

/**
 * @route   GET /api/test/auth
 * @desc    Test authentication without database
 * @access  Private (basic)
 */
router.get('/auth', auth, (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: {
      id: req.user.id,
      role: req.user.role
    }
  });
});

/**
 * @route   GET /api/test/upload-perm
 * @desc    Test upload permissions without database
 * @access  Private (basic, basic-upload, admin)
 */
router.get('/upload-perm', auth, requireRole(['basic', 'basic-upload', 'admin']), (req, res) => {
  res.json({
    message: 'Upload permission granted',
    user: {
      id: req.user.id,
      role: req.user.role
    }
  });
});

module.exports = router;

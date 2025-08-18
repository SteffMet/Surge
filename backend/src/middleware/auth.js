const jwt = require('jsonwebtoken');

/**
 * JWT authentication middleware
 * - Verifies token in Authorization header
 * - Attaches user id and role to req.user
 */
function auth(req, res, next) {
  const authHeader = req.header('Authorization') || req.header('authorization');

  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ errors: [{ msg: 'No token, authorisation denied' }] });
  }

  const token = authHeader.slice(7).trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user || decoded; // support both payload shapes
    return next();
  } catch (err) {
    return res.status(401).json({ errors: [{ msg: 'Token is not valid' }] });
  }
}

/**
 * Role-based authorisation middleware
 * - roles: array of allowed roles
 * - Example: requireRole(['admin']) or requireRole(['basic-upload','admin'])
 */
function requireRole(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ errors: [{ msg: 'Forbidden' }] });
    }
    
    // Super users have access to everything
    if (req.user.role === 'super') {
      return next();
    }
    
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ errors: [{ msg: 'Insufficient permissions' }] });
    }
    return next();
  };
}

module.exports = auth;
module.exports.requireRole = requireRole;
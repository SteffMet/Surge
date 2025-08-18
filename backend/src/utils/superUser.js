/**
 * Super user utility functions
 * Provides functionality for accounts that bypass demo mode restrictions
 */

/**
 * Check if a user is a super user that can bypass demo mode restrictions
 * @param {Object} user - User object from request
 * @returns {boolean} - True if user can bypass demo mode
 */
const isSuperUser = (user) => {
  return user && (user.role === 'super' || user.email === 'super@surge.local');
};

/**
 * Check if demo mode should be enforced for the current user
 * @param {Object} user - User object from request
 * @returns {boolean} - True if demo mode restrictions should apply
 */
const shouldEnforceDemoMode = (user) => {
  if (process.env.DEMO_MODE !== 'true') {
    return false;
  }
  return !isSuperUser(user);
};

module.exports = {
  isSuperUser,
  shouldEnforceDemoMode
};
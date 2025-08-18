/**
 * Super user utility functions for frontend
 * Provides functionality for accounts that bypass demo mode restrictions
 */

/**
 * Check if a user is a super user that can bypass demo mode restrictions
 * @param {Object} user - User object 
 * @returns {boolean} - True if user can bypass demo mode
 */
export const isSuperUser = (user) => {
  return user && (user.role === 'super' || user.email === 'super@surge.local');
};

/**
 * Check if demo mode should be enforced for the current user
 * @param {Object} user - User object
 * @param {boolean} demoMode - Current demo mode status
 * @returns {boolean} - True if demo mode restrictions should apply
 */
export const shouldEnforceDemoMode = (user, demoMode) => {
  if (!demoMode) {
    return false;
  }
  return !isSuperUser(user);
};
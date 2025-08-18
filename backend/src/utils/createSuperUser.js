const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Creates the super user account if it doesn't exist
 * This function should be called during application startup
 */
const createSuperUser = async () => {
  try {
    // Check if super user already exists
    const existingUser = await User.findOne({ email: 'super@surge.local' });
    
    if (existingUser) {
      // Update existing user to ensure it has super role
      if (existingUser.role !== 'super') {
        existingUser.role = 'super';
        await existingUser.save();
        console.log('Updated existing user to super role');
      }
      return existingUser;
    }

    // Create new super user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Steffan1', salt);

    const superUser = new User({
      username: 'SuperAdmin',
      email: 'super@surge.local',
      password: hashedPassword,
      role: 'super',
      active: true,
      externalAiProviderEnabled: true
    });

    await superUser.save();
    console.log('Super user account created successfully');
    return superUser;
    
  } catch (error) {
    console.error('Error creating super user:', error);
    throw error;
  }
};

module.exports = { createSuperUser };
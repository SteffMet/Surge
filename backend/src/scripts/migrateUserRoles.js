const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const migrateUserRoles = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/surge';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all users with 'basic' role
    const basicUsers = await User.find({ role: 'basic' });
    console.log(`Found ${basicUsers.length} users with 'basic' role`);

    if (basicUsers.length === 0) {
      console.log('No users to migrate');
      return;
    }

    // Update all basic users to basic-upload
    const result = await User.updateMany(
      { role: 'basic' },
      { role: 'basic-upload' }
    );

    console.log(`Successfully updated ${result.modifiedCount} users from 'basic' to 'basic-upload' role`);

  } catch (error) {
    console.error('Error migrating user roles:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

migrateUserRoles();

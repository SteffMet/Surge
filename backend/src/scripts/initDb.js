const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const initializeDatabase = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/surge';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@surge.local' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create default admin user
    const adminPassword = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const adminUser = new User({
      username: 'admin',
      email: 'admin@surge.local',
      password: hashedPassword,
      role: 'admin',
      active: true
    });

    await adminUser.save();
    console.log('Default admin user created successfully!');
    console.log('Email: admin@surge.local');
    console.log('Password: admin123');
    console.log('');
    console.log('IMPORTANT: Please change the default password after first login!');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the initialization
initializeDatabase();

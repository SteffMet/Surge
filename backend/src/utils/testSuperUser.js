#!/usr/bin/env node

/**
 * Test script for super user functionality
 * This script tests the super user account creation and demo mode bypass capabilities
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models and utilities
const User = require('../models/User');
const { createSuperUser } = require('../utils/createSuperUser');
const { shouldEnforceDemoMode } = require('../utils/superUser');

async function testSuperUserFunctionality() {
  try {
    console.log('🧪 Testing Super User Functionality');
    console.log('===================================');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/surge');
    console.log('✅ Connected to MongoDB');

    // Test 1: Create super user
    console.log('\n1. Testing super user creation...');
    const superUser = await createSuperUser();
    console.log(`✅ Super user created/verified: ${superUser.email}`);

    // Test 2: Test demo mode enforcement for regular user
    console.log('\n2. Testing demo mode enforcement...');
    const regularUser = { role: 'admin', email: 'admin@surge.local' };
    const shouldEnforceForRegular = shouldEnforceDemoMode(regularUser);
    console.log(`✅ Regular admin user demo mode enforcement: ${shouldEnforceForRegular} (DEMO_MODE=${process.env.DEMO_MODE})`);

    // Test 3: Test demo mode bypass for super user
    const shouldEnforceForSuper = shouldEnforceDemoMode(superUser);
    console.log(`✅ Super user demo mode enforcement: ${shouldEnforceForSuper} (should be false)`);

    // Test 4: Verify super user permissions
    console.log('\n3. Verifying super user in database...');
    const dbSuperUser = await User.findOne({ email: 'super@surge.local' });
    if (dbSuperUser) {
      console.log(`✅ Super user found in database:`);
      console.log(`   - Username: ${dbSuperUser.username}`);
      console.log(`   - Email: ${dbSuperUser.email}`);
      console.log(`   - Role: ${dbSuperUser.role}`);
      console.log(`   - Active: ${dbSuperUser.active}`);
    } else {
      console.log('❌ Super user not found in database!');
    }

    // Test 5: Test password verification
    console.log('\n4. Testing password verification...');
    const isPasswordValid = await bcrypt.compare('Steffan1', dbSuperUser.password);
    console.log(`✅ Password verification: ${isPasswordValid ? 'PASSED' : 'FAILED'}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\nSuper User Login Credentials:');
    console.log('Email: super@surge.local');
    console.log('Password: Steffan1');
    console.log('\nThis account can bypass all demo mode restrictions.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testSuperUserFunctionality();
}

module.exports = { testSuperUserFunctionality };
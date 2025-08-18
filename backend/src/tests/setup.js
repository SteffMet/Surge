const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Use in-memory MongoDB for testing if available, otherwise use test database
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('Connected to in-memory MongoDB for testing');
  } catch (error) {
    // Fallback to regular test database
    const testUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/surge-test';
    await mongoose.connect(testUri);
    console.log('Connected to test MongoDB database');
  }
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clear all test data between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Global test utilities
global.testUtils = {
  // Helper function to create test user
  async createTestUser(userData = {}) {
    const bcrypt = require('bcryptjs');
    const User = require('../models/User');
    
    const hashedPassword = await bcrypt.hash(userData.password || 'testpassword', 10);
    
    return await User.create({
      username: userData.username || 'testuser',
      email: userData.email || 'test@example.com',
      password: hashedPassword,
      role: userData.role || 'basic',
      active: userData.active !== false,
      ...userData
    });
  },

  // Helper function to create test workspace
  async createTestWorkspace(ownerUser, workspaceData = {}) {
    const Workspace = require('../models/Workspace');
    
    return await Workspace.create({
      name: workspaceData.name || 'Test Workspace',
      description: workspaceData.description || 'Test workspace description',
      owner: ownerUser._id,
      isActive: workspaceData.isActive !== false,
      members: workspaceData.members || [
        {
          userId: ownerUser._id,
          role: 'admin',
          joinedAt: new Date()
        }
      ],
      ...workspaceData
    });
  },

  // Helper function to create test document
  async createTestDocument(workspace, user, documentData = {}) {
    const Document = require('../models/Document');
    
    return await Document.create({
      title: documentData.title || 'Test Document',
      content: documentData.content || 'Test document content',
      workspaceId: workspace._id,
      createdBy: user._id,
      status: documentData.status || 'active',
      ...documentData
    });
  },

  // Helper function to create analytics event
  async createAnalyticsEvent(eventData = {}) {
    const { AnalyticsEvent } = require('../models/Analytics');
    
    return await AnalyticsEvent.create({
      eventType: eventData.eventType || 'document_view',
      user: eventData.user,
      workspace: eventData.workspace,
      document: eventData.document,
      timestamp: eventData.timestamp || new Date(),
      metadata: eventData.metadata || {},
      ...eventData
    });
  },

  // Helper function to authenticate user and get token
  async getAuthToken(user) {
    const jwt = require('jsonwebtoken');
    
    return jwt.sign(
      { 
        userId: user._id, 
        id: user._id,
        email: user.email, 
        role: user.role,
        workspaces: user.workspaces || []
      },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1h' }
    );
  }
};

// Suppress console logs during testing unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error // Keep error logs
  };
}
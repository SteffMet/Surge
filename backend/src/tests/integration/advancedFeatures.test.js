const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../index');
const User = require('../../models/User');
const Document = require('../../models/Document');
const Workspace = require('../../models/Workspace');
const { AnalyticsEvent } = require('../../models/Analytics');
const Template = require('../../models/Template');
const bcrypt = require('bcryptjs');

describe('Advanced Documentation Platform Features', () => {
  let authToken;
  let testUser;
  let testWorkspace;
  let testDocument;
  let templateId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/surge-test');
    
    // Clean up test data
    await User.deleteMany({});
    await Document.deleteMany({});
    await Workspace.deleteMany({});
    await AnalyticsEvent.deleteMany({});
    await Template.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'admin',
      active: true
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword'
      });

    authToken = loginResponse.body.token;

    // Create test workspace
    testWorkspace = await Workspace.create({
      name: 'Test Workspace',
      description: 'Test workspace for advanced features',
      owner: testUser._id,
      isActive: true,
      members: [
        {
          userId: testUser._id,
          role: 'admin',
          joinedAt: new Date()
        }
      ]
    });

    // Create test document
    testDocument = await Document.create({
      title: 'Test Document',
      content: 'This is a test document for advanced features testing.',
      workspaceId: testWorkspace._id,
      createdBy: testUser._id,
      status: 'active'
    });

    // Update user with workspace
    await User.findByIdAndUpdate(testUser._id, {
      workspaces: [
        {
          workspaceId: testWorkspace._id,
          role: 'admin'
        }
      ]
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await User.deleteMany({});
    await Document.deleteMany({});
    await Workspace.deleteMany({});
    await AnalyticsEvent.deleteMany({});
    await Template.deleteMany({});
  });

  describe('Real-time Collaboration Features', () => {
    test('should track document views in analytics', async () => {
      const response = await request(app)
        .post('/api/analytics/event')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventType: 'document_view',
          workspace: testWorkspace._id,
          document: testDocument._id,
          metadata: { duration: 5000 }
        });

      expect(response.status).toBe(201);

      // Verify analytics event was created
      const analyticsEvent = await AnalyticsEvent.findOne({
        eventType: 'document_view',
        document: testDocument._id
      });
      expect(analyticsEvent).toBeTruthy();
    });

    test('should handle document editing events', async () => {
      const response = await request(app)
        .post('/api/analytics/event')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventType: 'document_edit',
          workspace: testWorkspace._id,
          document: testDocument._id,
          metadata: { 
            changeType: 'content_update',
            charactersChanged: 50
          }
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Document Versioning System', () => {
    test('should create document version when content changes', async () => {
      const updateResponse = await request(app)
        .put(`/api/documents/${testDocument._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Test Document',
          content: 'This is updated content for testing versioning.',
          versionMessage: 'Updated for testing'
        });

      expect(updateResponse.status).toBe(200);

      // Check if version was created
      const versionsResponse = await request(app)
        .get(`/api/versions/document/${testDocument._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(versionsResponse.status).toBe(200);
      expect(versionsResponse.body.versions.length).toBeGreaterThan(0);
    });

    test('should compare document versions', async () => {
      // Create initial version
      await request(app)
        .put(`/api/documents/${testDocument._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Version 1 content',
          versionMessage: 'Version 1'
        });

      // Create second version
      await request(app)
        .put(`/api/documents/${testDocument._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Version 2 content',
          versionMessage: 'Version 2'
        });

      const versionsResponse = await request(app)
        .get(`/api/versions/document/${testDocument._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(versionsResponse.status).toBe(200);
      const versions = versionsResponse.body.versions;
      
      if (versions.length >= 2) {
        const compareResponse = await request(app)
          .get(`/api/versions/compare/${versions[0]._id}/${versions[1]._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(compareResponse.status).toBe(200);
        expect(compareResponse.body.diff).toBeDefined();
      }
    });
  });

  describe('Advanced Search with AI', () => {
    test('should perform enhanced search', async () => {
      const response = await request(app)
        .post('/api/search/enhanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'test document',
          filters: {
            workspaceId: testWorkspace._id
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
    });

    test('should provide search suggestions', async () => {
      const response = await request(app)
        .post('/api/search/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'tes',
          workspaceId: testWorkspace._id
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });
  });

  describe('Analytics Dashboard', () => {
    beforeEach(async () => {
      // Create some analytics events for testing
      await AnalyticsEvent.create([
        {
          eventType: 'document_view',
          user: testUser._id,
          workspace: testWorkspace._id,
          document: testDocument._id,
          timestamp: new Date(),
          metadata: { duration: 3000 }
        },
        {
          eventType: 'document_edit',
          user: testUser._id,
          workspace: testWorkspace._id,
          document: testDocument._id,
          timestamp: new Date(),
          metadata: { changeType: 'content_update' }
        },
        {
          eventType: 'search_query',
          user: testUser._id,
          workspace: testWorkspace._id,
          timestamp: new Date(),
          metadata: { query: 'test search', resultsCount: 5 }
        }
      ]);
    });

    test('should get comprehensive dashboard data', async () => {
      const response = await request(app)
        .get(`/api/analytics/dashboard/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ timeRange: '30' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.activityTimeline).toBeDefined();
      expect(response.body.data.topDocuments).toBeDefined();
    });

    test('should get user productivity scores', async () => {
      const response = await request(app)
        .post('/api/analytics/calculate/productivity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: testUser._id });

      expect(response.status).toBe(200);
      expect(response.body.productivityScore).toBeDefined();
    });
  });

  describe('Template System', () => {
    beforeEach(async () => {
      // Create a test template
      const templateResponse = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Template',
          description: 'A template for testing',
          content: 'Hello {{name}}, this is a {{type}} template.',
          variables: [
            { name: 'name', type: 'text', description: 'User name' },
            { name: 'type', type: 'text', description: 'Template type' }
          ],
          category: 'testing',
          workspaceId: testWorkspace._id
        });

      templateId = templateResponse.body.data._id;
    });

    test('should create and retrieve templates', async () => {
      const response = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ workspaceId: testWorkspace._id });

      expect(response.status).toBe(200);
      expect(response.body.data.templates.length).toBeGreaterThan(0);
    });

    test('should render template with variables', async () => {
      const response = await request(app)
        .post(`/api/templates/${templateId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variables: {
            name: 'John Doe',
            type: 'advanced'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.rendered).toBe('Hello John Doe, this is a advanced template.');
    });
  });

  describe('Export Functionality', () => {
    test('should export document as markdown', async () => {
      const response = await request(app)
        .post(`/api/export/document/${testDocument._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'markdown',
          includeMetadata: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should export workspace documents', async () => {
      const response = await request(app)
        .post(`/api/export/workspace/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'markdown',
          includeSubfolders: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Automation Features', () => {
    test('should analyze content for suggestions', async () => {
      const response = await request(app)
        .post('/api/automation/analyze-content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a short test content without proper structure or formatting.',
          documentId: testDocument._id
        });

      expect(response.status).toBe(200);
      expect(response.body.data.suggestions).toBeDefined();
      expect(response.body.data.suggestions.qualityScore).toBeDefined();
    });

    test('should get content freshness report', async () => {
      const response = await request(app)
        .get(`/api/automation/freshness/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.freshness).toBeDefined();
      expect(response.body.data.freshness.score).toBeDefined();
    });

    test('should generate workflow suggestions', async () => {
      const response = await request(app)
        .get(`/api/automation/workflow-suggestions/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.suggestions).toBeDefined();
    });
  });

  describe('Security Features', () => {
    test('should handle workspace access control', async () => {
      // Create another user without workspace access
      const hashedPassword = await bcrypt.hash('password', 10);
      const unauthorizedUser = await User.create({
        username: 'unauthorized',
        email: 'unauthorized@example.com',
        password: hashedPassword,
        role: 'basic',
        active: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unauthorized@example.com',
          password: 'password'
        });

      const unauthorizedToken = loginResponse.body.token;

      // Try to access workspace analytics (should fail)
      const response = await request(app)
        .get(`/api/analytics/dashboard/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`);

      expect(response.status).toBe(403);
    });

    test('should validate input data', async () => {
      const response = await request(app)
        .post('/api/analytics/event')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          metadata: { test: 'data' }
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Branding System', () => {
    test('should create and retrieve branding configuration', async () => {
      const createResponse = await request(app)
        .post('/api/branding')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workspaceId: testWorkspace._id,
          name: 'Test Brand',
          colors: {
            primary: '#007bff',
            secondary: '#6c757d'
          },
          typography: {
            fontFamily: 'Arial, sans-serif',
            headingFont: 'Georgia, serif'
          },
          logo: {
            url: 'https://example.com/logo.png',
            width: 200,
            height: 60
          }
        });

      expect(createResponse.status).toBe(201);

      const getResponse = await request(app)
        .get(`/api/branding/workspace/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.colors.primary).toBe('#007bff');
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent requests', async () => {
      const promises = [];
      
      // Create 10 concurrent analytics events
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/analytics/event')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              eventType: 'document_view',
              workspace: testWorkspace._id,
              document: testDocument._id,
              metadata: { test: i }
            })
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all events were created
      const eventCount = await AnalyticsEvent.countDocuments({
        eventType: 'document_view',
        document: testDocument._id
      });
      expect(eventCount).toBe(10);
    });

    test('should handle bulk analytics events', async () => {
      const events = [];
      for (let i = 0; i < 50; i++) {
        events.push({
          eventType: 'document_view',
          workspace: testWorkspace._id,
          document: testDocument._id,
          metadata: { bulk: i },
          timestamp: new Date()
        });
      }

      const response = await request(app)
        .post('/api/analytics/events/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ events });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid document ID', async () => {
      const response = await request(app)
        .get('/api/documents/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    test('should handle missing authentication', async () => {
      const response = await request(app)
        .get(`/api/analytics/dashboard/${testWorkspace._id}`);

      expect(response.status).toBe(401);
    });

    test('should handle invalid workspace ID in automation', async () => {
      const response = await request(app)
        .get('/api/automation/freshness/invalid-workspace-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('Integration Between Features', () => {
    test('should integrate analytics with document operations', async () => {
      // Update document
      await request(app)
        .put(`/api/documents/${testDocument._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated content for integration testing'
        });

      // Track the edit event
      await request(app)
        .post('/api/analytics/event')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventType: 'document_edit',
          workspace: testWorkspace._id,
          document: testDocument._id,
          metadata: { integration: true }
        });

      // Verify analytics dashboard shows the update
      const dashboardResponse = await request(app)
        .get(`/api/analytics/dashboard/${testWorkspace._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.data.overview.totalEdits).toBeGreaterThan(0);
    });

    test('should integrate templates with document creation', async () => {
      // Use template to create document
      const renderResponse = await request(app)
        .post(`/api/templates/${templateId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variables: {
            name: 'Integration Test',
            type: 'automated'
          }
        });

      const renderedContent = renderResponse.body.data.rendered;

      // Create document with rendered content
      const createResponse = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Template Integration Test',
          content: renderedContent,
          workspaceId: testWorkspace._id
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.content).toContain('Integration Test');
    });
  });
});
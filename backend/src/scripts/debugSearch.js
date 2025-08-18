const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Document = require('../models/Document');
const embeddingService = require('../services/embeddingService');
const ollamaService = require('../services/ollamaService');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();

async function debugSearchSystem() {
  try {
    console.log('🔍 Starting comprehensive search system debug...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/surge', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // 1. Check database state
    console.log('\n📊 DATABASE STATE:');
    const documentCount = await Document.countDocuments();
    console.log(`Total documents: ${documentCount}`);

    if (documentCount > 0) {
      const documents = await Document.find({}).limit(5);
      console.log('\nSample documents:');
      documents.forEach((doc, i) => {
        console.log(`${i + 1}. ${doc.originalName} - Status: ${doc.status} - Has embedding: ${!!doc.embedding}`);
      });

      // Check for "xCaddy notes" specifically
      const xCaddyDoc = await Document.findOne({ originalName: /xCaddy/i });
      if (xCaddyDoc) {
        console.log('\n🎯 Found xCaddy document:');
        console.log(`- Name: ${xCaddyDoc.originalName}`);
        console.log(`- Status: ${xCaddyDoc.status}`);
        console.log(`- Has content: ${!!xCaddyDoc.extractedText}`);
        console.log(`- Content length: ${xCaddyDoc.extractedText?.length || 0}`);
        console.log(`- Has embedding: ${!!xCaddyDoc.embedding}`);
        console.log(`- Embedding length: ${xCaddyDoc.embedding?.length || 0}`);
      } else {
        console.log('\n❌ No xCaddy document found');
      }
    } else {
      console.log('❌ Database is empty - no documents found');
    }

    // 2. Check MongoDB text indexes
    console.log('\n🔍 MONGODB TEXT INDEXES:');
    try {
      const indexes = await Document.collection.getIndexes();
      console.log('Available indexes:');
      Object.keys(indexes).forEach(indexName => {
        console.log(`- ${indexName}: ${JSON.stringify(indexes[indexName])}`);
      });
    } catch (error) {
      console.log('❌ Error getting indexes:', error.message);
    }

    // 3. Test embedding service
    console.log('\n🧠 EMBEDDING SERVICE TEST:');
    try {
      const testText = "This is a test document about network troubleshooting";
      console.log(`Testing embedding generation for: "${testText}"`);
      
      const embedding = await embeddingService.generate(testText);
      console.log(`✅ Embedding generated successfully`);
      console.log(`- Embedding length: ${embedding.length}`);
      console.log(`- First 5 values: [${embedding.slice(0, 5).join(', ')}]`);
    } catch (error) {
      console.log('❌ Embedding generation failed:', error.message);
    }

    // 4. Test Ollama service
    console.log('\n🤖 OLLAMA SERVICE TEST:');
    try {
      const healthStatus = await ollamaService.getHealthStatus();
      console.log('Ollama health status:', healthStatus);
      
      // Test embedding model
      console.log('\nTesting Ollama embedding model...');
      const ollamaEmbedding = await testOllamaEmbedding();
      if (ollamaEmbedding) {
        console.log(`✅ Ollama embedding successful - length: ${ollamaEmbedding.length}`);
      }
    } catch (error) {
      console.log('❌ Ollama service test failed:', error.message);
    }

    // 5. Test search functionality
    console.log('\n🔎 SEARCH FUNCTIONALITY TEST:');
    if (documentCount > 0) {
      try {
        // Test text search
        const textSearchResults = await Document.find(
          { $text: { $search: "network troubleshooting" } },
          { score: { $meta: 'textScore' } }
        ).sort({ score: { $meta: 'textScore' } });
        
        console.log(`Text search results: ${textSearchResults.length} documents`);
        
        // Test regex search
        const regexResults = await Document.find({
          $or: [
            { originalName: /network/i },
            { extractedText: /network/i },
            { tags: /network/i }
          ]
        });
        
        console.log(`Regex search results: ${regexResults.length} documents`);
      } catch (error) {
        console.log('❌ Search test failed:', error.message);
      }
    } else {
      console.log('⚠️ Skipping search test - no documents in database');
    }

    // 6. Create test document for debugging
    console.log('\n📝 CREATING TEST DOCUMENT:');
    try {
      const testDoc = new Document({
        originalName: 'xCaddy notes test.txt',
        storedName: 'test-xcaddy-notes.txt',
        path: '/tmp/test-xcaddy-notes.txt',
        folder: '/',
        mimeType: 'text/plain',
        size: 1000,
        tags: ['xcaddy', 'notes', 'test'],
        uploadedBy: new mongoose.Types.ObjectId(),
        status: 'processed',
        extractedText: 'This is a test document about xCaddy notes. It contains information about network troubleshooting, server configuration, and system administration. This document should be findable in search results.',
        metadata: { pages: 1 }
      });

      // Test embedding generation for test document
      console.log('Generating embedding for test document...');
      const testEmbedding = await embeddingService.generate(testDoc.extractedText);
      testDoc.embedding = testEmbedding;
      
      await testDoc.save();
      console.log('✅ Test document created successfully');
      
      // Test search with new document
      console.log('\nTesting search with new document...');
      const searchResults = await Document.find(
        { $text: { $search: "xCaddy notes" } },
        { score: { $meta: 'textScore' } }
      );
      console.log(`Search results for "xCaddy notes": ${searchResults.length} documents`);
      
    } catch (error) {
      console.log('❌ Test document creation failed:', error.message);
    }

    console.log('\n🏁 Debug complete!');

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📤 Disconnected from MongoDB');
  }
}

async function testOllamaEmbedding() {
  try {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: 'test embedding'
      }),
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.log('Ollama embedding test failed:', error.message);
    return null;
  }
}

// Run the debug script
debugSearchSystem().catch(console.error);
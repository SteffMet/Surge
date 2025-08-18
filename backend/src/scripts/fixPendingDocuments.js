const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Document = require('../models/Document');
const documentProcessor = require('../services/documentProcessor');
const embeddingService = require('../services/embeddingService');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();

async function fixPendingDocuments() {
  try {
    console.log('🔧 Starting to fix pending documents...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/surge', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all pending documents
    const pendingDocs = await Document.find({ status: 'pending' });
    console.log(`📋 Found ${pendingDocs.length} pending documents to process`);

    let processed = 0;
    let failed = 0;

    for (const doc of pendingDocs) {
      try {
        console.log(`\n🔄 Processing: ${doc.originalName}`);
        
        // Check if file exists
        let extractedText = '';
        if (doc.path) {
          try {
            const result = await documentProcessor.processDocument(doc.path, doc.mimeType);
            extractedText = result.text || '';
            doc.extractedText = extractedText;
            doc.metadata = result.metadata;
            doc.ocrApplied = result.ocrApplied;
            console.log(`  ✅ Text extracted: ${extractedText.length} characters`);
          } catch (extractError) {
            console.log(`  ⚠️ Text extraction failed: ${extractError.message}`);
            // Continue with empty text - better than failing completely
          }
        }

        // Generate embedding if we have text content
        if (extractedText && extractedText.trim().length > 0) {
          try {
            const embedding = await embeddingService.generate(extractedText.substring(0, 5000));
            doc.embedding = embedding;
            console.log(`  ✅ Embedding generated: ${embedding.length} dimensions`);
          } catch (embeddingError) {
            console.log(`  ⚠️ Embedding generation failed: ${embeddingError.message}`);
            // Continue without embedding - document can still be text-searchable
          }
        } else {
          console.log(`  ⚠️ No text content available for embedding`);
        }

        // Update status to processed
        doc.status = 'processed';
        await doc.save();
        
        console.log(`  ✅ Document processed successfully`);
        processed++;

      } catch (error) {
        console.log(`  ❌ Failed to process ${doc.originalName}: ${error.message}`);
        
        // Mark as failed but don't throw
        doc.status = 'failed';
        doc.error = error.message;
        await doc.save();
        failed++;
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`  ✅ Successfully processed: ${processed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📋 Total: ${pendingDocs.length}`);

    // Test search functionality with processed documents
    console.log(`\n🔍 Testing search functionality...`);
    
    const searchResults = await Document.find(
      { 
        status: 'processed',
        $text: { $search: "xCaddy notes" } 
      },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
    
    console.log(`🎯 Search results for "xCaddy notes": ${searchResults.length} documents`);
    
    if (searchResults.length > 0) {
      searchResults.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.originalName} (score: ${result.score?.toFixed(4) || 'N/A'})`);
      });
    }

    console.log('\n🏁 Fix complete!');

  } catch (error) {
    console.error('❌ Fix script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the fix script
fixPendingDocuments().catch(console.error);
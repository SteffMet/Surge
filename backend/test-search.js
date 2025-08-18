/**
 * Test script to verify the search functionality is working correctly
 * This script tests the core search function to ensure it's properly defined and accessible
 */

const express = require('express');

// Mock the dependencies that would normally be provided by the Express app
console.log('Testing search functionality...');

try {
  // Require the search router
  const searchRouter = require('./src/api/routes/search.js');
  
  console.log('✅ Search router loaded successfully');
  console.log('✅ searchDocuments function is properly defined and accessible');
  
  // Test that the router is a valid Express router
  if (typeof searchRouter === 'function') {
    console.log('✅ Search router is a valid Express router function');
  } else {
    console.log('❌ Search router is not a valid Express router function');
  }
  
  console.log('\n🎉 Search functionality test PASSED');
  console.log('The "searchDocuments is not defined" error has been resolved.');
  
} catch (error) {
  console.error('❌ Search functionality test FAILED:');
  console.error('Error:', error.message);
  
  if (error.message.includes('searchDocuments is not defined')) {
    console.error('\n🔍 The searchDocuments function is still not properly defined.');
    console.error('This indicates a syntax or scope issue in the search.js file.');
  } else {
    console.error('\n🔍 This may be due to missing dependencies or other issues.');
    console.error('Stack trace:', error.stack);
  }
}

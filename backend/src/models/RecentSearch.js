const mongoose = require('mongoose');

// Store recent searches per user (deduplicated by same query within short window)
const RecentSearchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  query: { type: String, required: true, index: true },
  results: { type: Number, default: 0 },
  hasDocumentContext: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }, // auto-expire after 30 days
});

RecentSearchSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('RecentSearch', RecentSearchSchema);

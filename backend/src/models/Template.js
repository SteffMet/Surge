const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  
  description: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  
  category: {
    type: String,
    required: true,
    enum: [
      'IT_PROCEDURE',
      'DOCUMENTATION',
      'INCIDENT_REPORT',
      'CHANGE_REQUEST',
      'KNOWLEDGE_BASE',
      'TROUBLESHOOTING',
      'MAINTENANCE',
      'SECURITY_POLICY',
      'USER_GUIDE',
      'PROJECT_PLAN',
      'CUSTOM'
    ],
    default: 'DOCUMENTATION'
  },
  
  type: {
    type: String,
    required: true,
    enum: ['system', 'custom', 'shared'],
    default: 'custom'
  },
  
  content: {
    type: mongoose.Schema.Types.Mixed, // TipTap JSON or HTML
    required: true
  },
  
  structure: {
    sections: [{
      id: String,
      title: String,
      required: Boolean,
      description: String,
      type: {
        type: String,
        enum: ['text', 'checklist', 'code', 'table', 'image', 'diagram'],
        default: 'text'
      },
      placeholder: String,
      validation: {
        minLength: Number,
        maxLength: Number,
        required: Boolean,
        pattern: String
      }
    }],
    metadata: [{
      key: String,
      label: String,
      type: {
        type: String,
        enum: ['text', 'number', 'date', 'select', 'multiselect', 'boolean'],
        default: 'text'
      },
      required: Boolean,
      options: [String], // For select/multiselect
      defaultValue: mongoose.Schema.Types.Mixed
    }]
  },
  
  variables: [{
    key: String,
    label: String,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'boolean'],
      default: 'text'
    },
    required: Boolean,
    defaultValue: String,
    options: [String], // For select type
    description: String
  }],
  
  tags: [String],
  
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false // null for system templates
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  isPublic: {
    type: Boolean,
    default: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  version: {
    type: String,
    default: '1.0.0'
  },
  
  usage: {
    count: {
      type: Number,
      default: 0
    },
    lastUsed: Date
  },
  
  preview: {
    thumbnail: String, // Base64 or URL
    description: String
  },
  
  branding: {
    logo: String,
    colors: {
      primary: String,
      secondary: String,
      accent: String
    },
    fonts: {
      heading: String,
      body: String
    },
    styling: mongoose.Schema.Types.Mixed // Custom CSS or styling rules
  },
  
  permissions: {
    canView: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: String
    }],
    canEdit: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: String
    }],
    canUse: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: String
    }]
  },
  
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  
  analytics: {
    views: { type: Number, default: 0 },
    uses: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
templateSchema.index({ category: 1, type: 1 });
templateSchema.index({ workspace: 1, isActive: 1 });
templateSchema.index({ createdBy: 1 });
templateSchema.index({ tags: 1 });
templateSchema.index({ 'usage.count': -1 });
templateSchema.index({ 'rating.average': -1 });
templateSchema.index({ isPublic: 1, isActive: 1 });

// Virtual for template usage statistics
templateSchema.virtual('popularityScore').get(function() {
  return (this.usage.count * 0.6) + (this.rating.average * 0.4);
});

// Static methods
templateSchema.statics.getSystemTemplates = function() {
  return this.find({ type: 'system', isActive: true }).sort({ name: 1 });
};

templateSchema.statics.getWorkspaceTemplates = function(workspaceId) {
  return this.find({
    $or: [
      { workspace: workspaceId, isActive: true },
      { type: 'system', isActive: true },
      { isPublic: true, isActive: true }
    ]
  }).sort({ 'usage.count': -1, name: 1 });
};

templateSchema.statics.getPublicTemplates = function() {
  return this.find({ isPublic: true, isActive: true }).sort({ 'rating.average': -1, 'usage.count': -1 });
};

templateSchema.statics.searchTemplates = function(query, options = {}) {
  const searchQuery = {
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      }
    ]
  };
  
  if (options.category) {
    searchQuery.$and.push({ category: options.category });
  }
  
  if (options.workspace) {
    searchQuery.$and.push({
      $or: [
        { workspace: options.workspace },
        { type: 'system' },
        { isPublic: true }
      ]
    });
  }
  
  return this.find(searchQuery).sort({ 'usage.count': -1, 'rating.average': -1 });
};

// Instance methods
templateSchema.methods.incrementUsage = function() {
  this.usage.count += 1;
  this.usage.lastUsed = new Date();
  this.analytics.uses += 1;
  return this.save();
};

templateSchema.methods.canUserAccess = function(userId, action = 'view') {
  if (this.type === 'system' || this.isPublic) return true;
  if (this.createdBy.toString() === userId.toString()) return true;
  
  const permissionField = `can${action.charAt(0).toUpperCase() + action.slice(1)}`;
  return this.permissions[permissionField].some(perm => 
    perm.user.toString() === userId.toString()
  );
};

templateSchema.methods.processVariables = function(variables = {}) {
  let processedContent = JSON.stringify(this.content);
  
  this.variables.forEach(variable => {
    const value = variables[variable.key] || variable.defaultValue || '';
    const regex = new RegExp(`{{${variable.key}}}`, 'g');
    processedContent = processedContent.replace(regex, value);
  });
  
  return JSON.parse(processedContent);
};

// Pre-save middleware
templateSchema.pre('save', function(next) {
  if (this.isNew) {
    this.analytics = {
      views: 0,
      uses: 0,
      downloads: 0,
      favorites: 0
    };
  }
  next();
});

module.exports = mongoose.model('Template', templateSchema);
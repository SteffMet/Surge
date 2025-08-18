const mongoose = require('mongoose');

const brandingSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    unique: true
  },
  
  organization: {
    name: String,
    displayName: String,
    description: String,
    website: String,
    industry: String,
    size: {
      type: String,
      enum: ['startup', 'small', 'medium', 'large', 'enterprise'],
      default: 'small'
    }
  },
  
  logo: {
    primary: String, // URL or base64
    secondary: String,
    favicon: String,
    watermark: String
  },
  
  colors: {
    primary: {
      type: String,
      default: '#2563eb',
      validate: {
        validator: function(v) {
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Primary color must be a valid hex color'
      }
    },
    secondary: {
      type: String,
      default: '#7c3aed',
      validate: {
        validator: function(v) {
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Secondary color must be a valid hex color'
      }
    },
    accent: {
      type: String,
      default: '#06b6d4',
      validate: {
        validator: function(v) {
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Accent color must be a valid hex color'
      }
    },
    success: {
      type: String,
      default: '#10b981'
    },
    warning: {
      type: String,
      default: '#f59e0b'
    },
    error: {
      type: String,
      default: '#ef4444'
    },
    info: {
      type: String,
      default: '#3b82f6'
    },
    background: {
      primary: String,
      secondary: String,
      paper: String,
      surface: String
    },
    text: {
      primary: String,
      secondary: String,
      disabled: String
    }
  },
  
  typography: {
    fontFamily: {
      primary: {
        type: String,
        default: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      },
      secondary: String,
      monospace: {
        type: String,
        default: '"Fira Code", "JetBrains Mono", monospace'
      }
    },
    fontSize: {
      base: {
        type: Number,
        default: 16,
        min: 12,
        max: 24
      },
      scale: {
        type: Number,
        default: 1.2,
        min: 1.1,
        max: 1.5
      }
    },
    fontWeights: {
      light: { type: Number, default: 300 },
      normal: { type: Number, default: 400 },
      medium: { type: Number, default: 500 },
      semibold: { type: Number, default: 600 },
      bold: { type: Number, default: 700 }
    },
    lineHeight: {
      tight: { type: Number, default: 1.2 },
      normal: { type: Number, default: 1.5 },
      relaxed: { type: Number, default: 1.75 }
    }
  },
  
  layout: {
    borderRadius: {
      type: Number,
      default: 8,
      min: 0,
      max: 20
    },
    spacing: {
      base: {
        type: Number,
        default: 8,
        min: 4,
        max: 16
      }
    },
    shadows: {
      enabled: { type: Boolean, default: true },
      intensity: {
        type: String,
        enum: ['none', 'subtle', 'medium', 'strong'],
        default: 'medium'
      }
    },
    animations: {
      enabled: { type: Boolean, default: true },
      duration: {
        type: String,
        enum: ['fast', 'normal', 'slow'],
        default: 'normal'
      }
    }
  },
  
  customCSS: {
    variables: String, // CSS custom properties
    global: String, // Global CSS overrides
    components: {
      header: String,
      sidebar: String,
      content: String,
      footer: String,
      buttons: String,
      forms: String,
      cards: String
    }
  },
  
  whiteLabel: {
    enabled: { type: Boolean, default: false },
    hideOriginalBranding: { type: Boolean, default: false },
    customDomain: String,
    customTitle: String,
    customMetaDescription: String,
    customFavicon: String,
    loginScreen: {
      backgroundImage: String,
      backgroundColor: String,
      logoPosition: {
        type: String,
        enum: ['top', 'center', 'bottom'],
        default: 'center'
      },
      customMessage: String
    }
  },
  
  emailBranding: {
    headerLogo: String,
    footerContent: String,
    colors: {
      background: String,
      text: String,
      accent: String
    },
    templates: {
      welcome: String,
      notification: String,
      invitation: String,
      report: String
    }
  },
  
  pdfExport: {
    headerLogo: String,
    footerText: String,
    watermark: {
      enabled: { type: Boolean, default: false },
      text: String,
      opacity: {
        type: Number,
        default: 0.1,
        min: 0.05,
        max: 0.5
      }
    },
    pageNumbers: {
      enabled: { type: Boolean, default: true },
      format: {
        type: String,
        enum: ['number', 'page-of-total', 'custom'],
        default: 'page-of-total'
      },
      position: {
        type: String,
        enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'bottom-center'],
        default: 'bottom-center'
      }
    }
  },
  
  features: {
    darkMode: {
      enabled: { type: Boolean, default: true },
      default: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
      }
    },
    customHomepage: {
      enabled: { type: Boolean, default: false },
      content: String, // HTML/Markdown content
      layout: {
        type: String,
        enum: ['default', 'dashboard', 'portal', 'knowledge-base'],
        default: 'default'
      }
    },
    navigation: {
      style: {
        type: String,
        enum: ['sidebar', 'topbar', 'hybrid'],
        default: 'sidebar'
      },
      collapsible: { type: Boolean, default: true },
      customMenuItems: [{
        label: String,
        url: String,
        icon: String,
        newTab: { type: Boolean, default: false },
        roles: [String] // User roles that can see this item
      }]
    }
  },
  
  integrations: {
    googleAnalytics: {
      enabled: { type: Boolean, default: false },
      trackingId: String
    },
    customScripts: {
      head: String, // Custom scripts for <head>
      body: String  // Custom scripts for <body>
    },
    sso: {
      enabled: { type: Boolean, default: false },
      provider: String,
      configuration: mongoose.Schema.Types.Mixed
    }
  },
  
  compliance: {
    gdpr: {
      enabled: { type: Boolean, default: false },
      cookieConsent: String,
      privacyPolicy: String,
      dataRetention: Number // Days
    },
    accessibility: {
      highContrast: { type: Boolean, default: false },
      largeText: { type: Boolean, default: false },
      keyboardNavigation: { type: Boolean, default: true }
    }
  },
  
  version: {
    type: String,
    default: '1.0.0'
  },
  
  lastModified: {
    type: Date,
    default: Date.now
  },
  
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  backups: [{
    version: String,
    data: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
brandingSchema.index({ workspace: 1 });
brandingSchema.index({ 'whiteLabel.enabled': 1 });
brandingSchema.index({ isActive: 1 });

// Virtuals
brandingSchema.virtual('cssVariables').get(function() {
  return `
    :root {
      --primary-color: ${this.colors.primary};
      --secondary-color: ${this.colors.secondary};
      --accent-color: ${this.colors.accent};
      --success-color: ${this.colors.success};
      --warning-color: ${this.colors.warning};
      --error-color: ${this.colors.error};
      --info-color: ${this.colors.info};
      --font-family-primary: ${this.typography.fontFamily.primary};
      --font-family-monospace: ${this.typography.fontFamily.monospace};
      --font-size-base: ${this.typography.fontSize.base}px;
      --border-radius: ${this.layout.borderRadius}px;
      --spacing-base: ${this.layout.spacing.base}px;
    }
  `;
});

brandingSchema.virtual('themeConfig').get(function() {
  return {
    palette: {
      primary: { main: this.colors.primary },
      secondary: { main: this.colors.secondary },
      success: { main: this.colors.success },
      warning: { main: this.colors.warning },
      error: { main: this.colors.error },
      info: { main: this.colors.info }
    },
    typography: {
      fontFamily: this.typography.fontFamily.primary,
      fontSize: this.typography.fontSize.base
    },
    shape: {
      borderRadius: this.layout.borderRadius
    },
    spacing: this.layout.spacing.base
  };
});

// Static methods
brandingSchema.statics.findByWorkspace = function(workspaceId) {
  return this.findOne({ workspace: workspaceId, isActive: true });
};

brandingSchema.statics.getWhiteLabelWorkspaces = function() {
  return this.find({ 
    'whiteLabel.enabled': true, 
    isActive: true 
  }).populate('workspace', 'name domain');
};

// Instance methods
brandingSchema.methods.createBackup = function(description, userId) {
  const backup = {
    version: this.version,
    data: this.toObject(),
    description: description || `Backup created on ${new Date().toISOString()}`,
    createdBy: userId
  };
  
  this.backups.push(backup);
  
  // Keep only last 10 backups
  if (this.backups.length > 10) {
    this.backups = this.backups.slice(-10);
  }
  
  return this.save();
};

brandingSchema.methods.restoreFromBackup = function(backupId) {
  const backup = this.backups.id(backupId);
  if (!backup) {
    throw new Error('Backup not found');
  }
  
  // Create current state backup before restoring
  this.createBackup('Pre-restore backup');
  
  // Restore from backup (excluding metadata)
  const { _id, workspace, backups, ...restoreData } = backup.data;
  Object.assign(this, restoreData);
  
  return this.save();
};

brandingSchema.methods.generateCustomCSS = function() {
  let css = this.cssVariables;
  
  if (this.customCSS.variables) {
    css += `\n${this.customCSS.variables}`;
  }
  
  if (this.customCSS.global) {
    css += `\n${this.customCSS.global}`;
  }
  
  Object.entries(this.customCSS.components).forEach(([component, styles]) => {
    if (styles) {
      css += `\n/* ${component.toUpperCase()} STYLES */\n${styles}`;
    }
  });
  
  return css;
};

// Pre-save middleware
brandingSchema.pre('save', function(next) {
  this.lastModified = new Date();
  
  if (this.isModified()) {
    // Increment version on significant changes
    if (this.isModified('colors') || this.isModified('typography') || this.isModified('layout')) {
      const [major, minor, patch] = this.version.split('.').map(Number);
      this.version = `${major}.${minor}.${patch + 1}`;
    }
  }
  
  next();
});

module.exports = mongoose.model('Branding', brandingSchema);
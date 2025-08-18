const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 64
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['basic', 'basic-upload', 'admin'],
      default: 'basic',
      index: true
    },
    active: {
      type: Boolean,
      default: true
    },
    passwordChangeRequired: {
      type: Boolean,
      default: false
    },
    externalAiProviderEnabled: {
      type: Boolean,
      default: false
    },
    externalAiApiKey: {
      type: String,
      select: false
    },
    externalAiSystemPrompt: {
      type: String
    },
    externalAiProviderType: {
      type: String,
      enum: ['openai', 'google', 'anthropic', 'azure-openai'],
      default: 'openai'
    },
    // Workspace-related fields
    workspacePreferences: {
      defaultWorkspaceType: {
        type: String,
        enum: ['private', 'collaborative'],
        default: 'private'
      },
      defaultBookmarkPrivacy: {
        type: String,
        enum: ['private', 'workspace'],
        default: 'workspace'
      },
      notificationSettings: {
        workspaceInvites: {
          type: Boolean,
          default: true
        },
        bookmarkUpdates: {
          type: Boolean,
          default: true
        },
        collaboratorActivity: {
          type: Boolean,
          default: false
        }
      }
    },
    // Statistics for user dashboard
    stats: {
      workspacesOwned: {
        type: Number,
        default: 0
      },
      workspacesCollaborating: {
        type: Number,
        default: 0
      },
      totalBookmarks: {
        type: Number,
        default: 0
      },
      lastWorkspaceActivity: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for total workspaces (owned + collaborating)
UserSchema.virtual('totalWorkspaces').get(function() {
  return (this.stats?.workspacesOwned || 0) + (this.stats?.workspacesCollaborating || 0);
});

// Instance method to get user's workspaces
UserSchema.methods.getWorkspaces = async function() {
  const Workspace = mongoose.model('Workspace');
  return await Workspace.findUserWorkspaces(this._id);
};

// Instance method to get user's bookmarks across all workspaces
UserSchema.methods.getBookmarks = async function(filters = {}) {
  const Bookmark = mongoose.model('Bookmark');
  return await Bookmark.findUserBookmarks(this._id, filters);
};

// Instance method to update workspace statistics
UserSchema.methods.updateWorkspaceStats = async function() {
  try {
    const Workspace = mongoose.model('Workspace');
    const Bookmark = mongoose.model('Bookmark');
    
    // Count owned workspaces
    const ownedCount = await Workspace.countDocuments({
      owner: this._id,
      isActive: true
    });
    
    // Count collaborating workspaces
    const collaboratingCount = await Workspace.countDocuments({
      'collaborators.user': this._id,
      isActive: true
    });
    
    // Count total bookmarks created by user
    const bookmarkCount = await Bookmark.countDocuments({
      createdBy: this._id
    });
    
    // Get last workspace activity
    const lastActivity = await Workspace.findOne({
      $or: [
        { owner: this._id },
        { 'collaborators.user': this._id }
      ],
      isActive: true
    }).sort({ updatedAt: -1 }).select('updatedAt');
    
    this.stats = {
      workspacesOwned: ownedCount,
      workspacesCollaborating: collaboratingCount,
      totalBookmarks: bookmarkCount,
      lastWorkspaceActivity: lastActivity ? lastActivity.updatedAt : null
    };
    
    await this.save();
    return this.stats;
  } catch (error) {
    console.error('Error updating workspace stats:', error);
    throw error;
  }
};

// Static method to find users by email for workspace invitations
UserSchema.statics.findByEmails = function(emails) {
  return this.find({
    email: { $in: emails.map(email => email.toLowerCase()) },
    active: true
  }).select('username email');
};

// hide password on toJSON
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
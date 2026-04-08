const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['javascript', 'nodejs'],
    default: 'nodejs'
  },
  output: String,
  error: String,
  executedAt: {
    type: Date,
    default: Date.now
  },
  executionTime: Number, // in milliseconds
  status: {
    type: String,
    enum: ['success', 'error', 'timeout'],
    default: 'success'
  }
});

const projectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name must not exceed 100 characters']
  },

  description: {
    type: String,
    maxlength: [500, 'Description must not exceed 500 characters'],
    default: ''
  },

  containerId: {
    type: String,
    required: true,
    unique: true
  },

  containerName: {
    type: String,
    required: true,
    unique: true
  },

  projectPath: {
    type: String,
    required: true
  },

  storagePath: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['created', 'running', 'stopped', 'error', 'terminated'],
    default: 'created',
    index: true
  },

  dependencies: {
    type: Map,
    of: String,
    default: () => new Map([
      ['express', '^4.18.2'],
      ['body-parser', '^1.20.2']
    ])
  },

  environment: {
    type: Map,
    of: String,
    default: () => new Map([
      ['NODE_ENV', 'development']
    ])
  },

  submissions: [submissionSchema],

  // Container stats
  lastRun: Date,
  totalRuns: {
    type: Number,
    default: 0
  },

  // Container resource info
  containerStats: {
    cpuUsage: Number,
    memoryUsage: Number,
    lastUpdated: Date
  },

  // Tags for organization
  tags: [String],

  // Settings
  isPublic: {
    type: Boolean,
    default: false
  },

  autoDelete: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true,
  collection: 'projects'
});

// ============================================
// SCHEMA INDEXES
// ============================================

// Compound index for user's projects
projectSchema.index({ userId: 1, createdAt: -1 });

// Status index for querying by status
projectSchema.index({ status: 1, createdAt: -1 });

// TTL index for auto-deletion (if needed)
projectSchema.index({ createdAt: 1 }, {
  expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
  sparse: true
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Get project summary for list view
 */
projectSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    status: this.status,
    containerName: this.containerName,
    totalRuns: this.totalRuns,
    lastRun: this.lastRun,
    createdAt: this.createdAt,
    tags: this.tags
  };
};

/**
 * Get detailed project info
 */
projectSchema.methods.getDetails = function() {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    status: this.status,
    containerName: this.containerName,
    containerId: this.containerId,
    projectPath: this.projectPath,
    dependencies: Object.fromEntries(this.dependencies),
    environment: Object.fromEntries(this.environment),
    totalRuns: this.totalRuns,
    lastRun: this.lastRun,
    submissions: this.submissions.length,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

/**
 * Add a new submission
 */
projectSchema.methods.addSubmission = async function(submission) {
  this.submissions.push(submission);
  this.totalRuns += 1;
  this.lastRun = new Date();
  
  // Keep only last 100 submissions to save space
  if (this.submissions.length > 100) {
    this.submissions = this.submissions.slice(-100);
  }
  
  return this.save();
};

/**
 * Get last N submissions
 */
projectSchema.methods.getRecentSubmissions = function(limit = 10) {
  return this.submissions.slice(-limit).reverse();
};

/**
 * Update project status
 */
projectSchema.methods.updateStatus = async function(newStatus, reason = null) {
  this.status = newStatus;
  if (reason) {
    console.log(`[Project ${this._id}] Status changed to ${newStatus}: ${reason}`);
  }
  return this.save();
};

/**
 * Update container stats
 */
projectSchema.methods.updateStats = async function(stats) {
  this.containerStats = {
    cpuUsage: stats.cpu || 0,
    memoryUsage: stats.memory || 0,
    lastUpdated: new Date()
  };
  return this.save();
};

/**
 * Get submission statistics
 */
projectSchema.methods.getStats = function() {
  const stats = {
    totalSubmissions: this.submissions.length,
    successful: 0,
    failed: 0,
    avgExecutionTime: 0
  };

  let totalTime = 0;
  
  this.submissions.forEach(sub => {
    if (sub.status === 'success') {
      stats.successful++;
    } else {
      stats.failed++;
    }
    totalTime += sub.executionTime || 0;
  });

  if (stats.totalSubmissions > 0) {
    stats.avgExecutionTime = Math.round(totalTime / stats.totalSubmissions);
  }

  return stats;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find all projects by user ID with pagination
 */
projectSchema.statics.findByUserId = function(userId, limit = 10, skip = 0) {
  return this.find({ userId })
    .limit(limit)
    .skip(skip)
    .sort({ createdAt: -1 });
};

/**
 * Count user projects
 */
projectSchema.statics.countByUserId = function(userId) {
  return this.countDocuments({ userId });
};

/**
 * Find running projects by user
 */
projectSchema.statics.findRunningByUser = function(userId) {
  return this.find({ userId, status: 'running' });
};

/**
 * Find all running projects
 */
projectSchema.statics.findAllRunning = function() {
  return this.find({ status: 'running' });
};

/**
 * Find project by container ID
 */
projectSchema.statics.findByContainerId = function(containerId) {
  return this.findOne({ containerId });
};

/**
 * Find project by container name
 */
projectSchema.statics.findByContainerName = function(containerName) {
  return this.findOne({ containerName });
};

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Populate user info before returning
 */
projectSchema.pre(/^find/, function(next) {
  // Populate userId only if it's selected
  if (this.getOptions()._recursed) {
    return next();
  }
  this.populate({
    path: 'userId',
    select: 'username email'
  });
  next();
});

module.exports = mongoose.model('Project', projectSchema);

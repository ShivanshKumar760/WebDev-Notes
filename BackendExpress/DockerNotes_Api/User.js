const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username must not exceed 30 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens']
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  isEmailVerified: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  lastLogin: Date,

  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true,
  collection: 'users'
});

// ============================================
// SCHEMA MIDDLEWARE
// ============================================

/**
 * Hash password before saving
 * Only hashes if password is new or modified
 */
userSchema.pre('save', async function(next) {
  // Skip if password hasn't changed
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Update lastLogin on save if user is being authenticated
 */
userSchema.pre('save', function(next) {
  if (this.isNew) {
    this.createdAt = new Date();
  }
  next();
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Compare provided password with hashed password
 * @param {string} plainPassword - Plain text password to compare
 * @returns {Promise<boolean>} - True if password matches
 */
userSchema.methods.comparePassword = async function(plainPassword) {
  try {
    return await bcrypt.compare(plainPassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Get public user data (without sensitive info)
 * @returns {object} - User object without password
 */
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.password;
  delete userObject.__v;
  
  return userObject;
};

/**
 * Get user public profile
 * @returns {object} - Limited user data for public display
 */
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    createdAt: this.createdAt,
    role: this.role
  };
};

/**
 * Update lastLogin timestamp
 */
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<object>} - User document
 */
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find user by username
 * @param {string} username - Username
 * @returns {Promise<object>} - User document
 */
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase() });
};

/**
 * Check if email exists
 * @param {string} email - Email to check
 * @returns {Promise<boolean>}
 */
userSchema.statics.emailExists = async function(email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

/**
 * Check if username exists
 * @param {string} username - Username to check
 * @returns {Promise<boolean>}
 */
userSchema.statics.usernameExists = async function(username) {
  const user = await this.findOne({ username: username.toLowerCase() });
  return !!user;
};

// ============================================
// INDEXES
// ============================================

// Create indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });

// Ensure email and username are unique
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);

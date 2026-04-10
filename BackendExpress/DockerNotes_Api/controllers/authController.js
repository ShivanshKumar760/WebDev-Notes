const User = require('../models/User');
const jwt = require('../utils/jwt');
const { ValidationError, AuthenticationError } = require('../middleware/errorHandler');

/**
 * Authentication Controller
 * Handles user signup, login, and logout operations
 */
class AuthController {
  /**
   * User Signup
   * POST /api/auth/signup
   */
  async signup(req, res, next) {
    try {
      const { username, email, password, confirmPassword } = req.body;

      // Validate input
      if (!username || !email || !password || !confirmPassword) {
        throw new ValidationError('All fields are required');
      }

      if (password !== confirmPassword) {
        throw new ValidationError('Passwords do not match');
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
      });

      if (existingUser) {
        throw new ValidationError(
          existingUser.email === email.toLowerCase()
            ? 'Email already registered'
            : 'Username already taken'
        );
      }

      // Create new user
      const user = new User({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password
      });

      await user.save();
      console.log(`[Auth] User created: ${username}`);

      // Generate tokens
      const token = jwt.generateToken({ userId: user._id });
      const refreshToken = jwt.generateRefreshToken({ userId: user._id });

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        refreshToken,
        user: user.toJSON()
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * User Login
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      // Find user and include password
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AuthenticationError('Account has been deactivated');
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Update last login
      await user.updateLastLogin();
      console.log(`[Auth] User logged in: ${email}`);

      // Generate tokens
      const token = jwt.generateToken({ userId: user._id, role: user.role });
      const refreshToken = jwt.generateRefreshToken({ userId: user._id });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        refreshToken,
        user: user.toJSON()
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh Token
   * POST /api/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      // Verify refresh token
      const decoded = jwt.verifyRefreshToken(refreshToken);

      // Generate new access token
      const newToken = jwt.generateToken({ userId: decoded.userId });

      res.json({
        success: true,
        message: 'Token refreshed',
        token: newToken
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * User Logout
   * POST /api/auth/logout
   * Note: Token invalidation typically handled client-side or with token blacklist
   */
  async logout(req, res, next) {
    try {
      // In production, you might want to:
      // 1. Add token to blacklist (Redis)
      // 2. Invalidate refresh tokens in database
      // 3. Clear user sessions

      console.log(`[Auth] User logged out: ${req.user?.userId}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Current User
   * GET /api/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      if (!req.user) {
        throw new AuthenticationError('No user authenticated');
      }

      const user = await User.findById(req.user.userId);

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      res.json({
        success: true,
        user: user.toJSON()
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Change Password
   * POST /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      if (!req.user) {
        throw new AuthenticationError('No user authenticated');
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new ValidationError('All password fields are required');
      }

      if (newPassword !== confirmPassword) {
        throw new ValidationError('New passwords do not match');
      }

      if (newPassword === currentPassword) {
        throw new ValidationError('New password must be different from current password');
      }

      // Get user with password
      const user = await User.findById(req.user.userId).select('+password');

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Verify current password
      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      console.log(`[Auth] Password changed for user: ${user.username}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Account
   * DELETE /api/auth/account
   */
  async deleteAccount(req, res, next) {
    try {
      if (!req.user) {
        throw new AuthenticationError('No user authenticated');
      }

      const { password } = req.body;

      if (!password) {
        throw new ValidationError('Password is required to delete account');
      }

      // Get user with password
      const user = await User.findById(req.user.userId).select('+password');

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Verify password
      const isValid = await user.comparePassword(password);
      if (!isValid) {
        throw new AuthenticationError('Password is incorrect');
      }

      // Delete user
      await User.deleteOne({ _id: req.user.userId });

      // Also delete associated projects (optional)
      const Project = require('../models/Project');
      await Project.deleteMany({ userId: req.user.userId });

      console.log(`[Auth] Account deleted for user: ${user.username}`);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

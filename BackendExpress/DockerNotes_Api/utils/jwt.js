const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/**
 * JWT Utility Functions
 * Handle token generation and verification
 */
const jwtUtils = {
  /**
   * Generate JWT token
   * @param {object} payload - Data to encode
   * @param {string} expiresIn - Token expiration time (optional)
   * @returns {string} - JWT token
   */
  generateToken(payload, expiresIn = JWT_EXPIRY) {
    try {
      return jwt.sign(payload, JWT_SECRET, {
        expiresIn,
        issuer: 'mini-replit',
        algorithm: 'HS256'
      });
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  },

  /**
   * Verify JWT token
   * @param {string} token - Token to verify
   * @returns {object} - Decoded token payload
   * @throws {Error} - If token is invalid or expired
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256']
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw error;
      }
    }
  },

  /**
   * Decode token without verification
   * Use only for inspection, not for security decisions
   * @param {string} token - Token to decode
   * @returns {object|null} - Decoded payload or null
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  },

  /**
   * Generate refresh token
   * @param {object} payload - Data to encode
   * @returns {string} - Refresh token (longer expiry)
   */
  generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '30d', // Longer expiry for refresh tokens
        issuer: 'mini-replit',
        algorithm: 'HS256'
      });
    } catch (error) {
      throw new Error(`Refresh token generation failed: ${error.message}`);
    }
  },

  /**
   * Verify refresh token
   * @param {string} token - Refresh token to verify
   * @returns {object} - Decoded token payload
   * @throws {Error}
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256']
      });
    } catch (error) {
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  },

  /**
   * Get token expiration time
   * @param {string} token - Token to inspect
   * @returns {Date|null} - Expiration date or null if token doesn't have exp
   */
  getTokenExpiration(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    return new Date(decoded.exp * 1000);
  },

  /**
   * Check if token is expired
   * @param {string} token - Token to check
   * @returns {boolean} - True if expired
   */
  isTokenExpired(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return false;
    }
    return Date.now() >= decoded.exp * 1000;
  }
};

module.exports = jwtUtils;

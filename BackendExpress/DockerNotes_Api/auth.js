const jwt = require('../utils/jwt');

/**
 * Authentication Middleware
 * Verifies JWT token and extracts user information
 */
const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided',
        code: 'NO_AUTH_HEADER'
      });
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization header format. Use: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT'
      });
    }

    const token = parts[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message,
        code: 'INVALID_TOKEN'
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      iat: decoded.iat,
      exp: decoded.exp
    };

    // Store full decoded token for reference
    req.token = decoded;

    next();

  } catch (error) {
    console.error('[Auth] Middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Does not fail if no token provided, but verifies if one exists
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        const token = parts[1];
        
        try {
          const decoded = jwt.verifyToken(token);
          req.user = {
            userId: decoded.userId,
            iat: decoded.iat,
            exp: decoded.exp
          };
          req.token = decoded;
          req.isAuthenticated = true;
        } catch (error) {
          // Token exists but is invalid - continue without auth
          req.isAuthenticated = false;
        }
      }
    } else {
      req.isAuthenticated = false;
    }

    next();

  } catch (error) {
    console.error('[Auth] Optional middleware error:', error);
    req.isAuthenticated = false;
    next();
  }
};

/**
 * Admin Authentication Middleware
 * Requires admin role
 */
const adminAuthMiddleware = (req, res, next) => {
  try {
    // First apply regular auth
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NO_AUTH'
      });
    }

    // Check for admin role in token
    if (req.token.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges required',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    next();

  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      code: 'ACCESS_DENIED'
    });
  }
};

/**
 * Token Refresh Middleware
 * Checks if token is about to expire and provides refresh info
 */
const tokenRefreshCheckMiddleware = (req, res, next) => {
  try {
    if (req.token && req.token.exp) {
      const expiresIn = req.token.exp * 1000 - Date.now();
      const expiresInMinutes = Math.floor(expiresIn / 1000 / 60);

      // If token expires in less than 5 minutes, suggest refresh
      if (expiresInMinutes < 5) {
        res.set('X-Token-Expires-In-Minutes', expiresInMinutes.toString());
        res.set('X-Token-Refresh-Suggested', 'true');
      }
    }

    next();

  } catch (error) {
    console.error('[Auth] Token refresh check error:', error);
    next();
  }
};

/**
 * Rate Limiting Middleware (simple implementation)
 * Can be enhanced with Redis for distributed systems
 */
const createRateLimitMiddleware = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const store = new Map();

  return (req, res, next) => {
    const key = req.user?.userId || req.ip;
    const now = Date.now();
    
    if (!store.has(key)) {
      store.set(key, []);
    }

    const requests = store.get(key);
    
    // Remove old requests
    const recentRequests = requests.filter(time => now - time < windowMs);
    store.set(key, recentRequests);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
    
    next();
  };
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  adminAuthMiddleware,
  tokenRefreshCheckMiddleware,
  createRateLimitMiddleware
};

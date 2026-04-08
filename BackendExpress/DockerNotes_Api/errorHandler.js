/**
 * Error Handling Middleware
 * Catches and formats all application errors consistently
 */

/**
 * Global error handler middleware
 * Should be last middleware in the stack
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details = null;

  // Handle different error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID_FORMAT';
  }

  else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    // Handle MongoDB specific errors
    if (err.code === 11000) {
      statusCode = 409;
      message = 'Duplicate entry';
      code = 'DUPLICATE_ENTRY';
      const field = Object.keys(err.keyValue)[0];
      details = { field };
    } else {
      statusCode = 500;
      message = 'Database error';
      code = 'DATABASE_ERROR';
    }
  }

  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }

  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
    details = { expiredAt: err.expiredAt };
  }

  else if (err.code === 'ENOENT') {
    statusCode = 404;
    message = 'File not found';
    code = 'FILE_NOT_FOUND';
  }

  else if (err.code === 'EACCES') {
    statusCode = 403;
    message = 'Permission denied';
    code = 'PERMISSION_DENIED';
  }

  else if (err.message.includes('Docker') || err.message.includes('Container')) {
    statusCode = 503;
    message = 'Docker service error';
    code = 'DOCKER_ERROR';
  }

  else if (err.statusCode) {
    // Custom errors with status code
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || 'CUSTOM_ERROR';
  }

  // Send error response
  const response = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString()
  };

  // Include details if available
  if (details) {
    response.details = details;
  }

  // Include request ID for tracking
  if (req.id) {
    response.requestId = req.id;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found middleware
 * Should be placed after all routes
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method
  });
};

/**
 * Request ID middleware
 * Adds unique ID to each request for tracking
 */
const requestIdMiddleware = (req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.set('X-Request-ID', req.id);
  next();
};

/**
 * Custom Error Classes
 */

class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'API_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}

class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends ApiError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends ApiError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

class RateLimitError extends ApiError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

class DockerError extends ApiError {
  constructor(message = 'Docker service error') {
    super(message, 503, 'DOCKER_ERROR');
    this.name = 'DockerError';
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  requestIdMiddleware,
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DockerError
};

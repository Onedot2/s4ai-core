/**
 * Error Handling Module
 * Comprehensive error handling with structured logging and recovery strategies
 */

import logger from './logger.js';

/**
 * Base Application Error
 */
export class AppError extends Error {
  constructor(message, code = 'APP_ERROR', statusCode = 500, context = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.recovered = false;
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context
    };
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(message, context = {}) {
    super(message, 'DB_ERROR', 500, context);
    this.name = 'DatabaseError';
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(message, details = [], context = {}) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details
    };
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', context = {}) {
    super(message, 'AUTH_ERROR', 401, context);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Access denied', context = {}) {
    super(message, 'AUTHZ_ERROR', 403, context);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', context = {}) {
    super(`${resource} not found`, 'NOT_FOUND', 404, context);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', context = {}) {
    super(message, 'CONFLICT', 409, context);
    this.name = 'ConflictError';
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = 60, context = {}) {
    super(message, 'RATE_LIMIT', 429, context);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Service Unavailable Error
 */
export class ServiceError extends AppError {
  constructor(service = 'Service', message = 'temporarily unavailable', context = {}) {
    super(`${service} ${message}`, 'SERVICE_ERROR', 503, context);
    this.name = 'ServiceError';
    this.service = service;
  }
}

/**
 * Error Recovery Strategies
 */
export const recoveryStrategies = {
  // Retry with exponential backoff
  retry: (fn, maxAttempts = 3, delay = 1000) => {
    return async function retryWithBackoff(attempt = 0) {
      try {
        return await fn();
      } catch (error) {
        if (attempt < maxAttempts - 1) {
          const backoffDelay = delay * Math.pow(2, attempt);
          logger.warn(`Retry attempt ${attempt + 1}/${maxAttempts}`, {
            error: error.message,
            nextRetryIn: backoffDelay
          });
          
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return retryWithBackoff(attempt + 1);
        }
        throw error;
      }
    };
  },

  // Circuit breaker pattern
  circuitBreaker: (fn, threshold = 5, timeout = 60000) => {
    let failureCount = 0;
    let lastFailureTime = null;
    let isOpen = false;

    return async function withCircuitBreaker(...args) {
      // Check if circuit should close
      if (isOpen && Date.now() - lastFailureTime > timeout) {
        logger.info('Circuit breaker: Attempting recovery');
        isOpen = false;
        failureCount = 0;
      }

      if (isOpen) {
        throw new ServiceError('Circuit breaker is open', 'temporarily unavailable');
      }

      try {
        const result = await fn(...args);
        failureCount = 0;
        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = Date.now();

        if (failureCount >= threshold) {
          isOpen = true;
          logger.error('Circuit breaker opened', {
            failureCount,
            threshold,
            service: fn.name
          });
        }

        throw error;
      }
    };
  },

  // Fallback values
  fallback: (fn, fallbackValue) => {
    return async function withFallback(...args) {
      try {
        return await fn(...args);
      } catch (error) {
        logger.warn('Using fallback value', {
          error: error.message,
          fallback: typeof fallbackValue === 'object' ? '[Object]' : fallbackValue
        });
        return fallbackValue;
      }
    };
  },

  // Graceful degradation
  degrade: (primary, secondary) => {
    return async function withGracefulDegradation(...args) {
      try {
        return await primary(...args);
      } catch (primaryError) {
        logger.warn('Primary service failed, using secondary', {
          primary: primary.name,
          secondary: secondary.name,
          error: primaryError.message
        });
        
        try {
          return await secondary(...args);
        } catch (secondaryError) {
          logger.error('Both primary and secondary services failed', {
            primary: primary.name,
            primaryError: primaryError.message,
            secondary: secondary.name,
            secondaryError: secondaryError.message
          });
          throw secondaryError;
        }
      }
    };
  }
};

/**
 * Error handling middleware for Express
 */
export function createErrorHandler() {
  return (err, req, res, next) => {
    const error = normalizeError(err);

    // Log error with context
    logger.error('Request error', {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip,
      stack: error.stack.split('\n').slice(0, 3)
    });

    // Send response
    res.status(error.statusCode).json(error.toJSON());
  };
}

/**
 * Normalize errors to AppError
 */
export function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof TypeError) {
    return new ValidationError(error.message, [], { originalError: 'TypeError' });
  }

  if (error instanceof RangeError) {
    return new ValidationError(error.message, [], { originalError: 'RangeError' });
  }

  if (error instanceof SyntaxError) {
    return new ValidationError('Invalid format', [], { originalError: 'SyntaxError' });
  }

  // Default app error
  return new AppError(
    error.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500,
    { originalError: error.constructor.name }
  );
}

/**
 * Safe async wrapper
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(error => {
      logger.error('Async handler error', {
        error: error.message,
        handler: fn.name
      });
      next(normalizeError(error));
    });
  };
}

/**
 * Timeout wrapper
 */
export function withTimeout(promise, timeoutMs = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        reject(new AppError(
          `Operation timed out after ${timeoutMs}ms`,
          'TIMEOUT',
          408
        ));
      }, timeoutMs)
    )
  ]);
}

/**
 * Retry helper with jitter
 */
export function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 30000,
    backoff = 2,
    jitter = true
  } = options;

  return async function retryFn(...args) {
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts - 1) {
          let delay = initialDelay * Math.pow(backoff, attempt);
          if (jitter) {
            delay = delay * (0.5 + Math.random());
          }
          delay = Math.min(delay, maxDelay);

          logger.debug(`Retry attempt ${attempt + 1}/${maxAttempts}`, {
            error: error.message,
            delayMs: Math.round(delay)
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  };
}

export default {
  // Error classes
  AppError,
  DatabaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceError,
  
  // Utilities
  normalizeError,
  asyncHandler,
  withTimeout,
  withRetry,
  createErrorHandler,
  
  // Strategies
  recoveryStrategies
};

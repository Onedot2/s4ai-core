/**
 * Error Handling Module Tests
 * Tests for error classes and recovery strategies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AppError,
  DatabaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceError,
  normalizeError,
  asyncHandler,
  withTimeout,
  withRetry,
  createErrorHandler,
  recoveryStrategies
} from '../utils/errors.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with message', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('APP_ERROR');
    });

    it('should create error with code and statusCode', () => {
      const error = new AppError('Test error', 'CUSTOM_ERROR', 500);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.statusCode).toBe(500);
    });

    it('should include context information', () => {
      const error = new AppError('Test error', 'TEST', 400, { field: 'test' });
      expect(error.context).toEqual({ field: 'test' });
    });

    it('should serialize to JSON', () => {
      const error = new AppError('Test error', 'TEST', 400);
      const json = error.toJSON();
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST');
      expect(json.statusCode).toBe(400);
    });
  });

  describe('DatabaseError', () => {
    it('should create database error', () => {
      const error = new DatabaseError('Connection failed');
      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input', 'VALIDATION_FAILED', { field: 'email' });
      expect(error.statusCode).toBe(400);
      expect(error.context.field).toBe('email');
    });
  });

  describe('AuthenticationError', () => {
    it('should create 401 error', () => {
      const error = new AuthenticationError('Invalid token');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('AuthorizationError', () => {
    it('should create 403 error', () => {
      const error = new AuthorizationError('Access denied');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error', () => {
      const error = new NotFoundError('User not found', { userId: 123 });
      expect(error.statusCode).toBe(404);
      expect(error.context.userId).toBe(123);
    });
  });

  describe('ConflictError', () => {
    it('should create 409 error', () => {
      const error = new ConflictError('Email already exists');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('RateLimitError', () => {
    it('should create 429 error', () => {
      const error = new RateLimitError('Too many requests', 60);
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('ServiceError', () => {
    it('should create 503 error', () => {
      const error = new ServiceError('Database unavailable');
      expect(error.statusCode).toBe(503);
    });
  });
});

describe('Recovery Strategies', () => {
  describe('withRetry()', () => {
    it('should retry failed operation', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) throw new Error('Fail');
        return 'success';
      };

      // withRetry returns the wrapper, not the result directly
      const wrappedFn = withRetry(fn, 3);
      const result = await wrappedFn();
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should throw after max attempts', async () => {
      const fn = async () => {
        throw new Error('Always fails');
      };

      await expect(
        withRetry(fn, 2)()
      ).rejects.toThrow('Always fails');
    });

    it('should handle success', async () => {
      const fn = async () => 'success';

      const wrappedFn = withRetry(fn, 1);
      const result = await wrappedFn();
      expect(result).toBe('success');
    });
  });

  describe('withTimeout()', () => {
    it('should return result on success', async () => {
      const promise = Promise.resolve('result');
      const result = await withTimeout(promise, 1000);

      expect(result).toBe('result');
    });

    it('should reject on timeout', async () => {
      const promise = new Promise(() => {
        // Never resolves
      });

      await expect(
        withTimeout(promise, 100)
      ).rejects.toThrow();
    });
  });

  describe('normalizeError()', () => {
    it('should convert Error to AppError', () => {
      const error = new Error('Test error');
      const normalized = normalizeError(error);

      expect(normalized).toBeInstanceOf(AppError);
    });

    it('should return AppError as is', () => {
      const error = new AppError('Test error');
      const normalized = normalizeError(error);

      expect(normalized).toBe(error);
    });
  });

  describe('asyncHandler()', () => {
    it('should handle async function errors', async () => {
      const fn = asyncHandler(async (req, res) => {
        throw new Error('Test error');
      });

      const req = {};
      const res = {};
      const next = vi.fn();

      await fn(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should call next with error', async () => {
      const testError = new Error('Test error');
      const fn = asyncHandler(async () => {
        throw testError;
      });

      const next = vi.fn();
      await fn({}, {}, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

describe('Error Handler Middleware', () => {
  it('should create error handler middleware', () => {
    const handler = createErrorHandler();
    expect(typeof handler).toBe('function');
  });

  it('should handle AppError', () => {
    const handler = createErrorHandler();
    const error = new AppError('Test error', 'TEST', 400);
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    handler(error, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });

  it('should handle generic errors', () => {
    const handler = createErrorHandler();
    const error = new Error('Generic error');
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    handler(error, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

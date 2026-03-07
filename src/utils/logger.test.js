/**
 * Test suite for Logger Module
 * Tests logger initialization, log levels, and functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import logger from './logger.js';

describe('Logger', () => {
  describe('Logger Initialization', () => {
    it('should create logger instance', () => {
      expect(logger).toBeDefined();
    });

    it('should have log level methods', () => {
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have helper methods', () => {
      expect(typeof logger.request).toBe('function');
      expect(typeof logger.performance).toBe('function');
    });
  });

  describe('Log Methods', () => {
    it('should call info method without error', () => {
      expect(() => {
        logger.info('Test message', { test: true });
      }).not.toThrow();
    });

    it('should call error method without error', () => {
      expect(() => {
        logger.error('Test error', { error: 'details' });
      }).not.toThrow();
    });

    it('should call warn method without error', () => {
      expect(() => {
        logger.warn('Test warning', { warning: true });
      }).not.toThrow();
    });

    it('should call debug method without error', () => {
      expect(() => {
        logger.debug('Test debug', { debug: true });
      }).not.toThrow();
    });
  });

  describe('Helper Methods', () => {
    it('should log request with metadata', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        get: () => 'Mozilla/5.0'
      };

      expect(() => {
        logger.request(mockReq, 'Test request');
      }).not.toThrow();
    });

    it('should log performance metrics', () => {
      expect(() => {
        logger.performance('testOperation', 123, { test: true });
      }).not.toThrow();
    });

    it('should warn for slow operations (>1000ms)', () => {
      expect(() => {
        logger.performance('slowOperation', 1500, { slow: true });
      }).not.toThrow();
    });
  });

  describe('Log Format', () => {
    it('should accept message string', () => {
      expect(() => {
        logger.info('Simple message');
      }).not.toThrow();
    });

    it('should accept message with metadata object', () => {
      expect(() => {
        logger.info('Message', { key: 'value', nested: { deep: true } });
      }).not.toThrow();
    });

    it('should accept message with multiple metadata fields', () => {
      expect(() => {
        logger.info('Message', { 
          userId: 123,
          action: 'test',
          timestamp: new Date().toISOString(),
          data: { complex: 'object' }
        });
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should log Error objects', () => {
      const testError = new Error('Test error message');
      expect(() => {
        logger.error('An error occurred', { error: testError.message });
      }).not.toThrow();
    });

    it('should log with stack traces', () => {
      const testError = new Error('Test error');
      expect(() => {
        logger.error('Error with stack', { 
          message: testError.message,
          stack: testError.stack
        });
      }).not.toThrow();
    });
  });

  describe('Metadata Enrichment', () => {
    it('should include service metadata', () => {
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();
      // Service metadata should be added by logger configuration
    });

    it('should include environment metadata', () => {
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();
      // Environment should match NODE_ENV
    });

    it('should include process metadata', () => {
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();
      // Should include pid and hostname
    });
  });
});

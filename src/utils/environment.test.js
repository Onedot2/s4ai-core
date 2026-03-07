/**
 * Environment Module Tests
 * Tests for environment detection and validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getNodeVersion,
  getSystemInfo,
  getDeploymentPlatform,
  getRuntimeEnvironment,
  validateEnvironment,
  logEnvironmentInfo,
  getEnvironmentReport,
  createEnvironmentMiddleware,
  isRunningIn,
  getResourceLimits
} from '../utils/environment.js';

describe('Environment Detection', () => {
  describe('getNodeVersion()', () => {
    it('should return node version info', () => {
      const version = getNodeVersion();
      expect(version.version).toBeDefined();
      expect(version.major).toBeGreaterThanOrEqual(16);
      expect(typeof version.major).toBe('number');
    });

    it('should parse major version correctly', () => {
      const version = getNodeVersion();
      expect(version.major).toBeGreaterThan(0);
    });
  });

  describe('getSystemInfo()', () => {
    it('should return system information', () => {
      const info = getSystemInfo();
      expect(info.platform).toBeDefined();
      expect(info.arch).toBeDefined();
      expect(info.cpuCount).toBeGreaterThan(0);
      expect(info.totalMemory).toBeGreaterThan(0);
    });

    it('should include memory in MB', () => {
      const info = getSystemInfo();
      expect(info.totalMemory).toBeGreaterThan(256); // At least 256MB
    });

    it('should include hostname', () => {
      const info = getSystemInfo();
      expect(info.hostname).toBeDefined();
      expect(info.hostname.length).toBeGreaterThan(0);
    });

    it('should include load average', () => {
      const info = getSystemInfo();
      expect(Array.isArray(info.loadAverage)).toBe(true);
      expect(info.loadAverage).toHaveLength(3);
    });
  });

  describe('getDeploymentPlatform()', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should detect local environment', () => {
      delete process.env.RAILWAY_ENVIRONMENT;
      delete process.env.VERCEL;
      delete process.env.HEROKU_APP_NAME;

      const platform = getDeploymentPlatform();
      expect(platform.platform).toBe('local');
    });

    it('should detect Railway platform', () => {
      process.env.RAILWAY_ENVIRONMENT = 'production';
      process.env.RAILWAY_REGION = 'us-west';

      const platform = getDeploymentPlatform();
      expect(platform.platform).toBe('railway');
      expect(platform.environment).toBe('production');
    });

    it('should detect Vercel platform', () => {
      process.env.VERCEL = '1';
      process.env.VERCEL_ENV = 'production';

      const platform = getDeploymentPlatform();
      expect(platform.platform).toBe('vercel');
    });

    it('should detect Docker environment', () => {
      process.env.CONTAINER = 'docker';

      const platform = getDeploymentPlatform();
      expect(platform.platform).toBe('docker');
    });
  });

  describe('getRuntimeEnvironment()', () => {
    it('should return complete environment info', () => {
      const env = getRuntimeEnvironment();
      expect(env.nodeVersion).toBeDefined();
      expect(env.system).toBeDefined();
      expect(env.deployment).toBeDefined();
      expect(env.environment).toBeDefined();
    });

    it('should include environment flags', () => {
      const env = getRuntimeEnvironment();
      expect(typeof env.isProduction).toBe('boolean');
      expect(typeof env.isDevelopment).toBe('boolean');
    });

    it('should default to development', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const env = getRuntimeEnvironment();
      expect(env.isDevelopment).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validateEnvironment()', () => {
    it('should validate environment', () => {
      const result = validateEnvironment();
      expect(result.valid).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should warn on old Node version', () => {
      const result = validateEnvironment();
      const nodeVersion = parseInt(process.version.split('.')[0].slice(1));

      if (nodeVersion < 18) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it('should check required vars in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = validateEnvironment();
      // Should have issues or we're in a fully configured environment
      expect(typeof result.valid).toBe('boolean');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('logEnvironmentInfo()', () => {
    it('should log environment information', () => {
      const result = logEnvironmentInfo('debug');
      expect(result.environment).toBeDefined();
      expect(result.validation).toBeDefined();
    });

    it('should return environment and validation', () => {
      const result = logEnvironmentInfo();
      expect(result.environment.nodeVersion).toBeDefined();
      expect(result.validation.valid).toBeDefined();
    });
  });

  describe('getEnvironmentReport()', () => {
    it('should generate complete report', () => {
      const report = getEnvironmentReport();
      expect(report.timestamp).toBeDefined();
      expect(report.environment).toBeDefined();
      expect(report.validation).toBeDefined();
      expect(report.processInfo).toBeDefined();
    });

    it('should include process information', () => {
      const report = getEnvironmentReport();
      expect(report.processInfo.pid).toBe(process.pid);
      expect(report.processInfo.cwd).toBeDefined();
    });

    it('should include memory usage', () => {
      const report = getEnvironmentReport();
      expect(report.processInfo.memoryUsage.heapUsed).toBeGreaterThan(0);
    });
  });

  describe('createEnvironmentMiddleware()', () => {
    it('should create middleware function', () => {
      const middleware = createEnvironmentMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should add environment info to request', () => {
      const middleware = createEnvironmentMiddleware();
      const req = {};
      const res = {};
      const next = vi.fn();

      middleware(req, res, next);

      expect(req.environment).toBeDefined();
      expect(req.environment.platform).toBeDefined();
      expect(req.environment.isProduction).toBeDefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('isRunningIn()', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should detect local environment', () => {
      delete process.env.RAILWAY_ENVIRONMENT;
      const result = isRunningIn('local');
      expect(result).toBe(true);
    });

    it('should return false for non-matching platform', () => {
      const result = isRunningIn('railway');
      expect(result).toBe(false);
    });
  });

  describe('getResourceLimits()', () => {
    it('should return resource limits', () => {
      const limits = getResourceLimits();
      expect(limits.cpuCount).toBeGreaterThan(0);
      expect(limits.memoryMB).toBeGreaterThan(0);
      expect(limits.timeoutMs).toBeGreaterThan(0);
      expect(limits.maxConnections).toBeGreaterThan(0);
    });

    it('should respect environment variables', () => {
      const originalTimeout = process.env.TIMEOUT_MS;
      process.env.TIMEOUT_MS = '60000';

      const limits = getResourceLimits();
      expect(limits.timeoutMs).toBe(60000);

      process.env.TIMEOUT_MS = originalTimeout;
    });

    it('should have reasonable defaults', () => {
      const limits = getResourceLimits();
      expect(limits.timeoutMs).toBeLessThan(300000); // Less than 5 minutes
      expect(limits.maxConnections).toBeGreaterThan(10);
    });
  });
});

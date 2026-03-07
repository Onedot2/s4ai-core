/**
 * Environment Detection Module
 * Detects and reports system environment, runtime details, and deployment context
 */

import os from 'os';
import logger from './logger.js';

/**
 * Get Node.js version info
 */
export function getNodeVersion() {
  return {
    version: process.version,
    major: parseInt(process.version.split('.')[0].slice(1)),
    minor: parseInt(process.version.split('.')[1]),
    patch: parseInt(process.version.split('.')[2]),
    v8: process.versions.v8,
    npm: process.env.npm_version || 'unknown'
  };
}

/**
 * Get system info
 */
export function getSystemInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    cpuCount: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
    freeMemory: Math.round(os.freemem() / 1024 / 1024),
    hostname: os.hostname(),
    uptime: Math.round(os.uptime() / 60), // minutes
    loadAverage: os.loadavg()
  };
}

/**
 * Detect deployment platform
 */
export function getDeploymentPlatform() {
  const env = process.env;

  if (env.RAILWAY_ENVIRONMENT) {
    return {
      platform: 'railway',
      environment: env.RAILWAY_ENVIRONMENT,
      region: env.RAILWAY_REGION || 'unknown'
    };
  }

  if (env.VERCEL) {
    return {
      platform: 'vercel',
      environment: env.VERCEL_ENV || 'unknown',
      region: env.VERCEL_REGION || 'unknown'
    };
  }

  if (env.HEROKU_APP_NAME) {
    return {
      platform: 'heroku',
      app: env.HEROKU_APP_NAME,
      region: env.HEROKU_REGION || 'unknown'
    };
  }

  if (env.AWS_LAMBDA_FUNCTION_NAME) {
    return {
      platform: 'aws-lambda',
      functionName: env.AWS_LAMBDA_FUNCTION_NAME,
      region: env.AWS_REGION || 'unknown'
    };
  }

  if (env.CONTAINER) {
    return {
      platform: 'docker',
      containerId: env.CONTAINER,
      region: 'containerized'
    };
  }

  return {
    platform: 'local',
    environment: env.NODE_ENV || 'development'
  };
}

/**
 * Get runtime environment details
 */
export function getRuntimeEnvironment() {
  return {
    nodeVersion: getNodeVersion(),
    system: getSystemInfo(),
    deployment: getDeploymentPlatform(),
    environment: process.env.NODE_ENV || 'development',
    isProduction: (process.env.NODE_ENV || 'development') === 'production',
    isDevelopment: (process.env.NODE_ENV || 'development') === 'development'
  };
}

/**
 * Environment validator
 */
export function validateEnvironment() {
  const env = getRuntimeEnvironment();
  const issues = [];
  const warnings = [];

  // Check Node version
  if (env.nodeVersion.major < 18) {
    warnings.push('Node.js version is below 18 (LTS), consider upgrading');
  }

  // Check memory
  if (env.system.freeMemory < 512) {
    warnings.push('Low available memory (<512MB)');
  }

  // Check for critical env vars in production
  if (env.isProduction) {
    const requiredVars = [
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'JWT_SECRET',
      'API_KEY'
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        issues.push(`Missing required environment variable: ${varName}`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    environment: env
  };
}

/**
 * Log environment info
 */
export function logEnvironmentInfo(level = 'info') {
  const env = getRuntimeEnvironment();
  const validation = validateEnvironment();

  logger[level]('Environment Information', {
    ...env,
    validation: {
      valid: validation.valid,
      issues: validation.issues,
      warnings: validation.warnings
    }
  });

  // Log warnings and issues
  validation.warnings.forEach(warning => {
    logger.warn(`Environment Warning: ${warning}`);
  });

  validation.issues.forEach(issue => {
    logger.error(`Environment Issue: ${issue}`);
  });

  return { environment: env, validation };
}

/**
 * Get detailed environment report
 */
export function getEnvironmentReport() {
  const env = getRuntimeEnvironment();
  const validation = validateEnvironment();

  return {
    timestamp: new Date().toISOString(),
    environment: env,
    validation,
    processInfo: {
      pid: process.pid,
      execPath: process.execPath,
      cwd: process.cwd(),
      argv: process.argv.slice(2),
      memoryUsage: process.memoryUsage()
    }
  };
}

/**
 * Environment check middleware
 */
export function createEnvironmentMiddleware() {
  return (req, res, next) => {
    // Add environment info to request
    req.environment = {
      platform: getDeploymentPlatform().platform,
      isProduction: process.env.NODE_ENV === 'production',
      nodeVersion: getNodeVersion().version
    };

    next();
  };
}

/**
 * Check if running in specific environment
 */
export function isRunningIn(platform) {
  const deployment = getDeploymentPlatform();
  return deployment.platform === platform;
}

/**
 * Get resource limits
 */
export function getResourceLimits() {
  return {
    cpuCount: os.cpus().length,
    memoryMB: Math.round(os.totalmem() / 1024 / 1024),
    maxMemoryPercent: (process.env.MEMORY_LIMIT || '80'),
    timeoutMs: parseInt(process.env.TIMEOUT_MS || '30000'),
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || '100')
  };
}

export default {
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
};

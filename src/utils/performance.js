/**
 * Performance Monitoring Module
 * Tracks operation timing, resource usage, and performance metrics
 */

import logger from './logger.js';

/**
 * Performance metric tracker
 */
export class PerformanceTracker {
  constructor(name = 'operation') {
    this.name = name;
    this.startTime = Date.now();
    this.marks = {};
    this.measures = [];
  }

  /**
   * Mark a point in time
   */
  mark(label) {
    this.marks[label] = Date.now() - this.startTime;
    return this.marks[label];
  }

  /**
   * Measure duration between marks
   */
  measure(label, startMark, endMark) {
    const start = this.marks[startMark] || 0;
    const end = this.marks[endMark] || (Date.now() - this.startTime);
    const duration = end - start;

    this.measures.push({ label, start, end, duration });
    return duration;
  }

  /**
   * Get elapsed time
   */
  elapsed() {
    return Date.now() - this.startTime;
  }

  /**
   * Log performance summary
   */
  summary(logLevel = 'info') {
    const total = this.elapsed();
    const level = total > 1000 ? 'warn' : logLevel;

    logger[level](`Performance: ${this.name}`, {
      totalMs: total,
      marks: this.marks,
      measures: this.measures
    });

    return {
      name: this.name,
      totalMs: total,
      marks: this.marks,
      measures: this.measures
    };
  }
}

/**
 * Memory usage tracker
 */
export function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
    external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
    arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100
  };
}

/**
 * Log memory usage
 */
export function logMemoryUsage(context = 'memory check') {
  const memory = getMemoryUsage();
  const heapPercentage = Math.round((memory.heapUsed / memory.heapTotal) * 100);
  
  if (heapPercentage > 90) {
    logger.warn(`High memory usage: ${context}`, memory);
  } else if (heapPercentage > 75) {
    logger.info(`Moderate memory usage: ${context}`, memory);
  } else {
    logger.debug(`Memory usage: ${context}`, memory);
  }

  return memory;
}

/**
 * Operation timing decorator
 */
export function timed(label) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const tracker = new PerformanceTracker(label || propertyKey);
      try {
        const result = await originalMethod.apply(this, args);
        tracker.summary();
        return result;
      } catch (error) {
        tracker.summary('error');
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Function wrapper for timing
 */
export function withTiming(fn, label = fn.name) {
  return async function timedFunction(...args) {
    const tracker = new PerformanceTracker(label);
    try {
      const result = await fn(...args);
      tracker.summary();
      return result;
    } catch (error) {
      tracker.summary('error');
      throw error;
    }
  };
}

/**
 * Real-time metrics collector
 */
export class MetricsCollector {
  constructor(interval = 60000) {
    this.interval = interval;
    this.metrics = {
      operations: [],
      errors: [],
      slowQueries: [],
      memorySnapshots: []
    };
    this.thresholds = {
      slowOperation: 1000, // ms
      criticalMemory: 90   // percentage
    };
  }

  /**
   * Record operation
   */
  recordOperation(name, durationMs, metadata = {}) {
    const metric = {
      name,
      durationMs,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    this.metrics.operations.push(metric);

    if (durationMs > this.thresholds.slowOperation) {
      logger.warn(`Slow operation: ${name}`, metric);
      this.metrics.slowQueries.push(metric);
    }

    // Keep only last 1000 operations
    if (this.metrics.operations.length > 1000) {
      this.metrics.operations = this.metrics.operations.slice(-1000);
    }
  }

  /**
   * Record error
   */
  recordError(name, error, metadata = {}) {
    const metric = {
      name,
      error: error.message,
      code: error.code || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      ...metadata
    };

    this.metrics.errors.push(metric);

    // Keep only last 500 errors
    if (this.metrics.errors.length > 500) {
      this.metrics.errors = this.metrics.errors.slice(-500);
    }
  }

  /**
   * Take memory snapshot
   */
  snapshot(label = 'snapshot') {
    const memory = getMemoryUsage();
    const snapshot = {
      label,
      ...memory,
      timestamp: new Date().toISOString()
    };

    this.metrics.memorySnapshots.push(snapshot);

    if ((memory.heapUsed / memory.heapTotal) * 100 > this.thresholds.criticalMemory) {
      logger.warn(`Critical memory usage: ${label}`, memory);
    }

    // Keep only last 100 snapshots
    if (this.metrics.memorySnapshots.length > 100) {
      this.metrics.memorySnapshots = this.metrics.memorySnapshots.slice(-100);
    }

    return snapshot;
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    const operations = this.metrics.operations;
    const errors = this.metrics.errors;

    if (operations.length === 0) {
      return { operations: 0, errors: 0 };
    }

    const durations = operations.map(op => op.durationMs);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    return {
      operations: operations.length,
      avgDurationMs: Math.round(avgDuration),
      minDurationMs: minDuration,
      maxDurationMs: maxDuration,
      slowCount: this.metrics.slowQueries.length,
      errors: errors.length,
      errorRate: (errors.length / (operations.length + errors.length) * 100).toFixed(2) + '%'
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      operations: [],
      errors: [],
      slowQueries: [],
      memorySnapshots: []
    };
  }

  /**
   * Log summary
   */
  logSummary(level = 'info') {
    const summary = this.getSummary();
    logger[level]('Metrics Summary', summary);
    return summary;
  }
}

/**
 * Global metrics instance
 */
export const metrics = new MetricsCollector();

/**
 * Health check function
 */
export function healthCheck() {
  const memory = getMemoryUsage();
  const heapPercentage = Math.round((memory.heapUsed / memory.heapTotal) * 100);

  return {
    status: heapPercentage < 90 ? 'healthy' : heapPercentage < 95 ? 'warning' : 'critical',
    heapPercentage,
    memory,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

export default {
  PerformanceTracker,
  MetricsCollector,
  getMemoryUsage,
  logMemoryUsage,
  withTiming,
  timed,
  metrics,
  healthCheck
};

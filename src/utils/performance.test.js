/**
 * Performance Module Tests
 * Tests for performance tracking and metrics collection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PerformanceTracker,
  getMemoryUsage,
  logMemoryUsage,
  withTiming,
  MetricsCollector,
  metrics,
  healthCheck
} from '../utils/performance.js';

describe('PerformanceTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new PerformanceTracker('test-operation');
  });

  it('should create tracker with name', () => {
    expect(tracker.name).toBe('test-operation');
    expect(tracker.startTime).toBeDefined();
  });

  it('should mark time points', () => {
    const mark1 = tracker.mark('start');
    expect(typeof mark1).toBe('number');
    expect(tracker.marks.start).toBe(mark1);
  });

  it('should measure duration between marks', async () => {
    tracker.mark('start');
    await new Promise(resolve => setTimeout(resolve, 50));
    tracker.mark('end');

    const duration = tracker.measure('operation', 'start', 'end');
    expect(duration).toBeGreaterThanOrEqual(40);
  });

  it('should get elapsed time', async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const elapsed = tracker.elapsed();
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it('should return summary', () => {
    tracker.mark('start');
    tracker.mark('end');

    const summary = tracker.summary();
    expect(summary.name).toBe('test-operation');
    expect(summary.totalMs).toBeGreaterThanOrEqual(0);
  });
});

describe('Memory Usage', () => {
  it('should get memory usage', () => {
    const usage = getMemoryUsage();
    expect(usage.heapUsed).toBeGreaterThan(0);
    expect(usage.heapTotal).toBeGreaterThan(0);
    expect(usage.rss).toBeGreaterThan(0);
  });

  it('should have valid memory values', () => {
    const usage = getMemoryUsage();
    expect(usage.heapUsed).toBeLessThanOrEqual(usage.heapTotal);
    expect(usage.heapUsed).toBeGreaterThanOrEqual(0);
  });

  it('should log memory usage', () => {
    const result = logMemoryUsage('test');
    expect(result.heapUsed).toBeGreaterThan(0);
  });
});

describe('withTiming()', () => {
  it('should wrap function with timing', async () => {
    const fn = async () => 'result';
    const timedFn = withTiming(fn, 'test-operation');

    const result = await timedFn();
    expect(result).toBe('result');
  });

  it('should handle function errors', async () => {
    const fn = async () => {
      throw new Error('Test error');
    };

    const timedFn = withTiming(fn, 'test-operation');

    await expect(timedFn()).rejects.toThrow('Test error');
  });
});

describe('MetricsCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('should create collector with defaults', () => {
    expect(collector.interval).toBe(60000);
    expect(collector.metrics.operations).toEqual([]);
  });

  it('should record operation', () => {
    collector.recordOperation('test-op', 100);
    expect(collector.metrics.operations).toHaveLength(1);
    expect(collector.metrics.operations[0].name).toBe('test-op');
  });

  it('should mark slow operations', () => {
    collector.recordOperation('slow-op', 2000); // > 1000ms threshold
    expect(collector.metrics.slowQueries).toHaveLength(1);
  });

  it('should record error', () => {
    const error = new Error('Test error');
    collector.recordError('test-op', error, { code: 'TEST' });

    expect(collector.metrics.errors).toHaveLength(1);
    expect(collector.metrics.errors[0].error).toBe('Test error');
  });

  it('should take memory snapshot', () => {
    const snapshot = collector.snapshot('test-snapshot');
    expect(snapshot.label).toBe('test-snapshot');
    expect(snapshot.heapUsed).toBeGreaterThan(0);
    expect(snapshot.timestamp).toBeDefined();
  });

  it('should get summary', () => {
    collector.recordOperation('op1', 100);
    collector.recordOperation('op2', 200);
    collector.recordOperation('op3', 150);

    const summary = collector.getSummary();
    expect(summary.operations).toBe(3);
    expect(summary.avgDurationMs).toBeGreaterThan(0);
    expect(summary.errors).toBe(0);
  });

  it('should calculate error rate', () => {
    collector.recordOperation('op1', 100);
    collector.recordError('op2', new Error('test'));

    const summary = collector.getSummary();
    expect(summary.errorRate).toBeDefined();
  });

  it('should reset metrics', () => {
    collector.recordOperation('op1', 100);
    collector.reset();

    expect(collector.metrics.operations).toHaveLength(0);
    expect(collector.metrics.errors).toHaveLength(0);
  });

  it('should limit stored operations', () => {
    // Add 1100 operations
    for (let i = 0; i < 1100; i++) {
      collector.recordOperation(`op-${i}`, 100);
    }

    // Should keep only last 1000
    expect(collector.metrics.operations).toHaveLength(1000);
  });

  it('should log summary', () => {
    collector.recordOperation('op1', 100);
    const summary = collector.logSummary('debug');

    expect(summary.operations).toBe(1);
  });
});

describe('Global Metrics Instance', () => {
  it('should have global metrics instance', () => {
    expect(metrics).toBeInstanceOf(MetricsCollector);
  });

  it('should record operations on global instance', () => {
    metrics.recordOperation('global-op', 100);
    expect(metrics.metrics.operations.length).toBeGreaterThan(0);
  });
});

describe('healthCheck()', () => {
  it('should return health status', () => {
    const health = healthCheck();
    expect(health.status).toMatch(/healthy|warning|critical/);
    expect(health.heapPercentage).toBeGreaterThanOrEqual(0);
    expect(health.uptime).toBeGreaterThan(0);
  });

  it('should have memory info', () => {
    const health = healthCheck();
    expect(health.memory.heapUsed).toBeGreaterThan(0);
    expect(health.timestamp).toBeDefined();
  });

  it('should mark as healthy under 90% heap', () => {
    const health = healthCheck();
    if (health.heapPercentage < 90) {
      expect(health.status).toBe('healthy');
    }
  });

  it('should mark as warning at 90-95% heap', () => {
    const health = healthCheck();
    if (health.heapPercentage >= 90 && health.heapPercentage < 95) {
      expect(health.status).toBe('warning');
    }
  });
});

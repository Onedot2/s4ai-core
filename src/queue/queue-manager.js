import { EventEmitter } from 'events';
import { Queue } from 'bullmq';
import logger from '../utils/logger.js';
import { getRedisConnection, getRedisStatus } from './redis-connection.js';

const DEFAULT_QUEUES = ['market-data', 'analysis', 'report', 'backup', 'autonomous', 'research'];

class QueueManager extends EventEmitter {
  constructor() {
    super();
    this.queues = new Map();
    this.metrics = null;
    this.metricsInterval = null;
  }

  getQueueNames() {
    return DEFAULT_QUEUES;
  }

  getQueue(name) {
    if (this.queues.has(name)) {
      return this.queues.get(name);
    }

    const connection = getRedisConnection('queue');
    if (!connection) {
      return null;
    }

    const prefix = process.env.REDIS_QUEUE_PREFIX || 's4ai';
    const queue = new Queue(name, {
      connection,
      prefix,
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });

    this.queues.set(name, queue);
    return queue;
  }

  async addJob(queueName, jobName, data = {}, options = {}) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error('Redis is not configured. Set REDIS_URL to enable queues.');
    }

    const job = await queue.add(jobName, data, options);
    return {
      id: job.id,
      name: job.name,
      queue: queueName,
      status: 'queued'
    };
  }

  async getJobStatus(queueName, jobId) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error('Redis is not configured. Set REDIS_URL to enable queues.');
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      id: job.id,
      name: job.name,
      queue: queueName,
      state,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace
    };
  }

  async getQueueStats() {
    const stats = {};
    for (const queueName of this.getQueueNames()) {
      const queue = this.getQueue(queueName);
      if (!queue) {
        stats[queueName] = { status: 'unavailable', reason: 'redis-not-configured' };
        continue;
      }

      const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
      stats[queueName] = {
        status: 'ok',
        counts
      };
    }
    return stats;
  }

  async refreshQueueDepths() {
    if (!this.metrics) return;

    for (const queueName of this.getQueueNames()) {
      const queue = this.getQueue(queueName);
      if (!queue) {
        this.metrics.setQueueDepth(queueName, 0);
        continue;
      }

      const counts = await queue.getJobCounts('waiting', 'active', 'delayed');
      const depth = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
      this.metrics.setQueueDepth(queueName, depth);
    }
  }

  startMetricsPolling(metrics, intervalMs) {
    this.metrics = metrics;
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    const pollInterval = Number(intervalMs || process.env.REDIS_QUEUE_METRICS_INTERVAL_MS || 10000);
    if (Number.isNaN(pollInterval) || pollInterval <= 0) {
      return;
    }

    this.metricsInterval = setInterval(() => {
      this.refreshQueueDepths().catch((error) => {
        logger.warn('[Queue] Metrics refresh failed', { error: error.message });
      });
    }, pollInterval);
  }

  getRedisStatus() {
    return getRedisStatus('queue');
  }
}

let queueManagerInstance = null;

export function getQueueManager() {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager();
  }
  return queueManagerInstance;
}

import logger from '../utils/logger.js';
import { getResearchDelegate } from '../services/research-delegate.js';

async function safeExecute(handler, job) {
  try {
    return await handler(job);
  } catch (error) {
    logger.error('[Queue] Job failed', {
      queue: job.queueName,
      name: job.name,
      id: job.id,
      error: error.message
    });
    throw error;
  }
}

const queueHandlers = {
  'market-data': async (job) => {
    logger.info('[Queue] Market data job', { name: job.name, id: job.id });
    return {
      status: 'processed',
      job: job.name,
      payload: job.data || {}
    };
  },
  analysis: async (job) => {
    logger.info('[Queue] Analysis job', { name: job.name, id: job.id });
    return {
      status: 'processed',
      job: job.name,
      payload: job.data || {}
    };
  },
  report: async (job) => {
    logger.info('[Queue] Report job', { name: job.name, id: job.id });
    return {
      status: 'processed',
      job: job.name,
      payload: job.data || {}
    };
  },
  backup: async (job) => {
    logger.info('[Queue] Backup job', { name: job.name, id: job.id });
    return {
      status: 'processed',
      job: job.name,
      payload: job.data || {}
    };
  },
  autonomous: async (job) => {
    logger.info('[Queue] Autonomous job', { name: job.name, id: job.id });
    return {
      status: 'processed',
      job: job.name,
      payload: job.data || {}
    };
  },
  research: async (job) => {
    logger.info('[Queue] Research job', { name: job.name, id: job.id });
    const delegate = getResearchDelegate();
    const query = job.data?.query;
    const options = job.data?.options || {};
    const result = await delegate.run(query, options);
    return {
      status: 'processed',
      job: job.name,
      result
    };
  }
};

export function getQueueProcessor(queueName) {
  const handler = queueHandlers[queueName];
  if (!handler) {
    return async (job) => {
      logger.warn('[Queue] No processor registered', { queueName, job: job.name });
      return { status: 'skipped', reason: 'no-processor' };
    };
  }
  return (job) => safeExecute(handler, job);
}

export function listQueueProcessors() {
  return Object.keys(queueHandlers);
}

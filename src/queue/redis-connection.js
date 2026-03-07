import IORedis from 'ioredis';
import logger from '../utils/logger.js';

const connections = new Map();

function getRedisUrl() {
  const rawUrl = (process.env.REDIS_URL || '').trim();
  if (!rawUrl) {
    logger.warn('[Redis] REDIS_URL not set - queue features disabled');
    return null;
  }
  if (rawUrl.startsWith('redis://') || rawUrl.startsWith('rediss://')) {
    return rawUrl;
  }
  logger.warn('[Redis] REDIS_URL missing scheme, prepending redis://');
  return `redis://${rawUrl}`;
}

function buildRedisOptions(redisUrl) {
  const options = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true  // ✅ CRITICAL: Don't block module loading - connect when needed
  };

  if (redisUrl.startsWith('rediss://')) {
    options.tls = {
      rejectUnauthorized: false
    };
  }

  return options;
}

export function getRedisConnection(role = 'default') {
  if (connections.has(role)) {
    return connections.get(role);
  }

  const redisUrl = getRedisUrl();
  if (!redisUrl) return null;

  try {
    const connection = new IORedis(redisUrl, buildRedisOptions(redisUrl));

    connection.on('connect', () => {
      logger.info('[Redis] Connected', { role });
    });

    connection.on('error', (error) => {
      logger.error('[Redis] Connection error', { role, error: error.message });
    });

    connection.on('close', () => {
      logger.warn('[Redis] Connection closed', { role });
    });

    // ✅ FIX: Explicitly connect for BullMQ (lazyConnect requires manual .connect())
    connection.connect().catch((error) => {
      logger.error('[Redis] Failed to establish connection', { role, error: error.message });
    });

    connections.set(role, connection);
    return connection;
  } catch (error) {
    logger.error('[Redis] Failed to create connection', { role, error: error.message });
    return null;
  }
}

export function getRedisStatus(role = 'default') {
  const connection = connections.get(role);
  if (!connection) {
    return {
      configured: Boolean(process.env.REDIS_URL),
      status: 'missing',
      role
    };
  }

  return {
    configured: true,
    status: connection.status || 'unknown',
    role
  };
}

export async function closeRedisConnections() {
  const closures = Array.from(connections.values()).map(async (connection) => {
    try {
      await connection.quit();
    } catch (error) {
      logger.warn('[Redis] Close failed', { error: error.message });
    }
  });

  await Promise.allSettled(closures);
  connections.clear();
}

import Redis from 'ioredis';

let client = null;
let state = 'disabled';

export function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;
  client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 250, 1000);
    },
  });
  client.on('ready', () => { state = 'ready'; });
  client.on('error', () => { state = 'error'; });
  client.on('close', () => { if (state !== 'disabled') state = 'offline'; });
  return client;
}

export async function connectRedis() {
  const redis = getRedis();
  if (!redis) return { enabled: false, status: 'disabled' };
  if (redis.status === 'ready') return { enabled: true, status: 'ready' };
  try {
    await redis.connect();
    state = 'ready';
    return { enabled: true, status: 'ready' };
  } catch (error) {
    state = 'error';
    // Redis is optional for local development; MongoDB remains the source of truth.
    console.warn(`Redis unavailable: ${error.message}`);
    return { enabled: true, status: 'error' };
  }
}

export function redisStatus() {
  return { enabled: Boolean(process.env.REDIS_URL), status: state };
}

export async function closeRedis() {
  if (client && client.status !== 'end') await client.quit().catch(() => {});
  client = null;
  state = process.env.REDIS_URL ? 'offline' : 'disabled';
}

// BullMQ can reuse this connection when background jobs are enabled.
export function getBullMQConnection() {
  const redis = getRedis();
  return redis || null;
}

import Redis from 'ioredis';

let client: Redis | null = null;

export const connectRedis = () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('⚠️  REDIS_URL not found. Redis connection skipped.');
    return null;
  }

  client = new Redis(url, {
    retryStrategy: times => (times > 5 ? null : Math.min(times * 500, 3000)),
    enableOfflineQueue: true,
    lazyConnect: false,
  });

  client.on('connect', () => console.log('✅ Redis connected'));
  client.on('error', (err: any) => console.warn('⚠️  Redis:', err.message));
  
  return client;
};

export const getRedisClient = () => client;

// ── Raw key store — caller passes the full key ──────────
export const set = (key: string, value: any, ttlSeconds: number) => 
  client?.setex(key, ttlSeconds, String(value));

export const get = async (key: string): Promise<string | null> => {
  if (!client) return null;
  return client.get(key);
};

export const del = async (key: string): Promise<number> => {
  if (!client) return 0;
  return client.del(key);
};

// ── Shuttle position store ───────────────────────────────
export const setPosition = (shuttleId: string, data: any) =>
  client?.setex(`pos:${shuttleId}`, 30, JSON.stringify(data));

export const getPosition = async (shuttleId: string) => {
  const raw = await client?.get(`pos:${shuttleId}`);
  return raw ? JSON.parse(raw) : null;
};

export const getAllPositions = async () => {
  if (!client) return [];
  const keys = await client.keys('pos:*');
  if (!keys.length) return [];
  const pipeline = client.pipeline();
  keys.forEach(k => pipeline.get(k));
  const results = await pipeline.exec();
  if (!results) return [];
  return results.map(([, v]) => (v ? JSON.parse(v as string) : null)).filter(Boolean);
};

export const removePosition = (shuttleId: string) => client?.del(`pos:${shuttleId}`);

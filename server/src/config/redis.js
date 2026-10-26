import IORedis from 'ioredis';
export function makeRedis() {
  if (!process.env.REDIS_URL) return null;
  return new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
}

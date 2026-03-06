import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;
export const isRedisConfigured = Boolean(redisUrl);

export const redis = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    })
  : null;

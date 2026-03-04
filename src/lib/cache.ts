import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;
const redisClient = redisUrl ? new Redis(redisUrl, { maxRetriesPerRequest: 2 }) : null;

export async function getOrSetJsonCache<T>(
  key: string,
  ttlSeconds: number,
  builder: () => Promise<T>,
) {
  if (!redisClient) {
    return builder();
  }

  const cached = await redisClient.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  const built = await builder();
  await redisClient.set(key, JSON.stringify(built), "EX", ttlSeconds);
  return built;
}

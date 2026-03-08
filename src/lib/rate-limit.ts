import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult = { success: boolean };

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasPlaceholderRedisUrl = redisUrl?.toLowerCase().includes("example") ?? false;
const redisEnabled =
  Boolean(redisUrl) &&
  Boolean(redisToken) &&
  !hasPlaceholderRedisUrl;

const redis = redisEnabled
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

const globalUpstashLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
    })
  : null;

const authUpstashLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
    })
  : null;

async function limitWithFallback(
  limiter: Ratelimit | null,
  key: string,
): Promise<RateLimitResult> {
  if (!limiter) {
    return { success: true };
  }

  try {
    const result = await limiter.limit(key);
    return { success: result.success };
  } catch (error) {
    console.warn("Rate limit disabled: Redis unavailable", error);
    return { success: true };
  }
}

export const globalLimiter = {
  limit: (key: string) => limitWithFallback(globalUpstashLimiter, key),
};

export const authLimiter = {
  limit: (key: string) => limitWithFallback(authUpstashLimiter, key),
};

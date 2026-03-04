import { RateLimiterRedis } from "rate-limiter-flexible";

import { redis } from "@/lib/redis";

export const loginRateLimiter = redis
  ? new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: "login_fail",
      points: 5,
      duration: 60,
      blockDuration: 60 * 5,
    })
  : null;

export async function consumeLoginRateLimit(ip: string) {
  if (!loginRateLimiter) {
    return;
  }

  await loginRateLimiter.consume(ip);
}

export async function penalizeLoginRateLimit(ip: string) {
  if (!loginRateLimiter) {
    return;
  }

  await loginRateLimiter.penalty(ip);
}

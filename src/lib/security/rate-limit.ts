import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { AuthorizationError } from "@/lib/policies/base";

type RateLimitKey = "auth/register" | "issue submit" | "file upload" | "internal metrics";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasPlaceholderRedisUrl = upstashUrl?.toLowerCase().includes("example") ?? false;
const redisEnabled =
  Boolean(upstashUrl) &&
  Boolean(upstashToken) &&
  !hasPlaceholderRedisUrl;

const redis =
  redisEnabled
    ? new Redis({
        url: upstashUrl,
        token: upstashToken,
      })
    : null;

const upstashLimiters: Partial<Record<RateLimitKey, Ratelimit>> = redis
  ? {
      "auth/register": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
      }),
      "issue submit": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 m"),
      }),
      "file upload": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
      }),
      "internal metrics": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
      }),
    }
  : {};

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

async function enforceForIdentifier(route: RateLimitKey, identifier: string) {
  const limiter = upstashLimiters[route];

  if (!limiter) {
    // Fail open when rate limiting backend is not configured.
    return;
  }

  try {
    const result = await limiter.limit(`${route}:${identifier}`);
    if (!result.success) {
      throw new AuthorizationError(429, "Rate limit exceeded.");
    }
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 429) {
      throw error;
    }

    // Fail open on Redis transport/runtime issues.
    console.warn("Rate limit disabled: Redis unavailable", error);
  }
}

export async function enforceRateLimit(route: RateLimitKey, request: Request) {
  await enforceForIdentifier(route, getClientIdentifier(request));
}

export async function enforceRateLimitByIdentifier(route: RateLimitKey, identifier: string) {
  await enforceForIdentifier(route, identifier || "unknown");
}

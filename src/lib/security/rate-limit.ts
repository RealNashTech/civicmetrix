import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { AuthError } from "@/lib/auth/require-staff";

type RateLimitKey = "auth/register" | "issue submit" | "file upload";

const LIMIT_CONFIG: Record<RateLimitKey, { requests: number; windowMs: number }> = {
  "auth/register": { requests: 10, windowMs: 60_000 },
  "issue submit": { requests: 20, windowMs: 60_000 },
  "file upload": { requests: 5, windowMs: 60_000 },
};

const localBuckets = new Map<string, number[]>();

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  upstashUrl && upstashToken
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
    }
  : {};

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function enforceLocalSlidingWindow(route: RateLimitKey, identifier: string) {
  const { requests, windowMs } = LIMIT_CONFIG[route];
  const key = `${route}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  const history = (localBuckets.get(key) ?? []).filter((value) => value > windowStart);

  if (history.length >= requests) {
    throw new AuthError(429, "Rate limit exceeded.");
  }

  history.push(now);
  localBuckets.set(key, history);
}

async function enforceForIdentifier(route: RateLimitKey, identifier: string) {
  const limiter = upstashLimiters[route];

  if (!limiter) {
    enforceLocalSlidingWindow(route, identifier);
    return;
  }

  const result = await limiter.limit(`${route}:${identifier}`);
  if (!result.success) {
    throw new AuthError(429, "Rate limit exceeded.");
  }
}

export async function enforceRateLimit(route: RateLimitKey, request: Request) {
  await enforceForIdentifier(route, getClientIdentifier(request));
}

export async function enforceRateLimitByIdentifier(route: RateLimitKey, identifier: string) {
  await enforceForIdentifier(route, identifier || "unknown");
}

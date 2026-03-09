import { NextResponse } from "next/server";

import { isRedisConfigured, redis } from "@/lib/redis";
import { RATE_LIMIT_POLICIES, RateLimitTierName } from "@/lib/security/rateLimits";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
};

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function buildRateLimitKey(tier: RateLimitTierName, ip: string) {
  return `ratelimit:${tier}:${ip || "unknown"}`;
}

export async function checkRateLimit(tier: RateLimitTierName, request: Request): Promise<RateLimitResult> {
  const policy = RATE_LIMIT_POLICIES[tier];
  const ip = getClientIp(request);
  const key = buildRateLimitKey(tier, ip);

  if (!redis) {
    return {
      allowed: true,
      limit: policy.maxRequests,
      remaining: policy.maxRequests,
      resetMs: Date.now() + policy.windowMs,
    };
  }

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.pexpire(key, policy.windowMs);
    }

    const ttlMs = await redis.pttl(key);
    const resetMs = Date.now() + Math.max(ttlMs, 0);
    const remaining = Math.max(policy.maxRequests - current, 0);

    return {
      allowed: current <= policy.maxRequests,
      limit: policy.maxRequests,
      remaining,
      resetMs,
    };
  } catch {
    // Preserve service availability if Redis is unavailable.
    if (isRedisConfigured) {
      return {
        allowed: true,
        limit: policy.maxRequests,
        remaining: policy.maxRequests,
        resetMs: Date.now() + policy.windowMs,
      };
    }

    return {
      allowed: true,
      limit: policy.maxRequests,
      remaining: policy.maxRequests,
      resetMs: Date.now() + policy.windowMs,
    };
  }
}

export function rateLimitExceededResponse(result: RateLimitResult) {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetMs - Date.now()) / 1000));

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests.",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetMs),
      },
    },
  );
}

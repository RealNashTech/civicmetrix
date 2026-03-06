import { RateLimiterRedis } from "rate-limiter-flexible";

import { isRedisConfigured, redis } from "@/lib/redis";

export const loginRateLimiter = redis
  ? new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: "login_fail",
      points: 5,
      duration: 60,
      blockDuration: 60 * 5,
    })
  : null;

const LOCAL_POINTS = 5;
const LOCAL_DURATION_MS = 60_000;
const LOCAL_BLOCK_MS = 5 * 60_000;
const localState = new Map<string, { hits: number[]; blockedUntil: number | null }>();

function getLocalState(ip: string) {
  const key = ip || "unknown";
  const existing = localState.get(key);
  if (existing) {
    return { key, state: existing };
  }
  const state = { hits: [], blockedUntil: null as number | null };
  localState.set(key, state);
  return { key, state };
}

function applyLocalConsume(ip: string) {
  const now = Date.now();
  const { state } = getLocalState(ip);
  if (state.blockedUntil && state.blockedUntil > now) {
    const error = new Error("Too many login attempts.");
    (error as Error & { msBeforeNext: number }).msBeforeNext = state.blockedUntil - now;
    throw error;
  }

  state.hits = state.hits.filter((value) => now - value <= LOCAL_DURATION_MS);
  state.hits.push(now);

  if (state.hits.length > LOCAL_POINTS) {
    state.blockedUntil = now + LOCAL_BLOCK_MS;
    const error = new Error("Too many login attempts.");
    (error as Error & { msBeforeNext: number }).msBeforeNext = LOCAL_BLOCK_MS;
    throw error;
  }
}

function applyLocalPenalty(ip: string) {
  const now = Date.now();
  const { state } = getLocalState(ip);
  state.hits = state.hits.filter((value) => now - value <= LOCAL_DURATION_MS);
  state.hits.push(now);
  if (state.hits.length >= LOCAL_POINTS) {
    state.blockedUntil = now + LOCAL_BLOCK_MS;
  }
}

export async function consumeLoginRateLimit(ip: string) {
  if (!loginRateLimiter) {
    applyLocalConsume(ip);
    return;
  }

  try {
    await loginRateLimiter.consume(ip);
  } catch (error) {
    const isRateLimitError =
      Boolean(error) &&
      typeof error === "object" &&
      "msBeforeNext" in (error as Record<string, unknown>);

    if (isRateLimitError) {
      throw error;
    }

    if (isRedisConfigured) {
      // Redis failure path: fail closed with local throttle instead of bypassing protection.
      applyLocalConsume(ip);
      return;
    }

    applyLocalConsume(ip);
  }
}

export async function penalizeLoginRateLimit(ip: string) {
  if (!loginRateLimiter) {
    applyLocalPenalty(ip);
    return;
  }

  try {
    await loginRateLimiter.penalty(ip);
  } catch {
    applyLocalPenalty(ip);
  }
}

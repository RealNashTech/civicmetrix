import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadRateLimitModule(options: {
  upstashConfigured: boolean;
  production?: boolean;
  limitImpl?: (key: string) => Promise<{ success: boolean }>;
}) {
  vi.resetModules();

  const limitMock = vi.fn(
    options.limitImpl ??
      (async () => ({
        success: true,
      })),
  );

  vi.doMock("@upstash/redis", () => ({
    Redis: class MockRedis {},
  }));

  vi.doMock("@upstash/ratelimit", () => ({
    Ratelimit: class MockRatelimit {
      static slidingWindow() {
        return "sliding-window";
      }

      limit = limitMock;
    },
  }));

  process.env.NODE_ENV = options.production ? "production" : "test";
  if (options.upstashConfigured) {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  } else {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }

  const mod = await import("@/lib/security/rate-limit");
  const { AuthorizationError } = await import("@/lib/policies/base");
  return { ...mod, AuthorizationError, limitMock };
}

describe("security rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rate limit allows requests within window", async () => {
    const { enforceRateLimitByIdentifier } = await loadRateLimitModule({ upstashConfigured: false });

    await expect(enforceRateLimitByIdentifier("auth/register", "ip-1")).resolves.toBeUndefined();
    await expect(enforceRateLimitByIdentifier("auth/register", "ip-1")).resolves.toBeUndefined();
  });

  it("rate limit blocks after max requests", async () => {
    const { enforceRateLimitByIdentifier, AuthorizationError } = await loadRateLimitModule({
      upstashConfigured: false,
    });

    for (let i = 0; i < 10; i += 1) {
      await enforceRateLimitByIdentifier("auth/register", "ip-2");
    }

    await expect(enforceRateLimitByIdentifier("auth/register", "ip-2")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("rate limit throws AuthorizationError when exceeded", async () => {
    const { enforceRateLimitByIdentifier, AuthorizationError } = await loadRateLimitModule({
      upstashConfigured: true,
      limitImpl: async () => ({ success: false }),
    });

    await expect(enforceRateLimitByIdentifier("file upload", "ip-3")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("redis failure path uses local fallback throttle when backend is unavailable", async () => {
    const { enforceRateLimitByIdentifier, AuthorizationError } = await loadRateLimitModule({
      upstashConfigured: false,
    });

    for (let i = 0; i < 20; i += 1) {
      await enforceRateLimitByIdentifier("issue submit", "ip-4");
    }

    await expect(enforceRateLimitByIdentifier("issue submit", "ip-4")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadLoginRateLimitModule(options: {
  redisEnabled: boolean;
  isRedisConfigured: boolean;
  consumeImpl?: (ip: string) => Promise<void>;
  penaltyImpl?: (ip: string) => Promise<void>;
}) {
  vi.resetModules();

  const consumeMock = vi.fn(options.consumeImpl ?? (async () => undefined));
  const penaltyMock = vi.fn(options.penaltyImpl ?? (async () => undefined));

  vi.doMock("rate-limiter-flexible", () => ({
    RateLimiterRedis: class {
      consume = consumeMock;
      penalty = penaltyMock;
    },
  }));

  vi.doMock("@/lib/redis", () => ({
    redis: options.redisEnabled ? ({}) : null,
    isRedisConfigured: options.isRedisConfigured,
  }));

  const mod = await import("@/lib/security/login-rate-limit");
  return { ...mod, consumeMock, penaltyMock };
}

describe("login rate limiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redis rate limiter allows first attempts", async () => {
    const { consumeLoginRateLimit, consumeMock } = await loadLoginRateLimitModule({
      redisEnabled: true,
      isRedisConfigured: true,
    });

    await expect(consumeLoginRateLimit("ip-1")).resolves.toBeUndefined();
    expect(consumeMock).toHaveBeenCalledWith("ip-1");
  });

  it("redis limiter blocks after threshold", async () => {
    const { consumeLoginRateLimit } = await loadLoginRateLimitModule({
      redisEnabled: true,
      isRedisConfigured: true,
      consumeImpl: async () => {
        const error = new Error("blocked");
        (error as Error & { msBeforeNext: number }).msBeforeNext = 10_000;
        throw error;
      },
    });

    await expect(consumeLoginRateLimit("ip-2")).rejects.toMatchObject({ msBeforeNext: 10_000 });
  });

  it("redis failure falls back to local limiter", async () => {
    const { consumeLoginRateLimit } = await loadLoginRateLimitModule({
      redisEnabled: true,
      isRedisConfigured: true,
      consumeImpl: async () => {
        throw new Error("redis unavailable");
      },
    });

    for (let i = 0; i < 5; i += 1) {
      await consumeLoginRateLimit("ip-3");
    }

    await expect(consumeLoginRateLimit("ip-3")).rejects.toBeInstanceOf(Error);
  });

  it("local limiter blocks repeated attempts", async () => {
    const { consumeLoginRateLimit } = await loadLoginRateLimitModule({
      redisEnabled: false,
      isRedisConfigured: false,
    });

    for (let i = 0; i < 5; i += 1) {
      await consumeLoginRateLimit("ip-4");
    }

    await expect(consumeLoginRateLimit("ip-4")).rejects.toBeInstanceOf(Error);
  });
});

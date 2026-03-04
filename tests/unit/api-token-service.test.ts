import { beforeEach, describe, expect, it, vi } from "vitest";

const { hashMock, compareMock, apiTokenCreateMock, apiTokenFindManyMock, apiTokenUpdateMock } =
  vi.hoisted(() => ({
    hashMock: vi.fn(async (value: string) => `hashed:${value}`),
    compareMock: vi.fn(
      async (value: string, hashedValue: string) => hashedValue === `hashed:${value}`,
    ),
    apiTokenCreateMock: vi.fn(),
    apiTokenFindManyMock: vi.fn(),
    apiTokenUpdateMock: vi.fn(),
  }));

vi.mock("bcryptjs", () => ({
  hash: hashMock,
  compare: compareMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    apiToken: {
      create: apiTokenCreateMock,
      findMany: apiTokenFindManyMock,
      update: apiTokenUpdateMock,
    },
  },
}));

import { createApiToken, generateApiToken, validateApiToken } from "@/lib/api-token-service";

describe("api-token-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a secure token", () => {
    const token = generateApiToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThanOrEqual(64);
  });

  it("creates a token using tokenHash storage only", async () => {
    apiTokenCreateMock.mockImplementationOnce(async () => ({
      id: "tok_1",
      organizationId: "org_1",
      name: "City Ops",
      scope: "city:read",
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      revokedAt: null,
    }));

    const result = await createApiToken({
      organizationId: "org_1",
      name: "City Ops",
      scope: "city:read",
      expiresAt: null,
    });

    expect(result.token).toBeTruthy();
    expect(hashMock).toHaveBeenCalledWith(result.token, 12);
    expect(apiTokenCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenHash: `hashed:${result.token}`,
          organizationId: "org_1",
          scope: "city:read",
        }),
      }),
    );
    expect(result.record).not.toHaveProperty("tokenHash");
  });

  it("validates token and updates lastUsedAt", async () => {
    apiTokenFindManyMock.mockResolvedValueOnce([
      {
        id: "tok_1",
        organizationId: "org_1",
        name: "Wrong",
        scope: "city:read",
        expiresAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
        revokedAt: null,
        tokenHash: "hashed:wrong-token",
      },
      {
        id: "tok_2",
        organizationId: "org_1",
        name: "Right",
        scope: "city:read",
        expiresAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
        revokedAt: null,
        tokenHash: "hashed:valid-token",
      },
    ]);
    apiTokenUpdateMock.mockResolvedValueOnce({
      id: "tok_2",
      organizationId: "org_1",
      name: "Right",
      scope: "city:read",
      expiresAt: null,
      lastUsedAt: new Date(),
      createdAt: new Date(),
      revokedAt: null,
    });

    const result = await validateApiToken("valid-token");

    expect(result?.id).toBe("tok_2");
    expect(apiTokenUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tok_2" },
        data: expect.objectContaining({
          lastUsedAt: expect.any(Date),
        }),
      }),
    );
  });
});

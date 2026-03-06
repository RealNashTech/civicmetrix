import { beforeEach, describe, expect, it, vi } from "vitest";

const { validateApiTokenMock } = vi.hoisted(() => ({
  validateApiTokenMock: vi.fn(),
}));

vi.mock("@/lib/api-token-service", () => ({
  validateApiToken: validateApiTokenMock,
}));

import { requireApiScope } from "@/lib/auth/require-api-scope";
import { AuthorizationError } from "@/lib/policies/base";

describe("requireApiScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("request without Authorization header returns 401", async () => {
    await expect(requireApiScope(new Request("http://localhost"), "city:read")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("invalid token returns 401", async () => {
    validateApiTokenMock.mockResolvedValueOnce(null);

    await expect(
      requireApiScope(
        new Request("http://localhost", {
          headers: { authorization: "Bearer invalid-token" },
        }),
        "city:read",
      ),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("valid token but insufficient scope returns 403", async () => {
    validateApiTokenMock.mockResolvedValueOnce({
      id: "tok_1",
      organizationId: "org_1",
      scope: "grant:read",
    });

    await expect(
      requireApiScope(
        new Request("http://localhost", {
          headers: { authorization: "Bearer some-token" },
        }),
        "system:metrics:read",
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("valid token and correct scope succeeds", async () => {
    validateApiTokenMock.mockResolvedValueOnce({
      id: "tok_2",
      organizationId: "org_2",
      scope: "system:metrics:read",
    });

    const result = await requireApiScope(
      new Request("http://localhost", {
        headers: { authorization: "Bearer good-token" },
      }),
      "system:metrics:read",
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: "tok_2",
        organizationId: "org_2",
      }),
    );
  });

  it("tokenPrefix lookup works correctly", async () => {
    validateApiTokenMock.mockResolvedValueOnce({
      id: "tok_pref",
      organizationId: "org_3",
      scope: "city:*",
    });

    await requireApiScope(
      new Request("http://localhost", {
        headers: { authorization: "Bearer pref1234tokenvalue" },
      }),
      "city:read",
    );

    expect(validateApiTokenMock).toHaveBeenCalledWith("pref1234tokenvalue");
  });
});

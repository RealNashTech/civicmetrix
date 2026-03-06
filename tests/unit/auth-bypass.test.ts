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

  it("rejects missing bearer token", async () => {
    await expect(requireApiScope(new Request("http://localhost"), "system:metrics:read")).rejects.toThrow(
      AuthorizationError,
    );
  });

  it("rejects insufficient scope", async () => {
    validateApiTokenMock.mockResolvedValueOnce({
      id: "tok_1",
      organizationId: "org_1",
      scope: "city:read",
    });

    await expect(
      requireApiScope(
        new Request("http://localhost", {
          headers: { authorization: "Bearer token_1" },
        }),
        "system:metrics:read",
      ),
    ).rejects.toThrow(AuthorizationError);
  });
});

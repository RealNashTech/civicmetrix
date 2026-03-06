import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffPolicyMock,
  requireApiScopeMock,
  setTenantContextMock,
  setObservabilityContextMock,
  staffTenantContextMock,
  apiTokenTenantContextMock,
} = vi.hoisted(() => ({
  requireStaffPolicyMock: vi.fn(),
  requireApiScopeMock: vi.fn(),
  setTenantContextMock: vi.fn(),
  setObservabilityContextMock: vi.fn(),
  staffTenantContextMock: vi.fn((staff: { organizationId: string; id: string; role: string }) => ({
    organizationId: staff.organizationId,
    principalType: "staff",
    principalId: staff.id,
    role: staff.role,
  })),
  apiTokenTenantContextMock: vi.fn((token: { organizationId: string; id: string; scope: string }) => ({
    organizationId: token.organizationId,
    principalType: "api-token",
    principalId: token.id,
    scope: token.scope,
  })),
}));

vi.mock("@/lib/policies/staff", () => ({
  requireStaff: requireStaffPolicyMock,
}));

vi.mock("@/lib/auth/require-api-scope", () => ({
  requireApiScope: requireApiScopeMock,
}));

vi.mock("@/lib/tenant-context", () => ({
  setTenantContext: setTenantContextMock,
  staffTenantContext: staffTenantContextMock,
  apiTokenTenantContext: apiTokenTenantContextMock,
}));

vi.mock("@/lib/observability/context", () => ({
  setObservabilityContext: setObservabilityContextMock,
}));

import {
  AuthorizationError,
  authorizeStaffOrApiScope,
  requireStaffUser,
} from "@/lib/security/authorization";

describe("authorization policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requireStaffUser rejects when no session exists", async () => {
    requireStaffPolicyMock.mockRejectedValueOnce(new AuthorizationError(401, "Unauthorized."));

    await expect(requireStaffUser("VIEWER")).rejects.toMatchObject({ status: 401 });
  });

  it("requireStaffUser rejects when role below required", async () => {
    requireStaffPolicyMock.mockRejectedValueOnce(new AuthorizationError(403, "Forbidden."));

    await expect(requireStaffUser("ADMIN")).rejects.toMatchObject({ status: 403 });
  });

  it("requireStaffUser allows ADMIN role", async () => {
    const staff = {
      id: "user_1",
      role: "ADMIN",
      organizationId: "org_1",
    };
    requireStaffPolicyMock.mockResolvedValueOnce(staff);

    const result = await requireStaffUser("ADMIN");

    expect(result).toEqual(staff);
    expect(setTenantContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        principalType: "staff",
      }),
    );
  });

  it("authorizeStaffOrApiScope allows valid API token scope", async () => {
    requireStaffPolicyMock.mockRejectedValueOnce(new AuthorizationError(401, "Unauthorized."));
    requireApiScopeMock.mockResolvedValueOnce({
      id: "tok_1",
      organizationId: "org_2",
      scope: "system:metrics:read",
    });

    const request = new Request("http://localhost/api/internal/metrics");
    const context = await authorizeStaffOrApiScope(request, "system:metrics:read", "ADMIN");

    expect(context).toEqual(
      expect.objectContaining({
        organizationId: "org_2",
        principalType: "api-token",
        principalId: "tok_1",
      }),
    );
  });

  it("authorizeStaffOrApiScope rejects insufficient scope", async () => {
    requireStaffPolicyMock.mockRejectedValueOnce(new AuthorizationError(401, "Unauthorized."));
    requireApiScopeMock.mockRejectedValueOnce(
      new AuthorizationError(403, "Insufficient API token scope."),
    );

    const request = new Request("http://localhost/api/internal/metrics");

    await expect(authorizeStaffOrApiScope(request, "system:metrics:read", "ADMIN")).rejects.toMatchObject(
      { status: 403 },
    );
  });
});

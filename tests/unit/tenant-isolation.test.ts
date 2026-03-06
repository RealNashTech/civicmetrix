import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/policies/staff", () => ({
  requireStaff: vi.fn(),
}));
vi.mock("@/lib/auth/require-api-scope", () => ({
  requireApiScope: vi.fn(),
}));
vi.mock("@/lib/tenant-context", () => ({
  apiTokenTenantContext: vi.fn(),
  setTenantContext: vi.fn(),
  staffTenantContext: vi.fn(),
}));
vi.mock("@/lib/observability/context", () => ({
  setObservabilityContext: vi.fn(),
}));

import { assertTenantAccess } from "@/lib/security/authorization";
import { AuthorizationError } from "@/lib/policies/base";

describe("tenant isolation guard", () => {
  it("allows access for matching tenant", () => {
    expect(() => assertTenantAccess("org_1", "org_1")).not.toThrow();
  });

  it("denies access for cross-tenant resource", () => {
    expect(() => assertTenantAccess("org_1", "org_2")).toThrow(AuthorizationError);
  });
});

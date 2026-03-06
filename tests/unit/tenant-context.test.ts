import { beforeEach, describe, expect, it } from "vitest";

import {
  apiTokenTenantContext,
  getTenantContext,
  runWithTenantContext,
  setTenantContext,
  staffTenantContext,
} from "@/lib/tenant-context";

describe("tenant context", () => {
  beforeEach(() => {
    runWithTenantContext(
      {
        organizationId: "reset",
        principalType: "staff",
        principalId: "reset",
        role: "VIEWER",
      },
      () => {
        // reset storage scope for test isolation
      },
    );
  });

  it("setTenantContext stores organizationId correctly", () => {
    setTenantContext({
      organizationId: "org_1",
      principalType: "staff",
      principalId: "user_1",
      role: "ADMIN",
    });

    expect(getTenantContext()).toEqual(
      expect.objectContaining({
        organizationId: "org_1",
        principalType: "staff",
      }),
    );
  });

  it("staffTenantContext returns correct context object", () => {
    const context = staffTenantContext({
      id: "user_2",
      role: "admin",
      organizationId: "org_2",
      userType: "staff",
    });

    expect(context).toEqual({
      organizationId: "org_2",
      principalType: "staff",
      principalId: "user_2",
      role: "ADMIN",
    });
  });

  it("apiTokenTenantContext returns correct context object", () => {
    const context = apiTokenTenantContext({
      id: "tok_1",
      organizationId: "org_3",
      scope: "system:metrics:read",
    });

    expect(context).toEqual({
      organizationId: "org_3",
      principalType: "api-token",
      principalId: "tok_1",
      scope: "system:metrics:read",
    });
  });

  it("tenant context rejects missing organizationId", () => {
    expect(() => staffTenantContext(null as never)).toThrow();
  });

  it("tenant context enforces correct principalType values", () => {
    const staff = staffTenantContext({
      id: "u-1",
      role: "VIEWER",
      organizationId: "org-1",
      userType: "staff",
    });
    const apiToken = apiTokenTenantContext({
      id: "tok-1",
      organizationId: "org-1",
      scope: "city:read",
    });

    expect([staff.principalType, apiToken.principalType]).toEqual(["staff", "api-token"]);
  });
});

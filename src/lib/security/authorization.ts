import { requireApiScope } from "@/lib/auth/require-api-scope";
import { AppRole } from "@/types/roles";

import { setObservabilityContext } from "@/lib/observability/context";
import { AuthorizationError } from "@/lib/policies/base";
import { requireStaff as requireStaffPolicy } from "@/lib/policies/staff";
import { apiTokenTenantContext, setTenantContext, staffTenantContext } from "@/lib/tenant-context";

export { AuthorizationError };

export async function requireStaffUser(minimumRole: AppRole = "VIEWER") {
  const staff = await requireStaffPolicy(minimumRole);
  setTenantContext(staffTenantContext(staff));
  setObservabilityContext({
    tenantId: staff.organizationId,
    userId: staff.id,
  });
  return staff;
}

export async function authorizeStaffOrApiScope(
  request: Request,
  requiredScope: string,
  minimumStaffRole: AppRole = "VIEWER",
) {
  try {
    const staff = await requireStaffPolicy(minimumStaffRole);
    const context = staffTenantContext(staff);
    setTenantContext(context);
    setObservabilityContext({
      tenantId: staff.organizationId,
      userId: staff.id,
    });
    return context;
  } catch (error) {
    if (!(error instanceof AuthorizationError) || error.status !== 401) {
      throw error;
    }
  }

  try {
    const token = await requireApiScope(request, requiredScope);
    const context = apiTokenTenantContext(token);
    setTenantContext(context);
    setObservabilityContext({
      tenantId: token.organizationId,
      userId: token.id,
    });
    return context;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      "message" in error &&
      typeof (error as { status?: unknown }).status === "number"
    ) {
      throw new AuthorizationError(
        (error as { status: number }).status,
        String((error as { message: unknown }).message),
      );
    }
    throw new AuthorizationError(500, "Authorization failed.");
  }
}

export function assertTenantAccess(contextOrganizationId: string, resourceOrganizationId: string) {
  if (contextOrganizationId !== resourceOrganizationId) {
    throw new AuthorizationError(403, "Forbidden.");
  }
}

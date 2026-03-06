import { hasMinimumRole } from "@/lib/permissions";
import { AppRole } from "@/types/roles";

const STAFF_ROLES = new Set<AppRole>(["ADMIN", "EDITOR", "VIEWER"]);

export class AuthorizationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type StaffPrincipal = {
  id: string;
  role: AppRole | string;
  organizationId: string;
  organizationSlug?: string;
  userType?: string | null;
};

export function assertAuthenticated(principal: StaffPrincipal | null | undefined): asserts principal is StaffPrincipal {
  if (!principal) {
    throw new AuthorizationError(401, "Unauthorized.");
  }

  if (!principal.organizationId) {
    throw new AuthorizationError(403, "Missing tenant context.");
  }
}

export function assertStaff(principal: StaffPrincipal) {
  const userType = String(principal.userType ?? "").toLowerCase();
  const role = String(principal.role ?? "").toUpperCase() as AppRole;
  const isStaffByRole = STAFF_ROLES.has(role);

  if (userType) {
    if (userType !== "staff") {
      throw new AuthorizationError(403, "Forbidden.");
    }
    return;
  }

  if (!isStaffByRole) {
    throw new AuthorizationError(403, "Forbidden.");
  }
}

export function assertRole(principal: StaffPrincipal, minimumRole: AppRole) {
  const normalizedRole = String(principal.role ?? "").toUpperCase() as AppRole;
  if (!STAFF_ROLES.has(normalizedRole) || !hasMinimumRole(normalizedRole, minimumRole)) {
    throw new AuthorizationError(403, "Forbidden.");
  }
}

import { AppRole } from "@/types/roles";

import { AuthorizationError, StaffPrincipal } from "./base";
import { requireStaff } from "./staff";

export async function requireStaffDocumentAccess(minimumRole: AppRole = "VIEWER") {
  return requireStaff(minimumRole);
}

export function assertDocumentTenantAccess(principal: StaffPrincipal, organizationId: string) {
  if (principal.organizationId !== organizationId) {
    throw new AuthorizationError(403, "Forbidden.");
  }
}

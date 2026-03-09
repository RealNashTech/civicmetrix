import { hasAnyRole, RBAC_ROLES, RolePrincipal } from "@/lib/role-checks";

export {
  canAccessGrants,
  hasAnyRole,
  hasMinimumRole,
  hasRole,
  mapLegacyRoleToRbac,
  RBAC_ROLES,
  resolveUserRole,
} from "@/lib/role-checks";

export class RoleAccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function resolveRoleUser(providedUser?: RolePrincipal) {
  if (providedUser) {
    return providedUser;
  }
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  return session?.user;
}

export async function requireRole(roleName: string, user?: RolePrincipal) {
  return requireAnyRole([roleName], user);
}

export async function requireAnyRole(roleNames: readonly string[], user?: RolePrincipal) {
  const roleUser = await resolveRoleUser(user);
  if (!roleUser) {
    throw new RoleAccessError(401, "Unauthorized");
  }

  if (!hasAnyRole(roleUser, roleNames)) {
    throw new RoleAccessError(403, "Forbidden");
  }

  return roleUser;
}

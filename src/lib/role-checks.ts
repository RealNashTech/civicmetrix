import { AppRole, LegacyStaffRole, RbacRoleName } from "@/types/roles";

export const RBAC_ROLES: readonly RbacRoleName[] = [
  "SYSTEM_ADMIN",
  "CITY_ADMIN",
  "DEPARTMENT_ADMIN",
  "STAFF",
  "COUNCIL_MEMBER",
  "PUBLIC_USER",
] as const;

const LEGACY_TO_RBAC: Record<LegacyStaffRole, RbacRoleName> = {
  ADMIN: "CITY_ADMIN",
  EDITOR: "DEPARTMENT_ADMIN",
  VIEWER: "STAFF",
};

const ROLE_WEIGHT: Record<RbacRoleName, number> = {
  PUBLIC_USER: 1,
  COUNCIL_MEMBER: 2,
  STAFF: 3,
  DEPARTMENT_ADMIN: 4,
  CITY_ADMIN: 5,
  SYSTEM_ADMIN: 6,
};

export type RolePrincipal = {
  role?: string | null;
  userType?: string | null;
} | null | undefined;

function normalize(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function asRbacRole(value: unknown): RbacRoleName | null {
  const normalized = normalize(value);
  if ((RBAC_ROLES as readonly string[]).includes(normalized)) {
    return normalized as RbacRoleName;
  }
  if (normalized === "ADMIN" || normalized === "EDITOR" || normalized === "VIEWER") {
    return LEGACY_TO_RBAC[normalized as LegacyStaffRole];
  }
  return null;
}

export function mapLegacyRoleToRbac(role: string | null | undefined): RbacRoleName {
  return asRbacRole(role) ?? "STAFF";
}

export function resolveUserRole(user: RolePrincipal): RbacRoleName | null {
  if (!user) {
    return null;
  }
  return asRbacRole(user.role);
}

export function hasRole(user: RolePrincipal, roleName: string): boolean {
  const userRole = resolveUserRole(user);
  const requiredRole = asRbacRole(roleName);
  return Boolean(userRole && requiredRole && userRole === requiredRole);
}

export function hasAnyRole(user: RolePrincipal, roleNames: readonly string[]): boolean {
  return roleNames.some((roleName) => hasRole(user, roleName));
}

export function hasMinimumRole(role: AppRole, minimum: AppRole): boolean {
  const resolvedRole = asRbacRole(role);
  const resolvedMinimum = asRbacRole(minimum);
  if (!resolvedRole || !resolvedMinimum) {
    return false;
  }
  return ROLE_WEIGHT[resolvedRole] >= ROLE_WEIGHT[resolvedMinimum];
}

export function canAccessGrants(role: AppRole): boolean {
  return hasMinimumRole(role, "DEPARTMENT_ADMIN");
}

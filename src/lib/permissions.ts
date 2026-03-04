import { AppRole } from "@/types/roles";
import { db } from "@/lib/db";

export const ROLE_WEIGHT: Record<AppRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

export function hasMinimumRole(role: AppRole, minimum: AppRole): boolean {
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[minimum];
}

export function canAccessGrants(role: AppRole): boolean {
  return hasMinimumRole(role, "EDITOR");
}

export async function hasDepartmentAccess(
  userId: string,
  departmentId: string,
): Promise<boolean> {
  const user = await db().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      organizationId: true,
    },
  });

  if (!user) {
    return false;
  }

  if (user.role === "ADMIN") {
    return true;
  }

  const department = await db().department.findFirst({
    where: {
      id: departmentId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!department) {
    return false;
  }

  const permissionCount = await db().departmentPermission.count({
    where: { userId: user.id },
  });

  if (permissionCount === 0 && user.role === "EDITOR") {
    return true;
  }

  const permission = await db().departmentPermission.findFirst({
    where: {
      userId: user.id,
      departmentId: department.id,
    },
    select: { id: true },
  });

  return Boolean(permission);
}

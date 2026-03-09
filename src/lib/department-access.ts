import { db } from "@/lib/db";
import { hasMinimumRole, mapLegacyRoleToRbac } from "@/lib/permissions";
import { AppRole } from "@/types/roles";

export async function hasDepartmentAccess(userId: string, departmentId: string): Promise<boolean> {
  const user = await db().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      legacyRole: true,
      role: {
        select: { name: true },
      },
      organizationId: true,
    },
  });

  if (!user) {
    return false;
  }

  const effectiveRole = (user.role?.name ?? mapLegacyRoleToRbac(user.legacyRole)) as AppRole;

  if (hasMinimumRole(effectiveRole, "CITY_ADMIN")) {
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

  if (permissionCount === 0 && hasMinimumRole(effectiveRole, "DEPARTMENT_ADMIN")) {
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

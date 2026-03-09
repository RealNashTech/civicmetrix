import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { RBAC_ROLES, requireAnyRole, RoleAccessError } from "@/lib/permissions";
import { tenantDb } from "@/lib/tenantDb";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  usersCount: number;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  legacyRole: string;
  role: { id: string; name: string } | null;
};

async function updateUserRole(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) {
    notFound();
  }
  try {
    await requireAnyRole(["SYSTEM_ADMIN", "CITY_ADMIN"], session.user);
  } catch (error) {
    if (error instanceof RoleAccessError) {
      notFound();
    }
    throw error;
  }

  const organizationId = requireOrganization(session);
  const userId = String(formData.get("userId") ?? "").trim();
  const roleName = String(formData.get("roleName") ?? "").trim().toUpperCase();

  if (!userId || !(RBAC_ROLES as readonly string[]).includes(roleName)) {
    redirect("/dashboard/organization/roles");
  }

  await tenantDb(organizationId, async (tx) => {
    const [user, role] = await Promise.all([
      tx.user.findFirst({
        where: { id: userId, organizationId },
        select: { id: true },
      }),
      tx.role.findFirst({
        where: { organizationId, name: roleName },
        select: { id: true },
      }),
    ]);

    if (!user || !role) {
      return;
    }

    await tx.user.update({
      where: { id: user.id },
      data: { roleId: role.id },
    });
  });

  revalidatePath("/dashboard/organization/roles");
  revalidatePath("/dashboard/organization");
  redirect("/dashboard/organization/roles");
}

export default async function OrganizationRolesPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  try {
    await requireAnyRole(["SYSTEM_ADMIN", "CITY_ADMIN"], session.user);
  } catch (error) {
    if (error instanceof RoleAccessError) {
      notFound();
    }
    throw error;
  }

  const organizationId = requireOrganization(session);
  const data = await tenantDb<{
    roles: RoleRow[];
    users: UserRow[];
  }>(organizationId, async (tx) => {
    const [roles, users] = await Promise.all([
      tx.role.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { users: true } },
        },
      }),
      tx.user.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          legacyRole: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      roles: roles.map((role: { id: string; name: string; description: string | null; _count: { users: number } }) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        usersCount: role._count.users,
      })),
      users,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Role Management</h1>
        <p className="text-sm text-slate-600">
          View tenant-scoped roles and assign user access by organization.
        </p>
      </div>

      <Card title="Roles">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Role</th>
                <th className="py-2 pr-2">Description</th>
                <th className="py-2">Users</th>
              </tr>
            </thead>
            <tbody>
              {data.roles.map((role) => (
                <tr key={role.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 font-medium text-slate-900">{role.name}</td>
                  <td className="py-2 pr-2 text-slate-700">{role.description ?? "N/A"}</td>
                  <td className="py-2">{role.usersCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Assign User Roles">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Current Role</th>
                <th className="py-2">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 text-slate-900">{user.name}</td>
                  <td className="py-2 pr-2">{user.email}</td>
                  <td className="py-2 pr-2">{user.role?.name ?? user.legacyRole}</td>
                  <td className="py-2">
                    <form action={updateUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <select
                        name="roleName"
                        defaultValue={user.role?.name ?? "STAFF"}
                        className="rounded-md border border-slate-300 px-2 py-1"
                      >
                        {RBAC_ROLES.map((roleName) => (
                          <option key={roleName} value={roleName}>
                            {roleName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        Update
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

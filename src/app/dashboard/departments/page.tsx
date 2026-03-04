import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import { createDepartment, deleteDepartment, updateDepartment } from "./actions";

export default async function DepartmentsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const role = user.role as AppRole;
  const canManage = hasMinimumRole(role, "EDITOR");

  const departments = await db().department.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      {canManage ? (
        <Card title="Create Department">
          <form action={createDepartment} className="flex flex-wrap items-center gap-3">
            <input
              name="name"
              required
              placeholder="Department name"
              className="min-w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Create Department
            </button>
          </form>
        </Card>
      ) : null}

      <Card title="Department List">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {departments.length > 0 ? (
                departments.map((department) => (
                  <tr key={department.id}>
                    <td className="px-4 py-3 text-slate-800">{department.name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.DateTimeFormat("en-US").format(department.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <details>
                            <summary className="cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100">
                              Edit
                            </summary>
                            <form
                              action={updateDepartment}
                              className="mt-2 grid min-w-72 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3"
                            >
                              <input type="hidden" name="id" value={department.id} />
                              <input
                                name="name"
                                required
                                defaultValue={department.name}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                              <button
                                type="submit"
                                className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                              >
                                Save
                              </button>
                            </form>
                          </details>

                          <details>
                            <summary className="cursor-pointer rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                              Delete
                            </summary>
                            <form
                              action={deleteDepartment}
                              className="mt-2 rounded-md border border-red-200 bg-red-50 p-3"
                            >
                              <input type="hidden" name="id" value={department.id} />
                              <p className="mb-2 text-xs text-red-700">
                                Delete this department and clear assignments from related KPIs and grants.
                              </p>
                              <button
                                type="submit"
                                className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500"
                              >
                                Confirm Delete
                              </button>
                            </form>
                          </details>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={3}>
                    No departments found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

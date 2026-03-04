import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import { createProgram, deleteProgram, updateProgram } from "./actions";

function toDateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function ProgramsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const role = user.role as AppRole;
  const canManage = hasMinimumRole(role, "EDITOR");

  const [departments, programs] = await Promise.all([
    db().department.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
    db().program.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        department: {
          select: {
            name: true,
          },
        },
        strategicObjectives: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
  ]);

  const objectives = await db().strategicObjective.findMany({
    where: {
      goal: {
        organizationId: user.organizationId,
      },
    },
    include: {
      goal: {
        select: {
          title: true,
        },
      },
    },
    orderBy: [{ goal: { title: "asc" } }, { title: "asc" }],
  });

  return (
    <div className="space-y-6">
      {canManage ? (
        <Card title="Create Program">
          <form action={createProgram} className="grid gap-3 md:grid-cols-3">
            <input
              name="name"
              required
              placeholder="Program name"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              name="departmentId"
              required
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select department
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" name="isPublic" />
              Public
            </label>
            <textarea
              name="description"
              placeholder="Description (optional)"
              className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-3"
            />
            <input
              name="startDate"
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="endDate"
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              name="objectiveId"
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-3"
            >
              <option value="">Strategic Objective (optional)</option>
              {objectives.map((objective) => (
                <option key={objective.id} value={objective.id}>
                  {objective.goal.title} - {objective.title}
                </option>
              ))}
            </select>
            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Create Program
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Program List">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Program</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Strategic Objective</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Public</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Dates</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {programs.length > 0 ? (
                programs.map((program) => (
                  <tr key={program.id}>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="font-medium">{program.name}</div>
                      <p className="text-xs text-slate-500">{program.description ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{program.department.name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {program.strategicObjectives[0]?.title ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{program.isPublic ? "Published" : "Private"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {toDateInputValue(program.startDate) || "-"} to {toDateInputValue(program.endDate) || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <details>
                            <summary className="cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100">
                              Edit
                            </summary>
                            <form action={updateProgram} className="mt-2 grid min-w-80 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                              <input type="hidden" name="id" value={program.id} />
                              <input
                                name="name"
                                required
                                defaultValue={program.name}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                              <select
                                name="departmentId"
                                required
                                defaultValue={program.departmentId}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              >
                                {departments.map((department) => (
                                  <option key={department.id} value={department.id}>
                                    {department.name}
                                  </option>
                                ))}
                              </select>
                              <textarea
                                name="description"
                                defaultValue={program.description ?? ""}
                                className="min-h-16 rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                              <label className="flex items-center gap-2 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700">
                                <input type="checkbox" name="isPublic" defaultChecked={program.isPublic} />
                                Public
                              </label>
                              <input
                                name="startDate"
                                type="date"
                                defaultValue={toDateInputValue(program.startDate)}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                              <input
                                name="endDate"
                                type="date"
                                defaultValue={toDateInputValue(program.endDate)}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                              <select
                                name="objectiveId"
                                defaultValue={program.strategicObjectives[0]?.id ?? ""}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              >
                                <option value="">No strategic objective</option>
                                {objectives.map((objective) => (
                                  <option key={objective.id} value={objective.id}>
                                    {objective.goal.title} - {objective.title}
                                  </option>
                                ))}
                              </select>
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
                            <form action={deleteProgram} className="mt-2 rounded-md border border-red-200 bg-red-50 p-3">
                              <input type="hidden" name="id" value={program.id} />
                              <p className="mb-2 text-xs text-red-700">
                                Delete this program and remove program links from related KPIs and grants.
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
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    No programs found for this organization.
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

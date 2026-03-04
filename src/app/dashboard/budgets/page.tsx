import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import { createBudget, deleteBudget, updateBudget } from "./actions";

export default async function BudgetsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const role = user.role as AppRole;
  const canManage = hasMinimumRole(role, "EDITOR");

  const [programs, budgets] = await Promise.all([
    db().program.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
    db().budget.findMany({
      where: {
        OR: [{ organizationId: user.organizationId }, { program: { organizationId: user.organizationId } }],
      },
      orderBy: [{ fiscalYear: "desc" }, { createdAt: "desc" }],
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      {canManage ? (
        <Card title="Create Budget">
          <form action={createBudget} className="grid gap-3 md:grid-cols-4">
            <select
              name="programId"
              required
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select program
              </option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <input
              name="fiscalYear"
              type="number"
              required
              placeholder="Fiscal year"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="category"
              type="text"
              placeholder="Category"
              defaultValue="GENERAL"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="allocated"
              type="number"
              step="0.01"
              required
              placeholder="Allocated amount"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="spent"
              type="number"
              step="0.01"
              required
              defaultValue="0"
              placeholder="Spent amount"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="md:col-span-4">
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Create Budget
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Budget List">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Program</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Fiscal Year</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Allocated</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Spent</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Remaining</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {budgets.length > 0 ? (
                budgets.map((budget) => {
                  const allocated = Number(budget.allocated);
                  const spent = Number(budget.spent);
                  const remaining = allocated - spent;
                  const departmentName = budget.department?.name ?? budget.program?.department?.name ?? "-";

                  return (
                    <tr key={budget.id}>
                      <td className="px-4 py-3 text-slate-800">{budget.program?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{departmentName}</td>
                      <td className="px-4 py-3 text-slate-700">{budget.fiscalYear}</td>
                      <td className="px-4 py-3 text-slate-700">{budget.category}</td>
                      <td className="px-4 py-3 text-slate-700">${allocated.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-700">${spent.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-700">${remaining.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {canManage ? (
                          <div className="flex items-center gap-2">
                            <details>
                              <summary className="cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100">
                                Edit
                              </summary>
                              <form action={updateBudget} className="mt-2 grid min-w-80 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                                <input type="hidden" name="id" value={budget.id} />
                                <select
                                  name="programId"
                                  defaultValue={budget.programId ?? ""}
                                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                                >
                                  {programs.map((program) => (
                                    <option key={program.id} value={program.id}>
                                      {program.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  name="fiscalYear"
                                  type="number"
                                  required
                                  defaultValue={budget.fiscalYear}
                                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                                />
                                <input
                                  name="category"
                                  type="text"
                                  required
                                  defaultValue={budget.category}
                                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                                />
                                <input
                                  name="allocated"
                                  type="number"
                                  step="0.01"
                                  required
                                  defaultValue={allocated.toFixed(2)}
                                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                                />
                                <input
                                  name="spent"
                                  type="number"
                                  step="0.01"
                                  required
                                  defaultValue={spent.toFixed(2)}
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
                              <form action={deleteBudget} className="mt-2 rounded-md border border-red-200 bg-red-50 p-3">
                                <input type="hidden" name="id" value={budget.id} />
                                <p className="mb-2 text-xs text-red-700">Confirm budget deletion.</p>
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
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={8}>
                    No budgets found for this organization.
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

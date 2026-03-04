import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import { createGoal, createObjective } from "./actions";

export default async function GoalsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const role = user.role as AppRole;
  const canManage = hasMinimumRole(role, "EDITOR");

  const [goals, programs] = await Promise.all([
    db().strategicGoal.findMany({
      where: { organizationId: user.organizationId },
      include: {
        objectives: {
          include: {
            program: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db().program.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      {canManage ? (
        <Card title="Create Strategic Goal">
          <form action={createGoal} className="grid gap-3 md:grid-cols-3">
            <input
              name="title"
              required
              placeholder="Goal title"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="targetYear"
              type="number"
              placeholder="Target year"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="description"
              placeholder="Description (optional)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Create Goal
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      {canManage ? (
        <Card title="Create Strategic Objective">
          <form action={createObjective} className="grid gap-3 md:grid-cols-5">
            <select
              name="goalId"
              required
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select goal
              </option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
            <input
              name="title"
              required
              placeholder="Objective title"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="description"
              placeholder="Description (optional)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="progressPercent"
              type="number"
              min={0}
              max={100}
              defaultValue={0}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              name="programId"
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No linked program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <div className="md:col-span-5">
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Create Objective
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Strategic Goals">
        <div className="space-y-4">
          {goals.length > 0 ? (
            goals.map((goal) => {
              const avgProgress =
                goal.objectives.length > 0
                  ? Math.round(
                      goal.objectives.reduce((sum, objective) => sum + objective.progressPercent, 0) /
                        goal.objectives.length,
                    )
                  : 0;

              return (
                <section key={goal.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-base font-semibold text-slate-900">{goal.title}</h3>
                  <p className="text-sm text-slate-600">
                    Target Year: {goal.targetYear ?? "-"} | Progress: {avgProgress}%
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{goal.description ?? "-"}</p>

                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">Objective</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">Program</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-700">Progress %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {goal.objectives.length > 0 ? (
                          goal.objectives.map((objective) => (
                            <tr key={objective.id}>
                              <td className="px-3 py-2 text-slate-800">
                                <div className="font-medium">{objective.title}</div>
                                <p className="text-xs text-slate-500">{objective.description ?? "-"}</p>
                              </td>
                              <td className="px-3 py-2 text-slate-700">{objective.program?.name ?? "-"}</td>
                              <td className="px-3 py-2 text-slate-700">{objective.progressPercent}%</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-3 py-4 text-slate-500" colSpan={3}>
                              No objectives for this goal.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No strategic goals created yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

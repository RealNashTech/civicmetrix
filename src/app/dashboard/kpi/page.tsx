import Link from "next/link";

import { Card } from "@/components/ui/card";
import { KpiTrendChart } from "@/components/charts/KpiTrendChart";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { summarizeTrend } from "@/lib/kpi-trends";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import { createKpi, deleteKpi, toggleKpiPublic, updateKpi } from "./actions";

export default async function KpiPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const role = user.role as AppRole;
  const canCreate = hasMinimumRole(role, "EDITOR");

  const kpis = await db().kPI.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
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
        },
      },
      milestone: {
        select: {
          id: true,
          name: true,
          grant: {
            select: {
              name: true,
            },
          },
        },
      },
      history: {
        orderBy: {
          recordedAt: "desc",
        },
        take: 12,
        select: {
          recordedAt: true,
          value: true,
        },
      },
    },
  });

  const departments = await db().department.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  const programs = await db().program.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });
  const milestones = await db().grantMilestone.findMany({
    where: {
      grant: {
        organizationId: user.organizationId,
      },
    },
    include: {
      grant: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      {canCreate ? (
        <Card title="Create KPI">
          <form action={createKpi} className="grid gap-3 md:grid-cols-6">
            <input
              name="name"
              required
              placeholder="KPI name"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="value"
              required
              step="any"
              type="number"
              placeholder="Value"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="target"
              step="any"
              type="number"
              placeholder="Target (optional)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="unit"
              placeholder="Unit (optional)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="periodLabel"
              placeholder="Period label (optional)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              name="departmentId"
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <select
              name="programId"
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <select
              name="milestoneId"
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No grant milestone</option>
              {milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.grant.name} - {milestone.name}
                </option>
              ))}
            </select>
            <div className="md:col-span-6">
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Create KPI
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="KPI List">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Value</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Target</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Unit</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Period</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Program</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Grant Milestone</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Public</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {kpis.length > 0 ? (
                kpis.map((kpi) => (
                  <tr key={kpi.id}>
                    <td className="px-4 py-3 text-slate-800">{kpi.name}</td>
                    <td className="px-4 py-3 text-slate-700">{kpi.value}</td>
                    <td className="px-4 py-3 text-slate-700">{kpi.target ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {kpi.status.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{kpi.unit ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{kpi.periodLabel ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{kpi.department?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{kpi.program?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {kpi.milestone ? `${kpi.milestone.grant.name} - ${kpi.milestone.name}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="flex items-center gap-3">
                        <span>{kpi.isPublic ? "Published" : "Private"}</span>
                        {canCreate ? (
                          <form
                            action={async () => {
                              "use server";
                              await toggleKpiPublic(kpi.id);
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              {kpi.isPublic ? "Unpublish" : "Publish"}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/kpi/${kpi.id}`}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100"
                        >
                          History
                        </Link>
                        {canCreate ? (
                          <>
                          <details className="group">
                            <summary className="cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100">
                              Edit
                            </summary>
                            <form action={updateKpi} className="mt-2 grid min-w-72 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                              <input type="hidden" name="id" value={kpi.id} />
                              <input
                                name="name"
                                defaultValue={kpi.name}
                                required
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                              <input
                                name="value"
                                type="number"
                                step="any"
                                defaultValue={kpi.value}
                                required
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                              <input
                                name="target"
                                type="number"
                                step="any"
                                defaultValue={kpi.target ?? ""}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                              <input
                                name="unit"
                                defaultValue={kpi.unit ?? ""}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                              <input
                                name="periodLabel"
                                defaultValue={kpi.periodLabel ?? ""}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                              <select
                                name="departmentId"
                                defaultValue={kpi.departmentId ?? ""}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              >
                                <option value="">No department</option>
                                {departments.map((department) => (
                                  <option key={department.id} value={department.id}>
                                    {department.name}
                                  </option>
                                ))}
                              </select>
                              <select
                                name="programId"
                                defaultValue={kpi.programId ?? ""}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              >
                                <option value="">No program</option>
                                {programs.map((program) => (
                                  <option key={program.id} value={program.id}>
                                    {program.name}
                                  </option>
                                ))}
                              </select>
                              <select
                                name="milestoneId"
                                defaultValue={kpi.milestoneId ?? ""}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              >
                                <option value="">No grant milestone</option>
                                {milestones.map((milestone) => (
                                  <option key={milestone.id} value={milestone.id}>
                                    {milestone.grant.name} - {milestone.name}
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
                            <form action={deleteKpi} className="mt-2 rounded-md border border-red-200 bg-red-50 p-3">
                              <input type="hidden" name="id" value={kpi.id} />
                              <p className="mb-2 text-xs text-red-700">
                                Confirm KPI deletion. This cannot be undone.
                              </p>
                              <button
                                type="submit"
                                className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500"
                              >
                                Confirm Delete
                              </button>
                            </form>
                          </details>
                          </>
                        ) : null}
                        <details>
                          <summary className="cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100">
                            Trend
                          </summary>
                          <div className="mt-2 min-w-[22rem] rounded-md border border-slate-200 bg-slate-50 p-3">
                            {(() => {
                              const series = [...kpi.history]
                                .reverse()
                                .map((entry) => ({
                                  date: new Intl.DateTimeFormat("en-US", {
                                    month: "short",
                                    year: "2-digit",
                                  }).format(entry.recordedAt),
                                  value: Number(entry.value),
                                }));
                              const trend = summarizeTrend(series.map((point) => point.value));
                              const directionLabel =
                                trend.direction === "UP"
                                  ? "Improving"
                                  : trend.direction === "DOWN"
                                    ? "Declining"
                                    : "Stable";
                              return series.length > 1 ? (
                                <div className="space-y-2">
                                  <p className="text-xs text-slate-600">
                                    Last 12 records:{" "}
                                    <span className="font-semibold text-slate-800">
                                      {directionLabel} ({trend.deltaPercent}%)
                                    </span>
                                  </p>
                                  <KpiTrendChart data={series} height={170} />
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">Not enough history points yet.</p>
                              );
                            })()}
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={11}>
                    No KPIs found for this organization.
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

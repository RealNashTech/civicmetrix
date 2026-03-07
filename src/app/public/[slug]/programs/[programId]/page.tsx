import Link from "next/link";
import { notFound } from "next/navigation";

import { dbSystem } from "@/lib/db";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string; programId: string }>;
};

function getProgramStatus(startDate: Date | null, endDate: Date | null) {
  const now = new Date();
  const started = !startDate || startDate <= now;
  const notEnded = !endDate || endDate >= now;
  return started && notEnded ? "Active" : "Inactive";
}

function toPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((value / total) * 100));
}

export default async function PublicProgramDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);

  const program = await dbSystem().program.findFirst({
    where: {
      id: resolvedParams.programId,
      organizationId: organization.id,
      isPublic: true,
    },
    include: {
      department: {
        select: { name: true },
      },
      budgets: {
        orderBy: { fiscalYear: "desc" },
      },
      kpis: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
      },
      grants: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!program) {
    notFound();
  }

  const recentIssues = await dbSystem().issueReport.findMany({
    where: {
      organizationId: organization.id,
      departmentId: program.departmentId,
      status: {
        not: "RESOLVED",
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      createdAt: true,
    },
  });

  const allocated = program.budgets.reduce((sum, budget) => sum + Number(budget.allocated), 0);
  const spent = program.budgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
  const budgetUtilization = toPercent(spent, allocated);
  const programStatus = getProgramStatus(program.startDate, program.endDate);
  const remaining = allocated - spent;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <Link
          href={`/public/${resolvedParams.slug}/programs`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Programs
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{program.name}</h1>
        <p className="text-sm text-slate-600">Department: {program.department.name}</p>
        <p className="mt-2 text-slate-700">{program.description ?? "No description available."}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Program Status</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{programStatus}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 md:col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Budget Utilization</p>
          <p className="mt-1 text-sm text-slate-700">
            ${spent.toFixed(2)} spent of ${allocated.toFixed(2)} allocated
          </p>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-slate-700"
              style={{ width: `${budgetUtilization}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{budgetUtilization}% utilized</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Budget Breakdown</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Allocated</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">${allocated.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Spent</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">${spent.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Remaining</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">${remaining.toFixed(2)}</p>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Budget Progress</p>
          <div className="mt-2 h-3 w-full rounded-full bg-slate-100">
            <div className="h-3 rounded-full bg-blue-600" style={{ width: `${budgetUtilization}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{budgetUtilization}% utilized</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Budgets</h2>
        {program.budgets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No budgets published for this program.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Fiscal Year</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Allocated</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Spent</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {program.budgets.map((budget) => {
                  const allocated = Number(budget.allocated);
                  const spent = Number(budget.spent);
                  const remaining = allocated - spent;
                  return (
                    <tr key={budget.id}>
                      <td className="px-4 py-3 text-slate-700">{budget.fiscalYear}</td>
                      <td className="px-4 py-3 text-slate-700">${allocated.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-700">${spent.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-700">${remaining.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Public KPIs</h2>
        {program.kpis.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public KPIs for this program.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Value</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Target</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Progress</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {program.kpis.map((kpi) => {
                  const target = kpi.target ?? 0;
                  const progress =
                    kpi.target && kpi.target > 0 ? toPercent(kpi.value, kpi.target) : 0;

                  return (
                    <tr key={kpi.id}>
                      <td className="px-4 py-3 text-slate-800">{kpi.name}</td>
                      <td className="px-4 py-3 text-slate-700">{kpi.value}</td>
                      <td className="px-4 py-3 text-slate-700">{kpi.target ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{kpi.status.replace("_", " ")}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {kpi.target && kpi.target > 0 ? (
                          <div className="w-44">
                            <div className="h-2 w-full rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-emerald-600"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {kpi.value} / {target} ({progress}%)
                            </p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{kpi.unit ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Public Grants</h2>
        {program.grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public grants for this program.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {program.grants.map((grant) => (
                  <tr key={grant.id}>
                    <td className="px-4 py-3 text-slate-800">{grant.name}</td>
                    <td className="px-4 py-3 text-slate-700">{grant.status}</td>
                    <td className="px-4 py-3 text-slate-700">${grant.amount.toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recent Issues</h2>
        {recentIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active issues for this department.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {recentIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="px-4 py-3 text-slate-800">{issue.title}</td>
                    <td className="px-4 py-3 text-slate-700">{issue.category}</td>
                    <td className="px-4 py-3 text-slate-700">{issue.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.DateTimeFormat("en-US").format(issue.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

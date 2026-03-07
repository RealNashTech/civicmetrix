import Link from "next/link";

import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { dbSystem } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export default async function PublicTransparencyDashboardPage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);

  const publicPrograms = await dbSystem().program.findMany({
    where: { organizationId: organization.id, isPublic: true },
    select: { id: true, departmentId: true, name: true },
  });
  const publicDepartmentIds = [...new Set(publicPrograms.map((program) => program.departmentId))];

  const [kpis, budgets, issues, assets, departments] = await Promise.all([
    dbSystem().kPI.findMany({
      where: { organizationId: organization.id, isPublic: true },
      select: { status: true },
    }),
    dbSystem().budget.findMany({
      where: {
        OR: [
          { program: { organizationId: organization.id, isPublic: true } },
          { organizationId: organization.id, departmentId: { in: publicDepartmentIds } },
        ],
      },
      select: { allocated: true, spent: true, departmentId: true },
    }),
    dbSystem().issueReport.findMany({
      where: {
        organizationId: organization.id,
        departmentId: { in: publicDepartmentIds },
      },
      select: { status: true, departmentId: true },
    }),
    dbSystem().asset.findMany({
      where: {
        organizationId: organization.id,
        departmentId: { in: publicDepartmentIds },
      },
      select: { conditionScore: true, departmentId: true },
    }),
    dbSystem().department.findMany({
      where: { organizationId: organization.id, id: { in: publicDepartmentIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const kpiOnTrack = kpis.filter((kpi) => kpi.status === "ON_TRACK").length;
  const kpiHealth = asPercent(kpiOnTrack, kpis.length);
  const totalAllocated = budgets.reduce((sum, budget) => sum + Number(budget.allocated), 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
  const budgetUtilization = asPercent(totalSpent, totalAllocated);
  const resolvedIssues = issues.filter((issue) => issue.status === "RESOLVED").length;
  const issueResolutionRate = asPercent(resolvedIssues, issues.length);
  const averageAssetCondition =
    assets.length > 0
      ? Math.round(assets.reduce((sum, asset) => sum + (asset.conditionScore ?? 100), 0) / assets.length)
      : 0;

  const departmentPerformance = departments.map((department) => {
    const departmentIssues = issues.filter((issue) => issue.departmentId === department.id);
    const departmentResolved = departmentIssues.filter((issue) => issue.status === "RESOLVED").length;
    const issueScore = asPercent(departmentResolved, departmentIssues.length);

    const departmentBudgets = budgets.filter((budget) => budget.departmentId === department.id);
    const allocated = departmentBudgets.reduce((sum, budget) => sum + Number(budget.allocated), 0);
    const spent = departmentBudgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
    const utilization = asPercent(spent, allocated);
    const budgetScore = Math.max(0, 100 - Math.abs(utilization - 75));

    const departmentAssets = assets.filter((asset) => asset.departmentId === department.id);
    const conditionScore =
      departmentAssets.length > 0
        ? Math.round(
            departmentAssets.reduce((sum, asset) => sum + (asset.conditionScore ?? 100), 0) /
              departmentAssets.length,
          )
        : 100;

    return {
      id: department.id,
      name: department.name,
      score: Math.round(issueScore * 0.4 + budgetScore * 0.3 + conditionScore * 0.3),
      utilization,
      issueScore,
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <Link href={`/public/${resolvedParams.slug}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Public Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{organization.name} Transparency Dashboard</h1>
        <p className="text-sm text-slate-600">Public civic performance, infrastructure, and budget snapshot.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">KPI Health</p>
          <p className="text-2xl font-semibold text-slate-900">{kpiHealth}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Budget Utilization</p>
          <p className="text-2xl font-semibold text-slate-900">{budgetUtilization}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Issue Resolution</p>
          <p className="text-2xl font-semibold text-slate-900">{issueResolutionRate}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Asset Condition</p>
          <p className="text-2xl font-semibold text-slate-900">{averageAssetCondition}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Public Departments</p>
          <p className="text-2xl font-semibold text-slate-900">{departments.length}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Performance Score</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Issue Resolution</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Budget Utilization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {departmentPerformance.length > 0 ? (
              departmentPerformance.map((department) => (
                <tr key={department.id}>
                  <td className="px-4 py-3 text-slate-800">{department.name}</td>
                  <td className="px-4 py-3 text-slate-700">{department.score}%</td>
                  <td className="px-4 py-3 text-slate-700">{department.issueScore}%</td>
                  <td className="px-4 py-3 text-slate-700">{department.utilization}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  No public department performance data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

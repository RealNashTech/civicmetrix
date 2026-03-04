import { Card } from "@/components/ui/card";
import AssetMap from "@/components/maps/asset-map";
import IssueMap from "@/components/maps/issue-map";
import { getInfrastructureHealth } from "@/lib/asset-health";
import { auth } from "@/lib/auth";
import { getCityHealthScore } from "@/lib/city-health";
import { getIssueHotspots } from "@/lib/issue-hotspots";
import { getOrganizationKpiTrendHealth } from "@/lib/kpi-trends";
import { db } from "@/lib/db";

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export default async function CityOperationsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const [
    health,
    hotspots,
    urgentIssues,
    departments,
    strategicObjectives,
    grantMilestones,
    kpiTrendHealth,
    budgets,
    infrastructure,
    workOrders,
    maintenanceSchedules,
  ] =
    await Promise.all([
      getCityHealthScore(user.organizationId),
      getIssueHotspots(user.organizationId),
      db().issueReport.findMany({
        where: {
          organizationId: user.organizationId,
          priority: "URGENT",
          status: {
            not: "RESOLVED",
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db().department.findMany({
        where: { organizationId: user.organizationId },
        include: {
          programs: {
            include: {
              kpis: true,
              budgets: true,
            },
          },
          issueReports: true,
        },
        orderBy: { name: "asc" },
      }),
      db().strategicObjective.findMany({
        where: { goal: { organizationId: user.organizationId } },
        select: { progressPercent: true },
      }),
      db().grantMilestone.findMany({
        where: {
          grant: {
            organizationId: user.organizationId,
          },
        },
        select: {
          completed: true,
          dueDate: true,
        },
      }),
      getOrganizationKpiTrendHealth(user.organizationId, 6),
      db().budget.findMany({
        where: { OR: [{ organizationId: user.organizationId }, { program: { organizationId: user.organizationId } }] },
        select: {
          allocated: true,
          spent: true,
          fiscalYear: true,
          department: {
            select: { id: true, name: true },
          },
          program: {
            select: {
              department: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      getInfrastructureHealth(user.organizationId),
      db().workOrder.findMany({
        where: { organizationId: user.organizationId },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      }),
      db().maintenanceSchedule.findMany({
        where: { organizationId: user.organizationId },
        select: {
          id: true,
          frequencyDays: true,
          lastCompleted: true,
          createdAt: true,
        },
      }),
    ]);

  const mapIssues = urgentIssues
    .filter((issue) => issue.latitude != null && issue.longitude != null)
    .map((issue) => ({
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      latitude: issue.latitude as number,
      longitude: issue.longitude as number,
    }));
  const assetMapItems = infrastructure.assets
    .filter((asset) => asset.latitude != null && asset.longitude != null)
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      status: asset.status,
      conditionScore: asset.computedConditionScore,
      latitude: asset.latitude as number,
      longitude: asset.longitude as number,
    }));

  const departmentMetrics = departments.map((department) => {
    const kpis = department.programs.flatMap((program) => program.kpis);
    const onTrack = kpis.filter((kpi) => kpi.status === "ON_TRACK").length;
    const kpiScore = asPercent(onTrack, kpis.length);

    const openIssues = department.issueReports.filter((issue) => issue.status !== "RESOLVED").length;
    const issueScore = Math.max(0, 100 - Math.min(openIssues * 8, 100));

    const allocated = department.programs
      .flatMap((program) => program.budgets)
      .reduce((sum, budget) => sum + Number(budget.allocated), 0);
    const spent = department.programs
      .flatMap((program) => program.budgets)
      .reduce((sum, budget) => sum + Number(budget.spent), 0);
    const utilization = allocated > 0 ? (spent / allocated) * 100 : 0;
    const budgetScore = Math.max(0, 100 - Math.round(Math.abs(utilization - 75)));

    const score = Math.round(kpiScore * 0.45 + issueScore * 0.3 + budgetScore * 0.25);

    return {
      id: department.id,
      name: department.name,
      score,
      kpiScore,
      issueScore,
      budgetScore,
      openIssues,
      utilization: Math.round(utilization),
    };
  });

  const strategicProgress =
    strategicObjectives.length > 0
      ? Math.round(
          strategicObjectives.reduce((sum, objective) => sum + objective.progressPercent, 0) /
            strategicObjectives.length,
        )
      : 0;
  const totalAllocated = budgets.reduce((sum, budget) => sum + Number(budget.allocated), 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
  const budgetUtilization = asPercent(totalSpent, totalAllocated);
  const completedMilestones = grantMilestones.filter((milestone) => milestone.completed).length;
  const milestoneCompletion = asPercent(completedMilestones, grantMilestones.length);
  const overdueMilestones = grantMilestones.filter(
    (milestone) => !milestone.completed && milestone.dueDate < new Date(),
  ).length;
  const grantComplianceScore = Math.max(0, Math.round(milestoneCompletion - overdueMilestones * 5));
  const spendingByDepartment = budgets.reduce(
    (acc, budget) => {
      const department = budget.department ?? budget.program?.department;
      const key = department?.id ?? "unassigned";
      const name = department?.name ?? "Unassigned";
      if (!acc[key]) {
        acc[key] = { name, spent: 0, allocated: 0 };
      }
      acc[key].spent += Number(budget.spent);
      acc[key].allocated += Number(budget.allocated);
      return acc;
    },
    {} as Record<string, { name: string; spent: number; allocated: number }>,
  );
  const topSpendingDepartments = Object.values(spendingByDepartment)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);
  const openWorkOrders = workOrders.filter((order) => order.status !== "COMPLETED").length;
  const completedWorkOrders = workOrders.filter((order) => order.status === "COMPLETED").length;
  const maintenanceCompletionRate = asPercent(completedWorkOrders, workOrders.length);
  const overdueMaintenance = maintenanceSchedules.filter((schedule) => {
    const baseDate = schedule.lastCompleted ?? schedule.createdAt;
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + schedule.frequencyDays);
    return dueDate < new Date();
  }).length;

  return (
    <div className="space-y-6">
      <Card title="City Health Score">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Overall</p>
            <p className="text-2xl font-semibold text-slate-900">{health.overallScore}%</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">KPI</p>
            <p className="text-xl font-semibold text-slate-900">{health.kpiScore}%</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Issues</p>
            <p className="text-xl font-semibold text-slate-900">{health.issueScore}%</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Programs</p>
            <p className="text-xl font-semibold text-slate-900">{health.programScore}%</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Budget</p>
            <p className="text-xl font-semibold text-slate-900">{health.budgetScore}%</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Grants</p>
            <p className="text-xl font-semibold text-slate-900">{health.grantScore}%</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">KPI Trend Health</p>
            <p className="text-xl font-semibold text-slate-900">{kpiTrendHealth.score}%</p>
            <p className="text-xs text-slate-500">
              {kpiTrendHealth.downwardCount}/{kpiTrendHealth.total} declining
            </p>
          </div>
        </div>
      </Card>

      <Card title="Urgent Issues">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {urgentIssues.length > 0 ? (
                urgentIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="px-4 py-3 text-slate-800">{issue.title}</td>
                    <td className="px-4 py-3 text-slate-700">{issue.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-700">{issue.address ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={3}>
                    No urgent unresolved issues.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Issue Hotspot Map">
        {mapIssues.length > 0 ? (
          <IssueMap issues={mapIssues} />
        ) : (
          <p className="text-sm text-slate-500">No urgent issues with coordinates available.</p>
        )}
      </Card>

      <Card title="Operational Hotspots">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Hotspot Clusters</p>
            <p className="text-2xl font-semibold text-slate-900">{hotspots.hotspotCount}</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {hotspots.topHotspots.slice(0, 5).map((hotspot) => (
                <p key={hotspot.key}>
                  {hotspot.key} - {hotspot.count} issues
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Top Department Hotspots</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {hotspots.departmentHotspots.slice(0, 6).map((entry) => (
                <p key={entry.department}>
                  {entry.department}: {entry.count}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Department Performance">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Performance Score</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Open Issues</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Budget Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {departmentMetrics.map((department) => (
                <tr key={department.id}>
                  <td className="px-4 py-3 text-slate-800">{department.name}</td>
                  <td className="px-4 py-3 text-slate-700">{department.score}%</td>
                  <td className="px-4 py-3 text-slate-700">{department.openIssues}</td>
                  <td className="px-4 py-3 text-slate-700">{department.utilization}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Budget Utilization">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Total Allocated</p>
              <p className="text-lg font-semibold text-slate-900">${totalAllocated.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Spent</p>
              <p className="text-lg font-semibold text-slate-900">${totalSpent.toFixed(2)}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-500">Utilization</p>
          <p className="text-3xl font-semibold text-slate-900">{budgetUtilization}%</p>
          <div className="mt-3 space-y-1 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Highest spending departments</p>
            {topSpendingDepartments.length > 0 ? (
              topSpendingDepartments.map((entry) => (
                <p key={entry.name}>
                  {entry.name}: ${entry.spent.toFixed(2)} spent ({asPercent(entry.spent, entry.allocated)}%)
                </p>
              ))
            ) : (
              <p>No department spending records.</p>
            )}
          </div>
        </Card>
        <Card title="Strategic Progress">
          <p className="text-sm text-slate-500">Average strategic objective progress</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{strategicProgress}%</p>
        </Card>
        <Card title="Grant Compliance Score">
          <p className="text-sm text-slate-500">Milestone completion adjusted for overdue milestones</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{grantComplianceScore}%</p>
          <p className="text-xs text-slate-500">
            {completedMilestones}/{grantMilestones.length} milestones completed, {overdueMilestones} overdue
          </p>
        </Card>
      </div>

      <Card title="Infrastructure Condition">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Total Assets</p>
            <p className="text-2xl font-semibold text-slate-900">{infrastructure.totalAssets}</p>
            <p className="mt-2 text-xs text-slate-500">Assets below condition 50</p>
            <p className="text-xl font-semibold text-rose-700">{infrastructure.assetsBelow50}</p>
            <p className="mt-2 text-xs text-slate-500">Average condition</p>
            <p className="text-xl font-semibold text-slate-900">{infrastructure.averageCondition}%</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Top Failing Asset Types</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {infrastructure.topFailingTypes.length > 0 ? (
                infrastructure.topFailingTypes.map((entry) => (
                  <p key={entry.type}>
                    {entry.type}: {entry.failing}/{entry.total} below 50
                  </p>
                ))
              ) : (
                <p>No failing asset types detected.</p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4">
          {assetMapItems.length > 0 ? (
            <AssetMap assets={assetMapItems} />
          ) : (
            <p className="text-sm text-slate-500">No geocoded assets available for map overlay.</p>
          )}
        </div>
      </Card>

      <Card title="Maintenance Operations">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Open Work Orders</p>
            <p className="text-2xl font-semibold text-slate-900">{openWorkOrders}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Overdue Maintenance</p>
            <p className="text-2xl font-semibold text-rose-700">{overdueMaintenance}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Maintenance Completion Rate</p>
            <p className="text-2xl font-semibold text-slate-900">{maintenanceCompletionRate}%</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

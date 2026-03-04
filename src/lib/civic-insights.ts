import { db } from "@/lib/db";

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export async function getCivicInsights(organizationId: string): Promise<string[]> {
  const [kpis, issues, workOrders, assets, budgets] = await Promise.all([
    db().kPI.findMany({
      where: { organizationId },
      select: { status: true },
    }),
    db().issueReport.findMany({
      where: { organizationId },
      select: {
        status: true,
        department: {
          select: { name: true },
        },
      },
    }),
    db().workOrder.findMany({
      where: { organizationId },
      select: { status: true },
    }),
    db().asset.findMany({
      where: { organizationId },
      select: { conditionScore: true },
    }),
    db().budget.findMany({
      where: { OR: [{ organizationId }, { program: { organizationId } }] },
      select: { allocated: true, spent: true },
    }),
  ]);

  const insights: string[] = [];

  const offTrack = kpis.filter((kpi) => kpi.status === "OFF_TRACK").length;
  const atRisk = kpis.filter((kpi) => kpi.status === "AT_RISK").length;
  if (offTrack > 0 || atRisk > 0) {
    insights.push(`${offTrack} KPIs are off track and ${atRisk} are at risk.`);
  }

  const openIssues = issues.filter((issue) => issue.status !== "RESOLVED");
  if (openIssues.length > 0) {
    const byDepartment = openIssues.reduce(
      (acc, issue) => {
        const key = issue.department?.name ?? "Unassigned";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const [topDepartment, backlog] =
      Object.entries(byDepartment).sort((a, b) => b[1] - a[1])[0] ?? ["Unassigned", 0];
    insights.push(`${topDepartment} has the highest unresolved issue backlog (${backlog}).`);
  }

  const openWorkOrders = workOrders.filter((order) => order.status !== "COMPLETED").length;
  if (openWorkOrders > 0) {
    insights.push(`${openWorkOrders} work orders remain open across city operations.`);
  }

  const avgCondition =
    assets.length > 0
      ? Math.round(
          assets.reduce((sum, asset) => sum + (asset.conditionScore ?? 100), 0) / assets.length,
        )
      : 100;
  if (avgCondition < 70) {
    insights.push(`Infrastructure condition is trending low with an average score of ${avgCondition}%.`);
  }

  const totalAllocated = budgets.reduce((sum, budget) => sum + Number(budget.allocated), 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
  const utilization = asPercent(totalSpent, totalAllocated);
  if (utilization >= 90) {
    insights.push(`Budget utilization exceeded 90% (${utilization}%).`);
  } else {
    insights.push(`Budget utilization is currently ${utilization}% city-wide.`);
  }

  if (insights.length === 0) {
    insights.push("Operational indicators are stable with no critical governance anomalies detected.");
  }

  return insights;
}

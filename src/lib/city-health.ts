import { db } from "@/lib/db";

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export type CityHealthResult = {
  overallScore: number;
  kpiScore: number;
  issueScore: number;
  programScore: number;
  budgetScore: number;
  grantScore: number;
};

export async function getCityHealthScore(organizationId: string): Promise<CityHealthResult> {
  const [kpis, issues, objectives, budgets, grants] = await Promise.all([
    db().kPI.findMany({
      where: { organizationId },
      select: { status: true },
    }),
    db().issueReport.findMany({
      where: { organizationId },
      select: { status: true, priority: true },
    }),
    db().strategicObjective.findMany({
      where: {
        goal: {
          organizationId,
        },
      },
      select: { progressPercent: true },
    }),
    db().budget.findMany({
      where: { OR: [{ organizationId }, { program: { organizationId } }] },
      select: { allocated: true, spent: true },
    }),
    db().grant.findMany({
      where: { organizationId },
      select: { complianceStatus: true, nextReportDue: true },
    }),
  ]);

  const onTrackCount = kpis.filter((kpi) => kpi.status === "ON_TRACK").length;
  const kpiScore = asPercent(onTrackCount, kpis.length);

  const openIssues = issues.filter((issue) => issue.status !== "RESOLVED").length;
  const urgentIssues = issues.filter(
    (issue) => issue.priority === "URGENT" && issue.status !== "RESOLVED",
  ).length;
  const issueLoadPenalty = Math.min(openIssues * 2 + urgentIssues * 6, 100);
  const issueScore = Math.max(0, 100 - issueLoadPenalty);

  const programScore =
    objectives.length > 0
      ? Math.round(
          objectives.reduce((sum, objective) => sum + objective.progressPercent, 0) /
            objectives.length,
        )
      : 0;

  const totalAllocated = budgets.reduce((sum, budget) => sum + Number(budget.allocated), 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
  const utilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  const budgetScore = Math.max(0, 100 - Math.round(Math.abs(utilization - 75)));

  const now = new Date();
  const compliantCount = grants.filter((grant) => {
    if (grant.nextReportDue && grant.nextReportDue < now) {
      return false;
    }
    return (grant.complianceStatus ?? "COMPLIANT") === "COMPLIANT";
  }).length;
  const grantScore = asPercent(compliantCount, grants.length);

  const overallScore = Math.round(
    kpiScore * 0.3 +
      issueScore * 0.2 +
      programScore * 0.2 +
      budgetScore * 0.15 +
      grantScore * 0.15,
  );

  return {
    overallScore,
    kpiScore,
    issueScore,
    programScore,
    budgetScore,
    grantScore,
  };
}

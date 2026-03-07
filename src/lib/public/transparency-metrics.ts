import { dbSystem } from "@/lib/db";

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export async function getTransparencyMetrics(organizationId: string) {
  const [kpis, grants, issueTotals] = await Promise.all([
    dbSystem().kPI.findMany({
      where: { organizationId, isPublic: true },
      select: { id: true },
    }),
    dbSystem().grant.findMany({
      where: { organizationId, isPublic: true },
      select: { amount: true },
    }),
    dbSystem().issueReport.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
  ]);

  const totalIssues = issueTotals.reduce((sum, row) => sum + row._count._all, 0);
  const resolvedIssues = issueTotals
    .filter((row) => row.status === "RESOLVED")
    .reduce((sum, row) => sum + row._count._all, 0);

  return {
    totalGrants: grants.reduce((sum, grant) => sum + Number(grant.amount), 0),
    kpiCount: kpis.length,
    issueResolutionRate: asPercent(resolvedIssues, totalIssues),
    totalIssues,
    resolvedIssues,
  };
}

import { db } from "@/lib/db";

export type CouncilReportSummary = {
  kpiCount: number;
  grantCount: number;
  openIssues: number;
  resolvedIssues: number;
};

export async function generateCouncilReport(organizationId: string): Promise<CouncilReportSummary> {
  const [kpis, grants, issues] = await Promise.all([
    db().kPI.findMany({
      where: { organizationId },
      select: { id: true },
    }),
    db().grant.findMany({
      where: { organizationId },
      select: { id: true },
    }),
    db().issueReport.findMany({
      where: { organizationId },
      select: { status: true },
    }),
  ]);

  return {
    kpiCount: kpis.length,
    grantCount: grants.length,
    openIssues: issues.filter((issue) => issue.status !== "RESOLVED").length,
    resolvedIssues: issues.filter((issue) => issue.status === "RESOLVED").length,
  };
}

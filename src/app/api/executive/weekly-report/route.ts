import { NextResponse } from "next/server";

import { getOrSetJsonCache } from "@/lib/cache";
import { db } from "@/lib/db";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, authorizeStaffOrApiScope } from "@/lib/security/authorization";

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

async function handleGet(request: Request) {
  let organizationId: string;

  try {
    const context = await authorizeStaffOrApiScope(request, "city:read");
    organizationId = context.organizationId;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Authorization failed." }, { status: 500 });
  }

  const url = new URL(request.url);
  const issuePage = Math.max(1, Number.parseInt(url.searchParams.get("issuePage") ?? "1", 10) || 1);
  const issuePageSize = Math.min(
    200,
    Math.max(1, Number.parseInt(url.searchParams.get("issuePageSize") ?? "50", 10) || 50),
  );

  const cacheKey = [
    "api:executive-weekly-report",
    organizationId,
    issuePage,
    issuePageSize,
  ].join(":");

  const payload = await getOrSetJsonCache(cacheKey, 60, async () => {
    const [alerts, issues, issuesTotal, budgets, kpis, programs, unresolvedInsights] = await Promise.all([
      db().alert.findMany({
        where: { organizationId },
        select: { severity: true, resolvedAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      db().issueReport.findMany({
        where: { organizationId },
        select: {
          status: true,
          priority: true,
          assignedDepartmentId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (issuePage - 1) * issuePageSize,
        take: issuePageSize,
      }),
      db().issueReport.count({
        where: { organizationId },
      }),
      db().budget.findMany({
        where: { program: { organizationId } },
        select: { allocated: true, spent: true, fiscalYear: true },
        orderBy: { fiscalYear: "desc" },
      }),
      db().kPI.findMany({
        where: { organizationId },
        select: { status: true, target: true, value: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      db().program.findMany({
        where: { organizationId },
        select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      db().insight.findMany({
        where: {
          organizationId,
          resolvedAt: null,
        },
        select: {
          id: true,
          type: true,
          severity: true,
          title: true,
          description: true,
          sourceEntity: true,
          sourceId: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const budgetAllocated = budgets.reduce((sum, budget) => sum + Number(budget.allocated), 0);
    const budgetSpent = budgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
    const onTrack = kpis.filter((kpi) => kpi.status === "ON_TRACK").length;

    return {
      generatedAt: new Date().toISOString(),
      organizationId,
      alerts: {
        total: alerts.length,
        open: alerts.filter((alert) => !alert.resolvedAt).length,
        critical: alerts.filter((alert) => alert.severity === "CRITICAL" && !alert.resolvedAt).length,
      },
      issues: {
        total: issues.length,
        open: issues.filter((issue) => issue.status !== "RESOLVED").length,
        urgentOpen: issues.filter((issue) => issue.priority === "URGENT" && issue.status !== "RESOLVED")
          .length,
      },
      issuesList: issues,
      issuesPagination: {
        page: issuePage,
        pageSize: issuePageSize,
        total: issuesTotal,
        totalPages: Math.ceil(issuesTotal / issuePageSize),
      },
      budgets: {
        allocated: budgetAllocated,
        spent: budgetSpent,
        utilizationPercent: asPercent(budgetSpent, budgetAllocated),
      },
      kpis: {
        total: kpis.length,
        onTrack,
        healthPercent: asPercent(onTrack, kpis.length),
      },
      programs: {
        total: programs.length,
      },
      insights: {
        total: unresolvedInsights.length,
        critical: unresolvedInsights.filter((insight) => insight.severity === "CRITICAL").length,
        warning: unresolvedInsights.filter((insight) => insight.severity === "WARNING").length,
        grantRisks: unresolvedInsights.filter((insight) => insight.type === "GRANT_RISK"),
        kpiTrends: unresolvedInsights.filter((insight) => insight.type === "KPI_TREND_ALERT"),
        serviceClusters: unresolvedInsights.filter((insight) => insight.type === "SERVICE_CLUSTER"),
        unresolved: unresolvedInsights,
      },
    } as const;
  });

  return NextResponse.json(payload);
}

export const GET = withApiObservability("/api/executive/weekly-report", "GET", handleGet);

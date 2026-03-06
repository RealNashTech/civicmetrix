import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api/error-response";
import { apiSuccess } from "@/lib/api/success-response";
import { requireApiScope } from "@/lib/auth/require-api-scope";
import { getOrSetJsonCache } from "@/lib/cache";
import { db } from "@/lib/db";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError } from "@/lib/policies/base";
import { requireStaffUser } from "@/lib/security/authorization";
import { apiTokenTenantContext, runWithTenantContext } from "@/lib/tenant-context";

async function handleGet(request: Request) {
  let organizationId: string;
  let apiTokenContext: ReturnType<typeof apiTokenTenantContext> | null = null;

  try {
    const session = await auth();
    const user = session?.user;

    if (user) {
      const staff = await requireStaffUser("VIEWER");
      organizationId = staff.organizationId;
    } else {
      const token = await requireApiScope(request, "grant:read");
      organizationId = token.organizationId;
      apiTokenContext = apiTokenTenantContext(token);
    }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Authorization failed.", 500);
  }

  const url = new URL(request.url);
  const issuePage = Math.max(1, Number.parseInt(url.searchParams.get("issuePage") ?? "1", 10) || 1);
  const issuePageSize = Math.min(
    200,
    Math.max(1, Number.parseInt(url.searchParams.get("issuePageSize") ?? "50", 10) || 50),
  );
  const grantPage = Math.max(1, Number.parseInt(url.searchParams.get("grantPage") ?? "1", 10) || 1);
  const grantPageSize = Math.min(
    200,
    Math.max(1, Number.parseInt(url.searchParams.get("grantPageSize") ?? "50", 10) || 50),
  );

  const cacheKey = [
    "api:council-report",
    organizationId,
    issuePage,
    issuePageSize,
    grantPage,
    grantPageSize,
  ].join(":");

  try {
    const executeReportQuery = () =>
      getOrSetJsonCache(cacheKey, 60, async () => {
        const [kpis, budgets, issues, issuesTotal, goals, grants, grantsTotal] = await Promise.all([
          db().kPI.findMany({
            where: { organizationId },
            select: { id: true, name: true, value: true, target: true, status: true },
            orderBy: { createdAt: "desc" },
          }),
          db().budget.findMany({
            where: { program: { organizationId } },
            include: {
              program: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          db().issueReport.findMany({
            where: { organizationId },
            select: { id: true, title: true, status: true, priority: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            skip: (issuePage - 1) * issuePageSize,
            take: issuePageSize,
          }),
          db().issueReport.count({
            where: { organizationId },
          }),
          db().strategicGoal.findMany({
            where: { organizationId },
            include: {
              objectives: {
                include: {
                  program: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          db().grant.findMany({
            where: { organizationId },
            select: {
              id: true,
              name: true,
              complianceStatus: true,
              nextReportDue: true,
              lastReportSubmitted: true,
            },
            orderBy: { createdAt: "desc" },
            skip: (grantPage - 1) * grantPageSize,
            take: grantPageSize,
          }),
          db().grant.count({
            where: { organizationId },
          }),
        ]);

        return {
          generatedAt: new Date().toISOString(),
          organizationId,
          kpis,
          budgets,
          issues,
          issuesPagination: {
            page: issuePage,
            pageSize: issuePageSize,
            total: issuesTotal,
            totalPages: Math.ceil(issuesTotal / issuePageSize),
          },
          goals,
          grants,
          grantsPagination: {
            page: grantPage,
            pageSize: grantPageSize,
            total: grantsTotal,
            totalPages: Math.ceil(grantsTotal / grantPageSize),
          },
        } as const;
      });

    const payload = apiTokenContext
      ? await runWithTenantContext(apiTokenContext, executeReportQuery)
      : await executeReportQuery();

    return apiSuccess(payload);
  } catch {
    return apiError("Failed to generate council report", 500);
  }
}

export const GET = withApiObservability("/api/reports/council", "GET", handleGet);

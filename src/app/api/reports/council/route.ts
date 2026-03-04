import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api/error-response";
import { logApiRequest } from "@/lib/api/request-logger";
import { apiSuccess } from "@/lib/api/success-response";
import { requireApiScope } from "@/lib/auth/require-api-scope";
import { AuthError, requireStaff } from "@/lib/auth/require-staff";
import { getOrSetJsonCache } from "@/lib/cache";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const start = Date.now();
  let organizationId: string;

  try {
    const session = await auth();
    const user = session?.user;

    if (user) {
      const staff = await requireStaff();
      organizationId = staff.organizationId;
    } else {
      const token = await requireApiScope(request, "grant:read");
      organizationId = token.organizationId;
    }
  } catch (error) {
    if (error instanceof AuthError) {
      await logApiRequest(
        "/api/reports/council",
        "GET",
        Date.now() - start,
        error.status,
      );
      return apiError(error.message, error.status);
    }
    await logApiRequest(
      "/api/reports/council",
      "GET",
      Date.now() - start,
      500,
    );
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
    const payload = await getOrSetJsonCache(cacheKey, 60, async () => {
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

    await logApiRequest(
      "/api/reports/council",
      "GET",
      Date.now() - start,
      200,
    );
    return apiSuccess(payload);
  } catch {
    await logApiRequest(
      "/api/reports/council",
      "GET",
      Date.now() - start,
      500,
    );
    return apiError("Failed to generate council report", 500);
  }
}

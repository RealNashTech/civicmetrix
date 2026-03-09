import { apiError } from "@/lib/api/error-response";
import { getTenantDb } from "@/lib/db/tenantClient";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

async function handleGet() {
  try {
    const user = await requireStaffUser("VIEWER");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await getTenantDb(user.organizationId, async (tx: any) => {
      const [aggregate, recordsLast30Days, categoryBreakdownRaw, programBreakdownRaw] = await Promise.all([
        tx.assistanceRecord.aggregate({
          where: { organizationId: user.organizationId },
          _sum: { householdsServed: true },
        }),
        tx.assistanceRecord.count({
          where: {
            organizationId: user.organizationId,
            reportDate: { gte: thirtyDaysAgo },
          },
        }),
        tx.assistanceRecord.groupBy({
          by: ["category"],
          where: { organizationId: user.organizationId },
          _sum: { householdsServed: true },
          orderBy: {
            _sum: {
              householdsServed: "desc",
            },
          },
        }),
        tx.assistanceRecord.groupBy({
          by: ["programName", "organizationName"],
          where: { organizationId: user.organizationId },
          _sum: { householdsServed: true },
          orderBy: {
            _sum: {
              householdsServed: "desc",
            },
          },
        }),
      ]);

      return {
        totalHouseholdsServed: Number(aggregate._sum.householdsServed ?? 0),
        recordsLast30Days,
        categoryBreakdown: categoryBreakdownRaw.map((row) => ({
          category: row.category,
          householdsServed: Number(row._sum.householdsServed ?? 0),
        })),
        programBreakdown: programBreakdownRaw.map((row) => ({
          programName: row.programName,
          organizationName: row.organizationName,
          householdsServed: Number(row._sum.householdsServed ?? 0),
        })),
      };
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to fetch assistance summary.", 500);
  }
}

export const GET = withApiObservability("/api/assistance/summary", "GET", handleGet);

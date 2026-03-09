import { apiError } from "@/lib/api/error-response";
import { getTenantDb } from "@/lib/db/tenantClient";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

async function handleGet() {
  try {
    const user = await requireStaffUser("VIEWER");

    const dataSources = await getTenantDb(user.organizationId, async (tx) =>
      tx.dataSource.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          datasetType: true,
          refreshMinutes: true,
          lastSyncAt: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    );

    return Response.json({
      success: true,
      dataSources,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to fetch data sources.", 500);
  }
}

export const GET = withApiObservability("/api/datasources", "GET", handleGet);

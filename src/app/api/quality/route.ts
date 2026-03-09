import { apiError } from "@/lib/api/error-response";
import prisma from "@/lib/prisma";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

async function handleGet() {
  try {
    const user = await requireStaffUser("VIEWER");

    const metrics = await prisma.dataQualityMetric.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        datasetType: true,
        totalRecords: true,
        missingFieldCount: true,
        validationFailureCount: true,
        lastImportSessionId: true,
        qualityScore: true,
        createdAt: true,
      },
      orderBy: [
        {
          datasetType: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return Response.json({
      success: true,
      metrics,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }

    return apiError("Failed to fetch data quality metrics.", 500);
  }
}

export const GET = withApiObservability("/api/quality", "GET", handleGet);

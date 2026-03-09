import { apiError } from "@/lib/api/error-response";
import prisma from "@/lib/prisma";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

async function handleGet() {
  try {
    const user = await requireStaffUser("VIEWER");

    const sessions = await prisma.importSession.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        fileName: true,
        entityType: true,
        rowCount: true,
        successCount: true,
        failureCount: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return Response.json({
      success: true,
      sessions,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to fetch import sessions.", 500);
  }
}

export const GET = withApiObservability("/api/uploads/imports", "GET", async () => handleGet());

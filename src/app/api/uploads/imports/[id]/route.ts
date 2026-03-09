import { apiError } from "@/lib/api/error-response";
import prisma from "@/lib/prisma";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

async function handleGet(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStaffUser("VIEWER");
    const params = await context.params;
    const id = (params.id ?? "").trim();

    if (!id) {
      return apiError("Invalid import session id.", 400);
    }

    const session = await prisma.importSession.findUnique({
      where: { id },
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
    });

    if (!session || session.organizationId !== user.organizationId) {
      return apiError("Import session not found.", 404);
    }

    return Response.json({
      success: true,
      session,
      successCount: session.successCount,
      failureCount: session.failureCount,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to fetch import session.", 500);
  }
}

export const GET = withApiObservability("/api/uploads/imports/[id]", "GET", handleGet);

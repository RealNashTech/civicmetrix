import { apiError } from "@/lib/api/error-response";
import prisma from "@/lib/prisma";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

async function handleGet(request: Request) {
  try {
    const user = await requireStaffUser("VIEWER");
    const url = new URL(request.url);
    const organizationId = (url.searchParams.get("organizationId") ?? "").trim();

    if (!organizationId) {
      return apiError("organizationId is required.", 400);
    }
    if (organizationId !== user.organizationId) {
      return apiError("Organization mismatch.", 403);
    }

    const templates = await prisma.uploadMappingTemplate.findMany({
      where: { organizationId },
      select: {
        id: true,
        templateName: true,
        entityType: true,
        datasetType: true,
        mappingJSON: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({
      success: true,
      templates,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to list upload templates.", 500);
  }
}

export const GET = withApiObservability("/api/uploads/templates/list", "GET", handleGet);

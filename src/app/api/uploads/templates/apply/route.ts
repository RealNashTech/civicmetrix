import { z } from "zod";

import { apiError } from "@/lib/api/error-response";
import prisma from "@/lib/prisma";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";
import { normalizeFieldToColumnMapping, toMapApiMapping } from "@/lib/uploads/templates";

const applyTemplateSchema = z.object({
  templateId: z.string().min(1),
});

async function handlePost(request: Request) {
  try {
    const user = await requireStaffUser("VIEWER");
    const body = await request.json();
    const parsed = applyTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid request body. Expected templateId.", 400);
    }

    const template = await prisma.uploadMappingTemplate.findUnique({
      where: { id: parsed.data.templateId },
      select: {
        id: true,
        organizationId: true,
        templateName: true,
        entityType: true,
        datasetType: true,
        mappingJSON: true,
      },
    });

    if (!template) {
      return apiError("Template not found.", 404);
    }
    if (template.organizationId !== user.organizationId) {
      return apiError("Organization mismatch.", 403);
    }

    const fieldToColumn = normalizeFieldToColumnMapping(template.mappingJSON);
    const mapApiMapping = toMapApiMapping(fieldToColumn);

    return Response.json({
      success: true,
      template: {
        id: template.id,
        templateName: template.templateName,
        entityType: template.entityType,
        datasetType: template.datasetType,
      },
      mapping: mapApiMapping,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to apply upload template.", 500);
  }
}

export const POST = withApiObservability("/api/uploads/templates/apply", "POST", handlePost);

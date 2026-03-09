import { z } from "zod";

import { apiError } from "@/lib/api/error-response";
import prisma from "@/lib/prisma";
import { withApiObservability } from "@/lib/observability/http";
import { logger } from "@/lib/observability/logger";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";
import { normalizeFieldToColumnMapping } from "@/lib/uploads/templates";

const saveTemplateSchema = z.object({
  organizationId: z.string().min(1),
  templateName: z.string().min(1).max(120),
  entityType: z.string().min(1).max(80),
  datasetType: z.string().min(1).max(80).optional(),
  mapping: z.record(z.string().min(1), z.string().min(1)),
});

async function handlePost(request: Request) {
  try {
    const user = await requireStaffUser("VIEWER");
    const body = await request.json();
    const parsed = saveTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid request body. Expected organizationId, templateName, entityType, mapping.", 400);
    }

    const { organizationId, templateName, entityType, datasetType, mapping } = parsed.data;
    if (organizationId !== user.organizationId) {
      return apiError("Organization mismatch.", 403);
    }
    const resolvedDatasetType = datasetType?.trim() || entityType.trim();

    const normalizedMapping = normalizeFieldToColumnMapping(mapping);
    if (Object.keys(normalizedMapping).length === 0) {
      return apiError("Mapping cannot be empty.", 400);
    }

    const template = await prisma.uploadMappingTemplate.create({
      data: {
        organizationId,
        templateName: templateName.trim(),
        entityType: entityType.trim(),
        datasetType: resolvedDatasetType,
        mappingJSON: normalizedMapping,
      },
      select: {
        id: true,
        templateName: true,
        entityType: true,
        datasetType: true,
        createdAt: true,
      },
    });

    logger.info("upload_template_saved", {
      component: "upload-template-save-api",
      organizationId,
      templateId: template.id,
      entityType: template.entityType,
      datasetType: template.datasetType,
    });

    return Response.json({
      success: true,
      template,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to save upload template.", 500);
  }
}

export const POST = withApiObservability("/api/uploads/templates/save", "POST", handlePost);

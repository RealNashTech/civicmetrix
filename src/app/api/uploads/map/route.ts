import { z } from "zod";

import { apiError } from "@/lib/api/error-response";
import { withApiObservability } from "@/lib/observability/http";
import { logger } from "@/lib/observability/logger";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

const uploadMappingSchema = z.object({
  columns: z.array(z.string().min(1)).min(1),
  mapping: z.record(z.string().min(1), z.string().min(1)),
  datasetType: z.string().min(1).optional(),
});

async function handlePost(request: Request) {
  try {
    const user = await requireStaffUser("VIEWER");
    const body = await request.json();
    const parsed = uploadMappingSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid request body. Expected columns[] and mapping{}.", 400);
    }

    const { columns, mapping, datasetType } = parsed.data;
    const resolvedDatasetType = datasetType?.trim() || "InfrastructureAsset";
    const normalizedMapping = Object.fromEntries(
      Object.entries(mapping).map(([column, field]) => [column.trim(), field.trim()]),
    );
    const mappingEntries = Object.entries(normalizedMapping);

    if (mappingEntries.length === 0) {
      return apiError("Mapping cannot be empty.", 400);
    }

    const allowedColumns = new Set(columns.map((column) => column.trim()));
    const unknownColumns = mappingEntries
      .map(([column]) => column)
      .filter((column) => !allowedColumns.has(column));

    if (unknownColumns.length > 0) {
      return apiError(`Unknown mapped columns: ${unknownColumns.join(", ")}`, 400);
    }

    logger.info("upload_mapping_received", {
      component: "upload-map-api",
      organizationId: user.organizationId,
      columnCount: columns.length,
      mappingCount: mappingEntries.length,
      datasetType: resolvedDatasetType,
    });

    return Response.json({
      success: true,
      mapping: normalizedMapping,
      datasetType: resolvedDatasetType,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Upload mapping validation failed.", 500);
  }
}

export const POST = withApiObservability("/api/uploads/map", "POST", handlePost);

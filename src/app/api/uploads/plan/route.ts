import { z } from "zod";

import { apiError } from "@/lib/api/error-response";
import { withApiObservability } from "@/lib/observability/http";
import { logger } from "@/lib/observability/logger";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";
import { validateRows } from "@/lib/uploads/validateRows";

type RawRow = Record<string, unknown>;
type NormalizedRow = Record<string, unknown>;

const importPlanSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  mapping: z.record(z.string().min(1), z.string().min(1)),
  datasetType: z.string().min(1).optional(),
});

function normalizeRow(row: RawRow, mapping: Record<string, string>): NormalizedRow {
  const normalized: NormalizedRow = {};
  for (const [sourceColumn, targetField] of Object.entries(mapping)) {
    normalized[targetField] = row[sourceColumn];
  }
  return normalized;
}

async function handlePost(request: Request) {
  try {
    const user = await requireStaffUser("VIEWER");
    const body = await request.json();
    const parsed = importPlanSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid request body. Expected rows[] and mapping{}.", 400);
    }

    const { rows, mapping, datasetType } = parsed.data;
    const resolvedDatasetType = datasetType?.trim() || "InfrastructureAsset";
    const mappingCount = Object.keys(mapping).length;
    if (mappingCount === 0) {
      return apiError("Mapping cannot be empty.", 400);
    }

    const normalizedRows = rows.map((row) => normalizeRow(row, mapping));
    const validation = validateRows(resolvedDatasetType, normalizedRows);
    const warningLimit = 50;
    const warnings = validation.warnings.slice(0, warningLimit);

    logger.info("upload_import_plan_generated", {
      component: "upload-plan-api",
      organizationId: user.organizationId,
      rowCount: rows.length,
      validRowCount: validation.validRows.length,
      datasetType: resolvedDatasetType,
    });

    return Response.json({
      success: true,
      validRows: validation.validRows.length,
      invalidRows: validation.invalidRows,
      warningCount: validation.warnings.length,
      summary: {
        totalRows: rows.length,
        validRows: validation.validRows.length,
        invalidRows: validation.invalidRows.length,
      },
      preview: validation.validRows.slice(0, 10),
      warnings,
      datasetType: resolvedDatasetType,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to generate import plan.", 500);
  }
}

export const POST = withApiObservability("/api/uploads/plan", "POST", handlePost);

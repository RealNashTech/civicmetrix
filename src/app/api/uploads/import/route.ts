import { z } from "zod";

import { apiError } from "@/lib/api/error-response";
import prisma from "@/lib/prisma";
import { withApiObservability } from "@/lib/observability/http";
import { logger } from "@/lib/observability/logger";
import { eventProcessingQueue } from "@/lib/queue";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";
import { validateRows } from "@/lib/uploads/validateRows";

type RawRow = Record<string, unknown>;
type NormalizedRow = Record<string, unknown>;

const uploadImportSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  mapping: z.record(z.string().min(1), z.string().min(1)),
  fileName: z.string().trim().min(1).optional(),
  entityType: z.string().trim().min(1).optional(),
  datasetType: z.string().trim().min(1).optional(),
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
    const parsed = uploadImportSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid request body. Expected rows[] and mapping{}.", 400);
    }

    if (!eventProcessingQueue) {
      return apiError("Event processing queue is not configured.", 503);
    }

    const { rows, mapping, fileName, entityType, datasetType } = parsed.data;
    if (Object.keys(mapping).length === 0) {
      return apiError("Mapping cannot be empty.", 400);
    }
    const resolvedDatasetType = datasetType ?? entityType ?? "InfrastructureAsset";

    const normalizedRows = rows.map((row) => normalizeRow(row, mapping));
    const validation = validateRows(resolvedDatasetType, normalizedRows);
    if (validation.validRows.length === 0) {
      return Response.json(
        {
          success: false,
          error: {
            message: "No valid rows available for import.",
          },
          invalidRows: validation.invalidRows,
          warningCount: validation.warnings.length,
        },
        { status: 400 },
      );
    }

    const importSession = await prisma.importSession.create({
      data: {
        organizationId: user.organizationId,
        fileName: fileName ?? "uploaded-spreadsheet",
        entityType: resolvedDatasetType,
        rowCount: validation.validRows.length,
        successCount: 0,
        failureCount: 0,
        status: "PENDING",
      },
      select: {
        id: true,
      },
    });

    logger.info("import_session_created", {
      component: "upload-import-api",
      organizationId: user.organizationId,
      importSessionId: importSession.id,
      rowCount: validation.validRows.length,
      invalidRowCount: validation.invalidRows.length,
      datasetType: resolvedDatasetType,
    });

    const job = await eventProcessingQueue.add("upload-import", {
      organizationId: user.organizationId,
      rows: validation.validRows,
      importSessionId: importSession.id,
      datasetType: resolvedDatasetType,
    });

    logger.info("upload_import_started", {
      component: "upload-import-api",
      organizationId: user.organizationId,
      rowCount: validation.validRows.length,
      importSessionId: importSession.id,
      datasetType: resolvedDatasetType,
    });

    return Response.json({
      success: true,
      jobId: String(job.id),
      importSessionId: importSession.id,
      datasetType: resolvedDatasetType,
      validRows: validation.validRows.length,
      invalidRows: validation.invalidRows,
      warningCount: validation.warnings.length,
      message: "Import started",
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to start upload import.", 500);
  }
}

export const POST = withApiObservability("/api/uploads/import", "POST", handlePost);

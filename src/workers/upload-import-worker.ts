import prisma from "@/lib/prisma";
import { civicIntelligenceQueue, eventProcessingQueue } from "@/lib/queue";
import { logger } from "@/lib/observability/logger";
import { datasetHandlers } from "@/workers/handlers";

const DEFAULT_DATASET_TYPE = "InfrastructureAsset";

export type UploadImportJobPayload = {
  organizationId: string;
  rows: any[];
  importSessionId?: string;
  datasetType?: string;
};

export async function runUploadImportWorker(jobData: UploadImportJobPayload) {
  const queueName = eventProcessingQueue?.name ?? "event-processing";
  const { organizationId, rows, importSessionId, datasetType } = jobData;
  const resolvedDatasetType = datasetType ?? DEFAULT_DATASET_TYPE;
  let successCount = 0;
  let failureCount = 0;

  try {
    if (importSessionId) {
      await prisma.importSession.update({
        where: { id: importSessionId },
        data: {
          status: "RUNNING",
        },
      });
    }

    const handler = datasetHandlers[resolvedDatasetType];
    if (!handler) {
      throw new Error(`Unsupported datasetType: ${resolvedDatasetType}`);
    }
    const result = await handler.persist({
      prisma,
      organizationId,
      rows,
      importSessionId,
    });
    successCount = result.successCount;
    failureCount = result.failureCount;

    logger.info("upload_import_completed", {
      queueName,
      organizationId,
      totalRows: rows.length,
      datasetType: resolvedDatasetType,
    });

    if (importSessionId) {
      await prisma.importSession.update({
        where: { id: importSessionId },
        data: {
          successCount,
          failureCount,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      logger.info("import_session_completed", {
        organizationId,
        importSessionId,
        successCount,
        failureCount,
        datasetType: resolvedDatasetType,
      });
    }

    if (!civicIntelligenceQueue) {
      logger.error("dashboard_refresh_trigger_failed", {
        organizationId,
        source: "upload_import",
        error: "civic-intelligence queue is not configured",
      });
      return;
    }

    await civicIntelligenceQueue.add("refresh-dashboards", {
      organizationId,
    });

    logger.info("dashboard_refresh_triggered", {
      organizationId,
      source: "upload_import",
    });
  } catch (error) {
    if (importSessionId) {
      await prisma.importSession.update({
        where: { id: importSessionId },
        data: {
          successCount,
          failureCount,
          status: "FAILED",
          completedAt: new Date(),
        },
      });
    }
    throw error;
  }
}

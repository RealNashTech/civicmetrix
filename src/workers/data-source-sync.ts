import { DataSourceType } from "@prisma/client";

import { getSystemDb } from "@/lib/db/systemClient";
import { fetchGoogleSheetRows } from "@/lib/datasources/googleSheets";
import { hashRows } from "@/lib/datasources/hashRows";
import { fetchExcelRows } from "@/lib/datasources/microsoftExcel";
import { logger } from "@/lib/observability/logger";
import { eventProcessingQueue } from "@/lib/queue";
import { redis } from "@/lib/redis";
import { autoMapColumns } from "@/lib/uploads/autoMapColumns";
import { normalizeRow } from "@/lib/uploads/normalizeRows";
import { validateRows } from "@/lib/uploads/validateRows";

const DEFAULT_FILE_NAME_PREFIX = "datasource";

type DataSourceSyncJobPayload = {
  dataSourceId?: string;
};

function asColumnMapping(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key, target]) => key.trim().length > 0 && typeof target === "string" && target.trim().length > 0,
  );

  return Object.fromEntries(entries);
}

async function fetchSourceRows(source: {
  type: DataSourceType;
  externalId: string;
  range: string | null;
  sheetName: string | null;
}) {
  if (source.type === DataSourceType.GOOGLE_SHEETS) {
    const range = source.range ?? source.sheetName;
    if (!range) {
      throw new Error("Google Sheets data source requires either range or sheetName.");
    }
    return fetchGoogleSheetRows(source.externalId, range);
  }

  if (source.type === DataSourceType.MICROSOFT_EXCEL) {
    if (!source.sheetName) {
      throw new Error("Microsoft Excel data source requires sheetName.");
    }
    return fetchExcelRows(source.externalId, source.sheetName);
  }

  return [];
}

export async function runDataSourceSyncWorker(jobData?: DataSourceSyncJobPayload) {
  if (!eventProcessingQueue) {
    throw new Error("Event processing queue is not configured.");
  }
  if (!redis) {
    logger.warn("data_source_sync_skipped_lock");
    return;
  }

  const lockKey = "datasource-sync-lock";
  const acquired = await redis.set(lockKey, "1", "EX", 300, "NX");
  if (!acquired) {
    logger.warn("data_source_sync_skipped_lock");
    return;
  }

  try {
    const systemDb = getSystemDb();
    const requestedDataSourceId = jobData?.dataSourceId?.trim();
    const sources = await systemDb.dataSource.findMany({
      where: requestedDataSourceId
        ? {
            id: requestedDataSourceId,
          }
        : undefined,
      select: {
        id: true,
        organizationId: true,
        type: true,
        datasetType: true,
        name: true,
        externalId: true,
        sheetName: true,
        range: true,
        columnMapping: true,
        refreshMinutes: true,
        lastSyncAt: true,
        lastContentHash: true,
      },
    });

    const now = new Date();
    for (const source of sources) {
      try {
        if (
          !requestedDataSourceId &&
          source.lastSyncAt &&
          now.getTime() - source.lastSyncAt.getTime() <
            source.refreshMinutes * 60 * 1000
        ) {
          continue;
        }

        const datasetType = source.datasetType;
        const rawRows = await fetchSourceRows(source);
        if (!rawRows || rawRows.length === 0) {
          logger.warn("data_source_empty_dataset", {
            dataSourceId: source.id,
          });
          continue;
        }

        const firstRow = rawRows[0];
        if (!firstRow || typeof firstRow !== "object") {
          logger.warn("data_source_invalid_rows", {
            dataSourceId: source.id,
          });
          continue;
        }

        const contentHash = hashRows(rawRows);
        if (source.lastContentHash && source.lastContentHash === contentHash) {
          logger.info("data_source_sync_skipped_no_change", {
            dataSourceId: source.id,
          });
          continue;
        }

        const columns = Object.keys(firstRow);
        let mapping: Record<string, string>;
        const configuredMapping = asColumnMapping(source.columnMapping);
        if (Object.keys(configuredMapping).length > 0) {
          mapping = configuredMapping;
        } else {
          mapping = autoMapColumns(datasetType, columns);
        }

        if (Object.keys(mapping).length === 0) {
          logger.warn("data_source_mapping_missing", {
            dataSourceId: source.id,
            datasetType,
            columns,
          });
          continue;
        }

        const normalizedRows = rawRows.map((row) => normalizeRow(row, mapping));
        const validation = validateRows(datasetType, normalizedRows);
        if (validation.validRows.length === 0) {
          logger.error("data_source_sync_no_valid_rows", {
            dataSourceId: source.id,
            organizationId: source.organizationId,
            invalidRows: validation.invalidRows.length,
          });
          continue;
        }

        const importSession = await systemDb.importSession.create({
          data: {
            organizationId: source.organizationId,
            fileName: `${DEFAULT_FILE_NAME_PREFIX}:${source.name}`,
            entityType: datasetType,
            rowCount: validation.validRows.length,
            status: "PENDING",
          },
          select: { id: true },
        });

        await eventProcessingQueue.add("upload-import", {
          organizationId: source.organizationId,
          rows: validation.validRows,
          importSessionId: importSession.id,
          datasetType,
        });

        await systemDb.dataSource.update({
          where: { id: source.id },
          data: {
            lastSyncAt: new Date(),
            lastContentHash: contentHash,
          },
        });

        logger.info("data_source_sync_enqueued", {
          dataSourceId: source.id,
          organizationId: source.organizationId,
          importSessionId: importSession.id,
          rowCount: validation.validRows.length,
          invalidRows: validation.invalidRows.length,
        });
      } catch (error) {
        logger.error("data_source_sync_failed", {
          dataSourceId: source.id,
          organizationId: source.organizationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await redis.del(lockKey);
  }
}

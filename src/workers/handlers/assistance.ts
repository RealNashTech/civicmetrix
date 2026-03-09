import { logger } from "@/lib/observability/logger";

import { DatasetHandler } from "@/workers/handlers/types";

type AssistanceImportRow = {
  organization?: string;
  organizationName?: string;
  program?: string;
  programName?: string;
  category?: string;
  householdsServed?: number | string;
  reportDate?: string | Date;
  latitude?: number | string | null;
  longitude?: number | string | null;
  city?: string | null;
  zipcode?: string | null;
};

function asNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asDate(value: string | Date | undefined): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

export async function persistAssistanceRows(prisma: any, organizationId: string, rows: any[]) {
  const typedRows = rows as AssistanceImportRow[];
  let successCount = 0;
  let failureCount = 0;

  for (const row of typedRows) {
    try {
      await prisma.assistanceRecord.create({
        data: {
          organizationId,
          organizationName: String(row.organizationName ?? row.organization ?? "").trim(),
          programName: String(row.programName ?? row.program ?? "").trim(),
          category: String(row.category ?? "").trim(),
          householdsServed: asNumber(row.householdsServed) ?? 0,
          reportDate: asDate(row.reportDate),
          latitude: asNumber(row.latitude),
          longitude: asNumber(row.longitude),
          city: row.city?.trim() || null,
          zipcode: row.zipcode?.trim() || null,
        },
      });

      successCount += 1;
    } catch (error) {
      failureCount += 1;
      logger.error("upload_import_row_failed", {
        queueName: "event-processing",
        organizationId,
        datasetType: "AssistanceRecord",
        programName: row.programName ?? row.program ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { successCount, failureCount };
}

export const assistanceHandler: DatasetHandler = {
  async persist({ prisma, organizationId, rows }) {
    return persistAssistanceRows(prisma, organizationId, rows);
  },
};

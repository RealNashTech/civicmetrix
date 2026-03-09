import { logger } from "@/lib/observability/logger";

import { DatasetHandler } from "@/workers/handlers/types";

type GrantImportRow = {
  name?: string;
  program?: string;
  department?: string;
  amount?: number | string | null;
  awardAmount?: number | string | null;
  grantor?: string;
  status?: string;
  awardDate?: string | Date;
  startDate?: string | Date;
  endDate?: string | Date;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

function asNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asDate(value: string | Date | undefined): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

export async function persistGrantRows(prisma: any, organizationId: string, rows: any[]) {
  const typedRows = rows as GrantImportRow[];
  let successCount = 0;
  let failureCount = 0;

  for (const row of typedRows) {
    try {
      await prisma.grant.create({
        data: {
          organizationId,
          name: String(row.name ?? row.program ?? "Untitled Grant").trim() || "Untitled Grant",
          amount: asNumber(row.amount) ?? 0,
          awardAmount: asNumber(row.awardAmount),
          startDate: asDate(row.startDate),
          endDate: asDate(row.endDate),
          status: row.status ?? undefined,
          applicationDeadline: asDate(row.awardDate),
        },
      });

      successCount += 1;
    } catch (error) {
      failureCount += 1;
      logger.error("upload_import_row_failed", {
        queueName: "event-processing",
        organizationId,
        datasetType: "Grant",
        grantName: row.name ?? row.program ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { successCount, failureCount };
}

export const grantHandler: DatasetHandler = {
  async persist({ prisma, organizationId, rows }) {
    return persistGrantRows(prisma, organizationId, rows);
  },
};

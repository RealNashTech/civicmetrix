import { InsightSeverity, InsightType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type DbClient = ReturnType<typeof db>;

type CreateInsightInput = {
  organizationId: string;
  type: InsightType;
  title: string;
  description: string;
  sourceEntity?: string | null;
  sourceId?: string | null;
  severity?: InsightSeverity;
  metadata?: Prisma.InputJsonValue;
  duplicateWindowHours?: number;
};

function parseIncreasePercent(metadata: Prisma.InputJsonValue | undefined): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).increasePercent;
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return value;
}

function resolveSeverity(
  inputSeverity: InsightSeverity | undefined,
  metadata: Prisma.InputJsonValue | undefined,
) {
  if (inputSeverity) {
    return inputSeverity;
  }

  const increasePercent = parseIncreasePercent(metadata);
  if (increasePercent === null) {
    return InsightSeverity.INFO;
  }
  if (increasePercent >= 100) {
    return InsightSeverity.CRITICAL;
  }
  if (increasePercent > 50) {
    return InsightSeverity.WARNING;
  }
  return InsightSeverity.INFO;
}

export async function createInsight(input: CreateInsightInput, client: DbClient = db()) {
  const duplicateWindowHours = input.duplicateWindowHours ?? 24;
  const dedupeSince = new Date(Date.now() - duplicateWindowHours * 60 * 60 * 1000);
  const normalizedSeverity = resolveSeverity(input.severity, input.metadata);

  const existing = await client.insight.findFirst({
    where: {
      organizationId: input.organizationId,
      type: input.type,
      title: input.title,
      sourceEntity: input.sourceEntity ?? null,
      sourceId: input.sourceId ?? null,
      resolvedAt: null,
      createdAt: {
        gte: dedupeSince,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return existing;
  }

  return client.insight.create({
    data: {
      organizationId: input.organizationId,
      type: input.type,
      severity: normalizedSeverity,
      title: input.title,
      description: input.description,
      sourceEntity: input.sourceEntity ?? null,
      sourceId: input.sourceId ?? null,
      metadata: input.metadata,
    },
  });
}

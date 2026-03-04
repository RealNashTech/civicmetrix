import { InsightType, Prisma } from "@prisma/client";

import { createInsight } from "@/lib/insights/create-insight";
import { db } from "@/lib/db";

type CountByOrganization = {
  organizationId: string;
  count: number;
};

function getWindowStart(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function mapCounts(rows: Array<{ organizationId: string; _count: number }>): CountByOrganization[] {
  return rows.map((row) => ({
    organizationId: row.organizationId,
    count: row._count,
  }));
}

export async function runIssueAnomalyWorker() {
  const now = new Date();
  const lastWindowStart = getWindowStart(7);
  const previousWindowStart = getWindowStart(14);

  const [last7Raw, previous7Raw] = await Promise.all([
    db().issueReport.groupBy({
      by: ["organizationId"],
      where: {
        createdAt: {
          gte: lastWindowStart,
          lt: now,
        },
      },
      _count: {
        _all: true,
      },
    }),
    db().issueReport.groupBy({
      by: ["organizationId"],
      where: {
        createdAt: {
          gte: previousWindowStart,
          lt: lastWindowStart,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const last7 = mapCounts(last7Raw.map((row) => ({ organizationId: row.organizationId, _count: row._count._all })));
  const previousByOrganization = new Map(
    mapCounts(previous7Raw.map((row) => ({ organizationId: row.organizationId, _count: row._count._all }))).map(
      (row) => [row.organizationId, row.count],
    ),
  );

  for (const row of last7) {
    const previousCount = previousByOrganization.get(row.organizationId) ?? 0;
    if (previousCount <= 0) {
      continue;
    }

    const increasePercent = ((row.count - previousCount) / previousCount) * 100;
    if (increasePercent <= 50) {
      continue;
    }

    const metadata: Prisma.InputJsonValue = {
      previous7DayCount: previousCount,
      last7DayCount: row.count,
      increasePercent: Number(increasePercent.toFixed(2)),
      evaluatedAt: now.toISOString(),
    };

    await createInsight({
      organizationId: row.organizationId,
      type: InsightType.SERVICE_ANOMALY,
      title: "Service issue volume anomaly detected",
      description: `Issue volume increased by ${Math.round(increasePercent)}% in the last 7 days compared to the previous 7-day period.`,
      sourceEntity: "IssueReport",
      metadata,
    });
  }
}

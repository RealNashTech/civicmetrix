import { InsightSeverity, InsightType, Prisma } from "@prisma/client";

import { createInsight } from "@/lib/insights/create-insight";
import { dbSystem } from "@/lib/db";

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentChange(recentAverage: number, baselineAverage: number) {
  if (baselineAverage === 0) {
    return null;
  }
  return ((recentAverage - baselineAverage) / baselineAverage) * 100;
}

export async function runKpiTrendWorker() {
  const now = new Date();
  const last30Start = new Date(now);
  last30Start.setDate(last30Start.getDate() - 30);

  const last7Start = new Date(now);
  last7Start.setDate(last7Start.getDate() - 7);

  const kpis = await dbSystem().kPI.findMany({
    select: {
      id: true,
      name: true,
      organizationId: true,
      target: true,
    },
  });

  for (const kpi of kpis) {
    const existing = await dbSystem().insight.findFirst({
      where: {
        organizationId: kpi.organizationId,
        type: InsightType.KPI_TREND_ALERT,
        sourceEntity: "KPI",
        sourceId: kpi.id,
        resolvedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const history = await dbSystem().kPIHistory.findMany({
      where: {
        kpiId: kpi.id,
        recordedAt: {
          gte: last30Start,
          lt: now,
        },
      },
      select: {
        value: true,
        recordedAt: true,
      },
      orderBy: {
        recordedAt: "asc",
      },
    });

    const recentValues = history
      .filter((entry) => entry.recordedAt >= last7Start)
      .map((entry) => Number(entry.value));
    const baselineValues = history
      .filter((entry) => entry.recordedAt < last7Start)
      .map((entry) => Number(entry.value));

    const recentAverage = average(recentValues);
    const baselineAverage = average(baselineValues);

    if (recentAverage === null || baselineAverage === null) {
      continue;
    }

    let trendPercent = percentChange(recentAverage, baselineAverage);
    if (trendPercent === null) {
      const targetValue = kpi.target == null ? null : Number(kpi.target);
      if (targetValue === null || targetValue === 0) {
        continue;
      }
      trendPercent = ((recentAverage - targetValue) / targetValue) * 100;
    }

    const absoluteChange = Math.abs(trendPercent);
    if (absoluteChange < 25) {
      continue;
    }

    const severity =
      absoluteChange >= 50 ? InsightSeverity.CRITICAL : InsightSeverity.WARNING;

    const roundedPercent = Number(trendPercent.toFixed(2));
    const metadata: Prisma.InputJsonValue = {
      kpiId: kpi.id,
      baselineAverage: Number(baselineAverage.toFixed(2)),
      recentAverage: Number(recentAverage.toFixed(2)),
      percentChange: roundedPercent,
    };

    await createInsight({
      organizationId: kpi.organizationId,
      type: InsightType.KPI_TREND_ALERT,
      title: "KPI trend anomaly detected",
      description: `KPI ${kpi.name} changed ${roundedPercent}% compared to the previous 30-day baseline.`,
      severity,
      sourceEntity: "KPI",
      sourceId: kpi.id,
      metadata,
    }, dbSystem());
  }
}

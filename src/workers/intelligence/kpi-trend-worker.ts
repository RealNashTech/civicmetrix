import { InsightSeverity, InsightType, Prisma } from "@prisma/client";

import { createInsight } from "@/lib/insights/create-insight";
import { dbSystem } from "@/lib/db";
import { recordSystemMetric } from "@/lib/system-metrics";
import { tenantDb } from "@/lib/tenantDb";

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

async function runForOrganization(organizationId: string) {
  const now = new Date();
  const last30Start = new Date(now);
  last30Start.setDate(last30Start.getDate() - 30);

  const last7Start = new Date(now);
  last7Start.setDate(last7Start.getDate() - 7);

  await tenantDb(organizationId, async (tx) => {
    const kpis = await tx.kPI.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
        target: true,
      },
    });

    for (const kpi of kpis) {
      const existing = await tx.insight.findFirst({
        where: {
          organizationId,
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

      const history = await tx.kPIHistory.findMany({
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
        .filter((entry: { recordedAt: Date }) => entry.recordedAt >= last7Start)
        .map((entry: { value: unknown }) => Number(entry.value));
      const baselineValues = history
        .filter((entry: { recordedAt: Date }) => entry.recordedAt < last7Start)
        .map((entry: { value: unknown }) => Number(entry.value));

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
        organizationId,
        type: InsightType.KPI_TREND_ALERT,
        title: "KPI trend anomaly detected",
        description: `KPI ${kpi.name} changed ${roundedPercent}% compared to the previous 30-day baseline.`,
        severity,
        sourceEntity: "KPI",
        sourceId: kpi.id,
        metadata,
      }, tx);
    }
  });
}

export async function runKpiTrendWorker() {
  const organizations = await dbSystem().organization.findMany({
    select: { id: true },
  });

  for (const organization of organizations) {
    const startedAt = Date.now();
    try {
      await runForOrganization(organization.id);
      await recordSystemMetric(
        organization.id,
        "WORKER_RUNTIME:kpi-trend-worker",
        Date.now() - startedAt,
      );
    } catch {
      await recordSystemMetric(organization.id, "ERROR_RATE:kpi-trend-worker", 1, "CRITICAL");
      throw new Error(`KPI trend worker failed for organization ${organization.id}`);
    }
  }
}

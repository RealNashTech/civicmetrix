import { db } from "@/lib/db";

export type KpiTrendPoint = {
  date: string;
  value: number;
};

export type KpiTrendSummary = {
  direction: "UP" | "DOWN" | "FLAT";
  deltaPercent: number;
};

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function summarizeTrend(values: number[]): KpiTrendSummary {
  if (values.length < 2) {
    return { direction: "FLAT", deltaPercent: 0 };
  }

  const start = values[0];
  const end = values[values.length - 1];
  const delta = end - start;
  const baseline = Math.abs(start) > 0 ? Math.abs(start) : 1;
  const deltaPercent = Math.round((delta / baseline) * 100);

  if (deltaPercent > 2) {
    return { direction: "UP", deltaPercent };
  }
  if (deltaPercent < -2) {
    return { direction: "DOWN", deltaPercent };
  }
  return { direction: "FLAT", deltaPercent };
}

export async function getKpiHistoryPoints(kpiId: string, months: number): Promise<KpiTrendPoint[]> {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const history = await db().kPIHistory.findMany({
    where: {
      kpiId,
      recordedAt: {
        gte: from,
      },
    },
    orderBy: {
      recordedAt: "asc",
    },
    select: {
      value: true,
      recordedAt: true,
    },
  });

  return history.map((entry) => ({
    date: toMonthKey(entry.recordedAt),
    value: Number(entry.value),
  }));
}

export async function getOrganizationKpiTrendHealth(organizationId: string, months: number) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const kpis = await db().kPI.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  });

  if (kpis.length === 0) {
    return {
      score: 100,
      warning: false,
      downwardCount: 0,
      total: 0,
      rows: [],
    };
  }

  const history = await db().kPIHistory.findMany({
    where: {
      kpiId: { in: kpis.map((kpi) => kpi.id) },
      recordedAt: { gte: from },
    },
    orderBy: [{ kpiId: "asc" }, { recordedAt: "asc" }],
    select: {
      kpiId: true,
      value: true,
      recordedAt: true,
    },
  });

  const historyByKpi = new Map<string, number[]>();
  for (const entry of history) {
    const existing = historyByKpi.get(entry.kpiId) ?? [];
    existing.push(Number(entry.value));
    historyByKpi.set(entry.kpiId, existing);
  }

  const trendRows = kpis.map((kpi) => {
    const values = historyByKpi.get(kpi.id) ?? [];
    const summary = summarizeTrend(values);
    return {
      id: kpi.id,
      name: kpi.name,
      summary,
    };
  });

  const downward = trendRows.filter((row) => row.summary.direction === "DOWN");
  const score = Math.max(0, 100 - downward.length * 10);

  return {
    score,
    warning: downward.length > 0,
    downwardCount: downward.length,
    total: trendRows.length,
    rows: trendRows,
  };
}

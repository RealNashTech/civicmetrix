import { InsightType, Prisma } from "@prisma/client";

import { createInsight } from "@/lib/insights/create-insight";
import { dbSystem } from "@/lib/db";

type CategoryCountRow = {
  organizationId: string;
  category: string | null;
  count: number;
};

type CategoryLocationRow = {
  organizationId: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
};

const DAYS_IN_MONTH_WINDOW = 30;
const DAYS_IN_WEEK_WINDOW = 7;

function getWindowStart(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function formatCategory(category: string | null) {
  const normalized = (category ?? "").trim().toLowerCase();
  if (!normalized) {
    return "Uncategorized";
  }

  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatLocation(latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) {
    return "citywide";
  }

  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export async function runIssueAnomalyWorker() {
  const now = new Date();
  const last7Start = getWindowStart(DAYS_IN_WEEK_WINDOW);
  const last30Start = getWindowStart(DAYS_IN_MONTH_WINDOW);

  const [last7Raw, last30Raw, last7Locations] = await Promise.all([
    dbSystem().issueReport.groupBy({
      by: ["organizationId", "category"],
      where: {
        createdAt: {
          gte: last7Start,
          lt: now,
        },
      },
      _count: {
        _all: true,
      },
    }),
    dbSystem().issueReport.groupBy({
      by: ["organizationId", "category"],
      where: {
        createdAt: {
          gte: last30Start,
          lt: now,
        },
      },
      _count: {
        _all: true,
      },
    }),
    dbSystem().$queryRaw<CategoryLocationRow[]>(Prisma.sql`
      SELECT
        "organizationId",
        "category",
        AVG("latitude")::double precision AS "latitude",
        AVG("longitude")::double precision AS "longitude"
      FROM "IssueReport"
      WHERE "createdAt" >= ${last7Start}
        AND "createdAt" < ${now}
      GROUP BY "organizationId", "category"
    `),
  ]);

  const last7 = last7Raw.map<CategoryCountRow>((row) => ({
    organizationId: row.organizationId,
    category: row.category,
    count: row._count._all,
  }));

  const last30ByOrgCategory = new Map(
    last30Raw.map((row) => [
      `${row.organizationId}:${(row.category ?? "").toLowerCase()}`,
      row._count._all,
    ]),
  );

  const locationByOrgCategory = new Map(
    last7Locations.map((row) => [
      `${row.organizationId}:${(row.category ?? "").toLowerCase()}`,
      row,
    ]),
  );

  for (const row of last7) {
    const categoryKey = `${row.organizationId}:${(row.category ?? "").toLowerCase()}`;
    const last30Count = last30ByOrgCategory.get(categoryKey) ?? 0;
    if (last30Count <= 0) {
      continue;
    }

    const last30DaysAvgPer7Days = (last30Count * DAYS_IN_WEEK_WINDOW) / DAYS_IN_MONTH_WINDOW;
    if (last30DaysAvgPer7Days <= 0) {
      continue;
    }

    if (row.count <= last30DaysAvgPer7Days * 2) {
      continue;
    }

    const increasePercent = ((row.count - last30DaysAvgPer7Days) / last30DaysAvgPer7Days) * 100;
    const locationRow = locationByOrgCategory.get(categoryKey);
    const location = formatLocation(locationRow?.latitude ?? null, locationRow?.longitude ?? null);
    const categoryLabel = formatCategory(row.category);

    const metadata: Prisma.InputJsonValue = {
      category: row.category,
      location,
      locationCoordinates:
        locationRow?.latitude != null && locationRow?.longitude != null
          ? {
              latitude: Number(locationRow.latitude.toFixed(6)),
              longitude: Number(locationRow.longitude.toFixed(6)),
            }
          : null,
      last30DayCount: last30Count,
      last30DaysAveragePer7Days: Number(last30DaysAvgPer7Days.toFixed(2)),
      last7DayCount: row.count,
      increasePercent: Number(increasePercent.toFixed(2)),
      evaluatedAt: now.toISOString(),
    };

    await createInsight({
      organizationId: row.organizationId,
      type: InsightType.SERVICE_ANOMALY,
      title: `${categoryLabel} issue anomaly detected`,
      description: `${categoryLabel} reports increased ${Math.round(increasePercent)}% in the last week near ${location}.`,
      sourceEntity: "IssueReportCategory",
      sourceId: `${(row.category ?? "uncategorized").toLowerCase()}:${location}`,
      metadata,
    }, dbSystem());
  }
}

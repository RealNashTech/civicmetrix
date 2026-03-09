import { dbSystem } from "@/lib/db";
import { refreshDashboards } from "@/lib/dashboard/refreshDashboards";
import { analyzeInfrastructureRisk } from "@/lib/intelligence/analyzeInfrastructureRisk";
import { analyzeInfrastructureTrends } from "@/lib/intelligence/analyzeInfrastructureTrends";
import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";
import { generateQualityMetrics } from "@/lib/quality/generateQualityMetrics";
import { recordSystemMetric } from "@/lib/system-metrics";
import { tenantDb } from "@/lib/tenantDb";

const DEDUPE_WINDOW_HOURS = 24;
const ACTIVE_GRANT_STATUSES = ["AWARDED", "REPORTING"] as const;

type OperationalSeverity = "INFO" | "WARNING" | "CRITICAL";

function clusterKey(latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) {
    return "Unknown location";
  }
  const latCluster = Math.round(latitude * 100) / 100;
  const lonCluster = Math.round(longitude * 100) / 100;
  return `${latCluster.toFixed(2)}, ${lonCluster.toFixed(2)}`;
}

function resolveInfrastructureSeverity(assetCount: number): OperationalSeverity {
  if (assetCount >= 8) {
    return "CRITICAL";
  }
  if (assetCount >= 4) {
    return "WARNING";
  }
  return "INFO";
}

async function createOperationalInsight(
  tx: any,
  organizationId: string,
  type: string,
  title: string,
  description: string,
  severity: OperationalSeverity,
) {
  const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000);

  const existing = await tx.operationalInsight.findFirst({
    where: {
      organizationId,
      type,
      title,
      createdAt: {
        gte: dedupeSince,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await tx.operationalInsight.create({
    data: {
      organizationId,
      type,
      title,
      description,
      severity,
    },
  });
}

async function analyzeOrganization(organizationId: string) {
  await tenantDb(organizationId, async (tx) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const previous30Start = new Date(now);
    previous30Start.setDate(now.getDate() - 37);

    const previous30End = new Date(now);
    previous30End.setDate(now.getDate() - 7);

    const sixtyDaysOut = new Date(now);
    sixtyDaysOut.setDate(now.getDate() + 60);

    const [
      riskyAssets,
      recentIssueCounts,
      previousIssueCounts,
      candidateGrants,
      kpis,
    ] = await Promise.all([
      tx.asset.findMany({
        where: {
          organizationId,
          conditionScore: { lt: 40 },
        },
        select: {
          id: true,
          name: true,
          conditionScore: true,
          latitude: true,
          longitude: true,
          department: {
            select: {
              name: true,
            },
          },
        },
      }),
      tx.issueReport.groupBy({
        by: ["category"],
        where: {
          organizationId,
          createdAt: {
            gte: sevenDaysAgo,
            lte: now,
          },
        },
        _count: { _all: true },
      }),
      tx.issueReport.groupBy({
        by: ["category"],
        where: {
          organizationId,
          createdAt: {
            gte: previous30Start,
            lt: previous30End,
          },
        },
        _count: { _all: true },
      }),
      tx.grant.findMany({
        where: {
          organizationId,
          status: {
            in: [...ACTIVE_GRANT_STATUSES],
          },
          OR: [
            {
              applicationDeadline: {
                gte: now,
                lte: sixtyDaysOut,
              },
            },
            {
              nextReportDue: {
                gte: now,
                lte: sixtyDaysOut,
              },
            },
            {
              reportDueDate: {
                gte: now,
                lte: sixtyDaysOut,
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          status: true,
          reportingFrequency: true,
          complianceStatus: true,
          applicationDeadline: true,
          nextReportDue: true,
          reportDueDate: true,
          department: {
            select: {
              name: true,
            },
          },
        },
      }),
      tx.kPI.findMany({
        where: {
          organizationId,
          target: {
            not: null,
          },
        },
        select: {
          id: true,
          name: true,
          value: true,
          target: true,
          department: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const infrastructureGroups = new Map<
      string,
      {
        department: string;
        location: string;
        assets: Array<{ id: string; name: string; conditionScore: number | null }>;
      }
    >();

    for (const asset of riskyAssets as Array<{
      id: string;
      name: string;
      conditionScore: number | null;
      latitude: number | null;
      longitude: number | null;
      department: { name: string } | null;
    }>) {
      const departmentName = asset.department?.name ?? "Unassigned";
      const location = clusterKey(asset.latitude, asset.longitude);
      const key = `${departmentName}::${location}`;

      const existing = infrastructureGroups.get(key) ?? {
        department: departmentName,
        location,
        assets: [],
      };

      existing.assets.push({
        id: asset.id,
        name: asset.name,
        conditionScore: asset.conditionScore,
      });

      infrastructureGroups.set(key, existing);
    }

    for (const group of infrastructureGroups.values()) {
      const topAssets = group.assets.slice(0, 3).map((asset) => `${asset.name} (${asset.id})`).join(", ");
      await createOperationalInsight(
        tx,
        organizationId,
        "INFRASTRUCTURE_RISK",
        `Infrastructure risk cluster in ${group.department}`,
        `Department: ${group.department}; Location cluster: ${group.location}; Related: Asset ${topAssets}; Risky assets: ${group.assets.length}.`,
        resolveInfrastructureSeverity(group.assets.length),
      );
    }

    const previousCountByCategory = new Map<string, number>(
      (previousIssueCounts as Array<{ category: string; _count: { _all: number } }>).map((row) => [
        row.category,
        row._count._all,
      ]),
    );

    for (const row of recentIssueCounts as Array<{ category: string; _count: { _all: number } }>) {
      const previousCount = previousCountByCategory.get(row.category) ?? 0;
      const previous30DailyAverage = previousCount / 30;
      const previous7Expected = previous30DailyAverage * 7;

      if (previous7Expected <= 0) {
        continue;
      }

      if (row._count._all <= previous7Expected * 2) {
        continue;
      }

      const spikeRatio = row._count._all / previous7Expected;
      const severity: OperationalSeverity = spikeRatio >= 3 ? "CRITICAL" : "WARNING";

      await createOperationalInsight(
        tx,
        organizationId,
        "SERVICE_DEMAND_SPIKE",
        `Service demand spike in ${row.category}`,
        `Department: Unassigned; Related: Issue category ${row.category}; Last 7 days: ${row._count._all}; Previous 30-day expected weekly volume: ${previous7Expected.toFixed(1)}.`,
        severity,
      );
    }

    for (const grant of candidateGrants as Array<{
      id: string;
      name: string;
      status: string;
      reportingFrequency: string | null;
      complianceStatus: string | null;
      applicationDeadline: Date | null;
      nextReportDue: Date | null;
      reportDueDate: Date | null;
      department: { name: string } | null;
    }>) {
      const missingFields: string[] = [];
      if (!grant.reportingFrequency) {
        missingFields.push("reportingFrequency");
      }
      if (!grant.complianceStatus) {
        missingFields.push("complianceStatus");
      }
      if (!grant.nextReportDue) {
        missingFields.push("nextReportDue");
      }

      if (missingFields.length === 0) {
        continue;
      }

      const deadline = grant.nextReportDue ?? grant.reportDueDate ?? grant.applicationDeadline;
      const daysToDeadline = deadline
        ? Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      const severity: OperationalSeverity = daysToDeadline != null && daysToDeadline <= 14 ? "CRITICAL" : "WARNING";

      await createOperationalInsight(
        tx,
        organizationId,
        "GRANT_RISK",
        `Grant risk detected: ${grant.name}`,
        `Department: ${grant.department?.name ?? "Unassigned"}; Related: Grant ${grant.id}; Status: ${grant.status}; Missing fields: ${missingFields.join(", ")}; Deadline in days: ${daysToDeadline ?? "N/A"}.`,
        severity,
      );
    }

    for (const kpi of kpis as Array<{
      id: string;
      name: string;
      value: number;
      target: number | null;
      department: { name: string } | null;
    }>) {
      if (typeof kpi.target !== "number" || kpi.target === 0) {
        continue;
      }

      const threshold = kpi.target * 0.8;
      if (kpi.value >= threshold) {
        continue;
      }

      const shortfallPercent = ((kpi.target - kpi.value) / kpi.target) * 100;
      const severity: OperationalSeverity = shortfallPercent >= 35 ? "CRITICAL" : "WARNING";

      await createOperationalInsight(
        tx,
        organizationId,
        "KPI_PERFORMANCE_ALERT",
        `KPI underperformance: ${kpi.name}`,
        `Department: ${kpi.department?.name ?? "Unassigned"}; Related: KPI ${kpi.id}; Current: ${kpi.value}; Target: ${kpi.target}; Shortfall: ${shortfallPercent.toFixed(1)}%.`,
        severity,
      );
    }
  });
}

export async function runCivicIntelligenceWorker() {
  const organizations = await dbSystem().organization.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  logger.info("civic_intelligence_worker_started", {
    organizations: organizations.length,
  });

  for (const organization of organizations) {
    const startedAt = Date.now();
    try {
      await analyzeOrganization(organization.id);
      await recordSystemMetric(
        organization.id,
        "WORKER_RUNTIME:civic-intelligence-worker",
        Date.now() - startedAt,
      );
    } catch {
      await recordSystemMetric(organization.id, "ERROR_RATE:civic-intelligence-worker", 1, "CRITICAL");
      throw new Error(`Civic intelligence worker failed for organization ${organization.id}`);
    }
  }

  logger.info("civic_intelligence_worker_completed", {
    organizations: organizations.length,
  });
}

export type RefreshDashboardsJobPayload = {
  organizationId: string;
  datasetType?: string;
};

export async function runRefreshDashboardsWorker(payload: RefreshDashboardsJobPayload) {
  const { organizationId } = payload;
  if (!organizationId) {
    throw new Error("refresh-dashboards payload is missing organizationId");
  }

  const startedAt = Date.now();
  logger.info("refresh_dashboards_started", {
    organizationId,
    workerType: "civic-intelligence",
  });

  const refreshedMetrics = await refreshDashboards(organizationId);
  const latestImport = await prisma.importSession.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { entityType: true },
  });
  const datasetType = payload.datasetType ?? latestImport?.entityType ?? "InfrastructureAsset";
  const qualityMetric = await generateQualityMetrics(organizationId, datasetType);
  const riskSummary = await analyzeInfrastructureRisk(organizationId);
  const trendSummary = await analyzeInfrastructureTrends(organizationId);

  logger.info("refresh_dashboards_completed", {
    organizationId,
    workerType: "civic-intelligence",
    datasetType,
    runtime: Date.now() - startedAt,
    infrastructureMetrics: refreshedMetrics.infrastructureMetrics,
    grantMetrics: refreshedMetrics.grantMetrics,
    issueMetrics: refreshedMetrics.issueMetrics,
    qualityMetrics: {
      totalRecords: qualityMetric.totalRecords,
      missingFieldCount: qualityMetric.missingFieldCount,
      validationFailureCount: qualityMetric.validationFailureCount,
      qualityScore: qualityMetric.qualityScore,
      lastImportSessionId: qualityMetric.lastImportSessionId,
    },
    infrastructureRisk: riskSummary,
    infrastructureTrends: trendSummary,
  });
}

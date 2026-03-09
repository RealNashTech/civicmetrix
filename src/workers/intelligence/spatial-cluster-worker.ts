import { InsightSeverity, InsightType, Prisma } from "@prisma/client";

import { createInsight } from "@/lib/insights/create-insight";
import { dbSystem } from "@/lib/db";
import { recordSystemMetric } from "@/lib/system-metrics";
import { tenantDb } from "@/lib/tenantDb";

const RADIUS_METERS = 800;
const MIN_CLUSTER_SIZE = 8;
const DEDUPE_WINDOW_HOURS = 24;

type ClusterRow = {
  clusterId: number;
  clusterCount: number;
  centerLatitude: number;
  centerLongitude: number;
  potholeCount: number;
  streetlightCount: number;
  garbageCount: number;
  graffitiCount: number;
  sidewalkCount: number;
};

function resolveSeverity(clusterCount: number) {
  if (clusterCount >= 20) {
    return InsightSeverity.CRITICAL;
  }
  if (clusterCount >= 12) {
    return InsightSeverity.WARNING;
  }
  return InsightSeverity.INFO;
}

async function runForOrganization(organizationId: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  await tenantDb(organizationId, async (tx) => {
    const clusters = (await tx.$queryRaw(Prisma.sql`
      WITH recent_issues AS (
        SELECT
          "id",
          "latitude",
          "longitude",
          "category",
          ST_Transform(ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326), 3857) AS geom
        FROM "IssueReport"
        WHERE "organizationId" = ${organizationId}
          AND "createdAt" >= ${sevenDaysAgo}
          AND "latitude" IS NOT NULL
          AND "longitude" IS NOT NULL
      ),
      clustered AS (
        SELECT
          "category",
          "latitude",
          "longitude",
          ST_ClusterDBSCAN(geom, eps => ${RADIUS_METERS}, minpoints => ${MIN_CLUSTER_SIZE})
            OVER () AS cluster_id
        FROM recent_issues
      )
      SELECT
        cluster_id::int AS "clusterId",
        COUNT(*)::int AS "clusterCount",
        AVG("latitude")::double precision AS "centerLatitude",
        AVG("longitude")::double precision AS "centerLongitude",
        SUM(CASE WHEN LOWER(COALESCE("category", '')) = 'pothole' THEN 1 ELSE 0 END)::int AS "potholeCount",
        SUM(CASE WHEN LOWER(COALESCE("category", '')) = 'streetlight' THEN 1 ELSE 0 END)::int AS "streetlightCount",
        SUM(CASE WHEN LOWER(COALESCE("category", '')) IN ('garbage', 'trash') THEN 1 ELSE 0 END)::int AS "garbageCount",
        SUM(CASE WHEN LOWER(COALESCE("category", '')) = 'graffiti' THEN 1 ELSE 0 END)::int AS "graffitiCount",
        SUM(CASE WHEN LOWER(COALESCE("category", '')) = 'sidewalk' THEN 1 ELSE 0 END)::int AS "sidewalkCount"
      FROM clustered
      WHERE cluster_id IS NOT NULL
      GROUP BY cluster_id
      HAVING COUNT(*) >= ${MIN_CLUSTER_SIZE}
      ORDER BY "clusterCount" DESC
    `)) as ClusterRow[];

    const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000);
    const windowKey = sevenDaysAgo.toISOString().slice(0, 10);

    for (const cluster of clusters) {
      const existing = await tx.insight.findFirst({
        where: {
          organizationId,
          type: InsightType.SERVICE_CLUSTER,
          sourceEntity: "IssueReportCluster",
          resolvedAt: null,
          createdAt: {
            gte: dedupeSince,
          },
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      const sourceId = `cluster-${organizationId}-${cluster.clusterId}-${windowKey}`;
      const metadata: Prisma.InputJsonValue = {
        centerLatitude: Number(cluster.centerLatitude.toFixed(6)),
        centerLongitude: Number(cluster.centerLongitude.toFixed(6)),
        clusterCount: cluster.clusterCount,
        radiusMeters: RADIUS_METERS,
        total: cluster.clusterCount,
        categories: {
          pothole: cluster.potholeCount,
          streetlight: cluster.streetlightCount,
          garbage: cluster.garbageCount,
          graffiti: cluster.graffitiCount,
          sidewalk: cluster.sidewalkCount,
        },
      };

      await createInsight({
        organizationId,
        type: InsightType.SERVICE_CLUSTER,
        title: "Service issue cluster detected",
        description: `${cluster.clusterCount} service reports were submitted within 800m over the last 7 days.`,
        severity: resolveSeverity(cluster.clusterCount),
        sourceEntity: "IssueReportCluster",
        sourceId,
        metadata,
      }, tx);
    }
  });
}

export async function runSpatialClusterWorker() {
  const organizations = await dbSystem().organization.findMany({
    select: { id: true },
  });

  for (const organization of organizations) {
    const startedAt = Date.now();
    try {
      await runForOrganization(organization.id);
      await recordSystemMetric(
        organization.id,
        "WORKER_RUNTIME:spatial-cluster-worker",
        Date.now() - startedAt,
      );
    } catch {
      await recordSystemMetric(organization.id, "ERROR_RATE:spatial-cluster-worker", 1, "CRITICAL");
      throw new Error(`Spatial cluster worker failed for organization ${organization.id}`);
    }
  }
}

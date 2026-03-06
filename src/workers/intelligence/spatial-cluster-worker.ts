import { InsightSeverity, InsightType, Prisma } from "@prisma/client";

import { createInsight } from "@/lib/insights/create-insight";
import { dbSystem } from "@/lib/db";

const RADIUS_METERS = 800;
const MIN_CLUSTER_SIZE = 8;
const DEDUPE_WINDOW_HOURS = 24;

type ClusterRow = {
  organizationId: string;
  clusterId: number;
  clusterCount: number;
  centerLatitude: number;
  centerLongitude: number;
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

export async function runSpatialClusterWorker() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const clusters = await dbSystem().$queryRaw<ClusterRow[]>`
    WITH recent_issues AS (
      SELECT
        "id",
        "organizationId",
        "latitude",
        "longitude",
        "createdAt",
        "category",
        ST_Transform(ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326), 3857) AS geom
      FROM "IssueReport"
      WHERE "createdAt" >= ${sevenDaysAgo}
        AND "latitude" IS NOT NULL
        AND "longitude" IS NOT NULL
    ),
    clustered AS (
      SELECT
        "organizationId",
        "latitude",
        "longitude",
        ST_ClusterDBSCAN(geom, eps => ${RADIUS_METERS}, minpoints => ${MIN_CLUSTER_SIZE})
          OVER (PARTITION BY "organizationId") AS cluster_id
      FROM recent_issues
    )
    SELECT
      "organizationId",
      cluster_id::int AS "clusterId",
      COUNT(*)::int AS "clusterCount",
      AVG("latitude")::double precision AS "centerLatitude",
      AVG("longitude")::double precision AS "centerLongitude"
    FROM clustered
    WHERE cluster_id IS NOT NULL
    GROUP BY "organizationId", cluster_id
    HAVING COUNT(*) >= ${MIN_CLUSTER_SIZE}
    ORDER BY "organizationId", "clusterCount" DESC
  `;

  const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000);
  const windowKey = sevenDaysAgo.toISOString().slice(0, 10);

  for (const cluster of clusters) {
    const existing = await dbSystem().insight.findFirst({
      where: {
        organizationId: cluster.organizationId,
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

    const sourceId = `cluster-${cluster.organizationId}-${cluster.clusterId}-${windowKey}`;
    const metadata: Prisma.InputJsonValue = {
      centerLatitude: Number(cluster.centerLatitude.toFixed(6)),
      centerLongitude: Number(cluster.centerLongitude.toFixed(6)),
      clusterCount: cluster.clusterCount,
      radiusMeters: RADIUS_METERS,
    };

    await createInsight({
      organizationId: cluster.organizationId,
      type: InsightType.SERVICE_CLUSTER,
      title: "Service issue cluster detected",
      description: `${cluster.clusterCount} service reports were submitted within 800m over the last 7 days.`,
      severity: resolveSeverity(cluster.clusterCount),
      sourceEntity: "IssueReportCluster",
      sourceId,
      metadata,
    }, dbSystem());
  }
}

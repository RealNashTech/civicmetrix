import type { InfrastructureTrendDirection } from "@prisma/client";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";

function resolveTrendDirection(scoreChange: number): InfrastructureTrendDirection {
  if (scoreChange > 3) {
    return "IMPROVING";
  }

  if (scoreChange < -3) {
    return "DECLINING";
  }

  return "STABLE";
}

export async function analyzeInfrastructureTrends(organizationId: string) {
  const snapshots = await prisma.infrastructureAssetSnapshot.findMany({
    where: { organizationId },
    select: {
      assetId: true,
      conditionScore: true,
      recordedAt: true,
    },
    orderBy: [{ assetId: "asc" }, { recordedAt: "desc" }],
  });

  const perAsset = new Map<string, Array<{ conditionScore: number }>>();
  for (const snapshot of snapshots) {
    const entries = perAsset.get(snapshot.assetId) ?? [];
    if (entries.length < 2) {
      entries.push({ conditionScore: snapshot.conditionScore });
      perAsset.set(snapshot.assetId, entries);
    }
  }

  const trends = Array.from(perAsset.entries())
    .filter(([, scores]) => scores.length === 2)
    .map(([assetId, scores]) => {
      const latestScore = scores[0].conditionScore;
      const firstScore = scores[1].conditionScore;
      const scoreChange = latestScore - firstScore;

      return {
        organizationId,
        assetId,
        trendDirection: resolveTrendDirection(scoreChange),
        scoreChange,
        firstScore,
        latestScore,
      };
    });

  await prisma.$transaction(async (tx) => {
    await tx.infrastructureTrend.deleteMany({
      where: { organizationId },
    });

    if (trends.length > 0) {
      await tx.infrastructureTrend.createMany({
        data: trends,
      });
    }
  });

  const summary = trends.reduce(
    (acc, trend) => {
      if (trend.trendDirection === "DECLINING") {
        acc.decliningAssets += 1;
      } else if (trend.trendDirection === "IMPROVING") {
        acc.improvingAssets += 1;
      } else {
        acc.stableAssets += 1;
      }
      return acc;
    },
    {
      decliningAssets: 0,
      improvingAssets: 0,
      stableAssets: 0,
    },
  );

  logger.info("infrastructure_trend_analysis_completed", {
    organizationId,
    analyzedAssets: trends.length,
    ...summary,
  });

  return {
    analyzedAssets: trends.length,
    ...summary,
  };
}

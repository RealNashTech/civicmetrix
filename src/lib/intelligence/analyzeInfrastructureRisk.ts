import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { calculateRiskLevel } from "@/lib/intelligence/calculateRiskLevel";

export async function analyzeInfrastructureRisk(organizationId: string) {
  const snapshots = await prisma.infrastructureAssetSnapshot.findMany({
    where: { organizationId },
    select: {
      assetId: true,
      conditionScore: true,
      recordedAt: true,
    },
    orderBy: [{ assetId: "asc" }, { recordedAt: "desc" }],
  });

  const latestByAsset = new Map<string, { conditionScore: number }>();
  for (const snapshot of snapshots) {
    if (!latestByAsset.has(snapshot.assetId)) {
      latestByAsset.set(snapshot.assetId, {
        conditionScore: snapshot.conditionScore,
      });
    }
  }

  const risks = Array.from(latestByAsset.entries()).map(([assetId, latest]) => ({
    organizationId,
    assetId,
    conditionScore: latest.conditionScore,
    riskLevel: calculateRiskLevel(latest.conditionScore),
  }));

  await prisma.$transaction(async (tx) => {
    await tx.infrastructureRisk.deleteMany({
      where: { organizationId },
    });

    if (risks.length > 0) {
      await tx.infrastructureRisk.createMany({
        data: risks,
      });
    }
  });

  const summary = risks.reduce(
    (acc, risk) => {
      if (risk.riskLevel === "HIGH") {
        acc.highRiskAssets += 1;
      } else if (risk.riskLevel === "MEDIUM") {
        acc.mediumRiskAssets += 1;
      } else {
        acc.lowRiskAssets += 1;
      }
      return acc;
    },
    {
      highRiskAssets: 0,
      mediumRiskAssets: 0,
      lowRiskAssets: 0,
    },
  );

  logger.info("infrastructure_risk_analysis_completed", {
    organizationId,
    analyzedAssets: risks.length,
    ...summary,
  });

  return {
    analyzedAssets: risks.length,
    ...summary,
  };
}

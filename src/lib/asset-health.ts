import { db } from "@/lib/db";

export type AssetConditionResult = {
  assetId: string;
  conditionScore: number;
};

function yearsSince(date: Date | null): number {
  if (!date) {
    return 0;
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365)));
}

export function calculateAssetCondition(params: {
  assetId: string;
  openIssues: number;
  urgentIssues: number;
  assetAgeYears: number;
}): AssetConditionResult {
  const score =
    100 - params.openIssues * 5 - params.urgentIssues * 10 - params.assetAgeYears * 1;
  return {
    assetId: params.assetId,
    conditionScore: Math.max(0, Math.min(100, Math.round(score))),
  };
}

export async function getAssetConditionScores(organizationId: string): Promise<AssetConditionResult[]> {
  const assets = await db().asset.findMany({
    where: { organizationId },
    include: {
      issues: {
        select: {
          status: true,
          priority: true,
        },
      },
    },
  });

  return assets.map((asset) => {
    const openIssues = asset.issues.filter((issue) => issue.status !== "RESOLVED").length;
    const urgentIssues = asset.issues.filter(
      (issue) => issue.priority === "URGENT" && issue.status !== "RESOLVED",
    ).length;
    const assetAgeYears = yearsSince(asset.installDate);

    return calculateAssetCondition({
      assetId: asset.id,
      openIssues,
      urgentIssues,
      assetAgeYears,
    });
  });
}

export async function getInfrastructureHealth(organizationId: string) {
  const [assets, scores] = await Promise.all([
    db().asset.findMany({
      where: { organizationId },
      include: {
        issues: {
          select: {
            id: true,
            status: true,
            priority: true,
          },
        },
      },
    }),
    getAssetConditionScores(organizationId),
  ]);

  const scoreMap = new Map(scores.map((score) => [score.assetId, score.conditionScore]));
  const withScores = assets.map((asset) => ({
    ...asset,
    computedConditionScore: scoreMap.get(asset.id) ?? asset.conditionScore ?? 0,
  }));

  const below50 = withScores.filter((asset) => asset.computedConditionScore < 50).length;
  const totalAssets = withScores.length;
  const avgCondition =
    totalAssets > 0
      ? Math.round(
          withScores.reduce((sum, asset) => sum + asset.computedConditionScore, 0) / totalAssets,
        )
      : 0;

  const typeCounts = new Map<string, { count: number; low: number }>();
  for (const asset of withScores) {
    const existing = typeCounts.get(asset.type) ?? { count: 0, low: 0 };
    existing.count += 1;
    if (asset.computedConditionScore < 50) {
      existing.low += 1;
    }
    typeCounts.set(asset.type, existing);
  }

  const topFailingTypes = [...typeCounts.entries()]
    .map(([type, values]) => ({
      type,
      failing: values.low,
      total: values.count,
    }))
    .sort((a, b) => b.failing - a.failing)
    .slice(0, 5);

  return {
    totalAssets,
    assetsBelow50: below50,
    averageCondition: avgCondition,
    topFailingTypes,
    assets: withScores,
  };
}

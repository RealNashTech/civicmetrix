import { tenantDb } from "@/lib/tenantDb";

const INFRASTRUCTURE_RISK_THRESHOLD = 40;

export type InfrastructureMetrics = {
  averageConditionScore: number;
  assetCount: number;
  assetsBelowRiskThreshold: number;
};

export type GrantMetrics = {
  totalGrantFunding: number;
  fundingPerDepartment: Record<string, number>;
};

export type IssueMetrics = {
  openIssueCount: number;
  issuesByCategory: Record<string, number>;
};

export type DashboardRefreshResult = {
  infrastructureMetrics: InfrastructureMetrics;
  grantMetrics: GrantMetrics;
  issueMetrics: IssueMetrics;
};

export async function refreshDashboards(organizationId: string): Promise<DashboardRefreshResult> {
  return tenantDb(organizationId, async (tx) => {
    const [assets, grants, openIssueCount, issueCategoryCounts] = await Promise.all([
      tx.asset.findMany({
        where: { organizationId },
        select: {
          conditionScore: true,
        },
      }),
      tx.grant.findMany({
        where: { organizationId },
        select: {
          amount: true,
          department: {
            select: {
              name: true,
            },
          },
        },
      }),
      tx.issueReport.count({
        where: {
          organizationId,
          status: {
            in: ["OPEN", "IN_PROGRESS"],
          },
        },
      }),
      tx.issueReport.groupBy({
        by: ["category"],
        where: {
          organizationId,
          status: {
            in: ["OPEN", "IN_PROGRESS"],
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const assetCount = assets.length;
    const assetsBelowRiskThreshold = assets.filter((asset: { conditionScore: number | null }) => {
      return typeof asset.conditionScore === "number" && asset.conditionScore < INFRASTRUCTURE_RISK_THRESHOLD;
    }).length;
    const assetConditionTotal = assets.reduce((sum: number, asset: { conditionScore: number | null }) => {
      if (typeof asset.conditionScore !== "number") {
        return sum;
      }
      return sum + asset.conditionScore;
    }, 0);
    const assetsWithCondition = assets.reduce((count: number, asset: { conditionScore: number | null }) => {
      return typeof asset.conditionScore === "number" ? count + 1 : count;
    }, 0);

    const averageConditionScore =
      assetsWithCondition > 0 ? Math.round((assetConditionTotal / assetsWithCondition) * 100) / 100 : 0;

    const totalGrantFunding = Math.round(
      grants.reduce((sum: number, grant: { amount: unknown }) => sum + Number(grant.amount), 0) * 100,
    ) / 100;
    const fundingPerDepartment = grants.reduce(
      (
        acc: Record<string, number>,
        grant: {
          amount: unknown;
          department: { name: string } | null;
        },
      ) => {
        const departmentName = grant.department?.name ?? "Unassigned";
        const nextAmount = (acc[departmentName] ?? 0) + Number(grant.amount);
        acc[departmentName] = Math.round(nextAmount * 100) / 100;
        return acc;
      },
      {},
    );

    const issuesByCategory = issueCategoryCounts.reduce(
      (acc: Record<string, number>, row: { category: string; _count: { _all: number } }) => {
        acc[row.category] = row._count._all;
        return acc;
      },
      {},
    );

    return {
      infrastructureMetrics: {
        averageConditionScore,
        assetCount,
        assetsBelowRiskThreshold,
      },
      grantMetrics: {
        totalGrantFunding,
        fundingPerDepartment,
      },
      issueMetrics: {
        openIssueCount,
        issuesByCategory,
      },
    };
  });
}

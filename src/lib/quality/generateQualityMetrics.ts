import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { calculateQualityScore } from "@/lib/quality/calculateQualityScore";

type DatasetCounts = {
  totalRecords: number;
  missingFieldCount: number;
};

async function getInfrastructureAssetCounts(organizationId: string): Promise<DatasetCounts> {
  const assets = await prisma.infrastructureAsset.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      snapshots: {
        select: { id: true },
        take: 1,
      },
    },
  });

  const missingFieldCount = assets.reduce((count, asset) => {
    const missingName = asset.name.trim().length === 0;
    const missingConditionSnapshot = asset.snapshots.length === 0;
    return count + Number(missingName) + Number(missingConditionSnapshot);
  }, 0);

  return {
    totalRecords: assets.length,
    missingFieldCount,
  };
}

async function getGrantCounts(organizationId: string): Promise<DatasetCounts> {
  const grants = await prisma.grant.findMany({
    where: { organizationId },
    select: {
      name: true,
      amount: true,
      status: true,
    },
  });

  const missingFieldCount = grants.reduce((count, grant) => {
    const missingName = grant.name.trim().length === 0;
    const missingAmount = Number.isNaN(Number(grant.amount));
    const missingStatus = String(grant.status ?? "").trim().length === 0;
    return count + Number(missingName) + Number(missingAmount) + Number(missingStatus);
  }, 0);

  return {
    totalRecords: grants.length,
    missingFieldCount,
  };
}

async function getIssueCounts(organizationId: string): Promise<DatasetCounts> {
  const issues = await prisma.issueReport.findMany({
    where: { organizationId },
    select: {
      title: true,
      category: true,
      status: true,
    },
  });

  const missingFieldCount = issues.reduce((count, issue) => {
    const missingTitle = issue.title.trim().length === 0;
    const missingCategory = issue.category.trim().length === 0;
    const missingStatus = String(issue.status ?? "").trim().length === 0;
    return count + Number(missingTitle) + Number(missingCategory) + Number(missingStatus);
  }, 0);

  return {
    totalRecords: issues.length,
    missingFieldCount,
  };
}

async function getDatasetCounts(organizationId: string, datasetType: string): Promise<DatasetCounts> {
  if (datasetType === "InfrastructureAsset") {
    return getInfrastructureAssetCounts(organizationId);
  }

  if (datasetType === "Grant") {
    return getGrantCounts(organizationId);
  }

  if (datasetType === "CivicIssue") {
    return getIssueCounts(organizationId);
  }

  return {
    totalRecords: 0,
    missingFieldCount: 0,
  };
}

export async function generateQualityMetrics(organizationId: string, datasetType: string) {
  const [datasetCounts, failureAggregate, lastImportSession] = await Promise.all([
    getDatasetCounts(organizationId, datasetType),
    prisma.importSession.aggregate({
      where: {
        organizationId,
        entityType: datasetType,
      },
      _sum: {
        failureCount: true,
      },
    }),
    prisma.importSession.findFirst({
      where: {
        organizationId,
        entityType: datasetType,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    }),
  ]);

  const validationFailureCount = failureAggregate._sum.failureCount ?? 0;
  const qualityScore = calculateQualityScore({
    totalRecords: datasetCounts.totalRecords,
    missingFieldCount: datasetCounts.missingFieldCount,
    validationFailureCount,
  });

  const metric = await prisma.$transaction(async (tx) => {
    await tx.dataQualityMetric.deleteMany({
      where: {
        organizationId,
        datasetType,
      },
    });

    return tx.dataQualityMetric.create({
      data: {
        organizationId,
        datasetType,
        totalRecords: datasetCounts.totalRecords,
        missingFieldCount: datasetCounts.missingFieldCount,
        validationFailureCount,
        lastImportSessionId: lastImportSession?.id ?? null,
        qualityScore,
      },
      select: {
        id: true,
        organizationId: true,
        datasetType: true,
        totalRecords: true,
        missingFieldCount: true,
        validationFailureCount: true,
        lastImportSessionId: true,
        qualityScore: true,
        createdAt: true,
      },
    });
  });

  logger.info("data_quality_metric_generated", {
    organizationId,
    datasetType,
    totalRecords: metric.totalRecords,
    missingFieldCount: metric.missingFieldCount,
    validationFailureCount: metric.validationFailureCount,
    qualityScore: metric.qualityScore,
    lastImportSessionId: metric.lastImportSessionId,
  });

  return metric;
}

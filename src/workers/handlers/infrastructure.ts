import { logger } from "@/lib/observability/logger";

import { DatasetHandler } from "@/workers/handlers/types";

const IMPORT_BATCH_SIZE = 100;

type UploadImportRow = {
  assetName: string;
  department?: string;
  conditionScore: number;
};

type InfrastructureAssetRecord = {
  id: string;
};

type PrismaWithInfrastructureRegistry = {
  infrastructureAsset: {
    findFirst: (args: {
      where: {
        organizationId: string;
        name: string;
      };
    }) => Promise<InfrastructureAssetRecord | null>;
    create: (args: {
      data: {
        organizationId: string;
        name: string;
        department?: string;
      };
    }) => Promise<InfrastructureAssetRecord>;
  };
  infrastructureAssetSnapshot: {
    create: (args: {
      data: {
        assetId: string;
        organizationId: string;
        conditionScore: number;
        source: string;
      };
    }) => Promise<unknown>;
  };
};

export const infrastructureHandler: DatasetHandler = {
  async persist({ prisma, organizationId, rows }) {
    const prismaClient = prisma as PrismaWithInfrastructureRegistry;
    const typedRows = rows as UploadImportRow[];
    const queueName = "event-processing";
    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;

    for (let index = 0; index < typedRows.length; index += IMPORT_BATCH_SIZE) {
      const batch = typedRows.slice(index, index + IMPORT_BATCH_SIZE);

      for (const row of batch) {
        try {
          const existingAsset = await prismaClient.infrastructureAsset.findFirst({
            where: {
              organizationId,
              name: row.assetName,
            },
          });

          if (existingAsset) {
            await prismaClient.infrastructureAssetSnapshot.create({
              data: {
                assetId: existingAsset.id,
                organizationId,
                conditionScore: row.conditionScore,
                source: "upload_import",
              },
            });

            logger.info("asset_registry_resolved", {
              organizationId,
              assetName: row.assetName,
              createdNewAsset: false,
            });
            successCount += 1;
            continue;
          }

          const newAsset = await prismaClient.infrastructureAsset.create({
            data: {
              organizationId,
              name: row.assetName,
              department: row.department,
            },
          });

          await prismaClient.infrastructureAssetSnapshot.create({
            data: {
              assetId: newAsset.id,
              organizationId,
              conditionScore: row.conditionScore,
              source: "upload_import",
            },
          });

          logger.info("asset_registry_resolved", {
            organizationId,
            assetName: row.assetName,
            createdNewAsset: true,
          });
          successCount += 1;
        } catch (error) {
          failureCount += 1;
          logger.error("upload_import_row_failed", {
            queueName,
            organizationId,
            assetName: row.assetName,
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          processedCount += 1;
        }
      }

      logger.info("upload_import_batch_processed", {
        queueName,
        organizationId,
        processedCount,
      });
    }

    return { successCount, failureCount };
  },
};

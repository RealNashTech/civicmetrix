import { apiError } from "@/lib/api/error-response";
import prisma from "@/lib/prisma";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

async function handleGet() {
  try {
    const user = await requireStaffUser("VIEWER");

    const trends = await prisma.infrastructureTrend.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        assetId: true,
        trendDirection: true,
        scoreChange: true,
        firstScore: true,
        latestScore: true,
        createdAt: true,
        asset: {
          select: {
            name: true,
            department: true,
          },
        },
      },
      orderBy: [{ trendDirection: "asc" }, { scoreChange: "asc" }],
    });

    const grouped = {
      decliningAssets: trends.filter((trend) => trend.trendDirection === "DECLINING"),
      improvingAssets: trends.filter((trend) => trend.trendDirection === "IMPROVING"),
      stableAssets: trends.filter((trend) => trend.trendDirection === "STABLE"),
    };

    return Response.json({
      success: true,
      decliningAssets: grouped.decliningAssets.length,
      improvingAssets: grouped.improvingAssets.length,
      stableAssets: grouped.stableAssets.length,
      assetsByTrendDirection: grouped,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }

    return apiError("Failed to fetch infrastructure trend metrics.", 500);
  }
}

export const GET = withApiObservability("/api/intelligence/infrastructure-trends", "GET", handleGet);

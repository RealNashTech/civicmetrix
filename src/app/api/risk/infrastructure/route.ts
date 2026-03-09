import { apiError } from "@/lib/api/error-response";
import prisma from "@/lib/prisma";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

async function handleGet() {
  try {
    const user = await requireStaffUser("VIEWER");

    const risks = await prisma.infrastructureRisk.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        assetId: true,
        conditionScore: true,
        riskLevel: true,
        createdAt: true,
        asset: {
          select: {
            name: true,
            department: true,
          },
        },
      },
      orderBy: [{ riskLevel: "asc" }, { conditionScore: "asc" }],
    });

    const grouped = {
      highRiskAssets: risks.filter((risk) => risk.riskLevel === "HIGH"),
      mediumRiskAssets: risks.filter((risk) => risk.riskLevel === "MEDIUM"),
      lowRiskAssets: risks.filter((risk) => risk.riskLevel === "LOW"),
    };

    return Response.json({
      success: true,
      highRiskAssets: grouped.highRiskAssets.length,
      mediumRiskAssets: grouped.mediumRiskAssets.length,
      lowRiskAssets: grouped.lowRiskAssets.length,
      assetsByRiskLevel: grouped,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }

    return apiError("Failed to fetch infrastructure risk metrics.", 500);
  }
}

export const GET = withApiObservability("/api/risk/infrastructure", "GET", handleGet);

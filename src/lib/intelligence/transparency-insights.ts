import { dbSystem } from "@/lib/db";
import type { TransparencyScore } from "@/lib/transparency/transparency-score";

const SCORE_METRIC_TYPE = "TRANSPARENCY_SCORE";
const INFRA_METRIC_TYPE = "TRANSPARENCY_INFRASTRUCTURE_COMPLETENESS";

export async function getTransparencyInsights(
  organizationId: string,
  transparency: TransparencyScore,
): Promise<string[]> {
  const insights: string[] = [];

  const [previousScoreMetric, previousInfrastructureMetric] = await Promise.all([
    dbSystem().systemMetric.findFirst({
      where: {
        organizationId,
        metricType: SCORE_METRIC_TYPE,
      },
      orderBy: { createdAt: "desc" },
      select: { value: true },
    }),
    dbSystem().systemMetric.findFirst({
      where: {
        organizationId,
        metricType: INFRA_METRIC_TYPE,
      },
      orderBy: { createdAt: "desc" },
      select: { value: true },
    }),
  ]);

  if (
    previousInfrastructureMetric &&
    transparency.infrastructureReportingCompleteness < previousInfrastructureMetric.value - 5
  ) {
    insights.push("City infrastructure reporting completeness dropped this month.");
  }

  if (previousScoreMetric && transparency.score < previousScoreMetric.value - 5) {
    insights.push("Overall transparency score declined versus the previous reporting cycle.");
  }

  if (transparency.missingDataAreas.length > 0) {
    insights.push(
      `Missing public datasets: ${transparency.missingDataAreas.slice(0, 3).join(", ")}.`,
    );
  }

  if (transparency.departmentReportingCoverage < 70) {
    insights.push("Department reporting coverage is below the target threshold.");
  }

  if (transparency.kpiAvailability < 70) {
    insights.push("Public KPI publication is too limited to support strong civic accountability.");
  }

  if (transparency.grantReportingCompleteness < 70) {
    insights.push("Grant disclosure coverage is incomplete for public-facing reporting.");
  }

  if (insights.length === 0) {
    insights.push("Transparency reporting coverage is stable across the public reporting domains.");
  }

  return insights;
}

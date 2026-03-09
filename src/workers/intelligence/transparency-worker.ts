import { dbSystem } from "@/lib/db";
import { getTransparencyInsights } from "@/lib/intelligence/transparency-insights";
import { recordSystemMetric } from "@/lib/system-metrics";
import { calculateTransparencyScore } from "@/lib/transparency/transparency-engine";
import { tenantDb } from "@/lib/tenantDb";

type OperationalSeverity = "INFO" | "WARNING" | "CRITICAL";

const DEDUPE_WINDOW_HOURS = 24;

function resolveSeverity(score: number): OperationalSeverity {
  if (score < 55) {
    return "CRITICAL";
  }
  if (score < 75) {
    return "WARNING";
  }
  return "INFO";
}

async function createOperationalInsight(
  tx: any,
  organizationId: string,
  type: string,
  title: string,
  description: string,
  severity: OperationalSeverity,
) {
  const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000);

  const existing = await tx.operationalInsight.findFirst({
    where: {
      organizationId,
      type,
      title,
      createdAt: {
        gte: dedupeSince,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await tx.operationalInsight.create({
    data: {
      organizationId,
      type,
      title,
      description,
      severity,
    },
  });
}

async function runForOrganization(organizationId: string) {
  const transparency = await calculateTransparencyScore(organizationId);
  const insights = await getTransparencyInsights(organizationId, transparency);
  const severity = resolveSeverity(transparency.score);

  await Promise.all([
    recordSystemMetric(organizationId, "TRANSPARENCY_SCORE", transparency.score, severity),
    recordSystemMetric(
      organizationId,
      "TRANSPARENCY_REPORTING_COMPLETENESS",
      transparency.reportingCompleteness,
      severity,
    ),
    recordSystemMetric(
      organizationId,
      "TRANSPARENCY_DATA_AVAILABILITY",
      transparency.dataAvailability,
      severity,
    ),
    recordSystemMetric(
      organizationId,
      "TRANSPARENCY_INFRASTRUCTURE_COMPLETENESS",
      transparency.infrastructureReportingCompleteness,
      severity,
    ),
    recordSystemMetric(
      organizationId,
      "TRANSPARENCY_GRANT_COMPLETENESS",
      transparency.grantReportingCompleteness,
      severity,
    ),
    recordSystemMetric(
      organizationId,
      "TRANSPARENCY_KPI_AVAILABILITY",
      transparency.kpiAvailability,
      severity,
    ),
  ]);

  await tenantDb(organizationId, async (tx) => {
    await createOperationalInsight(
      tx,
      organizationId,
      "TRANSPARENCY_SCORE",
      "Daily transparency score updated",
      `Transparency score ${transparency.score} (${transparency.grade}). Related: Transparency Score; Missing: ${
        transparency.missingDataAreas.join(", ") || "None"
      }.`,
      severity,
    );

    for (const insight of insights.slice(0, 3)) {
      await createOperationalInsight(
        tx,
        organizationId,
        "TRANSPARENCY_GAP",
        "Transparency reporting insight",
        `${insight} Related: Public Transparency Reporting.`,
        severity,
      );
    }
  });
}

export async function runTransparencyWorker() {
  const organizations = await dbSystem().organization.findMany({
    select: { id: true },
  });

  for (const organization of organizations) {
    await runForOrganization(organization.id);
  }
}

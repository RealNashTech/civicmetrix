import { dbSystem } from "@/lib/db";
import { tenantDb } from "@/lib/tenantDb";

export type PlatformMetricType =
  | "API_RESPONSE_TIME"
  | "WORKER_RUNTIME"
  | "QUEUE_DEPTH"
  | "ERROR_RATE";

export async function recordSystemMetric(
  organizationId: string,
  metricType: string,
  value: number,
  severity: "INFO" | "WARNING" | "CRITICAL" = "INFO",
) {
  if (!organizationId || !Number.isFinite(value)) {
    return;
  }

  await tenantDb(organizationId, async (tx) => {
    await tx.systemMetric.create({
      data: {
        organizationId,
        metricType,
        severity,
        value,
      },
    });
  });
}

export async function recordMetricForAllOrganizations(
  metricType: string,
  value: number,
  severity: "INFO" | "WARNING" | "CRITICAL" = "INFO",
) {
  if (!Number.isFinite(value)) {
    return;
  }

  const organizations = await dbSystem().organization.findMany({
    select: { id: true },
  });

  for (const org of organizations) {
    await recordSystemMetric(org.id, metricType, value, severity);
  }
}

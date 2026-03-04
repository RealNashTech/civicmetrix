import { AlertSeverity, KPIStatus } from "@prisma/client";

import { createAuditLog } from "@/lib/audit";
import { notifyOrganizationEditors } from "@/lib/notifications";
import { db } from "@/lib/db";

type CheckKpiAlertsInput = {
  kpi: {
    id: string;
    name: string;
    value: number;
    target: number | null;
    status: KPIStatus;
    organizationId: string;
    departmentId: string | null;
    programId: string | null;
  };
  userId: string;
};

export async function checkKpiAlerts({ kpi, userId }: CheckKpiAlertsInput) {
  if (kpi.status === KPIStatus.ON_TRACK) {
    const kpiMarker = `KPI_ID:${kpi.id}`;
    const openAlerts = await db().alert.findMany({
      where: {
        organizationId: kpi.organizationId,
        departmentId: kpi.departmentId,
        programId: kpi.programId,
        resolvedAt: null,
        message: {
          contains: kpiMarker,
        },
      },
      select: { id: true },
    });

    if (openAlerts.length === 0) {
      return;
    }

    await db().alert.updateMany({
      where: {
        id: {
          in: openAlerts.map((alert) => alert.id),
        },
      },
      data: {
        resolvedAt: new Date(),
      },
    });

    await Promise.all(
      openAlerts.map((alert) =>
        createAuditLog({
          action: "ALERT_RESOLVE",
          entityType: "Alert",
          entityId: alert.id,
          userId,
          organizationId: kpi.organizationId,
        }),
      ),
    );

    return;
  }

  const severity =
    kpi.status === KPIStatus.OFF_TRACK ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
  const title =
    kpi.status === KPIStatus.OFF_TRACK
      ? `KPI ${kpi.name} is off track`
      : `KPI ${kpi.name} is at risk`;
  const targetText = kpi.target == null ? "N/A" : `${kpi.target}`;
  const kpiMarker = `KPI_ID:${kpi.id}`;
  const message = `${kpiMarker} | Current value ${kpi.value} vs target ${targetText}`;

  const existing = await db().alert.findFirst({
    where: {
      organizationId: kpi.organizationId,
      departmentId: kpi.departmentId,
      programId: kpi.programId,
      title,
      message,
      resolvedAt: null,
    },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  const createdAlert = await db().alert.create({
    data: {
      organizationId: kpi.organizationId,
      departmentId: kpi.departmentId,
      programId: kpi.programId,
      title,
      message,
      severity,
    },
    select: { id: true },
  });

  await createAuditLog({
    action: "ALERT_CREATE",
    entityType: "Alert",
    entityId: createdAlert.id,
    userId,
    organizationId: kpi.organizationId,
  });

  if (kpi.status === KPIStatus.OFF_TRACK) {
    await notifyOrganizationEditors(
      kpi.organizationId,
      `KPI off track: ${kpi.name}`,
      "/dashboard/alerts",
    );
  }
}

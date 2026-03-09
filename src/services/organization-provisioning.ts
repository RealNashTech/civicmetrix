import { tenantDb } from "@/lib/tenantDb";
import { RBAC_ROLES } from "@/lib/permissions";

const DEFAULT_DEPARTMENTS = [
  "Public Works",
  "Housing",
  "Community Development",
  "Parks & Recreation",
  "Administration",
] as const;

const BASELINE_KPIS = [
  {
    name: "Average Service Response Time",
    unit: "hours",
    periodLabel: "30d",
    value: 24,
    target: 12,
    status: "AT_RISK" as const,
    departmentName: "Public Works",
  },
  {
    name: "Infrastructure Condition Index",
    unit: "score",
    periodLabel: "monthly",
    value: 72,
    target: 80,
    status: "AT_RISK" as const,
    departmentName: "Public Works",
  },
  {
    name: "Open Civic Issues",
    unit: "count",
    periodLabel: "current",
    value: 0,
    target: 0,
    status: "ON_TRACK" as const,
    departmentName: "Administration",
  },
  {
    name: "Grant Utilization Rate",
    unit: "percent",
    periodLabel: "quarterly",
    value: 0,
    target: 85,
    status: "AT_RISK" as const,
    departmentName: "Community Development",
  },
  {
    name: "Citizen Satisfaction",
    unit: "percent",
    periodLabel: "quarterly",
    value: 70,
    target: 85,
    status: "AT_RISK" as const,
    departmentName: "Administration",
  },
] as const;

const DEFAULT_DASHBOARD_TITLE = "City Operations Baseline Dashboard";

type ProvisionEventType =
  | "ORG_PROVISION_STARTED"
  | "ORG_PROVISION_COMPLETED"
  | "ORG_PROVISION_FAILED";

async function logProvisionEvent(
  organizationId: string,
  type: ProvisionEventType,
  adminUserId: string,
  payload?: Record<string, unknown>,
) {
  await tenantDb(organizationId, async (tx) => {
    await tx.event.create({
      data: {
        organizationId,
        type,
        entityType: "ORGANIZATION",
        entityId: organizationId,
        processed: false,
        payload: {
          adminUserId,
          ...payload,
        },
      },
    });
  });
}

export async function provisionOrganization(
  organizationId: string,
  adminUserId: string,
) {
  await logProvisionEvent(organizationId, "ORG_PROVISION_STARTED", adminUserId);

  try {
    await tenantDb(organizationId, async (tx) => {
      await tx.role.createMany({
        data: RBAC_ROLES.map((name) => ({
          organizationId,
          name,
        })),
        skipDuplicates: true,
      });

      const systemAdminRole = await tx.role.findFirst({
        where: {
          organizationId,
          name: "SYSTEM_ADMIN",
        },
        select: { id: true },
      });

      if (systemAdminRole) {
        await tx.user.updateMany({
          where: {
            id: adminUserId,
            organizationId,
          },
          data: {
            roleId: systemAdminRole.id,
            legacyRole: "ADMIN",
          },
        });
      }

      const departments = new Map<string, string>();
      for (const name of DEFAULT_DEPARTMENTS) {
        const existing = await tx.department.findFirst({
          where: {
            organizationId,
            name,
          },
          select: { id: true },
        });

        if (existing) {
          departments.set(name, existing.id);
          continue;
        }

        const created = await tx.department.create({
          data: {
            organizationId,
            name,
          },
          select: { id: true },
        });
        departments.set(name, created.id);
      }

      let dashboard = await tx.dashboard.findFirst({
        where: {
          organizationId,
          title: DEFAULT_DASHBOARD_TITLE,
        },
        select: { id: true },
      });

      if (!dashboard) {
        dashboard = await tx.dashboard.create({
          data: {
            organizationId,
            title: DEFAULT_DASHBOARD_TITLE,
            description: "Baseline operational metrics for tenant initialization.",
          },
          select: { id: true },
        });
      }

      for (const kpi of BASELINE_KPIS) {
        const existing = await tx.kPI.findFirst({
          where: {
            organizationId,
            name: kpi.name,
          },
          select: {
            id: true,
            departmentId: true,
            dashboardId: true,
          },
        });

        const departmentId = departments.get(kpi.departmentName) ?? null;

        if (!existing) {
          await tx.kPI.create({
            data: {
              organizationId,
              dashboardId: dashboard.id,
              departmentId,
              name: kpi.name,
              value: kpi.value,
              unit: kpi.unit,
              periodLabel: kpi.periodLabel,
              target: kpi.target,
              status: kpi.status,
            },
          });
          continue;
        }

        // Preserve existing values on rerun; only backfill baseline relations.
        if (!existing.departmentId || !existing.dashboardId) {
          await tx.kPI.update({
            where: { id: existing.id },
            data: {
              departmentId: existing.departmentId ?? departmentId,
              dashboardId: existing.dashboardId ?? dashboard.id,
            },
          });
        }
      }
    });

    await logProvisionEvent(organizationId, "ORG_PROVISION_COMPLETED", adminUserId, {
      departmentsSeeded: DEFAULT_DEPARTMENTS.length,
      baselineKpisSeeded: BASELINE_KPIS.length,
      rolesSeeded: RBAC_ROLES.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
      await logProvisionEvent(organizationId, "ORG_PROVISION_FAILED", adminUserId, {
        error: message,
      });
    } catch {
      // Best-effort failure logging only.
    }

    throw error;
  }
}

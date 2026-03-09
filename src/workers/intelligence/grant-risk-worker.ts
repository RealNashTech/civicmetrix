import { InsightSeverity, InsightType, Prisma } from "@prisma/client";

import { createInsight } from "@/lib/insights/create-insight";
import { dbSystem } from "@/lib/db";
import { recordSystemMetric } from "@/lib/system-metrics";
import { tenantDb } from "@/lib/tenantDb";

async function runForOrganization(organizationId: string) {
  const now = new Date();

  await tenantDb(organizationId, async (tx) => {
    const [overdueGrants, overdueMilestones] = await Promise.all([
      tx.grant.findMany({
        where: {
          organizationId,
          nextReportDue: {
            lt: now,
          },
        },
        select: {
          id: true,
          name: true,
          nextReportDue: true,
        },
      }),
      tx.grantMilestone.findMany({
        where: {
          completed: false,
          dueDate: {
            lt: now,
          },
          grant: {
            organizationId,
          },
        },
        select: {
          id: true,
          name: true,
          dueDate: true,
          grant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    for (const grant of overdueGrants) {
      const existing = await tx.insight.findFirst({
        where: {
          organizationId,
          type: InsightType.GRANT_RISK,
          sourceEntity: "Grant",
          sourceId: grant.id,
          resolvedAt: null,
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      const metadata: Prisma.InputJsonValue = {
        grantId: grant.id,
        nextReportDue: grant.nextReportDue?.toISOString() ?? null,
      };

      await createInsight({
        organizationId,
        type: InsightType.GRANT_RISK,
        title: "Grant compliance deadline missed",
        description: `Grant ${grant.name} is overdue for compliance reporting.`,
        severity: InsightSeverity.CRITICAL,
        sourceEntity: "Grant",
        sourceId: grant.id,
        metadata,
      }, tx);
    }

    for (const milestone of overdueMilestones) {
      const existing = await tx.insight.findFirst({
        where: {
          organizationId,
          type: InsightType.GRANT_RISK,
          sourceEntity: "GrantMilestone",
          sourceId: milestone.id,
          resolvedAt: null,
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      const metadata: Prisma.InputJsonValue = {
        milestoneId: milestone.id,
        milestoneDueDate: milestone.dueDate.toISOString(),
        grantId: milestone.grant.id,
      };

      await createInsight({
        organizationId,
        type: InsightType.GRANT_RISK,
        title: "Grant milestone overdue",
        description: `Milestone ${milestone.name} for grant ${milestone.grant.name} is overdue.`,
        severity: InsightSeverity.WARNING,
        sourceEntity: "GrantMilestone",
        sourceId: milestone.id,
        metadata,
      }, tx);
    }
  });
}

export async function runGrantRiskWorker() {
  const organizations = await dbSystem().organization.findMany({
    select: { id: true },
  });

  for (const organization of organizations) {
    const startedAt = Date.now();
    try {
      await runForOrganization(organization.id);
      await recordSystemMetric(
        organization.id,
        "WORKER_RUNTIME:grant-risk-worker",
        Date.now() - startedAt,
      );
    } catch {
      await recordSystemMetric(organization.id, "ERROR_RATE:grant-risk-worker", 1, "CRITICAL");
      throw new Error(`Grant risk worker failed for organization ${organization.id}`);
    }
  }
}

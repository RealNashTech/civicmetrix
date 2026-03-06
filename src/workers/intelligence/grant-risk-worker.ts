import { InsightSeverity, InsightType, Prisma } from "@prisma/client";

import { createInsight } from "@/lib/insights/create-insight";
import { dbSystem } from "@/lib/db";

export async function runGrantRiskWorker() {
  const now = new Date();

  const [overdueGrants, overdueMilestones] = await Promise.all([
    dbSystem().grant.findMany({
      where: {
        nextReportDue: {
          lt: now,
        },
      },
      select: {
        id: true,
        name: true,
        organizationId: true,
        nextReportDue: true,
      },
    }),
    dbSystem().grantMilestone.findMany({
      where: {
        completed: false,
        dueDate: {
          lt: now,
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
            organizationId: true,
          },
        },
      },
    }),
  ]);

  for (const grant of overdueGrants) {
    const existing = await dbSystem().insight.findFirst({
      where: {
        organizationId: grant.organizationId,
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
      organizationId: grant.organizationId,
      type: InsightType.GRANT_RISK,
      title: "Grant compliance deadline missed",
      description: `Grant ${grant.name} is overdue for compliance reporting.`,
      severity: InsightSeverity.CRITICAL,
      sourceEntity: "Grant",
      sourceId: grant.id,
      metadata,
    }, dbSystem());
  }

  for (const milestone of overdueMilestones) {
    const existing = await dbSystem().insight.findFirst({
      where: {
        organizationId: milestone.grant.organizationId,
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
      organizationId: milestone.grant.organizationId,
      type: InsightType.GRANT_RISK,
      title: "Grant milestone overdue",
      description: `Milestone ${milestone.name} for grant ${milestone.grant.name} is overdue.`,
      severity: InsightSeverity.WARNING,
      sourceEntity: "GrantMilestone",
      sourceId: milestone.id,
      metadata,
    }, dbSystem());
  }
}

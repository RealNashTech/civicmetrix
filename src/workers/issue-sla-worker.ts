import { notifyOrganizationEditors } from "@/lib/notifications";
import { dbSystem } from "@/lib/db";

const BATCH_SIZE = 500;

export async function runIssueSlaWorker() {
  const now = new Date();
  const breachedIssues = await dbSystem().issueReport.findMany({
    where: {
      slaBreached: false,
      status: {
        not: "RESOLVED",
      },
      OR: [
        {
          slaResponseDueAt: {
            lt: now,
          },
        },
        {
          slaResolutionDueAt: {
            lt: now,
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      organizationId: true,
      departmentId: true,
    },
    take: BATCH_SIZE,
  });

  if (breachedIssues.length === 0) {
    return;
  }

  const existingAlerts = await dbSystem().alert.findMany({
    where: {
      resolvedAt: null,
      OR: breachedIssues.map((issue) => ({
        organizationId: issue.organizationId,
        title: `Issue SLA breached: ${issue.title}`,
      })),
    },
    select: {
      organizationId: true,
      title: true,
    },
  });
  const existingAlertKeys = new Set(existingAlerts.map((alert) => `${alert.organizationId}:${alert.title}`));

  const newAlerts = breachedIssues
    .map((issue) => {
      const title = `Issue SLA breached: ${issue.title}`;
      const key = `${issue.organizationId}:${title}`;
      if (existingAlertKeys.has(key)) {
        return null;
      }
      return {
        organizationId: issue.organizationId,
        departmentId: issue.departmentId,
        title,
        message: `Issue ${issue.id} has breached SLA thresholds.`,
        severity: "CRITICAL" as const,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  if (newAlerts.length > 0) {
    await dbSystem().alert.createMany({
      data: newAlerts,
      skipDuplicates: true,
    });
  }

  const breachedIds = breachedIssues.map((issue) => issue.id);
  await dbSystem().issueReport.updateMany({
    where: {
      id: { in: breachedIds },
      slaBreached: false,
    },
    data: {
      slaBreached: true,
    },
  });

  const notifiedOrganizations = new Set<string>();
  for (const issue of breachedIssues) {
    if (notifiedOrganizations.has(issue.organizationId)) {
      continue;
    }
    notifiedOrganizations.add(issue.organizationId);
    await notifyOrganizationEditors(
      issue.organizationId,
      "SLA breaches detected for open issues",
      "/dashboard/issues",
      dbSystem(),
    );
  }
}

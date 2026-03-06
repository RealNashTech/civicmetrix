import { notifyOrganizationEditors } from "@/lib/notifications";
import { dbSystem } from "@/lib/db";

const BATCH_SIZE = 500;

export async function runGrantReminderWorker() {
  console.log("[worker] grant reminder worker executed", new Date());

  const now = new Date();
  const overdueGrants = await dbSystem().grant.findMany({
    where: {
      nextReportDue: {
        lt: now,
      },
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      departmentId: true,
      programId: true,
    },
    take: BATCH_SIZE,
  });

  if (overdueGrants.length === 0) {
    return;
  }

  const existingAlerts = await dbSystem().alert.findMany({
    where: {
      resolvedAt: null,
      OR: overdueGrants.map((grant) => ({
        organizationId: grant.organizationId,
        title: `Grant compliance overdue: ${grant.name}`,
      })),
    },
    select: {
      organizationId: true,
      title: true,
    },
  });
  const existingKeys = new Set(existingAlerts.map((alert) => `${alert.organizationId}:${alert.title}`));

  const newAlerts = overdueGrants
    .map((grant) => {
      const title = `Grant compliance overdue: ${grant.name}`;
      if (existingKeys.has(`${grant.organizationId}:${title}`)) {
        return null;
      }
      return {
        organizationId: grant.organizationId,
        departmentId: grant.departmentId,
        programId: grant.programId,
        title,
        message: `Grant ${grant.name} is overdue for compliance reporting.`,
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

  const notifiedOrganizations = new Set<string>();
  for (const grant of overdueGrants) {
    if (notifiedOrganizations.has(grant.organizationId)) {
      continue;
    }
    notifiedOrganizations.add(grant.organizationId);
    await notifyOrganizationEditors(
      grant.organizationId,
      "Grants overdue for compliance reporting",
      "/dashboard/grants/compliance",
      dbSystem(),
    );
  }
}

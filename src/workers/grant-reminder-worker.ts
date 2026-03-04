import { notifyOrganizationEditors } from "@/lib/notifications";
import { db } from "@/lib/db";

export async function runGrantReminderWorker() {
  console.log("[worker] grant reminder worker executed", new Date());

  const now = new Date();
  const overdueGrants = await db().grant.findMany({
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
  });

  for (const grant of overdueGrants) {
    const title = `Grant compliance overdue: ${grant.name}`;
    const existing = await db().alert.findFirst({
      where: {
        organizationId: grant.organizationId,
        title,
        resolvedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await db().alert.create({
      data: {
        organizationId: grant.organizationId,
        departmentId: grant.departmentId,
        programId: grant.programId,
        title,
        message: `Grant ${grant.name} is overdue for compliance reporting.`,
        severity: "CRITICAL",
      },
    });

    await notifyOrganizationEditors(
      grant.organizationId,
      `Grant overdue: ${grant.name}`,
      "/dashboard/grants/compliance",
    );
  }
}

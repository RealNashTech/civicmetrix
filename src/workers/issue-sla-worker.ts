import { notifyOrganizationEditors } from "@/lib/notifications";
import { db } from "@/lib/db";

export async function runIssueSlaWorker() {
  const now = new Date();
  const breachedIssues = await db().issueReport.findMany({
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
  });

  for (const issue of breachedIssues) {
    const title = `Issue SLA breached: ${issue.title}`;
    const existing = await db().alert.findFirst({
      where: {
        organizationId: issue.organizationId,
        title,
        resolvedAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      await db().alert.create({
        data: {
          organizationId: issue.organizationId,
          departmentId: issue.departmentId,
          title,
          message: `Issue ${issue.id} has breached SLA thresholds.`,
          severity: "CRITICAL",
        },
      });

      await notifyOrganizationEditors(
        issue.organizationId,
        `SLA breached for issue ${issue.id}`,
        "/dashboard/issues",
      );
    }

    await db().issueReport.update({
      where: { id: issue.id },
      data: {
        slaBreached: true,
      },
    });
  }
}

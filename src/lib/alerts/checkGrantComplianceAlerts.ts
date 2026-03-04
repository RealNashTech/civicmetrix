import { db } from "@/lib/db";
import { notifyOrganizationEditors } from "@/lib/notifications";

type GrantComplianceInput = {
  grant: {
    id: string;
    name: string;
    organizationId: string;
    departmentId: string | null;
    programId: string | null;
    nextReportDue: Date | null;
  };
};

export async function checkGrantComplianceAlerts({ grant }: GrantComplianceInput) {
  if (!grant.nextReportDue) {
    return;
  }

  const now = new Date();
  if (grant.nextReportDue >= now) {
    return;
  }

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
    return;
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

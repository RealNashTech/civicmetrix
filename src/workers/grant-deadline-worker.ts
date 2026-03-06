import { notifyOrganizationEditors } from "@/lib/notifications";
import { dbSystem } from "@/lib/db";

export async function runGrantDeadlineWorker() {
  console.log("[worker] grant deadline worker executed", new Date());

  const now = new Date();
  const fourteenDaysFromNow = new Date();
  fourteenDaysFromNow.setDate(now.getDate() + 14);

  const upcomingDeadlines = await dbSystem().grant.findMany({
    where: {
      organizationId: {
        not: "",
      },
      applicationDeadline: {
        gte: now,
        lte: fourteenDaysFromNow,
      },
      status: {
        in: ["PIPELINE", "DRAFT", "SUBMITTED"],
      },
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      departmentId: true,
      programId: true,
      applicationDeadline: true,
    },
    orderBy: {
      applicationDeadline: "asc",
    },
  });

  const grantsByOrganization = upcomingDeadlines.reduce<Record<string, typeof upcomingDeadlines>>((acc, grant) => {
    if (!acc[grant.organizationId]) {
      acc[grant.organizationId] = [];
    }
    acc[grant.organizationId].push(grant);
    return acc;
  }, {});

  for (const [organizationId, grants] of Object.entries(grantsByOrganization)) {
    for (const grant of grants) {
      const title = `Grant application due soon: ${grant.name}`;
      const existing = await dbSystem().alert.findFirst({
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

      await dbSystem().alert.create({
        data: {
          organizationId: grant.organizationId,
          departmentId: grant.departmentId,
          programId: grant.programId,
          title,
          message: `Application deadline is approaching for ${grant.name}.`,
          severity: "WARNING",
        },
      });

      await notifyOrganizationEditors(
        organizationId,
        `Grant deadline in 14 days: ${grant.name}`,
        "/dashboard/grants/pipeline",
        dbSystem(),
      );
    }
  }
}

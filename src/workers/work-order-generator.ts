import { dbSystem } from "@/lib/db";
import { tenantDb } from "@/lib/tenantDb";

const INFRASTRUCTURE_CATEGORY_KEYWORDS = [
  "road",
  "bridge",
  "sidewalk",
  "street",
  "traffic",
  "drain",
  "drainage",
  "sewer",
  "water",
  "infrastructure",
  "maintenance",
  "utility",
  "public works",
];

function isInfrastructureCategory(category: string): boolean {
  const normalized = category.toLowerCase();
  return INFRASTRUCTURE_CATEGORY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function mapIssuePriorityToWorkOrderPriority(priority: string | null): string {
  if (!priority) {
    return "NORMAL";
  }
  if (["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
    return priority;
  }
  return "NORMAL";
}

export async function runWorkOrderGeneratorWorker() {
  const openIssues = await dbSystem().issueReport.findMany({
    where: {
      status: "OPEN",
    },
    select: {
      id: true,
      organizationId: true,
      title: true,
      description: true,
      category: true,
      departmentId: true,
      assetId: true,
      priority: true,
    },
    take: 1000,
  });

  const candidates = openIssues.filter(
    (issue: (typeof openIssues)[number]) => isInfrastructureCategory(issue.category),
  );
  if (candidates.length === 0) {
    return;
  }

  const byOrganization = new Map<string, typeof candidates>();
  for (const issue of candidates) {
    const bucket = byOrganization.get(issue.organizationId) ?? [];
    bucket.push(issue);
    byOrganization.set(issue.organizationId, bucket);
  }

  for (const [organizationId, orgIssues] of byOrganization.entries()) {
    await tenantDb(organizationId, async (tx) => {
      const issueIds = orgIssues.map((issue: (typeof orgIssues)[number]) => issue.id);

      const existingOrders = await tx.workOrder.findMany({
        where: {
          organizationId,
          issueId: { in: issueIds },
          status: {
            in: ["OPEN", "IN_PROGRESS"],
          },
        },
        select: {
          issueId: true,
        },
      });

      const existingByIssue = new Set(
        existingOrders.map((order: { issueId: string | null }) => order.issueId).filter(Boolean),
      );

      const toCreate = orgIssues
        .filter((issue: (typeof orgIssues)[number]) => !existingByIssue.has(issue.id))
        .map((issue: (typeof orgIssues)[number]) => ({
          organizationId,
          issueId: issue.id,
          assetId: issue.assetId,
          departmentId: issue.departmentId,
          title: `Auto Work Order: ${issue.title}`,
          description: issue.description,
          status: "OPEN",
          priority: mapIssuePriorityToWorkOrderPriority(issue.priority),
          startedAt: new Date(),
        }));

      if (toCreate.length === 0) {
        return;
      }

      await tx.workOrder.createMany({
        data: toCreate,
        skipDuplicates: true,
      });

      await tx.event.createMany({
        data: toCreate.map((workOrder: (typeof toCreate)[number]) => ({
          organizationId,
          type: "WORK_ORDER_AUTO_GENERATED",
          entityType: "WORK_ORDER",
          entityId: workOrder.issueId,
          payload: {
            issueId: workOrder.issueId,
            assetId: workOrder.assetId,
            departmentId: workOrder.departmentId,
            title: workOrder.title,
          },
        })),
      });
    });
  }
}

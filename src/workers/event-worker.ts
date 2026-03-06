import { dbSystem } from "@/lib/db";
import { calculateIssueSLA } from "@/lib/sla-engine";

const EVENT_BATCH_SIZE = 100;

async function handleEvent(event: {
  id: string;
  type: string;
  entityType: string;
  entityId: string | null;
  organizationId: string;
}) {
  switch (event.type) {
    case "ISSUE_REPORTED":
    case "ISSUE_REPORT_CREATE":
      if (!event.entityId) {
        break;
      }

      const issue = await dbSystem().issueReport.findUnique({
        where: { id: event.entityId },
        select: {
          id: true,
          organizationId: true,
          category: true,
        },
      });

      if (!issue || issue.organizationId !== event.organizationId) {
        break;
      }

      const sla = await calculateIssueSLA({
        id: issue.id,
        organizationId: issue.organizationId,
        category: issue.category,
      });

      if (!sla) {
        break;
      }

      await dbSystem().issueReport.updateMany({
        where: {
          id: issue.id,
          organizationId: issue.organizationId,
        },
        data: {
          slaResponseDueAt: sla.responseDueAt,
          slaResolutionDueAt: sla.resolutionDueAt,
        },
      });
      break;
    default:
      break;
  }
}

export async function processEventBatch(batchSize = EVENT_BATCH_SIZE) {
  const events = await dbSystem().event.findMany({
    where: { processed: false },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    select: {
      id: true,
      type: true,
      entityType: true,
      entityId: true,
      organizationId: true,
    },
  });

  if (events.length === 0) {
    return 0;
  }

  const processedIds: string[] = [];
  for (const event of events) {
    await handleEvent(event);
    processedIds.push(event.id);
  }

  if (processedIds.length > 0) {
    await dbSystem().event.updateMany({
      where: {
        id: { in: processedIds },
        processed: false,
      },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  }

  return events.length;
}

export async function runEventWorker(batchSize = EVENT_BATCH_SIZE) {
  // Drain all pending events in deterministic createdAt order.
  while (true) {
    const processedCount = await processEventBatch(batchSize);
    if (processedCount < batchSize) {
      break;
    }
  }
}

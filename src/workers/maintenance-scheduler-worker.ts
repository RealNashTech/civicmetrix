import { notifyOrganizationEditors } from "@/lib/notifications";
import { dbSystem } from "@/lib/db";
import { WorkOrderPriority, WorkOrderStatus } from "@prisma/client";

const BATCH_SIZE = 500;

export async function runMaintenanceSchedulerWorker() {
  const now = new Date();
  const schedules = await dbSystem().maintenanceSchedule.findMany({
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          departmentId: true,
        },
      },
    },
    take: BATCH_SIZE,
  });

  const dueSchedules = schedules.filter((schedule) => {
    const baseDate = schedule.lastCompleted ?? schedule.createdAt;
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + schedule.frequencyDays);
    return dueDate <= now;
  });

  if (dueSchedules.length === 0) {
    return;
  }

  const existingOpenOrders = await dbSystem().workOrder.findMany({
    where: {
      OR: dueSchedules.map((schedule) => ({
        organizationId: schedule.organizationId,
        assetId: schedule.assetId,
        title: `Preventive Maintenance: ${schedule.name}`,
      })),
      status: {
        in: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.BLOCKED],
      },
    },
    select: {
      organizationId: true,
      assetId: true,
      title: true,
    },
  });
  const existingKeys = new Set(
    existingOpenOrders.map((order) => `${order.organizationId}:${order.assetId ?? "none"}:${order.title}`),
  );

  const toCreate = dueSchedules
    .map((schedule) => {
      const title = `Preventive Maintenance: ${schedule.name}`;
      const key = `${schedule.organizationId}:${schedule.assetId}:${title}`;
      if (existingKeys.has(key)) {
        return null;
      }
      return {
        organizationId: schedule.organizationId,
        assetId: schedule.asset.id,
        departmentId: schedule.asset.departmentId,
        title,
        description: `Auto-generated from maintenance schedule ${schedule.name}.`,
        status: WorkOrderStatus.OPEN,
        priority: WorkOrderPriority.MEDIUM,
        scheduledDate: now,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  if (toCreate.length > 0) {
    await dbSystem().workOrder.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }

  const notifiedOrganizations = new Set<string>();
  for (const schedule of schedules) {
    const baseDate = schedule.lastCompleted ?? schedule.createdAt;
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + schedule.frequencyDays);
    if (dueDate > now || notifiedOrganizations.has(schedule.organizationId)) {
      continue;
    }
    notifiedOrganizations.add(schedule.organizationId);

    await notifyOrganizationEditors(
      schedule.organizationId,
      "Preventive maintenance work orders generated",
      "/dashboard/work-orders",
      dbSystem(),
    );
  }
}

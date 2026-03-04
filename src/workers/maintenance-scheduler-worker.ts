import { notifyOrganizationEditors } from "@/lib/notifications";
import { db } from "@/lib/db";
import { WorkOrderPriority, WorkOrderStatus } from "@prisma/client";

export async function runMaintenanceSchedulerWorker() {
  const now = new Date();
  const schedules = await db().maintenanceSchedule.findMany({
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          departmentId: true,
        },
      },
    },
  });

  for (const schedule of schedules) {
    const baseDate = schedule.lastCompleted ?? schedule.createdAt;
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + schedule.frequencyDays);

    if (dueDate > now) {
      continue;
    }

    const title = `Preventive Maintenance: ${schedule.name}`;
    const existing = await db().workOrder.findFirst({
      where: {
        organizationId: schedule.organizationId,
        assetId: schedule.assetId,
        title,
        status: {
          in: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.BLOCKED],
        },
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await db().workOrder.create({
      data: {
        organizationId: schedule.organizationId,
        assetId: schedule.asset.id,
        departmentId: schedule.asset.departmentId,
        title,
        description: `Auto-generated from maintenance schedule ${schedule.name}.`,
        status: WorkOrderStatus.OPEN,
        priority: WorkOrderPriority.MEDIUM,
        scheduledDate: now,
      },
    });

    await notifyOrganizationEditors(
      schedule.organizationId,
      `Maintenance work order created for asset ${schedule.asset.name}`,
      "/dashboard/work-orders",
    );
  }
}

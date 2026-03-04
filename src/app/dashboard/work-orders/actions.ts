"use server";

import { revalidatePath } from "next/cache";
import { WorkOrderStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

const ALLOWED_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.OPEN,
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.BLOCKED,
  WorkOrderStatus.COMPLETED,
];

export async function updateWorkOrderStatus(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const role = user.role as AppRole;
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }

  const id = String(formData.get("id") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const status = statusRaw as WorkOrderStatus;

  if (!id || !ALLOWED_WORK_ORDER_STATUSES.includes(status)) {
    throw new Error("Invalid work order status update.");
  }

  const existing = await db().workOrder.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Work order not found.");
  }

  await db().workOrder.update({
    where: { id: existing.id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  await createAuditLog({
    action: "WORK_ORDER_STATUS_UPDATE",
    entityType: "WorkOrder",
    entityId: existing.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/work-orders");
  revalidatePath("/dashboard/city-operations");
}

export async function createMaintenanceSchedule(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const role = user.role as AppRole;
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }

  const assetId = String(formData.get("assetId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const frequencyDaysRaw = String(formData.get("frequencyDays") ?? "").trim();
  const frequencyDays = Number.parseInt(frequencyDaysRaw, 10);

  if (!assetId || !name || Number.isNaN(frequencyDays) || frequencyDays <= 0) {
    throw new Error("Invalid maintenance schedule data.");
  }

  const asset = await db().asset.findFirst({
    where: {
      id: assetId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!asset) {
    throw new Error("Invalid asset.");
  }

  const created = await db().maintenanceSchedule.create({
    data: {
      organizationId: user.organizationId,
      assetId: asset.id,
      name,
      frequencyDays,
    },
  });

  await createAuditLog({
    action: "MAINTENANCE_SCHEDULE_CREATE",
    entityType: "MaintenanceSchedule",
    entityId: created.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/work-orders");
  revalidatePath("/dashboard/city-operations");
}

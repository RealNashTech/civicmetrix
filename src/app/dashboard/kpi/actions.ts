"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { checkKpiAlerts } from "@/lib/alerts/checkKpiAlerts";
import { createEvent } from "@/lib/events";
import { hasMinimumRole } from "@/lib/permissions";
import { calculateKpiStatus } from "@/lib/performance/calculateKpiStatus";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

export async function createKpi(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const role = user.role as AppRole;
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const periodLabel = String(formData.get("periodLabel") ?? "").trim();
  const rawValue = String(formData.get("value") ?? "").trim();
  const rawTarget = String(formData.get("target") ?? "").trim();
  const rawDepartmentId = String(formData.get("departmentId") ?? "").trim();
  const rawProgramId = String(formData.get("programId") ?? "").trim();
  const rawMilestoneId = String(formData.get("milestoneId") ?? "").trim();
  const value = Number.parseFloat(rawValue);
  const parsedTarget = rawTarget ? Number.parseFloat(rawTarget) : null;

  if (!name || Number.isNaN(value) || (parsedTarget !== null && Number.isNaN(parsedTarget))) {
    throw new Error("Invalid KPI data.");
  }

  let departmentId: string | null = null;
  if (rawDepartmentId) {
    const department = await db().department.findFirst({
      where: {
        id: rawDepartmentId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });
    if (!department) {
      throw new Error("Invalid department.");
    }
    departmentId = department.id;
  }

  let programId: string | null = null;
  if (rawProgramId) {
    const program = await db().program.findFirst({
      where: {
        id: rawProgramId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });
    if (!program) {
      throw new Error("Invalid program.");
    }
    programId = program.id;
  }

  let milestoneId: string | null = null;
  if (rawMilestoneId) {
    const milestone = await db().grantMilestone.findFirst({
      where: {
        id: rawMilestoneId,
        grant: {
          organizationId: user.organizationId,
        },
      },
      select: { id: true },
    });
    if (!milestone) {
      throw new Error("Invalid grant milestone.");
    }
    milestoneId = milestone.id;
  }

  const status = calculateKpiStatus({ value, target: parsedTarget });

  const created = await db().kPI.create({
    data: {
      name,
      value,
      target: parsedTarget,
      status,
      unit: unit || null,
      periodLabel: periodLabel || null,
      departmentId,
      programId,
      milestoneId,
      organizationId: user.organizationId,
    },
  });

  await db().kPIHistory.create({
    data: {
      kpiId: created.id,
      value,
    },
  });

  await createEvent({
    organizationId: user.organizationId,
    type: "KPI_CREATE",
    entityType: "KPI",
    entityId: created.id,
    payload: {
      name: created.name,
      value: created.value,
      target: created.target,
      status: created.status,
    },
  });

  console.log("KPI CREATED:", created.id);

  await createAuditLog({
    action: "KPI_CREATE",
    entityType: "KPI",
    entityId: created.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  await checkKpiAlerts({
    kpi: {
      id: created.id,
      name: created.name,
      value: created.value,
      target: created.target,
      status: created.status,
      organizationId: created.organizationId,
      departmentId: created.departmentId,
      programId: created.programId,
    },
    userId: user.id,
  });

  revalidatePath("/dashboard/kpi");
  revalidatePath("/dashboard/command-center");
  revalidatePath("/dashboard/alerts");
  revalidatePath("/dashboard");
}

export async function updateKpi(formData: FormData) {
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
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const periodLabel = String(formData.get("periodLabel") ?? "").trim();
  const rawValue = String(formData.get("value") ?? "").trim();
  const rawTarget = String(formData.get("target") ?? "").trim();
  const rawDepartmentId = String(formData.get("departmentId") ?? "").trim();
  const rawProgramId = String(formData.get("programId") ?? "").trim();
  const rawMilestoneId = String(formData.get("milestoneId") ?? "").trim();
  const value = Number.parseFloat(rawValue);
  const parsedTarget = rawTarget ? Number.parseFloat(rawTarget) : null;

  if (!id || !name || Number.isNaN(value) || (parsedTarget !== null && Number.isNaN(parsedTarget))) {
    throw new Error("Invalid KPI update data.");
  }

  const existing = await db().kPI.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      isPublic: true,
      value: true,
    },
  });

  if (!existing) {
    throw new Error("KPI not found.");
  }

  let departmentId: string | null = null;
  if (rawDepartmentId) {
    const department = await db().department.findFirst({
      where: {
        id: rawDepartmentId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });
    if (!department) {
      throw new Error("Invalid department.");
    }
    departmentId = department.id;
  }

  let programId: string | null = null;
  if (rawProgramId) {
    const program = await db().program.findFirst({
      where: {
        id: rawProgramId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });
    if (!program) {
      throw new Error("Invalid program.");
    }
    programId = program.id;
  }

  let milestoneId: string | null = null;
  if (rawMilestoneId) {
    const milestone = await db().grantMilestone.findFirst({
      where: {
        id: rawMilestoneId,
        grant: {
          organizationId: user.organizationId,
        },
      },
      select: { id: true },
    });
    if (!milestone) {
      throw new Error("Invalid grant milestone.");
    }
    milestoneId = milestone.id;
  }

  const status = calculateKpiStatus({ value, target: parsedTarget });

  const updated = await db().kPI.update({
    where: { id: existing.id },
    data: {
      name,
      value,
      target: parsedTarget,
      status,
      unit: unit || null,
      periodLabel: periodLabel || null,
      departmentId,
      programId,
      milestoneId,
    },
  });

  await db().kPIHistory.create({
    data: {
      kpiId: updated.id,
      value: updated.value,
      recordedAt: new Date(),
    },
  });

  await createEvent({
    organizationId: user.organizationId,
    type: "KPI_UPDATE",
    entityType: "KPI",
    entityId: updated.id,
    payload: {
      value: updated.value,
      target: updated.target,
      status: updated.status,
    },
  });

  await createAuditLog({
    action: "KPI_UPDATE",
    entityType: "KPI",
    entityId: updated.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  await checkKpiAlerts({
    kpi: {
      id: updated.id,
      name: updated.name,
      value: updated.value,
      target: updated.target,
      status: updated.status,
      organizationId: updated.organizationId,
      departmentId: updated.departmentId,
      programId: updated.programId,
    },
    userId: user.id,
  });

  revalidatePath("/dashboard/kpi");
  revalidatePath("/dashboard/command-center");
  revalidatePath("/dashboard/alerts");
  revalidatePath("/dashboard/departments");
  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath("/public", "layout");
}

export async function toggleKpiPublic(id: string) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const role = user.role as AppRole;
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }

  const existing = await db().kPI.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      isPublic: true,
    },
  });

  if (!existing) {
    throw new Error("KPI not found.");
  }

  const updated = await db().kPI.update({
    where: { id: existing.id },
    data: { isPublic: !existing.isPublic },
  });

  await createAuditLog({
    action: updated.isPublic ? "KPI_PUBLISH" : "KPI_UNPUBLISH",
    entityType: "KPI",
    entityId: updated.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/kpi");
  revalidatePath("/dashboard/command-center");
  revalidatePath("/dashboard/departments");
  revalidatePath("/dashboard/programs");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath("/public", "layout");
}

export async function deleteKpi(formData: FormData) {
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
  if (!id) {
    throw new Error("Missing KPI id.");
  }

  const existing = await db().kPI.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new Error("KPI not found.");
  }

  await db().kPI.delete({
    where: { id: existing.id },
  });

  await createEvent({
    organizationId: user.organizationId,
    type: "KPI_DELETE",
    entityType: "KPI",
    entityId: existing.id,
  });

  await createAuditLog({
    action: "KPI_DELETE",
    entityType: "KPI",
    entityId: existing.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/kpi");
  revalidatePath("/dashboard/command-center");
  revalidatePath("/dashboard/alerts");
  revalidatePath("/dashboard/departments");
  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath("/public", "layout");
}


"use server";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit";
import { hasDepartmentAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { requireStaffUser } from "@/lib/security/authorization";

export async function createDepartment(formData: FormData) {
  const user = await requireStaffUser("EDITOR");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Department name is required.");
  }

  const created = await db().department.create({
    data: {
      name,
      organizationId: user.organizationId,
    },
  });

  await createAuditLog({
    action: "DEPARTMENT_CREATE",
    entityType: "Department",
    entityId: created.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/departments");
  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard/budgets");
  revalidatePath("/dashboard/kpi");
  revalidatePath("/dashboard/grants");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath(`/public/${user.organizationSlug}/departments`);
}

export async function updateDepartment(formData: FormData) {
  const user = await requireStaffUser("EDITOR");

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) {
    throw new Error("Department id and name are required.");
  }

  const existing = await db().department.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Department not found.");
  }

  const access = await hasDepartmentAccess(user.id, existing.id);
  if (!access) {
    throw new Error("No department access.");
  }

  const programCount = await db().program.count({
    where: {
      departmentId: existing.id,
      organizationId: user.organizationId,
    },
  });

  if (programCount > 0) {
    throw new Error("Department has programs assigned. Reassign or delete programs first.");
  }

  await db().department.update({
    where: { id: existing.id },
    data: { name },
  });

  await createAuditLog({
    action: "DEPARTMENT_UPDATE",
    entityType: "Department",
    entityId: existing.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/departments");
  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard/budgets");
  revalidatePath("/dashboard/kpi");
  revalidatePath("/dashboard/grants");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath(`/public/${user.organizationSlug}/departments`);
}

export async function deleteDepartment(formData: FormData) {
  const user = await requireStaffUser("EDITOR");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Department id is required.");
  }

  const existing = await db().department.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Department not found.");
  }

  const access = await hasDepartmentAccess(user.id, existing.id);
  if (!access) {
    throw new Error("No department access.");
  }

  await db().$transaction(async (tx) => {
    await tx.kPI.updateMany({
      where: {
        organizationId: user.organizationId,
        departmentId: existing.id,
      },
      data: {
        departmentId: null,
      },
    });

    await tx.grant.updateMany({
      where: {
        organizationId: user.organizationId,
        departmentId: existing.id,
      },
      data: {
        departmentId: null,
      },
    });

    await tx.department.delete({
      where: { id: existing.id },
    });
  });

  await createAuditLog({
    action: "DEPARTMENT_DELETE",
    entityType: "Department",
    entityId: existing.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/departments");
  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard/budgets");
  revalidatePath("/dashboard/kpi");
  revalidatePath("/dashboard/grants");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath(`/public/${user.organizationSlug}/departments`);
}

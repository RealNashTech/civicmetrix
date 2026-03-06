"use server";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireStaffUser } from "@/lib/security/authorization";

function parseDate(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  return raw ? new Date(raw) : null;
}

export async function createProgram(formData: FormData) {
  const user = await requireStaffUser("EDITOR");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "").trim();
  const isPublic = String(formData.get("isPublic") ?? "") === "on";
  const objectiveIdRaw = String(formData.get("objectiveId") ?? "").trim();
  const startDate = parseDate(formData.get("startDate"));
  const endDate = parseDate(formData.get("endDate"));

  if (!name || !departmentId) {
    throw new Error("Program name and department are required.");
  }

  const department = await db().department.findFirst({
    where: {
      id: departmentId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!department) {
    throw new Error("Invalid department.");
  }

  const created = await db().program.create({
    data: {
      name,
      description: description || null,
      departmentId: department.id,
      organizationId: user.organizationId,
      isPublic,
      startDate,
      endDate,
    },
  });

  if (objectiveIdRaw) {
    const objective = await db().strategicObjective.findFirst({
      where: {
        id: objectiveIdRaw,
        goal: {
          organizationId: user.organizationId,
        },
      },
      select: { id: true },
    });

    if (!objective) {
      throw new Error("Invalid strategic objective.");
    }

    await db().strategicObjective.update({
      where: { id: objective.id },
      data: { programId: created.id },
    });
  }

  await createAuditLog({
    action: "PROGRAM_CREATE",
    entityType: "Program",
    entityId: created.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard/kpi");
  revalidatePath("/dashboard/grants");
  revalidatePath("/dashboard/budgets");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath(`/public/${user.organizationSlug}/programs`);
}

export async function updateProgram(formData: FormData) {
  const user = await requireStaffUser("EDITOR");

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "").trim();
  const isPublic = String(formData.get("isPublic") ?? "") === "on";
  const objectiveIdRaw = String(formData.get("objectiveId") ?? "").trim();
  const startDate = parseDate(formData.get("startDate"));
  const endDate = parseDate(formData.get("endDate"));

  if (!id || !name || !departmentId) {
    throw new Error("Program id, name, and department are required.");
  }

  const existing = await db().program.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Program not found.");
  }

  const department = await db().department.findFirst({
    where: {
      id: departmentId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!department) {
    throw new Error("Invalid department.");
  }

  await db().$transaction(async (tx) => {
    await tx.program.update({
      where: { id: existing.id },
      data: {
        name,
        description: description || null,
        departmentId: department.id,
        isPublic,
        startDate,
        endDate,
      },
    });

    await tx.strategicObjective.updateMany({
      where: { programId: existing.id },
      data: { programId: null },
    });

    if (objectiveIdRaw) {
      const objective = await tx.strategicObjective.findFirst({
        where: {
          id: objectiveIdRaw,
          goal: {
            organizationId: user.organizationId,
          },
        },
        select: { id: true },
      });

      if (!objective) {
        throw new Error("Invalid strategic objective.");
      }

      await tx.strategicObjective.update({
        where: { id: objective.id },
        data: { programId: existing.id },
      });
    }
  });

  await createAuditLog({
    action: "PROGRAM_UPDATE",
    entityType: "Program",
    entityId: existing.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard/kpi");
  revalidatePath("/dashboard/grants");
  revalidatePath("/dashboard/budgets");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath(`/public/${user.organizationSlug}/programs`);
}

export async function deleteProgram(formData: FormData) {
  const user = await requireStaffUser("EDITOR");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Program id is required.");
  }

  const existing = await db().program.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Program not found.");
  }

  await db().$transaction(async (tx) => {
    await tx.kPI.updateMany({
      where: {
        organizationId: user.organizationId,
        programId: existing.id,
      },
      data: {
        programId: null,
      },
    });

    await tx.grant.updateMany({
      where: {
        organizationId: user.organizationId,
        programId: existing.id,
      },
      data: {
        programId: null,
      },
    });

    await tx.budget.deleteMany({
      where: {
        programId: existing.id,
      },
    });

    await tx.strategicObjective.updateMany({
      where: {
        programId: existing.id,
      },
      data: {
        programId: null,
      },
    });

    await tx.program.delete({
      where: { id: existing.id },
    });
  });

  await createAuditLog({
    action: "PROGRAM_DELETE",
    entityType: "Program",
    entityId: existing.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard/kpi");
  revalidatePath("/dashboard/grants");
  revalidatePath("/dashboard/budgets");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath(`/public/${user.organizationSlug}/programs`);
}

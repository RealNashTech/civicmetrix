"use server";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

function requireEditorRole(role: AppRole) {
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }
}

function parseNumber(raw: string, label: string) {
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}

function parseFiscalYear(raw: string) {
  const year = Number.parseInt(raw, 10);
  if (Number.isNaN(year)) {
    throw new Error("Fiscal year must be numeric.");
  }
  return year;
}

export async function createBudget(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  requireEditorRole(user.role as AppRole);

  const programId = String(formData.get("programId") ?? "").trim();
  const fiscalYearRaw = String(formData.get("fiscalYear") ?? "").trim();
  const category = String(formData.get("category") ?? "GENERAL").trim() || "GENERAL";
  const allocatedRaw = String(formData.get("allocated") ?? "").trim();
  const spentRaw = String(formData.get("spent") ?? "").trim();

  if (!programId) {
    throw new Error("Program is required.");
  }

  const fiscalYear = parseFiscalYear(fiscalYearRaw);
  const allocated = parseNumber(allocatedRaw, "allocated amount");
  const spent = parseNumber(spentRaw || "0", "spent amount");

  const program = await db().program.findFirst({
    where: {
      id: programId,
      organizationId: user.organizationId,
    },
    select: { id: true, departmentId: true },
  });

  if (!program) {
    throw new Error("Invalid program.");
  }

  const created = await db().budget.create({
    data: {
      organizationId: user.organizationId,
      departmentId: program.departmentId,
      programId: program.id,
      fiscalYear,
      category,
      allocated,
      spent,
    },
  });

  await createAuditLog({
    action: "BUDGET_CREATE",
    entityType: "Budget",
    entityId: created.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/budgets");
  revalidatePath(`/public/${user.organizationSlug}/programs`);
}

export async function updateBudget(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  requireEditorRole(user.role as AppRole);

  const id = String(formData.get("id") ?? "").trim();
  const programId = String(formData.get("programId") ?? "").trim();
  const fiscalYearRaw = String(formData.get("fiscalYear") ?? "").trim();
  const category = String(formData.get("category") ?? "GENERAL").trim() || "GENERAL";
  const allocatedRaw = String(formData.get("allocated") ?? "").trim();
  const spentRaw = String(formData.get("spent") ?? "").trim();

  if (!id || !programId) {
    throw new Error("Budget id and program are required.");
  }

  const fiscalYear = parseFiscalYear(fiscalYearRaw);
  const allocated = parseNumber(allocatedRaw, "allocated amount");
  const spent = parseNumber(spentRaw || "0", "spent amount");

  const [existing, program] = await Promise.all([
    db().budget.findFirst({
      where: {
        id,
        program: {
          organizationId: user.organizationId,
        },
      },
      select: { id: true },
    }),
    db().program.findFirst({
      where: {
        id: programId,
        organizationId: user.organizationId,
      },
      select: { id: true, departmentId: true },
    }),
  ]);

  if (!existing) {
    throw new Error("Budget not found.");
  }

  if (!program) {
    throw new Error("Invalid program.");
  }

  await db().budget.update({
    where: { id: existing.id },
    data: {
      organizationId: user.organizationId,
      departmentId: program.departmentId,
      programId: program.id,
      fiscalYear,
      category,
      allocated,
      spent,
    },
  });

  await createAuditLog({
    action: "BUDGET_UPDATE",
    entityType: "Budget",
    entityId: existing.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/budgets");
  revalidatePath(`/public/${user.organizationSlug}/programs`);
}

export async function deleteBudget(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  requireEditorRole(user.role as AppRole);

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Budget id is required.");
  }

  const existing = await db().budget.findFirst({
    where: {
      id,
      program: {
        organizationId: user.organizationId,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Budget not found.");
  }

  await db().budget.delete({
    where: { id: existing.id },
  });

  await createAuditLog({
    action: "BUDGET_DELETE",
    entityType: "Budget",
    entityId: existing.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/budgets");
  revalidatePath(`/public/${user.organizationSlug}/programs`);
}

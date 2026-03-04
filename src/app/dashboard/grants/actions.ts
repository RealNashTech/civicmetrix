"use server";

import { revalidatePath } from "next/cache";
import { GrantComplianceStatus, GrantStatus, Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { createAuditLog } from "@/lib/audit";
import { checkGrantComplianceAlerts } from "@/lib/alerts/checkGrantComplianceAlerts";
import { createEvent } from "@/lib/events";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { grantCreateSchema } from "@/lib/validation/grants";
import { AppRole } from "@/types/roles";

function parseGrantStatus(rawStatus: string): GrantStatus {
  if (!Object.values(GrantStatus).includes(rawStatus as GrantStatus)) {
    throw new Error("Invalid grant status.");
  }

  return rawStatus as GrantStatus;
}

function validateGrantStatusTransition(oldStatus: GrantStatus, newStatus: GrantStatus) {
  if (oldStatus === newStatus) {
    return;
  }

  const validTransitions: Record<GrantStatus, GrantStatus[]> = {
    PIPELINE: ["DRAFT", "SUBMITTED"],
    DRAFT: ["SUBMITTED", "PIPELINE"],
    SUBMITTED: ["AWARDED", "CLOSED"],
    AWARDED: ["REPORTING"],
    REPORTING: ["CLOSED"],
    CLOSED: [],
  };

  if (!validTransitions[oldStatus]?.includes(newStatus)) {
    throw new Error("Invalid grant status transition");
  }
}

function parseGrantComplianceStatus(
  rawComplianceStatus: string,
  nextReportDue: Date | null,
): GrantComplianceStatus {
  if (nextReportDue && nextReportDue < new Date()) {
    return GrantComplianceStatus.OVERDUE;
  }

  if (!rawComplianceStatus) {
    return GrantComplianceStatus.COMPLIANT;
  }

  if (!Object.values(GrantComplianceStatus).includes(rawComplianceStatus as GrantComplianceStatus)) {
    throw new Error("Invalid grant compliance status.");
  }

  return rawComplianceStatus as GrantComplianceStatus;
}

export async function createGrant(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const role = user.role as AppRole;
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }
  const organizationId = requireOrganization(session);

  const name = String(formData.get("name") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const reportingFrequency = String(formData.get("reportingFrequency") ?? "").trim();
  const nextReportDueRaw = String(formData.get("nextReportDue") ?? "").trim();
  const lastReportSubmittedRaw = String(formData.get("lastReportSubmitted") ?? "").trim();
  const applicationDeadlineRaw = String(formData.get("applicationDeadline") ?? "").trim();
  const reportDueDateRaw = String(formData.get("reportDueDate") ?? "").trim();
  const awardAmountRaw = String(formData.get("awardAmount") ?? "").trim();
  const complianceStatusRaw = String(formData.get("complianceStatus") ?? "").trim();
  const rawDepartmentId = String(formData.get("departmentId") ?? "").trim();
  const rawProgramId = String(formData.get("programId") ?? "").trim();
  const amountValue = Number.parseFloat(amountRaw);

  if (!name || !statusRaw || Number.isNaN(amountValue)) {
    throw new Error("Invalid grant data.");
  }

  let departmentId: string | null = null;
  if (rawDepartmentId) {
    const department = await db().department.findFirst({
      where: {
        id: rawDepartmentId,
        organizationId,
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
        organizationId,
      },
      select: { id: true },
    });
    if (!program) {
      throw new Error("Invalid program.");
    }
    programId = program.id;
  }

  const nextReportDue = nextReportDueRaw ? new Date(nextReportDueRaw) : null;
  const lastReportSubmitted = lastReportSubmittedRaw ? new Date(lastReportSubmittedRaw) : null;
  const awardAmountValue = awardAmountRaw ? Number.parseFloat(awardAmountRaw) : null;
  const parsed = grantCreateSchema.parse({
    name,
    status: statusRaw,
    amount: amountValue,
    awardAmount: Number.isFinite(awardAmountValue) ? awardAmountValue : undefined,
    applicationDeadline: applicationDeadlineRaw || undefined,
  });
  const applicationDeadline = parsed.applicationDeadline ? new Date(parsed.applicationDeadline) : null;
  const reportDueDate = reportDueDateRaw ? new Date(reportDueDateRaw) : null;
  const status = parseGrantStatus(parsed.status);
  const complianceStatus = parseGrantComplianceStatus(complianceStatusRaw, nextReportDue);

  const created = await db().grant.create({
    data: {
      name: parsed.name,
      status,
      amount: parsed.amount.toString(),
      startDate: startDateRaw ? new Date(startDateRaw) : null,
      endDate: endDateRaw ? new Date(endDateRaw) : null,
      reportingFrequency: reportingFrequency || null,
      nextReportDue,
      lastReportSubmitted,
      applicationDeadline,
      reportDueDate,
      awardAmount: Number.isFinite(awardAmountValue)
        ? new Prisma.Decimal(awardAmountValue as number)
        : null,
      complianceStatus,
      departmentId,
      programId,
      organizationId,
    },
  });

  await createEvent({
    organizationId,
    type: "GRANT_CREATE",
    entityType: "GRANT",
    entityId: created.id,
    payload: {
      name: created.name,
      status: created.status,
      amount: created.amount.toString(),
      complianceStatus: created.complianceStatus,
    },
  });

  await checkGrantComplianceAlerts({
    grant: {
      id: created.id,
      name: created.name,
      organizationId: created.organizationId,
      departmentId: created.departmentId,
      programId: created.programId,
      nextReportDue: created.nextReportDue,
    },
  });

  await createAuditLog({
    action: "GRANT_CREATE",
    entityType: "Grant",
    entityId: created.id,
    userId: user.id,
    organizationId,
  });

  revalidatePath("/dashboard/grants");
  revalidatePath("/dashboard/grants/pipeline");
  revalidatePath("/dashboard");
}

export async function updateGrant(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const role = user.role as AppRole;
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }
  const organizationId = requireOrganization(session);

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const reportingFrequency = String(formData.get("reportingFrequency") ?? "").trim();
  const nextReportDueRaw = String(formData.get("nextReportDue") ?? "").trim();
  const lastReportSubmittedRaw = String(formData.get("lastReportSubmitted") ?? "").trim();
  const applicationDeadlineRaw = String(formData.get("applicationDeadline") ?? "").trim();
  const reportDueDateRaw = String(formData.get("reportDueDate") ?? "").trim();
  const awardAmountRaw = String(formData.get("awardAmount") ?? "").trim();
  const complianceStatusRaw = String(formData.get("complianceStatus") ?? "").trim();
  const rawDepartmentId = String(formData.get("departmentId") ?? "").trim();
  const rawProgramId = String(formData.get("programId") ?? "").trim();
  const amountValue = Number.parseFloat(amountRaw);

  if (!id || !name || !statusRaw || Number.isNaN(amountValue)) {
    throw new Error("Invalid grant update data.");
  }

  const existing = await db().grant.findFirst({
    where: {
      id,
      organizationId,
    },
    select: {
      id: true,
      isPublic: true,
      status: true,
    },
  });

  if (!existing) {
    throw new Error("Grant not found.");
  }

  let departmentId: string | null = null;
  if (rawDepartmentId) {
    const department = await db().department.findFirst({
      where: {
        id: rawDepartmentId,
        organizationId,
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
        organizationId,
      },
      select: { id: true },
    });
    if (!program) {
      throw new Error("Invalid program.");
    }
    programId = program.id;
  }

  const nextReportDue = nextReportDueRaw ? new Date(nextReportDueRaw) : null;
  const lastReportSubmitted = lastReportSubmittedRaw ? new Date(lastReportSubmittedRaw) : null;
  const awardAmountValue = awardAmountRaw ? Number.parseFloat(awardAmountRaw) : null;
  const parsed = grantCreateSchema.parse({
    name,
    status: statusRaw,
    amount: amountValue,
    awardAmount: Number.isFinite(awardAmountValue) ? awardAmountValue : undefined,
    applicationDeadline: applicationDeadlineRaw || undefined,
  });
  const applicationDeadline = parsed.applicationDeadline ? new Date(parsed.applicationDeadline) : null;
  const reportDueDate = reportDueDateRaw ? new Date(reportDueDateRaw) : null;
  const status = parseGrantStatus(parsed.status);
  validateGrantStatusTransition(existing.status, status);
  const complianceStatus = parseGrantComplianceStatus(complianceStatusRaw, nextReportDue);

  const updated = await db().grant.update({
    where: { id: existing.id },
    data: {
      name: parsed.name,
      status,
      amount: parsed.amount.toString(),
      startDate: startDateRaw ? new Date(startDateRaw) : null,
      endDate: endDateRaw ? new Date(endDateRaw) : null,
      reportingFrequency: reportingFrequency || null,
      nextReportDue,
      lastReportSubmitted,
      applicationDeadline,
      reportDueDate,
      awardAmount: Number.isFinite(awardAmountValue)
        ? new Prisma.Decimal(awardAmountValue as number)
        : null,
      complianceStatus,
      departmentId,
      programId,
    },
  });

  await checkGrantComplianceAlerts({
    grant: {
      id: updated.id,
      name: updated.name,
      organizationId: updated.organizationId,
      departmentId: updated.departmentId,
      programId: updated.programId,
      nextReportDue: updated.nextReportDue,
    },
  });

  await createAuditLog({
    action: "GRANT_UPDATE",
    entityType: "Grant",
    entityId: updated.id,
    userId: user.id,
    organizationId,
  });

  revalidatePath("/dashboard/grants");
  revalidatePath("/dashboard/grants/pipeline");
  revalidatePath("/dashboard/grants/compliance");
  revalidatePath("/dashboard/departments");
  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath("/public/[slug]");
}

export async function toggleGrantPublic(id: string) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const role = user.role as AppRole;
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }
  const organizationId = requireOrganization(session);

  const existing = await db().grant.findFirst({
    where: {
      id,
      organizationId,
    },
    select: {
      id: true,
      isPublic: true,
    },
  });

  if (!existing) {
    throw new Error("Grant not found.");
  }

  const updated = await db().grant.update({
    where: { id: existing.id },
    data: { isPublic: !existing.isPublic },
  });

  await createAuditLog({
    action: updated.isPublic ? "GRANT_PUBLISH" : "GRANT_UNPUBLISH",
    entityType: "Grant",
    entityId: updated.id,
    userId: user.id,
    organizationId,
  });

  revalidatePath("/dashboard/grants");
  revalidatePath("/dashboard/grants/pipeline");
  revalidatePath("/dashboard/grants/compliance");
  revalidatePath("/dashboard/departments");
  revalidatePath("/dashboard/programs");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath("/public/[slug]");
}

export async function deleteGrant(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const role = user.role as AppRole;
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }
  const organizationId = requireOrganization(session);

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Missing Grant id.");
  }

  const existing = await db().grant.findFirst({
    where: {
      id,
      organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new Error("Grant not found.");
  }

  await db().grant.delete({
    where: { id: existing.id },
  });

  await createAuditLog({
    action: "GRANT_DELETE",
    entityType: "Grant",
    entityId: existing.id,
    userId: user.id,
    organizationId,
  });

  revalidatePath("/dashboard/grants");
  revalidatePath("/dashboard/grants/pipeline");
  revalidatePath("/dashboard/grants/compliance");
  revalidatePath("/dashboard/departments");
  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard");
  revalidatePath(`/public/${user.organizationSlug}`);
  revalidatePath("/public/[slug]");
}

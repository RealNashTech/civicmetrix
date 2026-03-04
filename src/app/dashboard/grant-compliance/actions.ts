"use server";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

function ensureEditor(role: AppRole) {
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }
}

export async function createMilestone(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  ensureEditor(user.role as AppRole);

  const grantId = String(formData.get("grantId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();

  if (!grantId || !name || !dueDateRaw) {
    throw new Error("Grant, name, and due date are required.");
  }

  const dueDate = new Date(dueDateRaw);
  if (Number.isNaN(dueDate.getTime())) {
    throw new Error("Invalid due date.");
  }

  const grant = await db().grant.findFirst({
    where: {
      id: grantId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!grant) {
    throw new Error("Invalid grant.");
  }

  const created = await db().grantMilestone.create({
    data: {
      grantId: grant.id,
      name,
      description: description || null,
      dueDate,
    },
  });

  await createAuditLog({
    action: "GRANT_MILESTONE_CREATE",
    entityType: "GrantMilestone",
    entityId: created.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/grant-compliance");
}

export async function createDeliverable(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  ensureEditor(user.role as AppRole);

  const milestoneId = String(formData.get("milestoneId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!milestoneId || !description) {
    throw new Error("Milestone and description are required.");
  }

  const milestone = await db().grantMilestone.findFirst({
    where: {
      id: milestoneId,
      grant: {
        organizationId: user.organizationId,
      },
    },
    select: { id: true },
  });

  if (!milestone) {
    throw new Error("Invalid milestone.");
  }

  const created = await db().grantDeliverable.create({
    data: {
      milestoneId: milestone.id,
      description,
    },
  });

  await createAuditLog({
    action: "GRANT_DELIVERABLE_CREATE",
    entityType: "GrantDeliverable",
    entityId: created.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/grant-compliance");
}

export async function toggleMilestoneCompletion(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  ensureEditor(user.role as AppRole);

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Missing milestone id.");
  }

  const existing = await db().grantMilestone.findFirst({
    where: {
      id,
      grant: {
        organizationId: user.organizationId,
      },
    },
    select: { id: true, completed: true },
  });

  if (!existing) {
    throw new Error("Milestone not found.");
  }

  await db().grantMilestone.update({
    where: { id: existing.id },
    data: { completed: !existing.completed },
  });

  await createAuditLog({
    action: "GRANT_MILESTONE_TOGGLE",
    entityType: "GrantMilestone",
    entityId: existing.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/grant-compliance");
  revalidatePath("/dashboard/city-operations");
}

export async function toggleDeliverableCompletion(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  ensureEditor(user.role as AppRole);

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Missing deliverable id.");
  }

  const existing = await db().grantDeliverable.findFirst({
    where: {
      id,
      milestone: {
        grant: {
          organizationId: user.organizationId,
        },
      },
    },
    select: { id: true, completed: true },
  });

  if (!existing) {
    throw new Error("Deliverable not found.");
  }

  await db().grantDeliverable.update({
    where: { id: existing.id },
    data: { completed: !existing.completed },
  });

  await createAuditLog({
    action: "GRANT_DELIVERABLE_TOGGLE",
    entityType: "GrantDeliverable",
    entityId: existing.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/grant-compliance");
  revalidatePath("/dashboard/city-operations");
}

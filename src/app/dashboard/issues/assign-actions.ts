"use server";

import { revalidatePath } from "next/cache";
import { IssuePriority } from "@prisma/client";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit";
import { createNotification, notifyOrganizationEditors } from "@/lib/notifications";
import { hasDepartmentAccess } from "@/lib/permissions";
import { db } from "@/lib/db";
import { requireStaffUser } from "@/lib/security/authorization";

type IssueAssignmentInput = {
  id: string;
  assignedDepartmentId?: string | null;
  priority?: IssuePriority | null;
  assignedUserId?: string | null;
};

const issueAssignmentSchema = z.object({
  id: z.string().trim().min(1, "Issue id is required."),
  assignedDepartmentId: z.string().trim().optional().nullable(),
  priority: z.nativeEnum(IssuePriority).optional().nullable(),
  assignedUserId: z.string().trim().optional().nullable(),
});

const updatePriorityFormSchema = z.object({
  id: z.string().trim().min(1, "Missing issue id."),
  priority: z.string().trim().optional(),
});

const reassignDepartmentFormSchema = z.object({
  id: z.string().trim().min(1, "Missing issue id."),
  assignedDepartmentId: z.string().trim().optional(),
});

async function requireIssueScope(id: string) {
  const user = await requireStaffUser("EDITOR");

  const issue = await db().issueReport.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true, organizationId: true, departmentId: true, assignedDepartmentId: true },
  });

  if (!issue) {
    throw new Error("Issue not found.");
  }

  const scopedDepartmentId = issue.assignedDepartmentId ?? issue.departmentId;
  if (scopedDepartmentId) {
    const canAccess = await hasDepartmentAccess(user.id, scopedDepartmentId);
    if (!canAccess) {
      throw new Error("No department access for this issue.");
    }
  }

  return { user, issue };
}

function revalidateIssueViews() {
  revalidatePath("/dashboard/issues");
  revalidatePath("/dashboard/issues/board");
  revalidatePath("/dashboard/command-center");
  revalidatePath("/dashboard/executive");
}

export async function assignIssue(input: IssueAssignmentInput) {
  const parsedInput = issueAssignmentSchema.parse({
    ...input,
    assignedDepartmentId: input.assignedDepartmentId ?? null,
    priority: input.priority ?? null,
    assignedUserId: input.assignedUserId ?? null,
  });

  const { user, issue } = await requireIssueScope(parsedInput.id);

  let assignedDepartmentId: string | null = null;
  if (parsedInput.assignedDepartmentId) {
    const department = await db().department.findFirst({
      where: {
        id: parsedInput.assignedDepartmentId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });
    if (!department) {
      throw new Error("Invalid assigned department.");
    }
    assignedDepartmentId = department.id;

    const hasAccess = await hasDepartmentAccess(user.id, assignedDepartmentId);
    if (!hasAccess) {
      throw new Error("No permission to assign this department.");
    }
  }

  const assignedUserId = parsedInput.assignedUserId ?? null;
  if (assignedUserId) {
    const assignedUser = await db().user.findFirst({
      where: {
        id: assignedUserId,
        organizationId: issue.organizationId,
      },
      select: { id: true },
    });

    if (!assignedUser) {
      throw new Error("User does not belong to this organization");
    }
  }

  await db().issueReport.update({
    where: { id: issue.id },
    data: {
      assignedDepartmentId,
      priority: input.priority ?? null,
      assignedUserId,
    },
  });

  await createAuditLog({
    action: "ISSUE_ASSIGNED",
    entityType: "IssueReport",
    entityId: issue.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  if (assignedUserId) {
    await createNotification({
      userId: assignedUserId,
      message: `You were assigned issue ${issue.id}.`,
      link: "/dashboard/issues",
    });
  } else {
    await notifyOrganizationEditors(
      user.organizationId,
      `Issue assigned: ${issue.id}`,
      "/dashboard/issues",
    );
  }

  revalidateIssueViews();
}

export async function updatePriority(formData: FormData) {
  const parsed = updatePriorityFormSchema.parse({
    id: formData.get("id"),
    priority: formData.get("priority"),
  });
  const priority = parsed.priority ? (parsed.priority as IssuePriority) : null;
  if (priority && !Object.values(IssuePriority).includes(priority)) {
    throw new Error("Invalid priority.");
  }

  await assignIssue({ id: parsed.id, priority });
}

export async function reassignDepartment(formData: FormData) {
  const parsed = reassignDepartmentFormSchema.parse({
    id: formData.get("id"),
    assignedDepartmentId: formData.get("assignedDepartmentId"),
  });

  await assignIssue({
    id: parsed.id,
    assignedDepartmentId: parsed.assignedDepartmentId || null,
  });
}

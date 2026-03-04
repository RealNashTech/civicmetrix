"use server";

import { revalidatePath } from "next/cache";
import { IssuePriority } from "@prisma/client";

import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { createNotification, notifyOrganizationEditors } from "@/lib/notifications";
import { hasDepartmentAccess, hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

type IssueAssignmentInput = {
  id: string;
  assignedDepartmentId?: string | null;
  priority?: IssuePriority | null;
  assignedUserId?: string | null;
};

async function requireIssueScope(id: string) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const role = user.role as AppRole;
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }

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
  const { user, issue } = await requireIssueScope(input.id);

  let assignedDepartmentId: string | null = null;
  if (input.assignedDepartmentId) {
    const department = await db().department.findFirst({
      where: {
        id: input.assignedDepartmentId,
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

  const assignedUserId = input.assignedUserId ?? null;
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
  const id = String(formData.get("id") ?? "").trim();
  const rawPriority = String(formData.get("priority") ?? "").trim();
  if (!id) {
    throw new Error("Missing issue id.");
  }

  const priority = rawPriority ? (rawPriority as IssuePriority) : null;
  if (priority && !Object.values(IssuePriority).includes(priority)) {
    throw new Error("Invalid priority.");
  }

  await assignIssue({ id, priority });
}

export async function reassignDepartment(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const assignedDepartmentId = String(formData.get("assignedDepartmentId") ?? "").trim();
  if (!id) {
    throw new Error("Missing issue id.");
  }

  await assignIssue({
    id,
    assignedDepartmentId: assignedDepartmentId || null,
  });
}

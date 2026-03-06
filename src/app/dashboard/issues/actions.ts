"use server";

import { revalidatePath } from "next/cache";
import { IssueStatus, WorkOrderPriority, WorkOrderStatus } from "@prisma/client";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit";
import { createEvent } from "@/lib/events";
import { createCitizenNotification } from "@/lib/notifications";
import { db } from "@/lib/db";
import { requireStaffUser } from "@/lib/security/authorization";

const issueIdSchema = z.object({
  id: z.string().trim().min(1, "Missing issue id."),
});

const createWorkOrderSchema = z.object({
  issueId: z.string().trim().min(1, "Missing issue id."),
});

const addCommentSchema = z.object({
  issueId: z.string().trim().min(1, "Issue is required."),
  message: z.string().trim().min(1, "Message is required."),
});

async function updateIssueStatus(id: string, status: IssueStatus, action: string) {
  const user = await requireStaffUser("EDITOR");

  const existing = await db().issueReport.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      status: true,
      citizenId: true,
    },
  });

  if (!existing) {
    throw new Error("Issue not found.");
  }

  if (existing.status === status) {
    return;
  }

  await db().issueReport.update({
    where: { id: existing.id },
    data: {
      status,
      resolvedAt: status === IssueStatus.RESOLVED ? new Date() : null,
    },
  });

  await createAuditLog({
    action,
    entityType: "IssueReport",
    entityId: existing.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  if (existing.citizenId) {
    await createCitizenNotification({
      citizenId: existing.citizenId,
      message: `Your issue ${existing.id} status was updated to ${status.replace("_", " ")}.`,
    });
  }

  revalidatePath("/dashboard/issues");
  revalidatePath("/dashboard/issues/board");
  revalidatePath("/dashboard/command-center");
  revalidatePath("/dashboard/executive");
}

function mapIssuePriorityToWorkOrderPriority(priority: string | null): WorkOrderPriority | null {
  if (!priority) {
    return null;
  }

  if (Object.values(WorkOrderPriority).includes(priority as WorkOrderPriority)) {
    return priority as WorkOrderPriority;
  }

  return null;
}

export async function markInProgress(formData: FormData) {
  const parsed = issueIdSchema.parse({ id: formData.get("id") });
  await updateIssueStatus(parsed.id, IssueStatus.IN_PROGRESS, "ISSUE_MARK_IN_PROGRESS");
}

export async function markResolved(formData: FormData) {
  const parsed = issueIdSchema.parse({ id: formData.get("id") });
  await updateIssueStatus(parsed.id, IssueStatus.RESOLVED, "ISSUE_MARK_RESOLVED");
}

export async function createWorkOrderFromIssue(formData: FormData) {
  const user = await requireStaffUser("EDITOR");

  const parsed = createWorkOrderSchema.parse({ issueId: formData.get("issueId") });

  const issue = await db().issueReport.findFirst({
    where: {
      id: parsed.issueId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      assetId: true,
      departmentId: true,
      priority: true,
    },
  });

  if (!issue) {
    throw new Error("Issue not found.");
  }

  const existing = await db().workOrder.findFirst({
    where: {
      organizationId: user.organizationId,
      issueId: issue.id,
      status: {
        in: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.BLOCKED],
      },
    },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  const workOrder = await db().workOrder.create({
    data: {
      organizationId: user.organizationId,
      issueId: issue.id,
      assetId: issue.assetId,
      departmentId: issue.departmentId,
      title: `Work Order: ${issue.title}`,
      description: issue.description ?? null,
      status: WorkOrderStatus.OPEN,
      priority: mapIssuePriorityToWorkOrderPriority(issue.priority),
      scheduledDate: new Date(),
    },
  });

  await createEvent({
    organizationId: user.organizationId,
    type: "WORK_ORDER_CREATE",
    entityType: "WORK_ORDER",
    entityId: workOrder.id,
    payload: {
      issueId: workOrder.issueId,
      assetId: workOrder.assetId,
      departmentId: workOrder.departmentId,
      priority: workOrder.priority,
      status: workOrder.status,
    },
  });

  await createAuditLog({
    action: "WORK_ORDER_CREATE_FROM_ISSUE",
    entityType: "WorkOrder",
    entityId: workOrder.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/issues");
  revalidatePath("/dashboard/work-orders");
  revalidatePath("/dashboard/city-operations");
}

export async function addStaffIssueComment(formData: FormData) {
  const user = await requireStaffUser("EDITOR");

  const parsed = addCommentSchema.parse({
    issueId: formData.get("issueId"),
    message: formData.get("message"),
  });

  const issue = await db().issueReport.findFirst({
    where: {
      id: parsed.issueId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      citizenId: true,
    },
  });

  if (!issue) {
    throw new Error("Issue not found.");
  }

  const comment = await db().issueComment.create({
    data: {
      issueId: issue.id,
      message: parsed.message,
      authorType: "STAFF",
    },
  });

  await createAuditLog({
    action: "ISSUE_COMMENT_STAFF",
    entityType: "IssueComment",
    entityId: comment.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  if (issue.citizenId) {
    await createCitizenNotification({
      citizenId: issue.citizenId,
      message: `Staff responded to your issue ${issue.id}.`,
    });
  }

  revalidatePath("/dashboard/issues");
  revalidatePath(`/citizen/issues/${issue.id}`);
  revalidatePath("/citizen/dashboard");
}

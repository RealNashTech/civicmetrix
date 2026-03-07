"use server";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit";
import { requireCitizenSession } from "@/lib/citizen-auth";
import { notifyOrganizationEditors } from "@/lib/notifications";
import { dbSystem } from "@/lib/db";

type AddCitizenCommentInput = {
  issueId: string;
  message: string;
};

export async function addCitizenComment(input: AddCitizenCommentInput) {
  const citizen = await requireCitizenSession();
  const issueId = input.issueId.trim();
  const message = input.message.trim();

  if (!issueId || !message) {
    throw new Error("Issue id and message are required.");
  }

  const issue = await dbSystem().issueReport.findFirst({
    where: {
      id: issueId,
      citizenId: citizen.citizenId,
      organizationId: citizen.organizationId,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!issue) {
    throw new Error("Issue not found.");
  }

  const comment = await dbSystem().issueComment.create({
    data: {
      issueId: issue.id,
      message,
      authorType: "CITIZEN",
    },
  });

  await createAuditLog({
    action: "ISSUE_COMMENT_CITIZEN",
    entityType: "IssueComment",
    entityId: comment.id,
    userId: citizen.citizenId!,
    organizationId: citizen.organizationId,
  });

  await notifyOrganizationEditors(
    issue.organizationId,
    `Citizen comment added on issue ${issue.id}.`,
    "/dashboard/issues",
  );

  revalidatePath(`/citizen/issues/${issue.id}`);
  revalidatePath("/dashboard/issues");
}

export async function markNotificationsRead() {
  const citizen = await requireCitizenSession();

  await dbSystem().citizenNotification.updateMany({
    where: {
      citizenId: citizen.citizenId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  revalidatePath("/citizen/dashboard");
}

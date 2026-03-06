import { dbSystem } from "@/lib/db";

type SlaIssueInput = {
  id: string;
  organizationId: string;
  category: string;
};

export async function calculateIssueSLA(issue: SlaIssueInput) {
  const policy = await dbSystem().sLAPolicy.findFirst({
    where: {
      organizationId: issue.organizationId,
      issueCategory: issue.category,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      responseHours: true,
      resolutionHours: true,
    },
  });

  if (!policy) {
    return null;
  }

  const now = new Date();
  const responseDueAt = new Date(now.getTime() + policy.responseHours * 60 * 60 * 1000);
  const resolutionDueAt = new Date(now.getTime() + policy.resolutionHours * 60 * 60 * 1000);

  return {
    responseDueAt,
    resolutionDueAt,
  };
}

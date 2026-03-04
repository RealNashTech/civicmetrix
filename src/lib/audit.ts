import { db } from "@/lib/db";

type AuditInput = {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  organizationId: string;
};

export async function createAuditLog(input: AuditInput) {
  console.log("AUDIT INPUT:", input);

  await db().auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId,
      organizationId: input.organizationId,
    },
  });
}

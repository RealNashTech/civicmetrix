import { dbSystem } from "@/lib/db";

type AuditInput = {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  organizationId: string;
};

export async function createAuditLog(input: AuditInput) {
  const immutableInput = Object.freeze({ ...input });

  await dbSystem().auditLog.create({
    data: {
      action: immutableInput.action,
      entityType: immutableInput.entityType,
      entityId: immutableInput.entityId,
      userId: immutableInput.userId,
      organizationId: immutableInput.organizationId,
    },
  });
}

export async function updateAuditLog() {
  throw new Error("AuditLog is immutable: updates are not allowed.");
}

export async function deleteAuditLog() {
  throw new Error("AuditLog is immutable: deletes are not allowed.");
}

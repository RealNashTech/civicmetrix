import "server-only";
import { db } from "@/lib/db";

const AUDIT_PAGE_LIMIT = 25;

export async function getAuditLogsForOrg(
  organizationId: string,
  page: number
) {
  const skip = (page - 1) * AUDIT_PAGE_LIMIT;

  const [logs, total] = await Promise.all([
    db().auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      skip,
      take: AUDIT_PAGE_LIMIT,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        userId: true,
        organizationId: true,
        createdAt: true,
      },
    }),
    db().auditLog.count({
      where: { organizationId },
    }),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / AUDIT_PAGE_LIMIT),
  };
}

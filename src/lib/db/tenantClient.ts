import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

export async function getTenantDb<T>(
  organizationId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  // Escape single quotes to avoid breaking the SQL string literal.
  const safeOrganizationId = organizationId.replace(/'/g, "''");

  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${safeOrganizationId}'`);
    return fn(tx as Prisma.TransactionClient);
  });
}

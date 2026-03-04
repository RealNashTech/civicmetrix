import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type CreateEventInput = {
  organizationId: string;
  type: string;
  entityType: string;
  entityId?: string | null;
  payload?: Prisma.InputJsonValue;
};

export async function createEvent({
  organizationId,
  type,
  entityType,
  entityId,
  payload,
}: CreateEventInput) {
  return db().event.create({
    data: {
      organizationId,
      type,
      entityType,
      entityId: entityId ?? null,
      payload: payload ?? undefined,
    },
  });
}

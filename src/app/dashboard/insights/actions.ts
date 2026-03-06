"use server";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireStaffUser } from "@/lib/security/authorization";

export async function resolveInsight(formData: FormData) {
  const user = await requireStaffUser("EDITOR");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Missing insight id.");
  }

  const existing = await db().insight.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      resolvedAt: true,
    },
  });

  if (!existing) {
    throw new Error("Insight not found.");
  }

  if (existing.resolvedAt) {
    return;
  }

  const updated = await db().insight.update({
    where: { id: existing.id },
    data: {
      resolvedAt: new Date(),
    },
  });

  await createAuditLog({
    action: "INSIGHT_RESOLVE",
    entityType: "Insight",
    entityId: updated.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/insights");
  revalidatePath("/dashboard/executive");
  revalidatePath("/dashboard/command-center");
}

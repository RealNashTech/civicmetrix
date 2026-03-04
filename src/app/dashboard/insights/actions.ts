"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

export async function resolveInsight(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const role = user.role as AppRole;
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }

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

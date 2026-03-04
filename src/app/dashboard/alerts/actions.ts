"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

export async function resolveAlert(formData: FormData) {
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
    throw new Error("Missing alert id.");
  }

  const existing = await db().alert.findFirst({
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
    throw new Error("Alert not found.");
  }

  if (existing.resolvedAt) {
    return;
  }

  const updated = await db().alert.update({
    where: { id: existing.id },
    data: {
      resolvedAt: new Date(),
    },
  });

  await createAuditLog({
    action: "ALERT_RESOLVE",
    entityType: "Alert",
    entityId: updated.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/alerts");
  revalidatePath("/dashboard/command-center");
}

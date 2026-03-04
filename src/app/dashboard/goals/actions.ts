"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

function requireEditor(role: AppRole) {
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }
}

export async function createGoal(formData: FormData) {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    throw new Error("Unauthorized.");
  }

  requireEditor(user.role as AppRole);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const targetYearRaw = String(formData.get("targetYear") ?? "").trim();
  const targetYear = targetYearRaw ? Number.parseInt(targetYearRaw, 10) : null;

  if (!title) {
    throw new Error("Goal title is required.");
  }

  const goal = await db().strategicGoal.create({
    data: {
      organizationId: user.organizationId,
      title,
      description: description || null,
      targetYear: Number.isFinite(targetYear) ? targetYear : null,
    },
  });

  await createAuditLog({
    action: "GOAL_CREATE",
    entityType: "StrategicGoal",
    entityId: goal.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard/command-center");
  revalidatePath("/dashboard/reports/council");
}

export async function createObjective(formData: FormData) {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    throw new Error("Unauthorized.");
  }

  requireEditor(user.role as AppRole);

  const goalId = String(formData.get("goalId") ?? "").trim();
  const programId = String(formData.get("programId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const progressRaw = String(formData.get("progressPercent") ?? "").trim();
  const progress = Number.parseInt(progressRaw || "0", 10);

  if (!goalId || !title) {
    throw new Error("Goal and title are required.");
  }

  const goal = await db().strategicGoal.findFirst({
    where: {
      id: goalId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });
  if (!goal) {
    throw new Error("Invalid goal.");
  }

  let validProgramId: string | null = null;
  if (programId) {
    const program = await db().program.findFirst({
      where: {
        id: programId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });
    if (!program) {
      throw new Error("Invalid program.");
    }
    validProgramId = program.id;
  }

  const objective = await db().strategicObjective.create({
    data: {
      goalId: goal.id,
      programId: validProgramId,
      title,
      description: description || null,
      progressPercent: Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0,
    },
  });

  await createAuditLog({
    action: "OBJECTIVE_CREATE",
    entityType: "StrategicObjective",
    entityId: objective.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard/command-center");
  revalidatePath("/dashboard/reports/council");
}

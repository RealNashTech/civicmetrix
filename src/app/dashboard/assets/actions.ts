"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

export async function createAsset(formData: FormData) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }

  const role = user.role as AppRole;
  if (!hasMinimumRole(role, "EDITOR")) {
    throw new Error("Forbidden.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() || "ACTIVE";
  const address = String(formData.get("address") ?? "").trim();
  const rawDepartmentId = String(formData.get("departmentId") ?? "").trim();
  const rawLatitude = String(formData.get("latitude") ?? "").trim();
  const rawLongitude = String(formData.get("longitude") ?? "").trim();
  const rawConditionScore = String(formData.get("conditionScore") ?? "").trim();
  const rawInstallDate = String(formData.get("installDate") ?? "").trim();

  if (!name || !type) {
    throw new Error("Asset name and type are required.");
  }

  const latitude = rawLatitude ? Number.parseFloat(rawLatitude) : null;
  const longitude = rawLongitude ? Number.parseFloat(rawLongitude) : null;
  const conditionScore = rawConditionScore ? Number.parseInt(rawConditionScore, 10) : null;
  const installDate = rawInstallDate ? new Date(rawInstallDate) : null;

  if ((latitude !== null && Number.isNaN(latitude)) || (longitude !== null && Number.isNaN(longitude))) {
    throw new Error("Invalid coordinates.");
  }

  if (conditionScore !== null && (Number.isNaN(conditionScore) || conditionScore < 0 || conditionScore > 100)) {
    throw new Error("Condition score must be between 0 and 100.");
  }

  let departmentId: string | null = null;
  if (rawDepartmentId) {
    const department = await db().department.findFirst({
      where: {
        id: rawDepartmentId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });

    if (!department) {
      throw new Error("Invalid department.");
    }

    departmentId = department.id;
  }

  const created = await db().asset.create({
    data: {
      organizationId: user.organizationId,
      departmentId,
      name,
      type,
      latitude,
      longitude,
      address: address || null,
      installDate,
      conditionScore,
      status,
    },
  });

  await createAuditLog({
    action: "ASSET_CREATE",
    entityType: "Asset",
    entityId: created.id,
    userId: user.id,
    organizationId: user.organizationId,
  });

  revalidatePath("/dashboard/assets");
  revalidatePath("/dashboard/assets/map");
  revalidatePath("/dashboard/city-operations");
}

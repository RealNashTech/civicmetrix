"use server";

import { revalidatePath } from "next/cache";

import { requireCitizenSession } from "@/lib/citizen-auth";
import { dbSystem } from "@/lib/db";

export async function markCitizenNotificationsRead() {
  const citizen = await requireCitizenSession();

  await dbSystem().citizenNotification.updateMany({
    where: {
      citizenId: citizen.citizenId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  revalidatePath("/citizen/dashboard");
}

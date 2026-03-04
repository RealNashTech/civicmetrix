"use server";

import { revalidatePath } from "next/cache";

import { requireCitizenSession } from "@/lib/citizen-auth";
import { db } from "@/lib/db";

export async function markCitizenNotificationsRead() {
  const citizen = await requireCitizenSession();

  await db().citizenNotification.updateMany({
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

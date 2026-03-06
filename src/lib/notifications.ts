import { db } from "@/lib/db";

type NotificationInput = {
  userId: string;
  message: string;
  link?: string | null;
};

export async function createNotification(input: NotificationInput) {
  await db().notification.create({
    data: {
      userId: input.userId,
      message: input.message,
      link: input.link ?? null,
    },
  });
}

export async function notifyOrganizationEditors(
  organizationId: string,
  message: string,
  link?: string,
  client = db(),
) {
  const recipients = await client.user.findMany({
    where: {
      organizationId,
      role: {
        in: ["ADMIN", "EDITOR"],
      },
    },
    select: { id: true },
  });

  if (recipients.length === 0) {
    return;
  }

  await client.notification.createMany({
    data: recipients.map((recipient) => ({
      userId: recipient.id,
      message,
      link: link ?? null,
    })),
  });
}

type CitizenNotificationInput = {
  citizenId: string;
  message: string;
};

export async function createCitizenNotification(input: CitizenNotificationInput) {
  await db().citizenNotification.create({
    data: {
      citizenId: input.citizenId,
      message: input.message,
    },
  });
}

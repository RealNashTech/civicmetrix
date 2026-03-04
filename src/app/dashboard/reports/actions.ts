"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { db } from "@/lib/db";
import { generateCouncilReport } from "@/lib/reports/generate-council-report";

export async function createCouncilReport() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized.");
  }
  const organizationId = requireOrganization(session);

  const summary = await generateCouncilReport(organizationId);

  await db().councilReport.create({
    data: {
      organizationId,
      generatedById: user.id,
      reportDate: new Date(),
      summary,
    },
  });

  revalidatePath("/dashboard/reports");
}

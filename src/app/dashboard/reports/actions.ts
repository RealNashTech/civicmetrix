"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { generateCouncilReport } from "@/lib/reports/generate-council-report";
import { requireStaffUser } from "@/lib/security/authorization";

export async function createCouncilReport() {
  const user = await requireStaffUser();
  const organizationId = user.organizationId;

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

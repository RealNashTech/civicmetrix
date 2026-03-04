import { db } from "@/lib/db";

export async function getGrantPipeline(organizationId: string) {
  const [pipeline, submitted, awarded] = await Promise.all([
    db().grant.count({
      where: { organizationId, status: "PIPELINE" }
    }),
    db().grant.count({
      where: { organizationId, status: "SUBMITTED" }
    }),
    db().grant.count({
      where: { organizationId, status: "AWARDED" }
    })
  ])

  return {
    pipeline,
    submitted,
    awarded
  }
}

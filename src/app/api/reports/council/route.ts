import { dbSystem } from "@/lib/db"

export async function GET() {
  const org = await dbSystem().organization.findFirst()

  if (!org) {
    return Response.json(
      {
        organization: null,
        summary: {
          kpis: 0,
          grants: 0,
          issues: 0,
          assets: 0,
          activeRisks: 0,
        },
        generatedAt: new Date(),
      },
      { status: 404 }
    )
  }

  const kpis = await dbSystem().kPI.findMany({
    where: { organizationId: org.id },
  })

  const grants = await dbSystem().grant.findMany({
    where: { organizationId: org.id },
  })

  const issues = await dbSystem().issueReport.findMany({
    where: { organizationId: org.id },
  })

  const assets = await dbSystem().asset.findMany({
    where: { organizationId: org.id },
  })

  const insights = await dbSystem().insight.findMany({
    where: {
      organizationId: org.id,
      resolvedAt: null,
    },
  })

  return Response.json({
    organization: org.name,
    summary: {
      kpis: kpis.length,
      grants: grants.length,
      issues: issues.length,
      assets: assets.length,
      activeRisks: insights.length,
    },
    generatedAt: new Date(),
  })
}

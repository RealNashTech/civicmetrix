import { auth } from "@/lib/auth"
import { requireOrganization } from "@/lib/auth/require-org"
import { dbSystem } from "@/lib/db"
import { hasMinimumRole } from "@/lib/permissions"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.role || !hasMinimumRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }
  const organizationId = requireOrganization(session)

  const org = await dbSystem().organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  })

  if (!org) {
    return NextResponse.json(
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

  const [kpiCount, grantCount, issueCount, assetCount, activeRiskCount] = await Promise.all([
    dbSystem().kPI.count({
      where: { organizationId },
    }),
    dbSystem().grant.count({
      where: { organizationId },
    }),
    dbSystem().issueReport.count({
      where: { organizationId },
    }),
    dbSystem().asset.count({
      where: { organizationId },
    }),
    dbSystem().insight.count({
      where: {
        organizationId,
        resolvedAt: null,
      },
    }),
  ])

  return NextResponse.json({
    organization: org.name,
    summary: {
      kpis: kpiCount,
      grants: grantCount,
      issues: issueCount,
      assets: assetCount,
      activeRisks: activeRiskCount,
    },
    generatedAt: new Date(),
  })
}

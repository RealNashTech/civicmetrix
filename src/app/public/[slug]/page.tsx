import { dbSystem } from "@/lib/db"
import IssueHeatmap from "@/components/demo/IssueHeatmap"
import GrantFlowChart from "@/components/demo/GrantFlowChart"
import AssetHealthChart from "@/components/demo/AssetHealthChart"
import Link from "next/link"

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString()}`
}

export default async function PublicCityPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const client = dbSystem()
  let organization: { id: string; name: string; slug: string } | null = null

  try {
    organization = await client.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    })
  } catch (err) {
    console.error("Organization query failed", err)
  }

  if (!organization) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-semibold">Demo City Not Found</h1>
        <p className="text-slate-500 mt-2">
          No organization exists for slug: {slug}
        </p>
      </div>
    )
  }

  let kpis: Array<{
    id: string
    name: string
    unit: string | null
    value: number
    target: number | null
  }> = []

  let publicGrants: Array<{
    id: string
    name: string
    amount: unknown
    departmentName: string
  }> = []

  let grantRows: Array<{
    id: string
    name: string
    amount: unknown
    department: {
      name: string
    } | null
  }> = []

  let issueRows: Array<{ latitude: number | null; longitude: number | null; category: string | null }> = []

  let kpiHistory: Array<{ kpiId: string; value: unknown; recordedAt: Date }> = []

  let insights: Array<{
    id: string
    severity: string
    title: string
    description: string
  }> = []

  let assetRows: Array<{
    id: string
    name: string
    conditionScore: number | null
  }> = []

  try {
    await client.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT set_config('app.current_tenant', ${organization.id}, true)
      `

      const [kpiRows, grantQueryRows, issueQueryRows, kpiHistoryRows, insightRows, assetQueryRows] =
        await Promise.all([
          tx.kPI.findMany({
            where: {
              organizationId: organization.id,
              isPublic: true,
            },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              unit: true,
              value: true,
              target: true,
            },
          }),
          tx.grant.findMany({
            where: {
              organizationId: organization.id,
              isPublic: true,
            },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              amount: true,
              department: {
                select: {
                  name: true,
                },
              },
            },
          }),
          tx.issueReport.findMany({
            where: {
              organizationId: organization.id,
            },
            select: {
              latitude: true,
              longitude: true,
              category: true,
            },
          }),
          tx.kPIHistory.findMany({
            where: {
              kpi: {
                organizationId: organization.id,
                isPublic: true,
              },
            },
            select: {
              kpiId: true,
              value: true,
              recordedAt: true,
            },
            orderBy: { recordedAt: "asc" },
          }),
          tx.insight.findMany({
            where: {
              organizationId: organization.id,
              resolvedAt: null,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 6,
            select: {
              id: true,
              severity: true,
              title: true,
              description: true,
            },
          }),
          tx.asset.findMany({
            where: {
              organizationId: organization.id,
            },
            select: {
              id: true,
              name: true,
              conditionScore: true,
            },
          }),
        ])

      kpis = kpiRows
      grantRows = grantQueryRows
      issueRows = issueQueryRows
      kpiHistory = kpiHistoryRows
      insights = insightRows
      assetRows = assetQueryRows
    })

    publicGrants = grantRows.map((grant) => ({
      id: grant.id,
      name: grant.name,
      amount: grant.amount,
      departmentName: grant.department?.name ?? "Unassigned",
    }))
  } catch (error) {
    console.error("Public dashboard data query failed:", error)
  }

  const issueData = issueRows.map(i => ({
    latitude: i.latitude,
    longitude: i.longitude,
    category: i.category,
  }))
    .map((issue) => ({
      latitude:
        issue.latitude == null ? Number.NaN : Number(issue.latitude),
      longitude:
        issue.longitude == null ? Number.NaN : Number(issue.longitude),
    }))
    .filter(
      (issue) =>
        Number.isFinite(issue.latitude) &&
        Number.isFinite(issue.longitude)
    )

  const grantData = grantRows.map(g => ({
    department: g.department?.name ?? "Unknown",
    amount: Number(g.amount)
  }))
    .filter((grant) => Number.isFinite(grant.amount))

  const assetData = assetRows.map(a => ({
    name: a.name,
    conditionScore: Number(a.conditionScore)
  }))
    .filter((asset) => Number.isFinite(asset.conditionScore))

  const highRiskAssets = assetRows
    .filter((a) => Number(a.conditionScore ?? 0) < 40)
    .slice(0, 5)

  const totalGrantFunding = publicGrants.reduce(
    (total, grant) => total + Number(grant.amount),
    0
  )
  const averageKpiValue =
    kpis.length > 0 ? kpis.reduce((total, kpi) => total + Number(kpi.value), 0) / kpis.length : 0
  const kpisOnTarget = kpis.filter((kpi) => kpi.target != null && Number(kpi.value) >= Number(kpi.target)).length

  const issuesCount = issueData.length
  const grantsCount = grantData.length
  const assetsCount = assetData.length

  function severityColor(severity: string) {
    switch (severity) {
      case "HIGH":
        return "text-red-600"
      case "MEDIUM":
        return "text-yellow-600"
      case "LOW":
        return "text-green-600"
      case "CRITICAL":
        return "text-red-600"
      case "WARNING":
        return "text-yellow-600"
      case "INFO":
        return "text-green-600"
      default:
        return "text-slate-600"
    }
  }

  console.log("PUBLIC DASHBOARD DATA", {
    issuesCount,
    grantsCount,
    assetsCount,
  })

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <section className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-semibold">{organization.name}</h1>
          <Link
            href={`/public/${organization.slug}/council-report`}
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            View Weekly Council Report
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-slate-500">Public KPIs</p>
          <p className="mt-1 text-2xl font-semibold">{kpis.length}</p>
        </section>
        <section className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-slate-500">Total Grant Funding</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalGrantFunding)}</p>
        </section>
        <section className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-slate-500">KPIs Meeting Target</p>
          <p className="mt-1 text-2xl font-semibold">
            {kpisOnTarget}/{kpis.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Average KPI value: {averageKpiValue.toFixed(1)}</p>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white rounded-xl shadow p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Civic Issue Map</h2>
          <IssueHeatmap data={issueData} slug={organization.slug} />
        </section>

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold">Civic Risk Engine</h2>
          <p className="text-sm text-slate-500 mt-1">
            Automated analysis of civic operations and infrastructure risk.
          </p>

          <div className="mt-6 space-y-3">
            {insights.length === 0 && (
              <p className="text-sm text-slate-500">
                No active civic risks detected.
              </p>
            )}

            {insights.map((insight) => (
              <div key={insight.id} className="border rounded-lg p-4">
                <p className={`text-sm font-semibold ${severityColor(insight.severity)}`}>
                  {insight.severity} RISK
                </p>
                <p className="mt-1 font-medium">{insight.title}</p>
                <p className="text-sm text-slate-500 mt-1">{insight.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700">High Risk Infrastructure</h3>
            <ul className="space-y-2 mt-3">
              {highRiskAssets.map((asset) => (
                <li key={asset.id} className="border rounded p-3">
                  <p className="font-medium">{asset.name}</p>
                  <p className="text-sm text-red-600">
                    Condition Score: {asset.conditionScore ?? 0}
                  </p>
                </li>
              ))}
              {highRiskAssets.length === 0 && (
                <li className="text-sm text-slate-500">No high risk infrastructure assets.</li>
              )}
            </ul>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Grant Funding Distribution</h2>
          <GrantFlowChart data={grantData} />
        </section>

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Infrastructure Health Dashboard</h2>
          <AssetHealthChart data={assetData} />
        </section>
      </div>
    </main>
  )
}

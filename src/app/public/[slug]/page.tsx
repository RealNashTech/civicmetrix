import { dbSystem } from "@/lib/db"
import DemoVisualizationBoundary from "@/components/demo/DemoVisualizationBoundary"
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

  try {
    kpis = await client.kPI.findMany({
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
    })
  } catch (error) {
    console.error("KPI query failed:", error)
  }

  let publicGrants: Array<{
    id: string
    name: string
    amount: unknown
    departmentName: string
  }> = []

  let grants: Array<{
    department: string
    funding: number
  }> = []
  let grantRows: Array<{
    id: string
    name: string
    amount: unknown
    department: {
      name: string
    } | null
  }> = []

  try {
    grantRows = await client.grant.findMany({
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
    })

    publicGrants = grantRows.map((grant) => ({
      id: grant.id,
      name: grant.name,
      amount: grant.amount,
      departmentName: grant.department?.name ?? "Unassigned",
    }))

    const grantFundingByDepartment = new Map<string, number>()
    for (const grant of publicGrants) {
      grantFundingByDepartment.set(
        grant.departmentName,
        (grantFundingByDepartment.get(grant.departmentName) ?? 0) +
          Number(grant.amount)
      )
    }

    grants = Array.from(grantFundingByDepartment.entries())
      .map(([department, funding]) => ({
        department,
        funding,
      }))
      .filter((grant) => Number.isFinite(grant.funding))
  } catch (error) {
    console.error("Grant query failed:", error)
  }

  let issues: Array<{ latitude: number; longitude: number }> = []
  let issueRows: Array<{ latitude: number | null; longitude: number | null }> = []

  try {
    issueRows = await client.issueReport.findMany({
      where: {
        organizationId: organization.id,
      },
      select: {
        latitude: true,
        longitude: true,
      },
    })

    issues = issueRows
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
  } catch (error) {
    console.error("Issue report query failed:", error)
  }

  let kpiHistory: Array<{ kpiId: string; value: unknown; recordedAt: Date }> = []

  try {
    kpiHistory = await client.kPIHistory.findMany({
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
    })
  } catch (error) {
    console.error("KPI history query failed:", error)
  }

  let insights: Array<{
    id: string
    severity: string
    title: string
    description: string
  }> = []

  try {
    insights = await client.insight.findMany({
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
    })
  } catch (error) {
    console.error("Insight query failed:", error)
  }

  let assetRows: Array<{
    id: string
    name: string
    conditionScore: number | null
  }> = []

  try {
    assetRows = await client.asset.findMany({
      where: {
        organizationId: organization.id,
      },
      select: {
        id: true,
        name: true,
        conditionScore: true,
      },
    })
  } catch (error) {
    console.error("Asset query failed:", error)
  }

  const assets = assetRows
    .map((asset) => ({
      name: asset.name,
      conditionScore: Number(asset.conditionScore ?? Number.NaN),
    }))
    .filter((asset) => Number.isFinite(asset.conditionScore))

  const issueData = issueRows.map(i => ({
    latitude: i.latitude,
    longitude: i.longitude
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

  const historyByKpi = kpiHistory.reduce<Record<string, Array<{ value: number; recordedAt: Date }>>>(
    (accumulator, point) => {
      if (!accumulator[point.kpiId]) {
        accumulator[point.kpiId] = []
      }

      accumulator[point.kpiId].push({
        value: Number(point.value),
        recordedAt: point.recordedAt,
      })
      return accumulator
    },
    {}
  )

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
    issues: issues?.length,
    grants: grants?.length,
    assets: assets?.length,
  })

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{organization.name}</h1>
      <div className="mt-4">
        <Link
          href={`/public/${organization.slug}/council-report`}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          View Weekly Council Report
        </Link>
      </div>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-slate-500">Public KPIs</p>
          <p className="mt-1 text-2xl font-semibold">{kpis.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-slate-500">Total Grant Funding</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalGrantFunding)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-slate-500">KPIs Meeting Target</p>
          <p className="mt-1 text-2xl font-semibold">
            {kpisOnTarget}/{kpis.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Average KPI value: {averageKpiValue.toFixed(1)}</p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Key Performance Indicators</h2>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="rounded-lg border p-4">
              <p className="font-medium">{kpi.name}</p>
              <p className="text-sm text-slate-500">{kpi.unit}</p>
              <p className="mt-2 text-xl font-semibold">
                {Number(kpi.value).toLocaleString()} {kpi.unit ?? ""}
              </p>
              {kpi.target != null && (
                <p className="text-sm text-slate-500">Target: {Number(kpi.target).toLocaleString()}</p>
              )}

              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Trend (last 12 points)</p>
                {(() => {
                  const points = (historyByKpi[kpi.id] ?? []).slice(-12)
                  if (points.length === 0) {
                    return <p className="mt-2 text-sm text-slate-500">No trend data available.</p>
                  }

                  const values = points.map((point) => point.value)
                  const min = Math.min(...values)
                  const max = Math.max(...values)
                  const range = max - min || 1

                  return (
                    <div className="mt-2 flex h-16 items-end gap-1">
                      {points.map((point) => {
                        const height = Math.max(12, ((point.value - min) / range) * 64)
                        return (
                          <div
                            key={`${kpi.id}-${point.recordedAt.toISOString()}`}
                            className="flex-1 rounded-sm bg-slate-300"
                            style={{ height: `${height}px` }}
                            title={`${point.recordedAt.toLocaleDateString()}: ${point.value.toLocaleString()}`}
                          />
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
        {kpis.length === 0 && (
          <p className="text-sm text-slate-500 mt-4">
            No public KPIs available.
          </p>
        )}
      </section>

      <DemoVisualizationBoundary
        issueData={issueData}
        grantData={grantData}
        assetData={assetData}
      />

      <section className="mt-16">
        <h2 className="text-xl font-semibold">Civic Risk Engine</h2>

        <p className="text-sm text-slate-500 mt-1">
          Automated analysis of civic operations and infrastructure risk.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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

              <p className="mt-1 font-medium">
                {insight.title}
              </p>

              <p className="text-sm text-slate-500 mt-1">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Grant Funding</h2>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {publicGrants.map((grant) => (
            <div key={grant.id} className="rounded-lg border p-4">
              <p className="font-medium">{grant.name}</p>
              <p className="text-sm text-slate-500">
                {formatCurrency(Number(grant.amount))}
              </p>
            </div>
          ))}
        </div>
        {publicGrants.length === 0 && (
          <p className="text-sm text-slate-500 mt-4">
            No public grants available.
          </p>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold">
          High Risk Infrastructure
        </h2>

        <ul className="space-y-2 mt-6">
          {highRiskAssets.map((asset) => (
            <li
              key={asset.id}
              className="border rounded p-3"
            >
              <p className="font-medium">
                {asset.name}
              </p>

              <p className="text-sm text-red-600">
                Condition Score: {asset.conditionScore ?? 0}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

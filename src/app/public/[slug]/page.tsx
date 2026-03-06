import { db } from "@/lib/db"
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
  params: { slug: string }
}) {
  const client = db()

  let organization = null

  try {
    organization = await client.organization.findUnique({
      where: { slug: params.slug },
    })
  } catch (error) {
    console.error("Organization query failed:", error)
  }

  if (!organization) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-semibold">
          Demo city not available
        </h1>

        <p className="text-slate-500 mt-2">
          The demo organization could not be loaded.
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

  let grants: Array<{
    id: string
    name: string
    amount: unknown
    departmentId: string | null
  }> = []

  try {
    grants = await client.grant.findMany({
      where: {
        organizationId: organization.id,
        isPublic: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        amount: true,
        departmentId: true,
      },
    })
  } catch (error) {
    console.error("Grant query failed:", error)
  }

  let issueRows: Array<{ latitude: number | null; longitude: number | null }> = []

  try {
    issueRows = await client.issueReport.findMany({
      where: {
        organizationId: organization.id,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        latitude: true,
        longitude: true,
      },
    })
  } catch (error) {
    console.error("Issue report query failed:", error)
  }

  const issues = issueRows.map((i) => ({
    latitude: Number(i.latitude),
    longitude: Number(i.longitude),
  }))

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

  let departments: Array<{ id: string; name: string }> = []

  try {
    departments = await client.department.findMany({
      where: {
        organizationId: organization.id,
      },
      select: {
        id: true,
        name: true,
      },
    })
  } catch (error) {
    console.error("Department query failed:", error)
  }

  const grantFundingByDepartment = await Promise.all(
    departments.map(async (department) => {
      try {
        const departmentGrants = await client.grant.findMany({
          where: {
            organizationId: organization.id,
            departmentId: department.id,
          },
          select: {
            amount: true,
          },
        })

        const total = departmentGrants.reduce((sum, grant) => sum + Number(grant.amount), 0)

        return {
          department: department.name,
          funding: total,
        }
      } catch (error) {
        console.error(`Grant distribution query failed for ${department.name}:`, error)
        return {
          department: department.name,
          funding: 0,
        }
      }
    })
  )

  let assets: Array<{
    id: string
    name: string
    conditionScore: number | null
    latitude: number | null
    longitude: number | null
  }> = []

  try {
    assets = await client.asset.findMany({
      where: {
        organizationId: organization.id,
      },
      select: {
        id: true,
        name: true,
        conditionScore: true,
        latitude: true,
        longitude: true,
      },
    })
  } catch (error) {
    console.error("Asset query failed:", error)
  }

  const assetHealth = {
    good: 0,
    warning: 0,
    critical: 0,
  }

  assets.forEach((asset) => {
    const score = Number(asset.conditionScore ?? 0)
    if (score >= 70) {
      assetHealth.good++
    } else if (score >= 40) {
      assetHealth.warning++
    } else {
      assetHealth.critical++
    }
  })

  const assetHealthChartData = [
    { name: "Good Condition", value: assetHealth.good },
    { name: "Moderate Risk", value: assetHealth.warning },
    { name: "Critical", value: assetHealth.critical },
  ]

  const highRiskAssets = assets
    .filter((a) => Number(a.conditionScore ?? 0) < 40)
    .slice(0, 5)

  const totalGrantFunding = grants.reduce((total, grant) => total + Number(grant.amount), 0)
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

      <section className="mt-16">
        <h2 className="text-xl font-semibold">Civic Issue Map</h2>

        <p className="text-sm text-slate-500 mt-1">
          Live geographic view of reported civic issues.
        </p>

        <IssueHeatmap issues={issues} />
      </section>

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
          {grants.map((grant) => (
            <div key={grant.id} className="rounded-lg border p-4">
              <p className="font-medium">{grant.name}</p>
              <p className="text-sm text-slate-500">
                {formatCurrency(Number(grant.amount))}
              </p>
            </div>
          ))}
        </div>
        {grants.length === 0 && (
          <p className="text-sm text-slate-500 mt-4">
            No public grants available.
          </p>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold">
          Grant Funding Distribution
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Visualization of grant funding across city departments.
        </p>

        <GrantFlowChart data={grantFundingByDepartment} />
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold">
          Infrastructure Health Dashboard
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Condition scores for city infrastructure assets.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mt-6">
          <div>
            <AssetHealthChart data={assetHealthChartData} />
          </div>

          <div>
            <h3 className="font-semibold mb-3">
              High Risk Infrastructure
            </h3>

            <ul className="space-y-2">
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
          </div>
        </div>
      </section>
    </main>
  )
}

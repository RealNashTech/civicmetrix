"use client"

import dynamic from "next/dynamic"

type IssueDatum = {
  latitude: number
  longitude: number
}

type GrantDatum = {
  department: string
  funding: number
}

type AssetDatum = {
  name: string
  value?: number
  conditionScore?: number
  score?: number
  condition?: number
  healthScore?: number
  condition_rating?: number
}

const IssueHeatmapDynamic = dynamic(
  () => import("@/components/demo/IssueHeatmap"),
  { ssr: false }
)

const GrantFlowChartDynamic = dynamic(
  () => import("@/components/demo/GrantFlowChart"),
  { ssr: false }
)

const AssetHealthChartDynamic = dynamic(
  () => import("@/components/demo/AssetHealthChart"),
  { ssr: false }
)

export function IssueHeatmap({ issueData }: { issueData: IssueDatum[] }) {
  return <IssueHeatmapDynamic data={issueData} />
}

export function GrantFlowChart({ grantData }: { grantData: GrantDatum[] }) {
  const formatted = grantData.map(g => ({
    department: g.department,
    amount: g.funding
  }))

  return <GrantFlowChartDynamic data={formatted} />
}

export function AssetHealthChart({ assetData }: { assetData: AssetDatum[] }) {
  const formatted = assetData.map(a => ({
    name: a.name,
    conditionScore: a.conditionScore ?? a.score ?? a.healthScore ?? 0
  }))

  return <AssetHealthChartDynamic data={formatted} />
}

"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type AssetHealthDatum = {
  name: string
  conditionScore: number
}

function AssetHealthChart({ data }: { data: AssetHealthDatum[] }) {
  if (typeof window === "undefined") return null

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height: 320 }}
        className="border rounded flex items-center justify-center text-sm text-slate-500"
      >
        No data available
      </div>
    )
  }

  console.log("Asset chart data", data)

  const safeData = data
    .map((item) => ({
      ...item,
      conditionScore: Number(item.conditionScore),
    }))
    .filter((item) => Number.isFinite(item.conditionScore))

  const getBarColor = (score: number) => {
    if (score >= 80) return "#16a34a"
    if (score >= 60) return "#eab308"
    return "#ef4444"
  }

  if (!safeData.length) {
    return (
      <div
        style={{ height: 320 }}
        className="border rounded flex items-center justify-center text-sm text-slate-500"
      >
        No data available
      </div>
    )
  }

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={safeData} layout="vertical" margin={{ left: 24, right: 16 }}>
          <XAxis type="number" domain={[0, 100]} />
          <YAxis type="category" dataKey="name" width={140} />
          <Tooltip formatter={(value) => `${Number(value).toFixed(0)}`} />
          <Bar dataKey="conditionScore" radius={[0, 4, 4, 0]}>
            {safeData.map((entry) => (
              <Cell key={entry.name} fill={getBarColor(entry.conditionScore)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default AssetHealthChart

"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type GrantFlowDatum = {
  department: string
  amount: number
}

function GrantFlowChart({ data }: { data: GrantFlowDatum[] }) {
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

  console.log("Grant chart data", data)

  const safeData = data
    .map((item) => ({
      ...item,
      amount: Number(item.amount),
    }))
    .filter((item) => Number.isFinite(item.amount))

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)

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
        <BarChart data={safeData}>
          <XAxis dataKey="department" />
          <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Bar dataKey="amount" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default GrantFlowChart

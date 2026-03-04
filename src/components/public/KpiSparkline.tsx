"use client"

import {
  LineChart,
  Line,
  ResponsiveContainer
} from "recharts"

interface KpiSparklineProps {
  values: number[]
}

export default function KpiSparkline({ values }: KpiSparklineProps) {
  const data = values.map((v, i) => ({
    index: i,
    value: v
  }))

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

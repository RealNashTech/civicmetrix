"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const COLORS = ["#16a34a", "#eab308", "#ef4444"]

type AssetHealthDatum = {
  name: string
  value: number
}

export default function AssetHealthChart({ data }: { data: AssetHealthDatum[] }) {
  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={120}
            label
          >
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>

          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

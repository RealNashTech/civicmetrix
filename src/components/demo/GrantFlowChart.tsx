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
  funding: number
}

export default function GrantFlowChart({ data }: { data: GrantFlowDatum[] }) {
  return (
    <div className="w-full h-[350px] mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="department" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="funding" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

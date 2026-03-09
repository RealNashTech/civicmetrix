"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AssistanceCategoryChartProps = {
  data: Array<{
    category: string;
    householdsServed: number;
  }>;
};

export function AssistanceCategoryChart({ data }: AssistanceCategoryChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" angle={-20} textAnchor="end" interval={0} height={64} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="householdsServed" fill="#0f172a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type BudgetUtilizationDatum = {
  name: string;
  allocated: number;
  spent: number;
};

type BudgetUtilizationChartProps = {
  data: BudgetUtilizationDatum[];
};

export function BudgetUtilizationChart({ data }: BudgetUtilizationChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="allocated" fill="#334155" name="Allocated" />
          <Bar dataKey="spent" fill="#0ea5e9" name="Spent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

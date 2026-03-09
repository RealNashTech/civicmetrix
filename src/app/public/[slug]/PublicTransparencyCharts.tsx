"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AssetConditionDatum = { bucket: string; count: number };
type IssueCategoryDatum = { category: string; count: number };
type GrantByDepartmentDatum = { department: string; amount: number };
type KpiPerformanceDatum = { name: string; value: number; target: number };

type Props = {
  assetConditionDistribution?: AssetConditionDatum[];
  issueCategories?: IssueCategoryDatum[];
  grantFundingByDepartment?: GrantByDepartmentDatum[];
  kpiPerformance?: KpiPerformanceDatum[];
};

export default function PublicTransparencyCharts({
  assetConditionDistribution = [],
  issueCategories = [],
  grantFundingByDepartment = [],
  kpiPerformance = [],
}: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Asset Condition Distribution</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assetConditionDistribution} margin={{ top: 10, right: 12, left: 0, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Issue Categories</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={issueCategories} margin={{ top: 10, right: 12, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" angle={-25} textAnchor="end" height={64} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Grant Funding by Department</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={grantFundingByDepartment} margin={{ top: 10, right: 12, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="department" angle={-25} textAnchor="end" height={64} />
              <YAxis />
              <Tooltip formatter={(value) => `$${Number(value ?? 0).toLocaleString()}`} />
              <Bar dataKey="amount" fill="#b45309" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">KPI Performance vs Targets</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kpiPerformance} margin={{ top: 10, right: 12, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" angle={-25} textAnchor="end" height={64} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#0f766e" radius={[4, 4, 0, 0]} name="Current" />
              <Bar dataKey="target" fill="#64748b" radius={[4, 4, 0, 0]} name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

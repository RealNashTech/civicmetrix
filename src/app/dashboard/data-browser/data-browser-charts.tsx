"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type IssueCategoryDatum = {
  category: string;
  count: number;
};

type AssetDistributionDatum = {
  bucket: string;
  count: number;
};

type GrantByDepartmentDatum = {
  department: string;
  amount: number;
};

type KpiTrendDatum = {
  point: string;
  [key: string]: string | number | null;
};

type DataBrowserChartsProps = {
  issueCategoryData: IssueCategoryDatum[];
  assetConditionDistributionData: AssetDistributionDatum[];
  grantFundingByDepartmentData: GrantByDepartmentDatum[];
  kpiTrendData: KpiTrendDatum[];
  kpiSeriesKeys: string[];
};

const KPI_LINE_COLORS = ["#0f766e", "#1d4ed8", "#b45309", "#be123c", "#6d28d9", "#374151"];

export function DataBrowserCharts({
  issueCategoryData,
  assetConditionDistributionData,
  grantFundingByDepartmentData,
  kpiTrendData,
  kpiSeriesKeys,
}: DataBrowserChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Issue Categories</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={issueCategoryData} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" angle={-25} textAnchor="end" height={64} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Asset Condition Distribution</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assetConditionDistributionData} margin={{ top: 10, right: 16, left: 0, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Grant Funding by Department</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={grantFundingByDepartmentData} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="department" angle={-25} textAnchor="end" height={64} />
              <YAxis />
              <Tooltip formatter={(value) => `$${Number(value ?? 0).toLocaleString()}`} />
              <Bar dataKey="amount" fill="#b45309" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">KPI Trend Lines</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kpiTrendData} margin={{ top: 10, right: 16, left: 0, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="point" />
              <YAxis />
              <Tooltip />
              <Legend />
              {kpiSeriesKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={KPI_LINE_COLORS[index % KPI_LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

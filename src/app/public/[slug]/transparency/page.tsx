import Link from "next/link";

import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { getTransparencyMetrics } from "@/lib/public/transparency-metrics";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export default async function PublicTransparencyPage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);
  const metrics = await getTransparencyMetrics(organization.id);

  const [kpis, grants] = await Promise.all([
    db().kPI.findMany({
      where: {
        organizationId: organization.id,
        isPublic: true,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        value: true,
        target: true,
        updatedAt: true,
      },
    }),
    db().grant.findMany({
      where: {
        organizationId: organization.id,
        isPublic: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        amount: true,
        status: true,
      },
    }),
  ]);

  const grantStatusBreakdown = Object.entries(
    grants.reduce<Record<string, number>>((acc, grant) => {
      acc[grant.status] = (acc[grant.status] ?? 0) + 1;
      return acc;
    }, {}),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <Link href={`/public/${resolvedParams.slug}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Public Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{organization.name} Transparency Dashboard</h1>
        <p className="text-sm text-slate-600">
          Public KPIs, grant funding totals, and issue resolution transparency.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Public KPIs</p>
          <p className="text-2xl font-semibold text-slate-900">{metrics.kpiCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Grant Funding</p>
          <p className="text-2xl font-semibold text-slate-900">
            $
            {metrics.totalGrants.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Issue Resolution Rate</p>
          <p className="text-2xl font-semibold text-slate-900">{metrics.issueResolutionRate}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Resolved / Total Issues</p>
          <p className="text-2xl font-semibold text-slate-900">
            {metrics.resolvedIssues} / {metrics.totalIssues}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">KPI Progress</h2>
        <div className="space-y-4">
          {kpis.length > 0 ? (
            kpis.map((kpi) => {
              const target = kpi.target != null ? Number(kpi.target) : null;
              const current = Number(kpi.value ?? 0);
              const progress = target && target > 0 ? asPercent(current, target) : Math.max(0, Math.min(current, 100));

              return (
                <div key={kpi.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{kpi.name}</p>
                    <p className="text-xs text-slate-500">
                      Updated {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(kpi.updatedAt)}
                    </p>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-200">
                    <div className="h-3 rounded-full bg-blue-600" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-700">
                    <p>Current: {current.toLocaleString()}</p>
                    <p>Target: {target != null ? target.toLocaleString() : "N/A"}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No public KPIs available.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Grant Funding Totals</h2>
        <div className="mb-4 grid gap-2 md:grid-cols-3">
          {grantStatusBreakdown.length > 0 ? (
            grantStatusBreakdown.map(([status, count]) => (
              <div key={status} className="rounded-md border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Status</p>
                <p className="text-sm font-medium text-slate-900">{status.replace("_", " ")}</p>
                <p className="text-xs text-slate-600">{count} grants</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No public grants available.</p>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Grant</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {grants.length > 0 ? (
                grants.map((grant) => (
                  <tr key={grant.id}>
                    <td className="px-4 py-3 text-slate-800">{grant.name}</td>
                    <td className="px-4 py-3 text-slate-700">{grant.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-700">
                      ${Number(grant.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={3}>
                    No public grants available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

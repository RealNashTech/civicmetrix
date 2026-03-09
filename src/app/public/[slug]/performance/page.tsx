import Link from "next/link";

import PublicTransparencyCharts from "@/app/public/[slug]/PublicTransparencyCharts";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { tenantDb } from "@/lib/tenantDb";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

type PerformanceRow = {
  id: string;
  name: string;
  value: number;
  target: number | null;
  unit: string | null;
  status: string;
  updatedAt: Date;
};

export default async function PublicPerformancePage({ params }: Props) {
  const { slug } = await params;
  const organization = await getOrganizationBySlug(slug);

  const kpis = await tenantDb<PerformanceRow[]>(organization.id, async (tx) => {
    return tx.kPI.findMany({
      where: {
        organizationId: organization.id,
        isPublic: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        value: true,
        target: true,
        unit: true,
        status: true,
        updatedAt: true,
      },
    });
  });

  const kpiPerformance = (kpis as Array<{
    id: string;
    name: string;
    value: number;
    target: number | null;
    unit: string | null;
    status: string;
    updatedAt: Date;
  }>).map((kpi) => ({
    name: kpi.name,
    value: kpi.value,
    target: Number(kpi.target ?? 0),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <Link href={`/public/${slug}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Public Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{organization.name} Performance</h1>
        <p className="text-sm text-slate-600">Public KPI performance against targets.</p>
      </div>

      <div className="flex gap-3">
        <a href={`/public/${slug}/kpis.csv`} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-100">
          Download CSV
        </a>
        <a href={`/public/${slug}/kpis.json`} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-100">
          JSON API
        </a>
      </div>

      <PublicTransparencyCharts kpiPerformance={kpiPerformance} />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">KPI</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Value</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Target</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {kpis.length > 0 ? (
              (kpis as Array<{ id: string; name: string; value: number; target: number | null; status: string; updatedAt: Date; unit: string | null }>).map((kpi) => (
                <tr key={kpi.id}>
                  <td className="px-4 py-3 text-slate-800">{kpi.name}</td>
                  <td className="px-4 py-3 text-slate-700">{kpi.value} {kpi.unit ?? ""}</td>
                  <td className="px-4 py-3 text-slate-700">{kpi.target ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{kpi.status}</td>
                  <td className="px-4 py-3 text-slate-700">{new Date(kpi.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No public KPIs available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

import Link from "next/link";

import { KpiTrendChart } from "@/components/charts/KpiTrendChart";
import { summarizeTrend } from "@/lib/kpi-trends";
import { dbSystem } from "@/lib/db";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicKpiTrendPage({ params }: Props) {
  const resolvedParams = await params;
  const org = await getOrganizationBySlug(resolvedParams.slug);

  const kpis = await dbSystem().kPI.findMany({
    where: {
      organizationId: org.id,
      isPublic: true,
    },
    orderBy: { createdAt: "desc" },
    include: {
      history: {
        orderBy: { recordedAt: "desc" },
        take: 12,
        select: {
          recordedAt: true,
          value: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <Link href={`/public/${resolvedParams.slug}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Public Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{org.name} KPI Trends</h1>
        <p className="text-sm text-slate-600">Public KPI performance over time.</p>
      </div>

      <div className="space-y-4">
        {kpis.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
            No public KPIs available.
          </p>
        ) : (
          kpis.map((kpi) => {
            const data = [...kpi.history]
              .reverse()
              .map((entry) => ({
                date: new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  year: "2-digit",
                }).format(entry.recordedAt),
                value: Number(entry.value),
              }));
            const trend = summarizeTrend(data.map((point) => point.value));

            return (
              <section key={kpi.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">{kpi.name}</h2>
                  <span className="text-sm text-slate-600">
                    {kpi.value} {kpi.unit ?? ""}
                  </span>
                </div>
                <p className="mb-2 text-xs text-slate-500">
                  Trend:{" "}
                  <span className="font-semibold text-slate-700">
                    {trend.direction} ({trend.deltaPercent}%)
                  </span>
                </p>
                {data.length > 1 ? (
                  <KpiTrendChart data={data} />
                ) : (
                  <p className="text-sm text-slate-500">Not enough history points yet.</p>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { KpiHistoryLineChart } from "@/components/charts/kpi-history-line-chart";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ kpiId: string }>;
};

export default async function KpiHistoryPage({ params }: Props) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const resolvedParams = await params;

  const kpi = await db().kPI.findFirst({
    where: {
      id: resolvedParams.kpiId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      name: true,
      unit: true,
      periodLabel: true,
    },
  });

  if (!kpi) {
    notFound();
  }

  const history = await db().kPIHistory.findMany({
    where: { kpiId: kpi.id },
    orderBy: { recordedAt: "asc" },
  });

  const chartData = history.map((entry) => ({
    recordedAt: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(entry.recordedAt),
    value: Number(entry.value),
  }));

  return (
    <div className="space-y-6">
      <Card title="KPI Historical Chart">
        <div className="space-y-2">
          <Link href="/dashboard/kpi" className="text-sm text-blue-600 hover:underline">
            ← Back to KPIs
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">{kpi.name}</h1>
          <p className="text-sm text-slate-500">
            {kpi.unit ? `Unit: ${kpi.unit}` : "No unit set"}{" "}
            {kpi.periodLabel ? `| Period: ${kpi.periodLabel}` : ""}
          </p>
        </div>
      </Card>

      <Card title="Trend (LineChart)">
        {chartData.length > 0 ? (
          <KpiHistoryLineChart data={chartData} />
        ) : (
          <p className="text-sm text-slate-500">No KPI history points available yet.</p>
        )}
      </Card>
    </div>
  );
}

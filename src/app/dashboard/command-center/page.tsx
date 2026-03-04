import { InsightType, WorkOrderStatus } from "@prisma/client";

import CivicIntelligenceMap from "@/components/maps/civic-intelligence-map";
import { Card } from "@/components/ui/card";

import { auth } from "@/lib/auth";
import { summarizeTrend } from "@/lib/kpi-trends";
import { db } from "@/lib/db";

type ClusterCenter = {
  id: string;
  latitude: number;
  longitude: number;
  clusterCount: number;
  radiusMeters: number;
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function readClusterCenter(metadata: unknown, fallbackId: string): ClusterCenter | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  const latitude = typeof record.centerLatitude === "number" ? record.centerLatitude : null;
  const longitude = typeof record.centerLongitude === "number" ? record.centerLongitude : null;
  const clusterCount = typeof record.clusterCount === "number" ? record.clusterCount : null;
  const radiusMeters = typeof record.radiusMeters === "number" ? record.radiusMeters : 800;

  if (latitude === null || longitude === null || clusterCount === null) {
    return null;
  }

  return {
    id: fallbackId,
    latitude,
    longitude,
    clusterCount,
    radiusMeters,
  };
}

export default async function CommandCenterPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const historyFrom = new Date();
  historyFrom.setDate(historyFrom.getDate() - 30);

  const mapFrom = new Date();
  mapFrom.setDate(mapFrom.getDate() - 7);

  const [
    alerts,
    insights,
    recentIssues,
    mapIssues,
    openWorkOrders,
    kpis,
    districts,
    wards,
    serviceZones,
    infrastructureLayers,
  ] = await Promise.all([
    db().alert.findMany({
      where: {
        organizationId: user.organizationId,
        resolvedAt: null,
      },
      select: {
        id: true,
        severity: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db().insight.findMany({
      where: {
        organizationId: user.organizationId,
        resolvedAt: null,
      },
      select: {
        id: true,
        type: true,
        severity: true,
        title: true,
        description: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db().issueReport.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db().issueReport.findMany({
      where: {
        organizationId: user.organizationId,
        createdAt: {
          gte: mapFrom,
        },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    db().workOrder.findMany({
      where: {
        organizationId: user.organizationId,
        status: {
          in: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.BLOCKED],
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db().kPI.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        name: true,
        value: true,
        unit: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db().district.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, geoJson: true },
    }),
    db().ward.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, geoJson: true },
    }),
    db().serviceZone.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, type: true, geoJson: true },
    }),
    db().infrastructureLayer.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, geoJson: true },
    }),
  ]);

  const kpiIds = kpis.map((kpi) => kpi.id);
  const kpiHistory = kpiIds.length
    ? await db().kPIHistory.findMany({
        where: {
          kpiId: { in: kpiIds },
          recordedAt: { gte: historyFrom },
        },
        select: {
          kpiId: true,
          value: true,
          recordedAt: true,
        },
        orderBy: [{ kpiId: "asc" }, { recordedAt: "asc" }],
      })
    : [];

  const historyByKpi = new Map<string, number[]>();
  for (const point of kpiHistory) {
    const values = historyByKpi.get(point.kpiId) ?? [];
    values.push(Number(point.value));
    historyByKpi.set(point.kpiId, values);
  }

  const criticalInsights = insights.filter((insight) => insight.severity === "CRITICAL");
  const warningInsights = insights.filter((insight) => insight.severity === "WARNING");
  const serviceClusters = insights
    .filter((insight) => insight.type === InsightType.SERVICE_CLUSTER)
    .map((insight) => readClusterCenter(insight.metadata, insight.id))
    .filter((cluster): cluster is ClusterCenter => cluster !== null);

  return (
    <div className="space-y-6">
      <Card title="Command Center Overview">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Open Alerts</p>
            <p className="text-xl font-semibold text-slate-900">{alerts.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Active Insights</p>
            <p className="text-xl font-semibold text-slate-900">{insights.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Recent Issues</p>
            <p className="text-xl font-semibold text-slate-900">{recentIssues.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Open Work Orders</p>
            <p className="text-xl font-semibold text-slate-900">{openWorkOrders.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Tracked KPIs</p>
            <p className="text-xl font-semibold text-slate-900">{kpis.length}</p>
          </div>
        </div>
      </Card>

      <Card title="Active Critical Insights">
        {criticalInsights.length > 0 ? (
          <div className="space-y-3">
            {criticalInsights.map((insight) => (
              <div key={insight.id} className="rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="font-medium text-rose-900">{insight.title}</p>
                <p className="text-sm text-rose-800">{insight.description}</p>
                <p className="mt-1 text-xs text-rose-700">{formatDateTime(insight.createdAt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No active critical insights.</p>
        )}
      </Card>

      <Card title="Warning Insights">
        {warningInsights.length > 0 ? (
          <div className="space-y-3">
            {warningInsights.map((insight) => (
              <div key={insight.id} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="font-medium text-amber-900">{insight.title}</p>
                <p className="text-sm text-amber-800">{insight.description}</p>
                <p className="mt-1 text-xs text-amber-700">{formatDateTime(insight.createdAt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No warning insights.</p>
        )}
      </Card>

      <Card title="KPI Health">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">KPI</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Current Value</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {kpis.length > 0 ? (
                kpis.map((kpi) => {
                  const trend = summarizeTrend(historyByKpi.get(kpi.id) ?? []);
                  const trendLabel =
                    trend.direction === "UP"
                      ? "Improving"
                      : trend.direction === "DOWN"
                        ? "Declining"
                        : "Stable";
                  const trendColor =
                    trend.direction === "UP"
                      ? "text-emerald-700"
                      : trend.direction === "DOWN"
                        ? "text-rose-700"
                        : "text-slate-700";

                  return (
                    <tr key={kpi.id}>
                      <td className="px-4 py-3 text-slate-800">{kpi.name}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {kpi.value}
                        {kpi.unit ? ` ${kpi.unit}` : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{kpi.status}</td>
                      <td className={`px-4 py-3 font-medium ${trendColor}`}>
                        {trendLabel} ({trend.deltaPercent}%)
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={4}>
                    No KPIs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Map Preview">
        <CivicIntelligenceMap
          issues={mapIssues.map((issue) => ({
            id: issue.id,
            title: issue.title,
            status: issue.status,
            priority: issue.priority,
            latitude: issue.latitude as number,
            longitude: issue.longitude as number,
          }))}
          clusterCenters={serviceClusters}
          districts={districts}
          wards={wards}
          serviceZones={serviceZones}
          infrastructureLayers={infrastructureLayers}
          heightClassName="h-[420px]"
        />
      </Card>

      <Card title="Recent Citizen Reports">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {recentIssues.length > 0 ? (
                recentIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="px-4 py-3 text-slate-800">{issue.title}</td>
                    <td className="px-4 py-3 text-slate-700">{issue.category}</td>
                    <td className="px-4 py-3 text-slate-700">{issue.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(issue.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={4}>
                    No recent citizen reports.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Open Work Orders">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {openWorkOrders.length > 0 ? (
                openWorkOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-slate-800">{order.title}</td>
                    <td className="px-4 py-3 text-slate-700">{order.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-700">{order.priority ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={4}>
                    No open work orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

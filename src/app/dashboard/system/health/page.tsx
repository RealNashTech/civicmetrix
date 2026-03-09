import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { requireAnyRole, RoleAccessError } from "@/lib/permissions";
import { tenantDb } from "@/lib/tenantDb";

type SystemMetricRow = {
  metricType: string;
  value: number;
  createdAt: Date;
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export default async function SystemHealthPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  try {
    await requireAnyRole(["SYSTEM_ADMIN", "CITY_ADMIN"], session.user);
  } catch (error) {
    if (error instanceof RoleAccessError) {
      notFound();
    }
    throw error;
  }

  const organizationId = requireOrganization(session);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const metrics = await tenantDb<SystemMetricRow[]>(organizationId, async (tx) => {
    return tx.systemMetric.findMany({
      where: {
        organizationId,
        createdAt: { gte: since },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        metricType: true,
        value: true,
        createdAt: true,
      },
      take: 5000,
    });
  });

  const apiResponseMetrics = metrics.filter((row) => row.metricType.startsWith("API_RESPONSE_TIME:"));
  const workerRuntimeMetrics = metrics.filter((row) => row.metricType.startsWith("WORKER_RUNTIME:"));
  const errorMetrics = metrics.filter((row) => row.metricType.startsWith("ERROR_RATE:"));
  const queueDepthMetrics = metrics.filter((row) => row.metricType.startsWith("QUEUE_DEPTH:"));

  const apiByRoute = new Map<string, number[]>();
  for (const row of apiResponseMetrics) {
    const routeKey = row.metricType.split(":").slice(1, 3).join(":");
    const current = apiByRoute.get(routeKey) ?? [];
    current.push(row.value);
    apiByRoute.set(routeKey, current);
  }

  const workerByType = new Map<string, number[]>();
  for (const row of workerRuntimeMetrics) {
    const workerType = row.metricType.split(":")[1] ?? "unknown";
    const current = workerByType.get(workerType) ?? [];
    current.push(row.value);
    workerByType.set(workerType, current);
  }

  const queueLatest = new Map<string, { value: number; createdAt: Date }>();
  for (const row of queueDepthMetrics) {
    const queueType = row.metricType.split(":")[1] ?? "unknown";
    if (!queueLatest.has(queueType)) {
      queueLatest.set(queueType, { value: row.value, createdAt: row.createdAt });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Platform System Health</h1>
        <p className="text-sm text-slate-600">Last 24 hours of API, worker, queue, and error metrics.</p>
      </div>

      <Card title="Overview">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">API Samples</p>
            <p className="text-2xl font-semibold text-slate-900">{apiResponseMetrics.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Worker Runtime Samples</p>
            <p className="text-2xl font-semibold text-slate-900">{workerRuntimeMetrics.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Error Events</p>
            <p className="text-2xl font-semibold text-rose-700">{errorMetrics.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Queue Metrics</p>
            <p className="text-2xl font-semibold text-slate-900">{queueDepthMetrics.length}</p>
          </div>
        </div>
      </Card>

      <Card title="API Response Times">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Route:Status</th>
                <th className="py-2 pr-2">Avg Response Time (ms)</th>
                <th className="py-2">Samples</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(apiByRoute.entries()).map(([route, values]) => (
                <tr key={route} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 text-slate-800">{route}</td>
                  <td className="py-2 pr-2">{average(values)}</td>
                  <td className="py-2">{values.length}</td>
                </tr>
              ))}
              {apiByRoute.size === 0 ? (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={3}>No API metrics recorded.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Worker Runtimes">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Worker</th>
                <th className="py-2 pr-2">Avg Runtime (ms)</th>
                <th className="py-2">Samples</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(workerByType.entries()).map(([workerType, values]) => (
                <tr key={workerType} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 text-slate-800">{workerType}</td>
                  <td className="py-2 pr-2">{average(values)}</td>
                  <td className="py-2">{values.length}</td>
                </tr>
              ))}
              {workerByType.size === 0 ? (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={3}>No worker runtime metrics recorded.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Queue Backlog">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Queue</th>
                <th className="py-2 pr-2">Latest Depth</th>
                <th className="py-2">Observed At</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(queueLatest.entries()).map(([queue, snapshot]) => (
                <tr key={queue} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 text-slate-800">{queue}</td>
                  <td className="py-2 pr-2">{snapshot.value}</td>
                  <td className="py-2">{new Date(snapshot.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {queueLatest.size === 0 ? (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={3}>No queue metrics recorded.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

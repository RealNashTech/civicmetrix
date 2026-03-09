import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { tenantDb } from "@/lib/tenantDb";

type DashboardData = {
  infrastructure: {
    totalAssets: number;
    riskAssets: number;
    avgCondition: number;
  };
  serviceDemand: Array<{ category: string; count: number }>;
  grants: {
    totalCount: number;
    totalAmount: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  alerts: {
    activeCount: number;
    bySeverity: Array<{ severity: string; count: number }>;
  };
  imports: {
    recentDocuments: Array<{
      id: string;
      name: string;
      type: string;
      createdAt: Date;
    }>;
    recentEvents: Array<{
      id: string;
      type: string;
      processed: boolean;
      createdAt: Date;
    }>;
  };
};

function formatDate(value: Date): string {
  return new Date(value).toLocaleString();
}

export default async function CommandCenterDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const organizationId = requireOrganization(session);

  const data = await tenantDb<DashboardData>(organizationId, async (tx) => {
    const [
      totalAssets,
      riskAssets,
      avgConditionResult,
      openIssuesByCategory,
      grantsSummary,
      grantsByStatusRaw,
      activeAlerts,
      alertsBySeverityRaw,
      recentDocuments,
      recentImportEvents,
    ] = await Promise.all([
      tx.asset.count({
        where: { organizationId },
      }),
      tx.asset.count({
        where: {
          organizationId,
          conditionScore: { lt: 40 },
        },
      }),
      tx.asset.aggregate({
        where: { organizationId },
        _avg: {
          conditionScore: true,
        },
      }),
      tx.issueReport.groupBy({
        by: ["category"],
        where: {
          organizationId,
          status: "OPEN",
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _count: {
            category: "desc",
          },
        },
        take: 8,
      }),
      tx.grant.aggregate({
        where: { organizationId },
        _count: {
          _all: true,
        },
        _sum: {
          amount: true,
        },
      }),
      tx.grant.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: {
          _all: true,
        },
        orderBy: {
          _count: {
            status: "desc",
          },
        },
      }),
      tx.alert.count({
        where: {
          organizationId,
          resolvedAt: null,
        },
      }),
      tx.alert.groupBy({
        by: ["severity"],
        where: {
          organizationId,
          resolvedAt: null,
        },
        _count: {
          _all: true,
        },
      }),
      tx.document.findMany({
        where: {
          organizationId,
          entityType: "DATA_IMPORT",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          name: true,
          type: true,
          createdAt: true,
        },
      }),
      tx.event.findMany({
        where: {
          organizationId,
          type: {
            startsWith: "DATA_IMPORT",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          type: true,
          processed: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      infrastructure: {
        totalAssets,
        riskAssets,
        avgCondition: Number(avgConditionResult._avg.conditionScore ?? 0),
      },
      serviceDemand: openIssuesByCategory.map((item: { category: string; _count: { _all: number } }) => ({
        category: item.category,
        count: item._count._all,
      })),
      grants: {
        totalCount: grantsSummary._count._all,
        totalAmount: Number(grantsSummary._sum.amount ?? 0),
        byStatus: grantsByStatusRaw.map((item: { status: string; _count: { _all: number } }) => ({
          status: item.status,
          count: item._count._all,
        })),
      },
      alerts: {
        activeCount: activeAlerts,
        bySeverity: alertsBySeverityRaw.map((item: { severity: string; _count: { _all: number } }) => ({
          severity: item.severity,
          count: item._count._all,
        })),
      },
      imports: {
        recentDocuments,
        recentEvents: recentImportEvents,
      },
    };
  });

  const kpisBelowTarget = await tenantDb<number>(organizationId, async (tx) => {
    const kpis = await tx.kPI.findMany({
      where: {
        organizationId,
        target: { not: null },
      },
      select: {
        value: true,
        target: true,
      },
    });

    return kpis.filter(
      (kpi: { value: number; target: number | null }) =>
        typeof kpi.target === "number" && kpi.value < kpi.target,
    ).length;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">CivicMetrix Command Center</h1>
        <p className="text-sm text-slate-600">
          Organization-wide operational overview with tenant-scoped analytics.
        </p>
      </div>

      <Card title="Infrastructure Health Summary">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Total Assets</p>
            <p className="text-2xl font-semibold text-slate-900">{data.infrastructure.totalAssets}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Risk Assets (&lt; 40)</p>
            <p className="text-2xl font-semibold text-slate-900">{data.infrastructure.riskAssets}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Average Condition</p>
            <p className="text-2xl font-semibold text-slate-900">
              {data.infrastructure.avgCondition.toFixed(1)}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Service Demand Snapshot">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">KPIs Below Target</p>
            <p className="text-2xl font-semibold text-slate-900">{kpisBelowTarget}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Open Issues (Top Categories)</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {data.serviceDemand.map((item) => (
                <li key={item.category}>
                  {item.category}: {item.count}
                </li>
              ))}
              {data.serviceDemand.length === 0 && <li>No open issues found.</li>}
            </ul>
          </div>
        </div>
      </Card>

      <Card title="Grant Funding Overview">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Total Grants</p>
            <p className="text-2xl font-semibold text-slate-900">{data.grants.totalCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Total Funding</p>
            <p className="text-2xl font-semibold text-slate-900">
              ${data.grants.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">By Status</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {data.grants.byStatus.map((item) => (
                <li key={item.status}>
                  {item.status}: {item.count}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card title="Operational Alerts">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Active Alerts</p>
            <p className="text-2xl font-semibold text-slate-900">{data.alerts.activeCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Severity Breakdown</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {data.alerts.bySeverity.map((item) => (
                <li key={item.severity}>
                  {item.severity}: {item.count}
                </li>
              ))}
              {data.alerts.bySeverity.length === 0 && <li>No active alerts found.</li>}
            </ul>
          </div>
        </div>
      </Card>

      <Card title="Recent Data Imports">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs text-slate-500">Documents</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {data.imports.recentDocuments.map((doc) => (
                <li key={doc.id}>
                  {doc.name} ({doc.type}) - {formatDate(doc.createdAt)}
                </li>
              ))}
              {data.imports.recentDocuments.length === 0 && <li>No recent import documents.</li>}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs text-slate-500">Import Events</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {data.imports.recentEvents.map((event) => (
                <li key={event.id}>
                  {event.type} ({event.processed ? "Processed" : "Pending"}) - {formatDate(event.createdAt)}
                </li>
              ))}
              {data.imports.recentEvents.length === 0 && <li>No recent import events.</li>}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

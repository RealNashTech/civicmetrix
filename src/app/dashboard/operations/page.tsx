import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { tenantDb } from "@/lib/tenantDb";

type RiskAsset = {
  id: string;
  name: string;
  conditionScore: number | null;
  department: { name: string } | null;
};

type ServiceDemandItem = {
  category: string;
  count: number;
};

type GrantUtilizationItem = {
  department: string;
  grantCount: number;
  amount: number;
};

type AlertItem = {
  id: string;
  title: string;
  severity: string;
  createdAt: Date;
};

type BelowTargetKpi = {
  id: string;
  name: string;
  value: number;
  target: number | null;
  status: string;
  department: { name: string } | null;
};

type OperationsData = {
  riskAssets: RiskAsset[];
  serviceDemand: ServiceDemandItem[];
  grantUtilization: GrantUtilizationItem[];
  activeAlerts: AlertItem[];
  alertsBySeverity: Array<{ severity: string; count: number }>;
  kpisBelowTarget: BelowTargetKpi[];
  activeWorkOrders: {
    open: number;
    inProgress: number;
    completed: number;
  };
};

function formatDate(value: Date): string {
  return new Date(value).toLocaleString();
}

export default async function OperationsConsolePage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const organizationId = requireOrganization(session);

  const data = await tenantDb<OperationsData>(organizationId, async (tx) => {
    const [riskAssets, issueDemandRaw, grantByDepartmentRaw, departments, activeAlerts, alertsBySeverity, kpiCandidates, workOrderCounts] =
      await Promise.all([
        tx.asset.findMany({
          where: {
            organizationId,
            conditionScore: {
              lt: 40,
            },
          },
          include: {
            department: {
              select: {
                name: true,
              },
            },
          },
          orderBy: [
            {
              conditionScore: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
          take: 20,
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
        }),
        tx.grant.groupBy({
          by: ["departmentId"],
          where: {
            organizationId,
          },
          _count: {
            _all: true,
          },
          _sum: {
            amount: true,
          },
        }),
        tx.department.findMany({
          where: {
            organizationId,
          },
          select: {
            id: true,
            name: true,
          },
        }),
        tx.alert.findMany({
          where: {
            organizationId,
            resolvedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          select: {
            id: true,
            title: true,
            severity: true,
            createdAt: true,
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
        tx.kPI.findMany({
          where: {
            organizationId,
            target: {
              not: null,
            },
          },
          include: {
            department: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        }),
        tx.workOrder.groupBy({
          by: ["status"],
          where: {
            organizationId,
          },
          _count: {
            _all: true,
          },
        }),
      ]);

    const serviceDemand = issueDemandRaw.map((item: { category: string; _count: { _all: number } }) => ({
      category: item.category,
      count: item._count._all,
    }));

    const deptMap = new Map(
      departments.map((d: { id: string; name: string }) => [d.id, d.name]),
    );
    const grantUtilization = grantByDepartmentRaw
      .map((item: { departmentId: string | null; _count: { _all: number }; _sum: { amount: unknown } }) => ({
        department: item.departmentId ? deptMap.get(item.departmentId) ?? "Unknown Department" : "Unassigned",
        grantCount: item._count._all,
        amount: Number(item._sum.amount ?? 0),
      }))
      .sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount);

    const kpisBelowTarget = kpiCandidates
      .filter(
        (kpi: {
          id: string;
          name: string;
          value: number;
          target: number | null;
          status: string;
          department: { name: string } | null;
        }) => typeof kpi.target === "number" && kpi.value < kpi.target,
      )
      .map((kpi: {
        id: string;
        name: string;
        value: number;
        target: number | null;
        status: string;
        department: { name: string } | null;
      }) => ({
        id: kpi.id,
        name: kpi.name,
        value: kpi.value,
        target: kpi.target,
        status: kpi.status,
        department: kpi.department,
      }));

    return {
      riskAssets,
      serviceDemand,
      grantUtilization,
      activeAlerts: activeAlerts.map((alert: { id: string; title: string; severity: string; createdAt: Date }) => ({
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        createdAt: alert.createdAt,
      })),
      alertsBySeverity: alertsBySeverity.map((item: { severity: string; _count: { _all: number } }) => ({
        severity: item.severity,
        count: item._count._all,
      })),
      kpisBelowTarget,
      activeWorkOrders: {
        open: workOrderCounts.find((item: { status: string }) => item.status === "OPEN")?._count._all ?? 0,
        inProgress:
          workOrderCounts.find((item: { status: string }) => item.status === "IN_PROGRESS")?._count._all ?? 0,
        completed:
          workOrderCounts.find((item: { status: string }) => item.status === "COMPLETE")?._count._all ?? 0,
      },
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">CivicMetrix Operations Console</h1>
        <p className="text-sm text-slate-600">
          Operational insights generated from tenant-scoped municipal datasets.
        </p>
      </div>

      <Card title="Infrastructure Risk">
        <p className="mb-3 text-xs text-slate-500">Assets with condition score below 40.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Asset</th>
                <th className="py-2 pr-2">Department</th>
                <th className="py-2">Condition Score</th>
              </tr>
            </thead>
            <tbody>
              {data.riskAssets.map((asset) => (
                <tr key={asset.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2">{asset.name}</td>
                  <td className="py-2 pr-2">{asset.department?.name ?? "N/A"}</td>
                  <td className="py-2">{asset.conditionScore ?? "N/A"}</td>
                </tr>
              ))}
              {data.riskAssets.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-slate-500">
                    No high-risk infrastructure assets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Service Demand">
        <p className="mb-3 text-xs text-slate-500">Open issues grouped by category.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Category</th>
                <th className="py-2">Open Issues</th>
              </tr>
            </thead>
            <tbody>
              {data.serviceDemand.map((item) => (
                <tr key={item.category} className="border-b last:border-b-0">
                  <td className="py-2 pr-2">{item.category}</td>
                  <td className="py-2">{item.count}</td>
                </tr>
              ))}
              {data.serviceDemand.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-3 text-slate-500">
                    No open service demand records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Grant Utilization">
        <p className="mb-3 text-xs text-slate-500">Grant funding grouped by department.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Department</th>
                <th className="py-2 pr-2">Grant Count</th>
                <th className="py-2">Total Funds</th>
              </tr>
            </thead>
            <tbody>
              {data.grantUtilization.map((item) => (
                <tr key={item.department} className="border-b last:border-b-0">
                  <td className="py-2 pr-2">{item.department}</td>
                  <td className="py-2 pr-2">{item.grantCount}</td>
                  <td className="py-2">${item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {data.grantUtilization.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-slate-500">
                    No grant utilization data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Operational Alerts">
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          {data.alertsBySeverity.map((item) => (
            <div key={item.severity} className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">{item.severity}</p>
              <p className="text-2xl font-semibold text-slate-900">{item.count}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Alert</th>
                <th className="py-2 pr-2">Severity</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.activeAlerts.map((alert) => (
                <tr key={alert.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2">{alert.title}</td>
                  <td className="py-2 pr-2">{alert.severity}</td>
                  <td className="py-2">{formatDate(alert.createdAt)}</td>
                </tr>
              ))}
              {data.activeAlerts.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-slate-500">
                    No active operational alerts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="KPI Performance">
        <p className="mb-3 text-xs text-slate-500">KPIs currently below target values.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">KPI</th>
                <th className="py-2 pr-2">Department</th>
                <th className="py-2 pr-2">Current Value</th>
                <th className="py-2 pr-2">Target</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.kpisBelowTarget.map((kpi) => (
                <tr key={kpi.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2">{kpi.name}</td>
                  <td className="py-2 pr-2">{kpi.department?.name ?? "N/A"}</td>
                  <td className="py-2 pr-2">{kpi.value}</td>
                  <td className="py-2 pr-2">{kpi.target ?? "N/A"}</td>
                  <td className="py-2">{kpi.status}</td>
                </tr>
              ))}
              {data.kpisBelowTarget.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-slate-500">
                    No KPIs below target were found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Active Work Orders">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Open</p>
            <p className="text-2xl font-semibold text-slate-900">{data.activeWorkOrders.open}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">In Progress</p>
            <p className="text-2xl font-semibold text-slate-900">{data.activeWorkOrders.inProgress}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Completed</p>
            <p className="text-2xl font-semibold text-slate-900">{data.activeWorkOrders.completed}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

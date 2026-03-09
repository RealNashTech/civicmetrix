import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { requireAnyRole, RoleAccessError } from "@/lib/permissions";
import { tenantDb } from "@/lib/tenantDb";
import { notFound } from "next/navigation";

type ReportType = "weekly" | "monthly" | "quarterly";

type ReportParams = {
  type?: string;
  generate?: string;
};

type ReportData = {
  totalAssets: number;
  assetsAtRisk: number;
  totalOpenIssues: number;
  issuesByCategory: Array<{ category: string; count: number }>;
  totalWorkOrders: number;
  openWorkOrders: number;
  inProgressWorkOrders: number;
  completedWorkOrders: number;
  grantTotalsByDepartment: Array<{ department: string; totalAmount: number }>;
  kpisBelowTarget: number;
};

const REPORT_TYPES: Array<{ value: ReportType; label: string }> = [
  { value: "weekly", label: "Weekly Operations Report" },
  { value: "monthly", label: "Monthly Infrastructure Health Report" },
  { value: "quarterly", label: "Quarterly Council Briefing" },
];

function parseReportType(value: string | undefined): ReportType {
  if (value === "monthly" || value === "quarterly") {
    return value;
  }
  return "weekly";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportParams>;
}) {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  try {
    await requireAnyRole(["SYSTEM_ADMIN", "CITY_ADMIN", "COUNCIL_MEMBER"], session.user);
  } catch (error) {
    if (error instanceof RoleAccessError) {
      notFound();
    }
    throw error;
  }

  const organizationId = requireOrganization(session);
  const params = await searchParams;
  const reportType = parseReportType(params.type);
  const shouldGenerate = params.generate === "1";

  const reportData = await tenantDb<ReportData>(organizationId, async (tx) => {
    const [
      totalAssets,
      assetsAtRisk,
      totalOpenIssues,
      issuesByCategoryRaw,
      totalWorkOrders,
      workOrderStatusRaw,
      grantsByDepartmentRaw,
      departments,
      kpis,
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
      tx.issueReport.count({
        where: {
          organizationId,
          status: "OPEN",
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
      }),
      tx.workOrder.count({
        where: { organizationId },
      }),
      tx.workOrder.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: {
          _all: true,
        },
      }),
      tx.grant.groupBy({
        by: ["departmentId"],
        where: { organizationId },
        _sum: {
          amount: true,
        },
      }),
      tx.department.findMany({
        where: { organizationId },
        select: { id: true, name: true },
      }),
      tx.kPI.findMany({
        where: {
          organizationId,
          target: { not: null },
        },
        select: {
          value: true,
          target: true,
        },
      }),
    ]);

    const deptMap = new Map(departments.map((department: { id: string; name: string }) => [department.id, department.name]));

    const issuesByCategory = issuesByCategoryRaw.map(
      (row: { category: string; _count: { _all: number } }) => ({
        category: row.category,
        count: row._count._all,
      }),
    );

    const openWorkOrders =
      workOrderStatusRaw.find((item: { status: string }) => item.status === "OPEN")?._count._all ?? 0;
    const inProgressWorkOrders =
      workOrderStatusRaw.find((item: { status: string }) => item.status === "IN_PROGRESS")?._count._all ?? 0;
    const completedWorkOrders =
      workOrderStatusRaw.find((item: { status: string }) => item.status === "COMPLETE")?._count._all ?? 0;

    const grantTotalsByDepartment = grantsByDepartmentRaw
      .map((row: { departmentId: string | null; _sum: { amount: unknown } }) => ({
        department: row.departmentId ? deptMap.get(row.departmentId) ?? "Unknown Department" : "Unassigned",
        totalAmount: Number(row._sum.amount ?? 0),
      }))
      .sort((a: { totalAmount: number }, b: { totalAmount: number }) => b.totalAmount - a.totalAmount);

    const kpisBelowTarget = kpis.filter(
      (kpi: { value: number; target: number | null }) =>
        typeof kpi.target === "number" && kpi.value < kpi.target,
    ).length;

    return {
      totalAssets,
      assetsAtRisk,
      totalOpenIssues,
      issuesByCategory,
      totalWorkOrders,
      openWorkOrders,
      inProgressWorkOrders,
      completedWorkOrders,
      grantTotalsByDepartment,
      kpisBelowTarget,
    };
  });

  return (
    <div className="space-y-6">
      <Card title="CivicMetrix Council Report Generator">
        <p className="mb-3 text-sm text-slate-600">Generate operational reports for city staff and council review.</p>
        <form method="GET" className="flex flex-col gap-3 md:flex-row md:items-center">
          <select
            name="type"
            defaultValue={reportType}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {REPORT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            name="generate"
            value="1"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Generate Report
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          Upcoming: PDF export, PowerPoint export, scheduled report emails.
        </p>
      </Card>

      {shouldGenerate ? (
        <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
          <header>
            <h1 className="text-2xl font-semibold text-slate-900">
              {
                REPORT_TYPES.find((option) => option.value === reportType)?.label ??
                "Weekly Operations Report"
              }
            </h1>
            <p className="text-sm text-slate-600">Generated at {new Date().toLocaleString()}</p>
          </header>

          <Card title="Infrastructure Health Summary">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Total Assets</p>
                <p className="text-2xl font-semibold text-slate-900">{reportData.totalAssets}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Assets at Risk (&lt; 40)</p>
                <p className="text-2xl font-semibold text-slate-900">{reportData.assetsAtRisk}</p>
              </div>
            </div>
          </Card>

          <Card title="Open Issues by Category">
            <p className="mb-3 text-sm text-slate-600">Total Open Issues: {reportData.totalOpenIssues}</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {reportData.issuesByCategory.map((item) => (
                <li key={item.category}>
                  {item.category}: {item.count}
                </li>
              ))}
              {reportData.issuesByCategory.length === 0 ? <li>No open issues found.</li> : null}
            </ul>
          </Card>

          <Card title="Work Order Status Summary">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Total Work Orders</p>
                <p className="text-2xl font-semibold text-slate-900">{reportData.totalWorkOrders}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Open</p>
                <p className="text-2xl font-semibold text-slate-900">{reportData.openWorkOrders}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">In Progress</p>
                <p className="text-2xl font-semibold text-slate-900">{reportData.inProgressWorkOrders}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Completed</p>
                <p className="text-2xl font-semibold text-slate-900">{reportData.completedWorkOrders}</p>
              </div>
            </div>
          </Card>

          <Card title="Grant Funding Overview">
            <ul className="space-y-1 text-sm text-slate-700">
              {reportData.grantTotalsByDepartment.map((item) => (
                <li key={item.department}>
                  {item.department}: ${item.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </li>
              ))}
              {reportData.grantTotalsByDepartment.length === 0 ? <li>No grants found.</li> : null}
            </ul>
          </Card>

          <Card title="KPI Performance Summary">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">KPIs Below Target</p>
              <p className="text-2xl font-semibold text-slate-900">{reportData.kpisBelowTarget}</p>
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

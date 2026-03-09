import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { requireAnyRole, RoleAccessError } from "@/lib/permissions";
import { tenantDb } from "@/lib/tenantDb";

import { DataBrowserCharts } from "./data-browser-charts";

type DatasetName =
  | "IssueReport"
  | "Asset"
  | "WorkOrder"
  | "Grant"
  | "KPI"
  | "Department"
  | "Program";

type SortDir = "asc" | "desc";

type DatasetPageParams = {
  dataset?: string;
  q?: string;
  status?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

type IssueCategoryDatum = { category: string; count: number };
type AssetDistributionDatum = { bucket: string; count: number };
type GrantDepartmentDatum = { department: string; amount: number };
type KpiTrendDatum = { point: string; [key: string]: string | number | null };

type DataBrowserResult = {
  rows: Array<Record<string, string | number | boolean | null>>;
  totalCount: number;
  columns: string[];
  datasetMetrics: Array<{ label: string; value: string }>;
  issueCategoryData: IssueCategoryDatum[];
  assetConditionDistributionData: AssetDistributionDatum[];
  grantFundingByDepartmentData: GrantDepartmentDatum[];
  kpiTrendData: KpiTrendDatum[];
  kpiSeriesKeys: string[];
};

const DATASETS: DatasetName[] = [
  "IssueReport",
  "Asset",
  "WorkOrder",
  "Grant",
  "KPI",
  "Department",
  "Program",
];

const PAGE_SIZE = 15;

const DATASET_SORT_FIELDS: Record<DatasetName, string[]> = {
  IssueReport: ["createdAt", "title", "status", "category", "priority"],
  Asset: ["createdAt", "name", "type", "conditionScore", "status"],
  WorkOrder: ["createdAt", "title", "status", "priority", "assignedTo"],
  Grant: ["createdAt", "name", "status", "amount", "nextReportDue"],
  KPI: ["createdAt", "name", "value", "target", "status"],
  Department: ["createdAt", "name"],
  Program: ["createdAt", "name", "startDate", "endDate", "isPublic"],
};

function parseDataset(input: string | undefined): DatasetName {
  if (input && DATASETS.includes(input as DatasetName)) {
    return input as DatasetName;
  }
  return "IssueReport";
}

function parseSortDir(input: string | undefined): SortDir {
  return input === "asc" ? "asc" : "desc";
}

function parsePage(input: string | undefined): number {
  const parsed = Number.parseInt(String(input ?? "1"), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function clampSort(dataset: DatasetName, sort: string | undefined): string {
  const allowed = DATASET_SORT_FIELDS[dataset];
  if (sort && allowed.includes(sort)) {
    return sort;
  }
  return "createdAt";
}

function formatCell(value: string | number | boolean | null): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value === null) {
    return "-";
  }
  return String(value);
}

function createQueryString(
  current: DatasetPageParams,
  updates: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();

  const merged: Record<string, string | undefined> = {
    dataset: current.dataset,
    q: current.q,
    status: current.status,
    sort: current.sort,
    dir: current.dir,
    page: current.page,
  };

  for (const [key, value] of Object.entries(updates)) {
    merged[key] = value == null ? undefined : String(value);
  }

  for (const [key, value] of Object.entries(merged)) {
    if (value && value.trim().length > 0) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function formatDate(value: Date | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return new Date(value).toLocaleString();
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

async function getDataBrowserResult(
  organizationId: string,
  dataset: DatasetName,
  page: number,
  sort: string,
  dir: SortDir,
  q: string,
  status: string,
): Promise<DataBrowserResult> {
  return tenantDb<DataBrowserResult>(organizationId, async (tx) => {
    const skip = (page - 1) * PAGE_SIZE;

    const issueCategoryRaw = await tx.issueReport.groupBy({
      by: ["category"],
      where: { organizationId },
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
      take: 8,
    });

    const assetConditionScores = await tx.asset.findMany({
      where: { organizationId },
      select: { conditionScore: true },
    });

    const grantsByDepartmentRaw = await tx.grant.groupBy({
      by: ["departmentId"],
      where: { organizationId },
      _sum: { amount: true },
    });

    const departmentsForGrantMap = await tx.department.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });

    const kpiTrendSource = await tx.kPI.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        name: true,
        value: true,
        history: {
          select: {
            recordedAt: true,
            value: true,
          },
          orderBy: { recordedAt: "asc" },
          take: 12,
        },
      },
    });

    const issueCategoryData: IssueCategoryDatum[] = issueCategoryRaw.map((row: { category: string; _count: { _all: number } }) => ({
      category: row.category,
      count: row._count._all,
    }));

    const assetBuckets = {
      "0-39": 0,
      "40-59": 0,
      "60-79": 0,
      "80-100": 0,
      "Unknown": 0,
    } as Record<string, number>;

    for (const asset of assetConditionScores as Array<{ conditionScore: number | null }>) {
      const score = asset.conditionScore;
      if (typeof score !== "number") {
        assetBuckets.Unknown += 1;
      } else if (score < 40) {
        assetBuckets["0-39"] += 1;
      } else if (score < 60) {
        assetBuckets["40-59"] += 1;
      } else if (score < 80) {
        assetBuckets["60-79"] += 1;
      } else {
        assetBuckets["80-100"] += 1;
      }
    }

    const assetConditionDistributionData: AssetDistributionDatum[] = Object.entries(assetBuckets).map(
      ([bucket, count]) => ({ bucket, count }),
    );

    const departmentMap = new Map<string, string>(
      (departmentsForGrantMap as Array<{ id: string; name: string }>).map((department) => [department.id, department.name]),
    );

    const grantFundingByDepartmentData: GrantDepartmentDatum[] = (
      grantsByDepartmentRaw as Array<{ departmentId: string | null; _sum: { amount: unknown } }>
    )
      .map((row) => ({
        department: row.departmentId ? departmentMap.get(row.departmentId) ?? "Unknown" : "Unassigned",
        amount: Number(row._sum.amount ?? 0),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const kpiSeriesKeys = (kpiTrendSource as Array<{ name: string; value: number; history: Array<{ recordedAt: Date; value: { toNumber: () => number } | number }> }>).map((kpi) => kpi.name);
    const maxLength = Math.max(
      1,
      ...((kpiTrendSource as Array<{ history: Array<unknown> }>).map((kpi) => kpi.history.length || 1)),
    );

    const kpiTrendData: KpiTrendDatum[] = [];
    for (let index = 0; index < maxLength; index += 1) {
      const point: KpiTrendDatum = { point: `T${index + 1}` };
      for (const kpi of kpiTrendSource as Array<{
        name: string;
        value: number;
        history: Array<{ value: { toNumber: () => number } | number }>;
      }>) {
        const historyValue = kpi.history[index]?.value;
        const numericHistoryValue =
          typeof historyValue === "number"
            ? historyValue
            : historyValue && typeof historyValue === "object" && "toNumber" in historyValue
              ? historyValue.toNumber()
              : null;
        point[kpi.name] = numericHistoryValue ?? (index === maxLength - 1 ? kpi.value : null);
      }
      kpiTrendData.push(point);
    }

    if (dataset === "IssueReport") {
      const where = {
        organizationId,
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
                { category: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [rows, totalCount, openIssues, resolvedIssues] = await Promise.all([
        tx.issueReport.findMany({
          where,
          orderBy: { [sort]: dir },
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            priority: true,
            createdAt: true,
          },
        }),
        tx.issueReport.count({ where }),
        tx.issueReport.count({ where: { organizationId, status: "OPEN" } }),
        tx.issueReport.count({ where: { organizationId, status: "RESOLVED" } }),
      ]);

      return {
        rows: (rows as Array<{ id: string; title: string; category: string; status: string; priority: string | null; createdAt: Date }>).map((row) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          status: row.status,
          priority: row.priority,
          createdAt: formatDate(row.createdAt),
        })),
        totalCount,
        columns: ["id", "title", "category", "status", "priority", "createdAt"],
        datasetMetrics: [
          { label: "Total Issues", value: String(totalCount) },
          { label: "Open Issues", value: String(openIssues) },
          { label: "Resolved Issues", value: String(resolvedIssues) },
        ],
        issueCategoryData,
        assetConditionDistributionData,
        grantFundingByDepartmentData,
        kpiTrendData,
        kpiSeriesKeys,
      };
    }

    if (dataset === "Asset") {
      const where = {
        organizationId,
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { type: { contains: q, mode: "insensitive" as const } },
                { address: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [rows, totalCount, aggregates, belowThreshold] = await Promise.all([
        tx.asset.findMany({
          where,
          orderBy: { [sort]: dir },
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            conditionScore: true,
            createdAt: true,
          },
        }),
        tx.asset.count({ where }),
        tx.asset.aggregate({
          where: { organizationId },
          _avg: { conditionScore: true },
        }),
        tx.asset.count({ where: { organizationId, conditionScore: { lt: 40 } } }),
      ]);

      return {
        rows: (rows as Array<{ id: string; name: string; type: string; status: string; conditionScore: number | null; createdAt: Date }>).map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          status: row.status,
          conditionScore: row.conditionScore,
          createdAt: formatDate(row.createdAt),
        })),
        totalCount,
        columns: ["id", "name", "type", "status", "conditionScore", "createdAt"],
        datasetMetrics: [
          { label: "Total Assets", value: String(totalCount) },
          { label: "Avg Condition", value: Number(aggregates._avg.conditionScore ?? 0).toFixed(1) },
          { label: "Below Threshold (<40)", value: String(belowThreshold) },
        ],
        issueCategoryData,
        assetConditionDistributionData,
        grantFundingByDepartmentData,
        kpiTrendData,
        kpiSeriesKeys,
      };
    }

    if (dataset === "WorkOrder") {
      const where = {
        organizationId,
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
                { assignedTo: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [rows, totalCount] = await Promise.all([
        tx.workOrder.findMany({
          where,
          orderBy: { [sort]: dir },
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assignedTo: true,
            createdAt: true,
          },
        }),
        tx.workOrder.count({ where }),
      ]);

      return {
        rows: (rows as Array<{ id: string; title: string; status: string; priority: string; assignedTo: string | null; createdAt: Date }>).map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          priority: row.priority,
          assignedTo: row.assignedTo,
          createdAt: formatDate(row.createdAt),
        })),
        totalCount,
        columns: ["id", "title", "status", "priority", "assignedTo", "createdAt"],
        datasetMetrics: [{ label: "Total Work Orders", value: String(totalCount) }],
        issueCategoryData,
        assetConditionDistributionData,
        grantFundingByDepartmentData,
        kpiTrendData,
        kpiSeriesKeys,
      };
    }

    if (dataset === "Grant") {
      const where = {
        organizationId,
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { reportingFrequency: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [rows, totalCount, grantTotals] = await Promise.all([
        tx.grant.findMany({
          where,
          orderBy: { [sort]: dir },
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            name: true,
            status: true,
            amount: true,
            department: {
              select: { name: true },
            },
            createdAt: true,
          },
        }),
        tx.grant.count({ where }),
        tx.grant.aggregate({
          where: { organizationId },
          _sum: { amount: true },
        }),
      ]);

      return {
        rows: (rows as Array<{
          id: string;
          name: string;
          status: string;
          amount: { toNumber: () => number } | number;
          department: { name: string } | null;
          createdAt: Date;
        }>).map((row) => ({
          id: row.id,
          name: row.name,
          status: row.status,
          amount:
            typeof row.amount === "number"
              ? row.amount
              : row.amount && typeof row.amount === "object" && "toNumber" in row.amount
                ? row.amount.toNumber()
                : 0,
          department: row.department?.name ?? "Unassigned",
          createdAt: formatDate(row.createdAt),
        })),
        totalCount,
        columns: ["id", "name", "status", "amount", "department", "createdAt"],
        datasetMetrics: [
          { label: "Total Grants", value: String(totalCount) },
          { label: "Total Funding", value: formatCurrency(Number(grantTotals._sum.amount ?? 0)) },
          { label: "Departments With Funding", value: String(grantFundingByDepartmentData.length) },
        ],
        issueCategoryData,
        assetConditionDistributionData,
        grantFundingByDepartmentData,
        kpiTrendData,
        kpiSeriesKeys,
      };
    }

    if (dataset === "KPI") {
      const where = {
        organizationId,
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { unit: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [rows, totalCount, allKpiTargets] = await Promise.all([
        tx.kPI.findMany({
          where,
          orderBy: { [sort]: dir },
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            name: true,
            value: true,
            target: true,
            status: true,
            unit: true,
            createdAt: true,
          },
        }),
        tx.kPI.count({ where }),
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

      const kpiRows = rows as Array<{
        id: string;
        name: string;
        value: number;
        target: number | null;
        status: string;
        unit: string | null;
        createdAt: Date;
      }>;
      const belowTargetComputed = (allKpiTargets as Array<{ value: number; target: number | null }>).filter(
        (row) => typeof row.target === "number" && row.value < row.target,
      ).length;

      return {
        rows: kpiRows.map((row) => ({
          id: row.id,
          name: row.name,
          value: row.value,
          target: row.target,
          status: row.status,
          unit: row.unit,
          createdAt: formatDate(row.createdAt),
        })),
        totalCount,
        columns: ["id", "name", "value", "target", "status", "unit", "createdAt"],
        datasetMetrics: [
          { label: "Total KPIs", value: String(totalCount) },
          { label: "Below Target", value: String(belowTargetComputed) },
          { label: "Series With Trend Data", value: String(kpiSeriesKeys.length) },
        ],
        issueCategoryData,
        assetConditionDistributionData,
        grantFundingByDepartmentData,
        kpiTrendData,
        kpiSeriesKeys,
      };
    }

    if (dataset === "Department") {
      const where = {
        organizationId,
        ...(q
          ? {
              name: { contains: q, mode: "insensitive" as const },
            }
          : {}),
      };

      const [rows, totalCount] = await Promise.all([
        tx.department.findMany({
          where,
          orderBy: { [sort]: dir },
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        }),
        tx.department.count({ where }),
      ]);

      return {
        rows: (rows as Array<{ id: string; name: string; createdAt: Date }>).map((row) => ({
          id: row.id,
          name: row.name,
          createdAt: formatDate(row.createdAt),
        })),
        totalCount,
        columns: ["id", "name", "createdAt"],
        datasetMetrics: [{ label: "Total Departments", value: String(totalCount) }],
        issueCategoryData,
        assetConditionDistributionData,
        grantFundingByDepartmentData,
        kpiTrendData,
        kpiSeriesKeys,
      };
    }

    const where = {
      organizationId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [rows, totalCount] = await Promise.all([
      tx.program.findMany({
        where,
        orderBy: { [sort]: dir },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          isPublic: true,
          startDate: true,
          endDate: true,
          department: {
            select: { name: true },
          },
          createdAt: true,
        },
      }),
      tx.program.count({ where }),
    ]);

    return {
      rows: (rows as Array<{
        id: string;
        name: string;
        isPublic: boolean;
        startDate: Date | null;
        endDate: Date | null;
        department: { name: string };
        createdAt: Date;
      }>).map((row) => ({
        id: row.id,
        name: row.name,
        isPublic: row.isPublic,
        startDate: formatDate(row.startDate),
        endDate: formatDate(row.endDate),
        department: row.department.name,
        createdAt: formatDate(row.createdAt),
      })),
      totalCount,
      columns: ["id", "name", "department", "isPublic", "startDate", "endDate", "createdAt"],
      datasetMetrics: [{ label: "Total Programs", value: String(totalCount) }],
      issueCategoryData,
      assetConditionDistributionData,
      grantFundingByDepartmentData,
      kpiTrendData,
      kpiSeriesKeys,
    };
  });
}

export default async function DataBrowserPage({
  searchParams,
}: {
  searchParams: Promise<DatasetPageParams>;
}) {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  try {
    await requireAnyRole(["SYSTEM_ADMIN", "CITY_ADMIN", "DEPARTMENT_ADMIN"], session.user);
  } catch (error) {
    if (error instanceof RoleAccessError) {
      notFound();
    }
    throw error;
  }

  const organizationId = requireOrganization(session);
  const params = await searchParams;

  const dataset = parseDataset(params.dataset);
  const q = (params.q ?? "").trim();
  const status = (params.status ?? "").trim();
  const page = parsePage(params.page);
  const sort = clampSort(dataset, params.sort);
  const dir = parseSortDir(params.dir);

  const data = await getDataBrowserResult(organizationId, dataset, page, sort, dir, q, status);

  const totalPages = Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE));
  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Municipal Data Browser</h1>
        <p className="text-sm text-slate-600">
          Explore tenant-scoped municipal datasets with search, filters, sorting, pagination, and visual analytics.
        </p>
      </div>

      <Card title="Dataset Selector">
        <form method="GET" className="grid gap-3 md:grid-cols-6">
          <select
            name="dataset"
            defaultValue={dataset}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {DATASETS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="status"
            defaultValue={status}
            placeholder="Status filter"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select name="sort" defaultValue={sort} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {DATASET_SORT_FIELDS[dataset].map((field) => (
              <option key={field} value={field}>
                Sort: {field}
              </option>
            ))}
          </select>
          <select name="dir" defaultValue={dir} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Apply
          </button>
        </form>
      </Card>

      <Card title={`Dataset Metrics: ${dataset}`}>
        <div className="grid gap-4 md:grid-cols-3">
          {data.datasetMetrics.map((metric) => (
            <div key={metric.label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">{metric.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title={`Table Explorer: ${dataset}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                {data.columns.map((column) => {
                  const isActive = sort === column;
                  const nextDir: SortDir = isActive && dir === "asc" ? "desc" : "asc";
                  const href = `/dashboard/data-browser${createQueryString(params, {
                    dataset,
                    sort: column,
                    dir: nextDir,
                    page: 1,
                  })}`;

                  return (
                    <th key={column} className="py-2 pr-3">
                      <Link href={href} className="hover:text-slate-800 hover:underline">
                        {column}
                        {isActive ? (dir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIndex) => (
                <tr key={`${dataset}-${rowIndex}`} className="border-b last:border-b-0">
                  {data.columns.map((column) => (
                    <td key={`${rowIndex}-${column}`} className="py-2 pr-3 text-slate-700">
                      {formatCell((row[column] as string | number | boolean | null) ?? null)}
                    </td>
                  ))}
                </tr>
              ))}
              {data.rows.length === 0 ? (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={data.columns.length}>
                    No records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-600">
            Page {page} of {totalPages} ({data.totalCount} records)
          </p>
          <div className="flex gap-3">
            <Link
              href={`/dashboard/data-browser${createQueryString(params, { page: previousPage })}`}
              className={`rounded-md border px-3 py-1 ${page <= 1 ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
            >
              Previous
            </Link>
            <Link
              href={`/dashboard/data-browser${createQueryString(params, { page: nextPage })}`}
              className={`rounded-md border px-3 py-1 ${page >= totalPages ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
            >
              Next
            </Link>
          </div>
        </div>
      </Card>

      <DataBrowserCharts
        issueCategoryData={data.issueCategoryData}
        assetConditionDistributionData={data.assetConditionDistributionData}
        grantFundingByDepartmentData={data.grantFundingByDepartmentData}
        kpiTrendData={data.kpiTrendData}
        kpiSeriesKeys={data.kpiSeriesKeys}
      />
    </div>
  );
}

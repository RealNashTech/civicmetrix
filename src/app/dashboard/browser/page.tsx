import Link from "next/link";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { tenantDb } from "@/lib/tenantDb";

type DatasetKey = "assets" | "grants" | "issues" | "kpis";

type SearchParams = {
  dataset?: string;
  q?: string;
  department?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  min?: string;
  max?: string;
  page?: string;
  detailId?: string;
};

type AssetRow = {
  id: string;
  name: string;
  type: string;
  conditionScore: number | null;
  status: string;
  createdAt: Date;
  department: { name: string } | null;
};

type GrantRow = {
  id: string;
  name: string;
  status: string;
  amount: unknown;
  createdAt: Date;
  department: { name: string } | null;
};

type IssueRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  createdAt: Date;
  department: { name: string } | null;
};

type KpiRow = {
  id: string;
  name: string;
  value: number;
  status: string;
  createdAt: Date;
  department: { name: string } | null;
};

type BrowserData = {
  assets: AssetRow[];
  grants: GrantRow[];
  issues: IssueRow[];
  kpis: KpiRow[];
  total: number;
  detail: Record<string, unknown> | null;
};

const DATASETS: Array<{ key: DatasetKey; label: string }> = [
  { key: "assets", label: "Assets" },
  { key: "grants", label: "Grants" },
  { key: "issues", label: "Issues" },
  { key: "kpis", label: "KPIs" },
];

const PAGE_SIZE = 15;

function parseDataset(dataset: string | undefined): DatasetKey {
  if (dataset === "grants" || dataset === "issues" || dataset === "kpis") {
    return dataset;
  }
  return "assets";
}

function toDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return parsed;
}

function formatDate(value: Date | null | undefined): string {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleString();
}

function withParam(params: URLSearchParams, key: string, value?: string) {
  const next = new URLSearchParams(params);
  if (value && value.length > 0) {
    next.set(key, value);
  } else {
    next.delete(key);
  }
  return `?${next.toString()}`;
}

function toDetailEntries(detail: Record<string, unknown> | null): Array<{ key: string; value: string }> {
  if (!detail) {
    return [];
  }
  return Object.entries(detail).map(([key, value]) => {
    if (value === null || value === undefined) {
      return { key, value: "N/A" };
    }
    if (typeof value === "object") {
      return { key, value: JSON.stringify(value) };
    }
    return { key, value: String(value) };
  });
}

export default async function MunicipalDataBrowserPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    return null;
  }

  const organizationId = requireOrganization(session);
  const params = await searchParams;

  const dataset = parseDataset(params.dataset);
  const query = params.q?.trim() ?? "";
  const department = params.department?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const dateFrom = toDate(params.dateFrom);
  const dateTo = toDate(params.dateTo);
  const min = toNumber(params.min);
  const max = toNumber(params.max);
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const detailId = params.detailId?.trim() || undefined;

  const data = await tenantDb<BrowserData>(organizationId, async (tx) => {
    if (dataset === "assets") {
      const where: Record<string, unknown> = { organizationId };
      if (query) {
        where.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { type: { contains: query, mode: "insensitive" } },
          { status: { contains: query, mode: "insensitive" } },
        ];
      }
      if (department) {
        where.department = { name: { contains: department, mode: "insensitive" } };
      }
      if (category) {
        where.type = { contains: category, mode: "insensitive" };
      }
      if (dateFrom || dateTo) {
        where.createdAt = {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        };
      }
      if (min !== undefined || max !== undefined) {
        where.conditionScore = {
          ...(min !== undefined ? { gte: min } : {}),
          ...(max !== undefined ? { lte: max } : {}),
        };
      }

      const [rows, total, detail] = await Promise.all([
        tx.asset.findMany({
          where,
          include: { department: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          skip,
          take: PAGE_SIZE,
        }),
        tx.asset.count({ where }),
        detailId
          ? tx.asset.findFirst({
              where: { id: detailId, organizationId },
              include: { department: { select: { name: true } } },
            })
          : Promise.resolve(null),
      ]);
      return { assets: rows, grants: [], issues: [], kpis: [], total, detail };
    }

    if (dataset === "grants") {
      const where: Record<string, unknown> = { organizationId };
      if (query) {
        where.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { status: { contains: query, mode: "insensitive" } },
        ];
      }
      if (department) {
        where.department = { name: { contains: department, mode: "insensitive" } };
      }
      if (category) {
        where.status = { contains: category, mode: "insensitive" };
      }
      if (dateFrom || dateTo) {
        where.createdAt = {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        };
      }
      if (min !== undefined || max !== undefined) {
        where.amount = {
          ...(min !== undefined ? { gte: min } : {}),
          ...(max !== undefined ? { lte: max } : {}),
        };
      }

      const [rows, total, detail] = await Promise.all([
        tx.grant.findMany({
          where,
          include: { department: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          skip,
          take: PAGE_SIZE,
        }),
        tx.grant.count({ where }),
        detailId
          ? tx.grant.findFirst({
              where: { id: detailId, organizationId },
              include: { department: { select: { name: true } } },
            })
          : Promise.resolve(null),
      ]);
      return { assets: [], grants: rows, issues: [], kpis: [], total, detail };
    }

    if (dataset === "issues") {
      const where: Record<string, unknown> = { organizationId };
      if (query) {
        where.OR = [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
        ];
      }
      if (department) {
        where.department = { name: { contains: department, mode: "insensitive" } };
      }
      if (category) {
        where.category = { contains: category, mode: "insensitive" };
      }
      if (dateFrom || dateTo) {
        where.createdAt = {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        };
      }

      const [rows, total, detail] = await Promise.all([
        tx.issueReport.findMany({
          where,
          include: { department: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          skip,
          take: PAGE_SIZE,
        }),
        tx.issueReport.count({ where }),
        detailId
          ? tx.issueReport.findFirst({
              where: { id: detailId, organizationId },
              include: { department: { select: { name: true } } },
            })
          : Promise.resolve(null),
      ]);
      return { assets: [], grants: [], issues: rows, kpis: [], total, detail };
    }

    const where: Record<string, unknown> = { organizationId };
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { status: { contains: query, mode: "insensitive" } },
      ];
    }
    if (department) {
      where.department = { name: { contains: department, mode: "insensitive" } };
    }
    if (category) {
      where.status = { contains: category, mode: "insensitive" };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }
    if (min !== undefined || max !== undefined) {
      where.value = {
        ...(min !== undefined ? { gte: min } : {}),
        ...(max !== undefined ? { lte: max } : {}),
      };
    }

    const [rows, total, detail] = await Promise.all([
      tx.kPI.findMany({
        where,
        include: { department: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      tx.kPI.count({ where }),
      detailId
        ? tx.kPI.findFirst({
            where: { id: detailId, organizationId },
            include: { department: { select: { name: true } } },
          })
        : Promise.resolve(null),
    ]);

    return { assets: [], grants: [], issues: [], kpis: rows, total, detail };
  });

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const urlParams = new URLSearchParams();
  if (dataset) urlParams.set("dataset", dataset);
  if (query) urlParams.set("q", query);
  if (department) urlParams.set("department", department);
  if (category) urlParams.set("category", category);
  if (params.dateFrom) urlParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) urlParams.set("dateTo", params.dateTo);
  if (params.min) urlParams.set("min", params.min);
  if (params.max) urlParams.set("max", params.max);

  const detailEntries = toDetailEntries(data.detail);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">CivicMetrix Municipal Data Browser</h1>
        <p className="text-sm text-slate-600">Explore tenant-scoped operational datasets.</p>
      </div>

      <Card title="1 Dataset Selector Tabs">
        <div className="flex flex-wrap gap-2">
          {DATASETS.map((tab) => (
            <Link
              key={tab.key}
              href={withParam(new URLSearchParams(urlParams), "dataset", tab.key)}
              className={`rounded-md border px-3 py-2 text-sm ${
                dataset === tab.key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </Card>

      <Card title="2 Filter Panel">
        <form method="GET" className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="dataset" value={dataset} />
          <input
            name="department"
            defaultValue={department}
            placeholder="Department"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="category"
            defaultValue={category}
            placeholder={dataset === "issues" ? "Issue category" : "Category / status"}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="dateFrom"
            defaultValue={params.dateFrom}
            type="date"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="dateTo"
            defaultValue={params.dateTo}
            type="date"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="min"
            defaultValue={params.min}
            type="number"
            step="0.01"
            placeholder="Numeric min"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="max"
            defaultValue={params.max}
            type="number"
            step="0.01"
            placeholder="Numeric max"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </Card>

      <Card title="3 Search Input">
        <form method="GET" className="flex gap-2">
          <input type="hidden" name="dataset" value={dataset} />
          <input type="hidden" name="department" value={department} />
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="dateFrom" value={params.dateFrom ?? ""} />
          <input type="hidden" name="dateTo" value={params.dateTo ?? ""} />
          <input type="hidden" name="min" value={params.min ?? ""} />
          <input type="hidden" name="max" value={params.max ?? ""} />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search records"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Search
          </button>
        </form>
      </Card>

      <Card title="4 Data Table With Pagination">
        <div className="overflow-x-auto">
          {dataset === "assets" && (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr className="border-b">
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 pr-2">Department</th>
                  <th className="py-2 pr-2">Condition</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.assets.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-2">
                      <Link
                        href={withParam(new URLSearchParams(urlParams), "detailId", row.id)}
                        className="text-blue-600 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-2">{row.type}</td>
                    <td className="py-2 pr-2">{row.department?.name ?? "N/A"}</td>
                    <td className="py-2 pr-2">{row.conditionScore ?? "N/A"}</td>
                    <td className="py-2">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {dataset === "grants" && (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr className="border-b">
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Department</th>
                  <th className="py-2 pr-2">Amount</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.grants.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-2">
                      <Link
                        href={withParam(new URLSearchParams(urlParams), "detailId", row.id)}
                        className="text-blue-600 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-2">{row.status}</td>
                    <td className="py-2 pr-2">{row.department?.name ?? "N/A"}</td>
                    <td className="py-2 pr-2">{String(row.amount)}</td>
                    <td className="py-2">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {dataset === "issues" && (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr className="border-b">
                  <th className="py-2 pr-2">Title</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2">Department</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.issues.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-2">
                      <Link
                        href={withParam(new URLSearchParams(urlParams), "detailId", row.id)}
                        className="text-blue-600 hover:underline"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-2">{row.category}</td>
                    <td className="py-2 pr-2">{row.department?.name ?? "N/A"}</td>
                    <td className="py-2 pr-2">{row.status}</td>
                    <td className="py-2">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {dataset === "kpis" && (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr className="border-b">
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Department</th>
                  <th className="py-2 pr-2">Value</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.kpis.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-2">
                      <Link
                        href={withParam(new URLSearchParams(urlParams), "detailId", row.id)}
                        className="text-blue-600 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-2">{row.status}</td>
                    <td className="py-2 pr-2">{row.department?.name ?? "N/A"}</td>
                    <td className="py-2 pr-2">{row.value}</td>
                    <td className="py-2">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data.total === 0 && <p className="mt-3 text-sm text-slate-500">No records found.</p>}

        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {page} of {totalPages} ({data.total} records)
          </p>
          <div className="flex gap-2">
            <Link
              href={withParam(new URLSearchParams(urlParams), "page", String(Math.max(1, page - 1)))}
              className={`rounded border px-3 py-1 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              Previous
            </Link>
            <Link
              href={withParam(
                new URLSearchParams(urlParams),
                "page",
                String(Math.min(totalPages, page + 1)),
              )}
              className={`rounded border px-3 py-1 ${
                page >= totalPages ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </Card>

      <Card title="5 Record Detail Drawer">
        {detailId && data.detail ? (
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-4">
            {detailEntries.map((entry) => (
              <p key={entry.key} className="text-sm">
                <span className="font-medium text-slate-900">{entry.key}:</span> {entry.value}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Select a record in the table to view details.</p>
        )}
      </Card>
    </div>
  );
}

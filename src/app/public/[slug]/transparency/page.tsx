import Link from "next/link";

import PublicTransparencyCharts from "@/app/public/[slug]/PublicTransparencyCharts";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { tenantDb } from "@/lib/tenantDb";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

type TransparencyData = {
  assets: Array<{ conditionScore: number | null }>;
  issuesByCategoryRaw: Array<{ category: string; _count: { _all: number } }>;
  grantsByDepartmentRaw: Array<{ departmentId: string | null; _sum: { amount: unknown } }>;
  departments: Array<{ id: string; name: string }>;
  kpis: Array<{ name: string; value: number; target: number | null }>;
  issueTotalsRaw: Array<{ status: string; _count: { _all: number } }>;
};

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export default async function PublicTransparencyPage({ params }: Props) {
  const { slug } = await params;
  const organization = await getOrganizationBySlug(slug);

  const data = await tenantDb<TransparencyData>(organization.id, async (tx) => {
    const [assets, issuesByCategoryRaw, grantsByDepartmentRaw, departments, kpis, issueTotalsRaw] = await Promise.all([
      tx.asset.findMany({
        where: { organizationId: organization.id },
        select: { conditionScore: true },
      }),
      tx.issueReport.groupBy({
        by: ["category"],
        where: { organizationId: organization.id },
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
        take: 8,
      }),
      tx.grant.groupBy({
        by: ["departmentId"],
        where: { organizationId: organization.id, isPublic: true },
        _sum: { amount: true },
      }),
      tx.department.findMany({
        where: { organizationId: organization.id },
        select: { id: true, name: true },
      }),
      tx.kPI.findMany({
        where: { organizationId: organization.id, isPublic: true, target: { not: null } },
        select: { name: true, value: true, target: true },
        take: 12,
      }),
      tx.issueReport.groupBy({
        by: ["status"],
        where: { organizationId: organization.id },
        _count: { _all: true },
      }),
    ]);

    return {
      assets,
      issuesByCategoryRaw,
      grantsByDepartmentRaw,
      departments,
      kpis,
      issueTotalsRaw,
    };
  });

  const assetBuckets = {
    "0-39": 0,
    "40-59": 0,
    "60-79": 0,
    "80-100": 0,
    Unknown: 0,
  } as Record<string, number>;

  for (const asset of data.assets as Array<{ conditionScore: number | null }>) {
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

  const assetConditionDistribution = Object.entries(assetBuckets).map(([bucket, count]) => ({
    bucket,
    count,
  }));

  const issueCategories = (data.issuesByCategoryRaw as Array<{ category: string; _count: { _all: number } }>).map(
    (row) => ({
      category: row.category,
      count: row._count._all,
    }),
  );

  const departmentMap = new Map(
    (data.departments as Array<{ id: string; name: string }>).map((dept) => [dept.id, dept.name]),
  );

  const grantFundingByDepartment = (
    data.grantsByDepartmentRaw as Array<{ departmentId: string | null; _sum: { amount: unknown } }>
  )
    .map((row) => ({
      department: row.departmentId ? departmentMap.get(row.departmentId) ?? "Unknown" : "Unassigned",
      amount: Number(row._sum.amount ?? 0),
    }))
    .sort((a, b) => b.amount - a.amount);

  const kpiPerformance = (data.kpis as Array<{ name: string; value: number; target: number | null }>).map((kpi) => ({
    name: kpi.name,
    value: kpi.value,
    target: Number(kpi.target ?? 0),
  }));

  const totalGrants = grantFundingByDepartment.reduce((sum, row) => sum + row.amount, 0);
  const totalIssues = (data.issueTotalsRaw as Array<{ status: string; _count: { _all: number } }>).reduce(
    (sum, row) => sum + row._count._all,
    0,
  );
  const resolvedIssues = (data.issueTotalsRaw as Array<{ status: string; _count: { _all: number } }>)
    .filter((row) => row.status === "RESOLVED")
    .reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div>
        <Link href={`/public/${slug}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Public Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{organization.name} Transparency</h1>
        <p className="text-sm text-slate-600">Public transparency portal generated from tenant datasets.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Assets</p>
          <p className="text-2xl font-semibold text-slate-900">{data.assets.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Issue Resolution</p>
          <p className="text-2xl font-semibold text-slate-900">{asPercent(resolvedIssues, totalIssues)}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Public Grants Funding</p>
          <p className="text-2xl font-semibold text-slate-900">${totalGrants.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Public KPIs</p>
          <p className="text-2xl font-semibold text-slate-900">{kpiPerformance.length}</p>
        </div>
      </section>

      <PublicTransparencyCharts
        assetConditionDistribution={assetConditionDistribution}
        issueCategories={issueCategories}
        grantFundingByDepartment={grantFundingByDepartment}
        kpiPerformance={kpiPerformance}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Public Pages</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="text-blue-600 hover:underline" href={`/public/${slug}/performance`}>Performance</Link>
          <Link className="text-blue-600 hover:underline" href={`/public/${slug}/infrastructure`}>Infrastructure</Link>
          <Link className="text-blue-600 hover:underline" href={`/public/${slug}/grants`}>Grants</Link>
          <Link className="text-blue-600 hover:underline" href={`/public/${slug}/operations`}>Operations</Link>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";

import PublicTransparencyCharts from "@/app/public/[slug]/PublicTransparencyCharts";
import UnifiedCivicMap from "@/components/maps/unified-civic-map";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { tenantDb } from "@/lib/tenantDb";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

type OperationsPageData = {
  issues: Array<{
    id: string;
    title: string;
    status: string;
    category: string;
    createdAt: Date;
    latitude: number;
    longitude: number;
    department: { name: string } | null;
  }>;
  workOrders: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    department: { name: string } | null;
    asset: { name: string; latitude: number | null; longitude: number | null } | null;
    issue: { title: string; latitude: number | null; longitude: number | null } | null;
  }>;
  issueCategoryRaw: Array<{ category: string; _count: { _all: number } }>;
};

export default async function PublicOperationsPage({ params }: Props) {
  const { slug } = await params;
  const organization = await getOrganizationBySlug(slug);

  const data = await tenantDb<OperationsPageData>(organization.id, async (tx) => {
    const [issues, workOrders, issueCategoryRaw] = await Promise.all([
      tx.issueReport.findMany({
        where: {
          organizationId: organization.id,
          latitude: { not: null },
          longitude: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          createdAt: true,
          latitude: true,
          longitude: true,
          department: { select: { name: true } },
        },
      }),
      tx.workOrder.findMany({
        where: {
          organizationId: organization.id,
        },
        orderBy: { createdAt: "desc" },
        take: 300,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          department: { select: { name: true } },
          asset: { select: { name: true, latitude: true, longitude: true } },
          issue: { select: { title: true, latitude: true, longitude: true } },
        },
      }),
      tx.issueReport.groupBy({
        by: ["category"],
        where: {
          organizationId: organization.id,
        },
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
        take: 8,
      }),
    ]);

    return { issues, workOrders, issueCategoryRaw };
  });

  const issueCategories = (data.issueCategoryRaw as Array<{ category: string; _count: { _all: number } }>).map((row) => ({
    category: row.category,
    count: row._count._all,
  }));

  const mappedIssues = data.issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    department: issue.department?.name ?? null,
    status: issue.status,
    createdAt: issue.createdAt.toISOString(),
    latitude: Number(issue.latitude),
    longitude: Number(issue.longitude),
  }));

  const mappedWorkOrders = data.workOrders
    .map((order) => {
      const latitude = order.asset?.latitude ?? order.issue?.latitude ?? null;
      const longitude = order.asset?.longitude ?? order.issue?.longitude ?? null;
      if (latitude == null || longitude == null) {
        return null;
      }
      return {
        id: order.id,
        title: order.title,
        department: order.department?.name ?? null,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        linkedAsset: order.asset?.name ?? null,
        linkedIssue: order.issue?.title ?? null,
        latitude: Number(latitude),
        longitude: Number(longitude),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div>
        <Link href={`/public/${slug}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Public Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{organization.name} Operations</h1>
        <p className="text-sm text-slate-600">Issue and work order transparency with mapped operations.</p>
      </div>

      <div className="flex gap-3">
        <a href={`/public/${slug}/issues.csv`} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-100">
          Download CSV
        </a>
        <a href={`/public/${slug}/issues.json`} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-100">
          JSON API
        </a>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Issues</p>
          <p className="text-2xl font-semibold text-slate-900">{data.issues.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Work Orders</p>
          <p className="text-2xl font-semibold text-slate-900">{data.workOrders.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Mapped Work Orders</p>
          <p className="text-2xl font-semibold text-slate-900">{mappedWorkOrders.length}</p>
        </div>
      </section>

      <PublicTransparencyCharts issueCategories={issueCategories} />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Issues and Work Orders Map</h2>
        <UnifiedCivicMap issues={mappedIssues} assets={[]} workOrders={mappedWorkOrders} grants={[]} />
      </section>
    </div>
  );
}

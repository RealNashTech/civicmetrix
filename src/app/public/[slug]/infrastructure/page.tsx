import Link from "next/link";

import UnifiedCivicMap from "@/components/maps/unified-civic-map";
import PublicTransparencyCharts from "@/app/public/[slug]/PublicTransparencyCharts";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { tenantDb } from "@/lib/tenantDb";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

type InfrastructurePageData = {
  assets: Array<{
    id: string;
    name: string;
    status: string;
    conditionScore: number | null;
    createdAt: Date;
    latitude: number | null;
    longitude: number | null;
    department: { name: string } | null;
  }>;
  issues: Array<{
    id: string;
    title: string;
    status: string;
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
};

export default async function PublicInfrastructurePage({ params }: Props) {
  const { slug } = await params;
  const organization = await getOrganizationBySlug(slug);

  const data = await tenantDb<InfrastructurePageData>(organization.id, async (tx) => {
    const [assets, issues, workOrders] = await Promise.all([
      tx.asset.findMany({
        where: {
          organizationId: organization.id,
        },
        include: {
          department: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
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
    ]);

    return { assets, issues, workOrders };
  });

  const assetConditionDistribution = [
    {
      bucket: "0-39",
      count: data.assets.filter((item) => (item.conditionScore ?? 100) < 40).length,
    },
    {
      bucket: "40-59",
      count: data.assets.filter((item) => (item.conditionScore ?? 100) >= 40 && (item.conditionScore ?? 100) < 60).length,
    },
    {
      bucket: "60-79",
      count: data.assets.filter((item) => (item.conditionScore ?? 100) >= 60 && (item.conditionScore ?? 100) < 80).length,
    },
    {
      bucket: "80-100",
      count: data.assets.filter((item) => (item.conditionScore ?? 100) >= 80).length,
    },
  ];

  const mapAssets = data.assets
    .filter((asset) => asset.latitude != null && asset.longitude != null)
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      department: asset.department?.name ?? null,
      status: asset.status,
      conditionScore: asset.conditionScore,
      createdAt: asset.createdAt.toISOString(),
      latitude: Number(asset.latitude),
      longitude: Number(asset.longitude),
    }));

  const mapIssues = data.issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    department: issue.department?.name ?? null,
    status: issue.status,
    createdAt: issue.createdAt.toISOString(),
    latitude: Number(issue.latitude),
    longitude: Number(issue.longitude),
  }));

  const mapWorkOrders = data.workOrders
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
        <h1 className="mt-2 text-3xl font-bold">{organization.name} Infrastructure</h1>
        <p className="text-sm text-slate-600">Infrastructure assets, condition distribution, and mapped civic operations.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Assets</p>
          <p className="text-2xl font-semibold text-slate-900">{data.assets.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Assets Below 40</p>
          <p className="text-2xl font-semibold text-rose-700">{assetConditionDistribution[0].count}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Mapped Work Orders</p>
          <p className="text-2xl font-semibold text-slate-900">{mapWorkOrders.length}</p>
        </div>
      </section>

      <PublicTransparencyCharts assetConditionDistribution={assetConditionDistribution} />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Infrastructure / Issues / Work Orders Map</h2>
        <UnifiedCivicMap issues={mapIssues} assets={mapAssets} workOrders={mapWorkOrders} grants={[]} />
      </section>
    </div>
  );
}

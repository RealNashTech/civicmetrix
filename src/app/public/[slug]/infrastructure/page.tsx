import Link from "next/link";

import AssetMap from "@/components/maps/asset-map";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { dbSystem } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export default async function PublicInfrastructurePage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);

  const publicPrograms = await dbSystem().program.findMany({
    where: { organizationId: organization.id, isPublic: true },
    select: { departmentId: true },
  });
  const publicDepartmentIds = [...new Set(publicPrograms.map((program) => program.departmentId))];

  const [assets, workOrders] = await Promise.all([
    dbSystem().asset.findMany({
      where: {
        organizationId: organization.id,
        departmentId: { in: publicDepartmentIds },
      },
      include: {
        department: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    dbSystem().workOrder.findMany({
      where: {
        organizationId: organization.id,
        OR: [
          { departmentId: { in: publicDepartmentIds } },
          { asset: { departmentId: { in: publicDepartmentIds } } },
        ],
      },
      select: { status: true },
    }),
  ]);

  const averageCondition =
    assets.length > 0
      ? Math.round(assets.reduce((sum, asset) => sum + (asset.conditionScore ?? 100), 0) / assets.length)
      : 0;
  const below50 = assets.filter((asset) => (asset.conditionScore ?? 100) < 50).length;
  const openWorkOrders = workOrders.filter((order) => order.status !== "COMPLETED").length;
  const completionRate = asPercent(
    workOrders.filter((order) => order.status === "COMPLETED").length,
    workOrders.length,
  );

  const mappedAssets = assets
    .filter((asset) => asset.latitude != null && asset.longitude != null)
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      status: asset.status,
      conditionScore: asset.conditionScore ?? 100,
      latitude: asset.latitude as number,
      longitude: asset.longitude as number,
    }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <Link href={`/public/${resolvedParams.slug}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Public Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{organization.name} Infrastructure</h1>
        <p className="text-sm text-slate-600">Public infrastructure condition and maintenance performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Assets</p>
          <p className="text-2xl font-semibold text-slate-900">{assets.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Average Condition</p>
          <p className="text-2xl font-semibold text-slate-900">{averageCondition}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Assets Below 50</p>
          <p className="text-2xl font-semibold text-rose-700">{below50}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Maintenance Completion</p>
          <p className="text-2xl font-semibold text-slate-900">{completionRate}%</p>
          <p className="text-xs text-slate-500">{openWorkOrders} open work orders</p>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Infrastructure Map</h2>
        {mappedAssets.length > 0 ? (
          <AssetMap assets={mappedAssets} />
        ) : (
          <p className="text-sm text-slate-500">No geocoded public assets available.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Asset</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Condition</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {assets.length > 0 ? (
              assets.map((asset) => (
                <tr key={asset.id}>
                  <td className="px-4 py-3 text-slate-800">{asset.name}</td>
                  <td className="px-4 py-3 text-slate-700">{asset.type}</td>
                  <td className="px-4 py-3 text-slate-700">{asset.department?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{asset.conditionScore ?? 100}</td>
                  <td className="px-4 py-3 text-slate-700">{asset.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No public infrastructure records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

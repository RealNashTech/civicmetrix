import Link from "next/link";

import AssetMap from "@/components/maps/asset-map";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AssetsMapPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const assets = await db().asset.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      conditionScore: true,
      latitude: true,
      longitude: true,
    },
  });

  const mappable = assets
    .filter((asset) => asset.latitude != null && asset.longitude != null)
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      status: asset.status,
      conditionScore: asset.conditionScore,
      latitude: asset.latitude as number,
      longitude: asset.longitude as number,
    }));

  return (
    <div className="space-y-6">
      <Card title="Asset Health Map">
        <div className="mb-3 flex items-center justify-between">
          <Link href="/dashboard/assets" className="text-sm text-blue-600 hover:underline">
            ← Back to Asset Inventory
          </Link>
          <span className="text-xs text-slate-500">
            {mappable.length} of {assets.length} assets geocoded
          </span>
        </div>
        {mappable.length > 0 ? (
          <AssetMap assets={mappable} />
        ) : (
          <p className="text-sm text-slate-500">No assets with coordinates yet.</p>
        )}
      </Card>
    </div>
  );
}

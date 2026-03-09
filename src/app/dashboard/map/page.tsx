import { Card } from "@/components/ui/card";
import UnifiedCivicMap from "@/components/maps/unified-civic-map";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { tenantDb } from "@/lib/tenantDb";

type UnifiedMapData = {
  issues: Array<{
    id: string;
    title: string;
    department: string | null;
    status: string;
    createdAt: string;
    latitude: number;
    longitude: number;
  }>;
  assets: Array<{
    id: string;
    name: string;
    department: string | null;
    status: string;
    conditionScore: number | null;
    createdAt: string;
    latitude: number;
    longitude: number;
  }>;
  workOrders: Array<{
    id: string;
    title: string;
    department: string | null;
    status: string;
    createdAt: string;
    linkedAsset: string | null;
    linkedIssue: string | null;
    latitude: number;
    longitude: number;
  }>;
  grants: Array<{
    id: string;
    title: string;
    department: string | null;
    status: string;
    createdAt: string;
    latitude: number;
    longitude: number;
  }>;
};

export default async function DashboardMapPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const organizationId = requireOrganization(session);

  const data = await tenantDb<UnifiedMapData>(organizationId, async (tx) => {
    const [issuesRaw, assetsRaw, workOrdersRaw, grantsRaw, issueCoordsByDepartment] = await Promise.all([
      tx.issueReport.findMany({
        where: {
          organizationId,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          latitude: true,
          longitude: true,
          department: {
            select: { name: true },
          },
        },
      }),
      tx.asset.findMany({
        where: {
          organizationId,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          name: true,
          status: true,
          conditionScore: true,
          createdAt: true,
          latitude: true,
          longitude: true,
          department: {
            select: { name: true },
          },
        },
      }),
      tx.workOrder.findMany({
        where: {
          organizationId,
          OR: [
            { asset: { latitude: { not: null }, longitude: { not: null } } },
            { issue: { latitude: { not: null }, longitude: { not: null } } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          department: {
            select: { name: true },
          },
          asset: {
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
            },
          },
          issue: {
            select: {
              id: true,
              title: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      }),
      tx.grant.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          departmentId: true,
          department: {
            select: { name: true },
          },
        },
      }),
      tx.issueReport.findMany({
        where: {
          organizationId,
          departmentId: { not: null },
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          departmentId: true,
          latitude: true,
          longitude: true,
        },
      }),
    ]);

    const issues = issuesRaw.map((item: {
      id: string;
      title: string;
      department: { name: string } | null;
      status: string;
      createdAt: Date;
      latitude: number | null;
      longitude: number | null;
    }) => ({
      id: item.id,
      title: item.title,
      department: item.department?.name ?? null,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      latitude: item.latitude as number,
      longitude: item.longitude as number,
    }));

    const assets = assetsRaw.map((item: {
      id: string;
      name: string;
      department: { name: string } | null;
      status: string;
      conditionScore: number | null;
      createdAt: Date;
      latitude: number | null;
      longitude: number | null;
    }) => ({
      id: item.id,
      name: item.name,
      department: item.department?.name ?? null,
      status: item.status,
      conditionScore: item.conditionScore,
      createdAt: item.createdAt.toISOString(),
      latitude: item.latitude as number,
      longitude: item.longitude as number,
    }));

    const workOrders = workOrdersRaw
      .map((item: {
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        department: { name: string } | null;
        asset: { id: string; name: string; latitude: number | null; longitude: number | null } | null;
        issue: { id: string; title: string; latitude: number | null; longitude: number | null } | null;
      }) => {
        const fromAsset = item.asset?.latitude != null && item.asset?.longitude != null;
        const fromIssue = item.issue?.latitude != null && item.issue?.longitude != null;
        if (!fromAsset && !fromIssue) {
          return null;
        }

        return {
          id: item.id,
          title: item.title,
          department: item.department?.name ?? null,
          status: item.status,
          createdAt: item.createdAt.toISOString(),
          linkedAsset: item.asset?.name ?? null,
          linkedIssue: item.issue?.title ?? null,
          latitude: fromAsset ? (item.asset?.latitude as number) : (item.issue?.latitude as number),
          longitude: fromAsset ? (item.asset?.longitude as number) : (item.issue?.longitude as number),
        };
      })
      .filter(
        (
          item: {
            id: string;
            title: string;
            department: string | null;
            status: string;
            createdAt: string;
            linkedAsset: string | null;
            linkedIssue: string | null;
            latitude: number;
            longitude: number;
          } | null,
        ): item is {
          id: string;
          title: string;
          department: string | null;
          status: string;
          createdAt: string;
          linkedAsset: string | null;
          linkedIssue: string | null;
          latitude: number;
          longitude: number;
        } => Boolean(item),
      );

    const allCoords = [
      ...issues.map((item: { latitude: number; longitude: number }) => ({
        latitude: item.latitude,
        longitude: item.longitude,
      })),
      ...assets.map((item: { latitude: number; longitude: number }) => ({
        latitude: item.latitude,
        longitude: item.longitude,
      })),
      ...workOrders.map((item: { latitude: number; longitude: number }) => ({
        latitude: item.latitude,
        longitude: item.longitude,
      })),
    ];

    const orgCenter = allCoords.length
      ? {
          latitude: allCoords.reduce((sum, point) => sum + point.latitude, 0) / allCoords.length,
          longitude: allCoords.reduce((sum, point) => sum + point.longitude, 0) / allCoords.length,
        }
      : { latitude: 45.1437, longitude: -122.8554 };

    const deptCoordinateMap = new Map<string, { latitude: number; longitude: number; count: number }>();
    for (const point of issueCoordsByDepartment as Array<{
      departmentId: string | null;
      latitude: number | null;
      longitude: number | null;
    }>) {
      if (!point.departmentId) {
        continue;
      }
      const existing = deptCoordinateMap.get(point.departmentId) ?? {
        latitude: 0,
        longitude: 0,
        count: 0,
      };
      existing.latitude += point.latitude as number;
      existing.longitude += point.longitude as number;
      existing.count += 1;
      deptCoordinateMap.set(point.departmentId, existing);
    }

    const grants = grantsRaw.map((grant: {
      id: string;
      name: string;
      status: string;
      createdAt: Date;
      departmentId: string | null;
      department: { name: string } | null;
    }) => {
      const deptPoint = grant.departmentId ? deptCoordinateMap.get(grant.departmentId) : null;
      const latitude = deptPoint && deptPoint.count > 0 ? deptPoint.latitude / deptPoint.count : orgCenter.latitude;
      const longitude = deptPoint && deptPoint.count > 0 ? deptPoint.longitude / deptPoint.count : orgCenter.longitude;

      return {
        id: grant.id,
        title: grant.name,
        department: grant.department?.name ?? null,
        status: grant.status,
        createdAt: grant.createdAt.toISOString(),
        latitude,
        longitude,
      };
    });

    return {
      issues,
      assets,
      workOrders,
      grants,
    };
  });

  return (
    <div className="space-y-6">
      <Card title="CivicMetrix Unified Civic Map">
        <p className="text-sm text-slate-600">
          Mapbox operations map with tenant-scoped Issues, Assets, Work Orders, and Grants.
        </p>
      </Card>
      <UnifiedCivicMap
        issues={data.issues}
        assets={data.assets}
        workOrders={data.workOrders}
        grants={data.grants}
      />
    </div>
  );
}

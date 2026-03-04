import { Card } from "@/components/ui/card";
import CivicIntelligenceMap from "@/components/maps/civic-intelligence-map";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardMapPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const [issues, districts, wards, serviceZones, infrastructureLayers] = await Promise.all([
    db().issueReport.findMany({
      where: {
        organizationId: user.organizationId,
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        latitude: true,
        longitude: true,
      },
    }),
    db().district.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, geoJson: true },
    }),
    db().ward.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, geoJson: true },
    }),
    db().serviceZone.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, type: true, geoJson: true },
    }),
    db().infrastructureLayer.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, geoJson: true },
    }),
  ]);

  const mappedIssues = issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    latitude: issue.latitude as number,
    longitude: issue.longitude as number,
  }));

  return (
    <div className="space-y-6">
      <Card title="GIS Civic Intelligence Map">
        <p className="text-sm text-slate-600">
          Unified operational map with issue markers, density heat overlay, districts, wards, service zones, and infrastructure layers.
        </p>
      </Card>
      <CivicIntelligenceMap
        issues={mappedIssues}
        districts={districts}
        wards={wards}
        serviceZones={serviceZones}
        infrastructureLayers={infrastructureLayers}
      />
    </div>
  );
}

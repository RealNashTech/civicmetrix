import Link from "next/link";

import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { dbSystem } from "@/lib/db";
import PublicMapClient from "./PublicMapClient";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export default async function PublicMapPage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);

  const publicPrograms = await dbSystem().program.findMany({
    where: { organizationId: organization.id, isPublic: true },
    select: { departmentId: true },
  });
  const publicDepartmentIds = [...new Set(publicPrograms.map((program) => program.departmentId))];

  const [issues, serviceZones, infrastructureLayers] = await Promise.all([
    dbSystem().issueReport.findMany({
      where: {
        organizationId: organization.id,
        departmentId: { in: publicDepartmentIds },
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        priority: true,
        createdAt: true,
        latitude: true,
        longitude: true,
      },
    }),
    dbSystem().serviceZone.findMany({
      where: { organizationId: organization.id },
      select: { id: true, name: true, type: true, geoJson: true },
    }),
    dbSystem().infrastructureLayer.findMany({
      where: { organizationId: organization.id },
      select: { id: true, name: true, geoJson: true },
    }),
  ]);

  const mappedIssues = issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    status: issue.status,
    priority: issue.priority,
    createdAt: issue.createdAt,
    latitude: issue.latitude as number,
    longitude: issue.longitude as number,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div>
        <Link href={`/public/${resolvedParams.slug}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Public Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{organization.name} Civic Map</h1>
        <p className="text-sm text-slate-600">
          Public issue density and infrastructure/service zone overlays.
        </p>
      </div>

      <PublicMapClient
        slug={resolvedParams.slug}
        issues={mappedIssues}
        serviceZones={serviceZones}
        infrastructureLayers={infrastructureLayers}
      />
    </div>
  );
}

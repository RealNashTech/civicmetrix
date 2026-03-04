import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type SpatialIssue = {
  id: string;
  organizationId: string;
  title: string;
  category: string;
  status: string;
  priority: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
};

function extractDistrictGeometry(geoJson: Prisma.JsonValue): Prisma.JsonValue | null {
  if (!geoJson || typeof geoJson !== "object" || Array.isArray(geoJson)) {
    return null;
  }

  const root = geoJson as Record<string, unknown>;
  const rootType = typeof root.type === "string" ? root.type : null;

  if (rootType === "Feature") {
    const geometry = root.geometry;
    if (geometry && typeof geometry === "object" && !Array.isArray(geometry)) {
      return geometry as Prisma.JsonValue;
    }
    return null;
  }

  if (rootType === "FeatureCollection") {
    const features = Array.isArray(root.features) ? root.features : [];
    const geometries = features
      .map((feature) => {
        if (!feature || typeof feature !== "object" || Array.isArray(feature)) {
          return null;
        }
        const geometry = (feature as Record<string, unknown>).geometry;
        if (!geometry || typeof geometry !== "object" || Array.isArray(geometry)) {
          return null;
        }
        return geometry;
      })
      .filter((geometry): geometry is Prisma.JsonObject => Boolean(geometry));

    if (geometries.length === 0) {
      return null;
    }

    return {
      type: "GeometryCollection",
      geometries: geometries as Prisma.JsonArray,
    } satisfies Prisma.JsonObject;
  }

  if (rootType && "coordinates" in root) {
    return geoJson;
  }

  return null;
}

export async function findIssuesWithinRadius(
  organizationId: string,
  lat: number,
  lng: number,
  meters: number,
) {
  if (!organizationId || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(meters) || meters <= 0) {
    return [];
  }

  return db().$queryRaw<SpatialIssue[]>`
    SELECT
      "id",
      "organizationId",
      "title",
      "category",
      "status",
      "priority",
      "latitude",
      "longitude",
      "createdAt"
    FROM "IssueReport"
    WHERE "organizationId" = ${organizationId}
      AND "location" IS NOT NULL
      AND ST_DWithin(
        "location"::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${meters}
      )
    ORDER BY "createdAt" DESC
  `;
}

export async function findIssuesWithinDistrict(organizationId: string, districtId: string) {
  if (!organizationId || !districtId) {
    return [];
  }

  const district = await db().district.findFirst({
    where: {
      id: districtId,
      organizationId,
    },
    select: {
      geoJson: true,
    },
  });

  if (!district) {
    return [];
  }

  const districtGeometry = extractDistrictGeometry(district.geoJson);
  if (!districtGeometry) {
    return [];
  }

  return db().$queryRaw<SpatialIssue[]>`
    SELECT
      "id",
      "organizationId",
      "title",
      "category",
      "status",
      "priority",
      "latitude",
      "longitude",
      "createdAt"
    FROM "IssueReport"
    WHERE "organizationId" = ${organizationId}
      AND "location" IS NOT NULL
      AND ST_Within(
        "location",
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(districtGeometry)}), 4326)
      )
    ORDER BY "createdAt" DESC
  `;
}

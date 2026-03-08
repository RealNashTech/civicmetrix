import { Prisma } from "@prisma/client";
import { z } from "zod";

import { dbSystem } from "@/lib/db";

const querySchema = z.object({
  slug: z.string().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(10000).default(800),
  category: z.string().optional(),
});

type IssueRow = {
  id: string;
  title: string;
  category: string | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
  status: string;
};

function resolveCategoryClause(category: string | undefined) {
  const normalized = (category ?? "").trim().toLowerCase();
  if (!normalized || normalized === "all" || normalized === "total") {
    return Prisma.sql``;
  }
  if (normalized === "garbage") {
    return Prisma.sql`AND LOWER(COALESCE(i."category", '')) IN ('garbage', 'trash')`;
  }
  return Prisma.sql`AND LOWER(COALESCE(i."category", '')) = ${normalized}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    slug: url.searchParams.get("slug"),
    latitude: url.searchParams.get("latitude"),
    longitude: url.searchParams.get("longitude"),
    radius: url.searchParams.get("radius") ?? "800",
    category: url.searchParams.get("category") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: "Invalid cluster query." }, { status: 400 });
  }

  const { slug, latitude, longitude, radius, category } = parsed.data;
  const organization = await dbSystem().organization.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!organization) {
    return Response.json({ issues: [] });
  }

  const categoryClause = resolveCategoryClause(category);
  const issues = await dbSystem().$queryRaw<IssueRow[]>(Prisma.sql`
    SELECT
      i."id",
      i."title",
      i."category",
      i."latitude"::double precision AS "latitude",
      i."longitude"::double precision AS "longitude",
      i."createdAt",
      i."status"
    FROM "IssueReport" i
    WHERE i."organizationId" = ${organization.id}
      AND i."location" IS NOT NULL
      AND ST_DWithin(
        i."location"::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${radius}
      )
      ${categoryClause}
    ORDER BY i."createdAt" DESC
    LIMIT 100
  `);

  return Response.json({ issues });
}

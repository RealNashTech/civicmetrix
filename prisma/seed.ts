import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/civicmetrics?schema=public";

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CENTER = {
  latitude: 45.1437,
  longitude: -122.8554,
} as const;

const ISSUE_TEMPLATES = [
  {
    title: "Pothole reported",
    description: "Large pothole affecting traffic lane",
    category: "Road Maintenance",
  },
  {
    title: "Streetlight outage",
    description: "Streetlight not working at night",
    category: "Street Lighting",
  },
  {
    title: "Sidewalk obstruction",
    description: "Debris blocking sidewalk access",
    category: "Public Safety",
  },
  {
    title: "Water leak observed",
    description: "Water leaking from utility line near curb",
    category: "Water Utility",
  },
  {
    title: "Graffiti cleanup needed",
    description: "Graffiti reported on public structure",
    category: "Code Enforcement",
  },
] as const;

const DEPARTMENT_NAMES = [
  "Public Works",
  "Housing",
  "Community Development",
  "Parks & Recreation",
  "Administration",
] as const;

const GRANTS = [
  { department: "Public Works", title: "Public Works Grant", amount: 1_200_000 },
  { department: "Housing", title: "Housing Grant", amount: 2_750_000 },
  {
    department: "Community Development",
    title: "Community Development Grant",
    amount: 850_000,
  },
  { department: "Parks & Recreation", title: "Parks & Recreation Grant", amount: 450_000 },
  { department: "Administration", title: "Administration Grant", amount: 600_000 },
] as const;
const GRANT_TITLES = GRANTS.map((grant) => grant.title);
const ASSET_NAMES = [
  "Bridge Inspection Asset",
  "Road Surface Segment",
  "Storm Drain Inlet",
  "Traffic Signal Cabinet",
  "Water Main Segment",
] as const;

function jitter(base: number, spread: number) {
  return Number((base + (Math.random() - 0.5) * spread).toFixed(6));
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function ensureDepartments(tx: Prisma.TransactionClient, organizationId: string) {
  const map = new Map<string, string>();

  for (const name of DEPARTMENT_NAMES) {
    const existing = await tx.department.findFirst({
      where: {
        organizationId,
        name,
      },
      select: { id: true },
    });

    if (existing) {
      map.set(name, existing.id);
      continue;
    }

    const created = await tx.department.create({
      data: {
        organizationId,
        name,
      },
      select: { id: true },
    });

    map.set(name, created.id);
  }

  return map;
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "city-of-woodburn" },
    update: {},
    create: {
      name: "City of Woodburn",
      slug: "city-of-woodburn",
    },
    select: { id: true, slug: true, name: true },
  });

  const counts = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${org.id}, true)`;

    const departmentIds = await ensureDepartments(tx, org.id);

    await tx.issueReport.deleteMany({
      where: { organizationId: org.id },
    });

    await tx.grant.deleteMany({
      where: { organizationId: org.id },
    });

    await tx.asset.deleteMany({
      where: { organizationId: org.id },
    });

    const issueRows = Array.from({ length: 25 }).map((_, index) => {
      const template = ISSUE_TEMPLATES[index % ISSUE_TEMPLATES.length];

      return {
        organizationId: org.id,
        title: `Civic Issue ${index + 1}: ${template.title}`,
        description: template.description,
        category: template.category,
        status: "OPEN" as const,
        latitude: jitter(CENTER.latitude, 0.04),
        longitude: jitter(CENTER.longitude, 0.04),
      };
    });

    await tx.issueReport.createMany({ data: issueRows });

    for (const grant of GRANTS) {
      const departmentId = departmentIds.get(grant.department);

      await tx.grant.create({
        data: {
          organizationId: org.id,
          departmentId: departmentId ?? null,
          name: grant.title,
          amount: grant.amount,
          isPublic: true,
        },
      });
    }

    const assetRows = Array.from({ length: 20 }).map((_, index) => {
      const departmentName = DEPARTMENT_NAMES[index % DEPARTMENT_NAMES.length];
      const departmentId = departmentIds.get(departmentName);
      const assetName = ASSET_NAMES[index % ASSET_NAMES.length];

      return {
        organizationId: org.id,
        departmentId: departmentId ?? null,
        name: `Infrastructure Asset ${index + 1}: ${assetName}`,
        type: "INFRASTRUCTURE",
        conditionScore: randomInt(35, 95),
      };
    });

    await tx.asset.createMany({ data: assetRows });

    const [issueCount, grantCount, assetCount] = await Promise.all([
      tx.issueReport.count({
        where: {
          organizationId: org.id,
          title: { startsWith: "Civic Issue" },
        },
      }),
      tx.grant.count({
        where: {
          organizationId: org.id,
          name: { in: GRANT_TITLES },
        },
      }),
      tx.asset.count({
        where: {
          organizationId: org.id,
          name: { startsWith: "Infrastructure Asset" },
        },
      }),
    ]);

    return { issueCount, grantCount, assetCount };
  });

  console.log("Seeded organization:", org.slug);
  console.log("Demo record counts:", {
    issues: counts.issueCount,
    grants: counts.grantCount,
    assets: counts.assetCount,
  });
}

main()
  .catch((error) => {
    console.error("Prisma seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

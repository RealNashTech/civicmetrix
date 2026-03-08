import "dotenv/config"

import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/civicmetrics?schema=public"
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const ORG_NAME = "City of Woodburn"
const ORG_SLUG = "city-of-woodburn"

const ISSUE_COUNT = 25
const GRANT_COUNT = 5
const ASSET_COUNT = 20

const CENTER_LAT = 45.1437
const CENTER_LON = -122.8554

const DEPARTMENTS = [
  "Public Works",
  "Housing",
  "Community Development",
  "Parks & Recreation",
  "Administration",
] as const

function jitter(base: number, delta: number) {
  return Number((base + (Math.random() - 0.5) * delta).toFixed(6))
}

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: { name: ORG_NAME },
    create: {
      name: ORG_NAME,
      slug: ORG_SLUG,
    },
    select: { id: true, slug: true, name: true },
  })

  const counts = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${organization.id}, true)`

    const existingDepartments = await tx.department.findMany({
      where: {
        organizationId: organization.id,
        name: { in: [...DEPARTMENTS] },
      },
      select: { name: true },
    })
    const existingNames = new Set(existingDepartments.map((d) => d.name))
    const missingNames = DEPARTMENTS.filter((name) => !existingNames.has(name))

    if (missingNames.length > 0) {
      await tx.department.createMany({
        data: missingNames.map((name) => ({
          organizationId: organization.id,
          name,
        })),
      })
    }

    const departments = await tx.department.findMany({
      where: {
        organizationId: organization.id,
        name: { in: [...DEPARTMENTS] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    const departmentByName = new Map(departments.map((d) => [d.name, d.id]))

    await tx.issueReport.deleteMany({
      where: { organizationId: organization.id },
    })
    await tx.grant.deleteMany({
      where: { organizationId: organization.id },
    })
    await tx.asset.deleteMany({
      where: { organizationId: organization.id },
    })

    const issueRows = Array.from({ length: ISSUE_COUNT }).map((_, i) => {
      const departmentName = DEPARTMENTS[i % DEPARTMENTS.length]
      return {
        organizationId: organization.id,
        departmentId: departmentByName.get(departmentName) ?? null,
        title: `Service issue #${i + 1}`,
        description: "Seeded public dashboard issue report for demo rendering.",
        category: "infrastructure",
        status: i % 7 === 0 ? "IN_PROGRESS" : i % 11 === 0 ? "RESOLVED" : "OPEN",
        priority: i % 5 === 0 ? "HIGH" : i % 2 === 0 ? "MEDIUM" : "LOW",
        latitude: jitter(CENTER_LAT, 0.04),
        longitude: jitter(CENTER_LON, 0.04),
      } as const
    })
    await tx.issueReport.createMany({ data: issueRows })

    const grantRows = DEPARTMENTS.slice(0, GRANT_COUNT).map((departmentName, i) => ({
      organizationId: organization.id,
      departmentId: departmentByName.get(departmentName) ?? null,
      name: `${departmentName} Funding Program`,
      status: "AWARDED" as const,
      amount: new Prisma.Decimal(250000 + i * 175000),
      isPublic: true,
    }))
    await tx.grant.createMany({ data: grantRows })

    const assetRows = Array.from({ length: ASSET_COUNT }).map((_, i) => {
      const departmentName = DEPARTMENTS[i % DEPARTMENTS.length]
      return {
        organizationId: organization.id,
        departmentId: departmentByName.get(departmentName) ?? null,
        name: `${departmentName} Asset ${i + 1}`,
        type: "INFRASTRUCTURE",
        conditionScore: 35 + (i * 3) % 61,
      } as const
    })
    await tx.asset.createMany({ data: assetRows })

    const [issues, grants, assets] = await Promise.all([
      tx.issueReport.count({ where: { organizationId: organization.id } }),
      tx.grant.count({ where: { organizationId: organization.id } }),
      tx.asset.count({ where: { organizationId: organization.id } }),
    ])

    return { issues, grants, assets }
  })

  console.log(`Seeded organization: ${organization.slug}`)
  console.log("Inserted record counts:", counts)
}

main()
  .catch((error) => {
    console.error("Prisma seed failed", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

import "dotenv/config"

import { dbSystem } from "@/lib/db"

const ORG_SLUG = "city-of-woodburn"
const ORG_NAME = "City of Woodburn"

const BASE_LATITUDE = 45.1437
const BASE_LONGITUDE = -122.8554
const COORDINATE_SPREAD = 0.02

const ISSUE_COUNT = 25
const ASSET_COUNT = 20

const DEPARTMENT_NAMES = [
  "Public Works",
  "Transportation",
  "Parks",
  "Water",
  "Housing",
] as const

const ISSUE_CATEGORIES = [
  "pothole",
  "streetlight",
  "sidewalk",
  "water",
  "graffiti",
] as const

const ASSET_TYPES = [
  "ROADS",
  "TRANSIT",
  "PARKS",
  "WATER",
  "HOUSING",
] as const

function randomFloat(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomCoordinate(base: number) {
  return Number(
    (base + randomFloat(-COORDINATE_SPREAD, COORDINATE_SPREAD)).toFixed(6)
  )
}

async function main() {
  const organization = await dbSystem().organization.upsert({
    where: { slug: ORG_SLUG },
    update: { name: ORG_NAME },
    create: {
      slug: ORG_SLUG,
      name: ORG_NAME,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  })

  await dbSystem().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${organization.id}, true)`

    const existingDepartments = await tx.department.findMany({
      where: {
        organizationId: organization.id,
        name: { in: [...DEPARTMENT_NAMES] },
      },
      select: { id: true, name: true },
    })

    const existingNames = new Set(existingDepartments.map((d) => d.name))
    const missingDepartments = DEPARTMENT_NAMES.filter(
      (name) => !existingNames.has(name)
    )

    if (missingDepartments.length > 0) {
      await tx.department.createMany({
        data: missingDepartments.map((name) => ({
          organizationId: organization.id,
          name,
        })),
      })
    }

    const departments = await tx.department.findMany({
      where: {
        organizationId: organization.id,
        name: { in: [...DEPARTMENT_NAMES] },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })

    if (departments.length !== DEPARTMENT_NAMES.length) {
      throw new Error("Failed to resolve all required departments.")
    }

    await tx.issueReport.deleteMany({
      where: {
        organizationId: organization.id,
        reporterEmail: { contains: "@woodburn-demo.local" },
      },
    })

    await tx.asset.deleteMany({
      where: {
        organizationId: organization.id,
        name: { startsWith: "Demo Infrastructure Asset " },
      },
    })

    await tx.issueReport.createMany({
      data: Array.from({ length: ISSUE_COUNT }).map((_, index) => {
        const category = ISSUE_CATEGORIES[index % ISSUE_CATEGORIES.length]
        const department = departments[index % departments.length]

        return {
          organizationId: organization.id,
          departmentId: department.id,
          title: `Demo ${category} issue #${index + 1}`,
          description: `Seeded demo issue for ${department.name}.`,
          category,
          latitude: randomCoordinate(BASE_LATITUDE),
          longitude: randomCoordinate(BASE_LONGITUDE),
          reporterName: `Demo Resident ${index + 1}`,
          reporterEmail: `resident-${index + 1}@woodburn-demo.local`,
          status: "OPEN" as const,
        }
      }),
    })

    await tx.asset.createMany({
      data: Array.from({ length: ASSET_COUNT }).map((_, index) => {
        const department = departments[index % departments.length]

        return {
          organizationId: organization.id,
          departmentId: department.id,
          name: `Demo Infrastructure Asset ${index + 1}`,
          type: ASSET_TYPES[index % ASSET_TYPES.length],
          conditionScore: randomInt(35, 95),
          latitude: randomCoordinate(BASE_LATITUDE),
          longitude: randomCoordinate(BASE_LONGITUDE),
          status: "ACTIVE",
        }
      }),
    })
  })

  const [issueCount, assetCount] = await dbSystem().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${organization.id}, true)`
    return Promise.all([
      tx.issueReport.count({
        where: {
          organizationId: organization.id,
          reporterEmail: { contains: "@woodburn-demo.local" },
        },
      }),
      tx.asset.count({
        where: {
          organizationId: organization.id,
          name: { startsWith: "Demo Infrastructure Asset " },
        },
      }),
    ])
  })

  console.log(`Seed complete for ${organization.slug} (${organization.id})`)
  console.log(`Demo issues created: ${issueCount}`)
  console.log(`Demo assets created: ${assetCount}`)
}

main()
  .catch((error) => {
    console.error("Woodburn public dashboard seed failed", error)
    process.exit(1)
  })
  .finally(async () => {
    await dbSystem().$disconnect()
  })

import "dotenv/config";

import { Prisma, WorkOrderPriority } from "@prisma/client";

import { db } from "@/lib/db";
import { runGrantRiskWorker } from "@/workers/intelligence/grant-risk-worker";
import { runKpiTrendWorker } from "@/workers/intelligence/kpi-trend-worker";
import { runSpatialClusterWorker } from "@/workers/intelligence/spatial-cluster-worker";

const ORG_NAME = "City of Woodburn";
const ORG_SLUG = "city-of-woodburn";

const WOODBURN_CENTER = {
  latitude: 45.1437,
  longitude: -122.8554,
};

type DepartmentSeed = {
  name: string;
};

type KpiSeed = {
  name: string;
  unit: string;
  target: number;
  baselineRange: [number, number];
  recentRange: [number, number];
};

type GrantSeed = {
  name: string;
  amount: number;
  nextReportDue: Date;
  milestones: Array<{
    name: string;
    dueDate: Date;
    completed: boolean;
  }>;
};

const departments: DepartmentSeed[] = [
  { name: "Public Works" },
  { name: "Housing" },
  { name: "Community Development" },
  { name: "Parks & Recreation" },
  { name: "Administration" },
];

const kpis: KpiSeed[] = [
  {
    name: "Average Service Response Time",
    unit: "hours",
    target: 36,
    baselineRange: [44, 50],
    recentRange: [62, 70],
  },
  {
    name: "Affordable Housing Units Created",
    unit: "units",
    target: 120,
    baselineRange: [95, 105],
    recentRange: [62, 72],
  },
  {
    name: "Pothole Repair Time",
    unit: "hours",
    target: 48,
    baselineRange: [50, 58],
    recentRange: [28, 35],
  },
  {
    name: "Park Maintenance Completion Rate",
    unit: "%",
    target: 92,
    baselineRange: [86, 90],
    recentRange: [88, 92],
  },
];

function randomInRange([min, max]: [number, number]) {
  return min + Math.random() * (max - min);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function addIssueOffset(
  latitude: number,
  longitude: number,
  maxOffsetDegrees: number,
) {
  const latOffset = (Math.random() - 0.5) * maxOffsetDegrees;
  const lonOffset = (Math.random() - 0.5) * maxOffsetDegrees;

  return {
    latitude: Number((latitude + latOffset).toFixed(6)),
    longitude: Number((longitude + lonOffset).toFixed(6)),
  };
}

async function clearOrganizationData(organizationId: string) {
  await db().$transaction([
    db().issueComment.deleteMany({
      where: { issue: { organizationId } },
    }),
    db().workOrder.deleteMany({
      where: { organizationId },
    }),
    db().issueReport.deleteMany({
      where: { organizationId },
    }),
    db().grantDeliverable.deleteMany({
      where: {
        milestone: {
          grant: {
            organizationId,
          },
        },
      },
    }),
    db().grantMilestone.deleteMany({
      where: { grant: { organizationId } },
    }),
    db().grantMetric.deleteMany({
      where: { grant: { organizationId } },
    }),
    db().grant.deleteMany({
      where: { organizationId },
    }),
    db().kPIHistory.deleteMany({
      where: { kpi: { organizationId } },
    }),
    db().kPI.deleteMany({
      where: { organizationId },
    }),
    db().alert.deleteMany({
      where: { organizationId },
    }),
    db().departmentPermission.deleteMany({
      where: {
        department: {
          organizationId,
        },
      },
    }),
    db().department.deleteMany({
      where: { organizationId },
    }),
  ]);
}

async function hasInsightTable() {
  const result = await db().$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'Insight'
    ) AS exists
  `;

  return result[0]?.exists === true;
}

async function seedDepartments(organizationId: string) {
  await db().department.createMany({
    data: departments.map((department) => ({
      name: department.name,
      organizationId,
    })),
  });

  return db().department.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

async function seedKpis(organizationId: string) {
  const kpiRecords = [];
  for (const kpi of kpis) {
    const created = await db().kPI.create({
      data: {
        name: kpi.name,
        value: Number(randomInRange(kpi.recentRange).toFixed(2)),
        target: kpi.target,
        organizationId,
        unit: kpi.unit,
      },
      select: { id: true, name: true },
    });
    kpiRecords.push(created);
  }

  const historyRows: Array<{
    kpiId: string;
    value: Prisma.Decimal;
    recordedAt: Date;
  }> = [];

  for (let i = 0; i < kpis.length; i += 1) {
    const seeded = kpis[i];
    const kpi = kpiRecords[i];

    for (let day = 30; day >= 1; day -= 1) {
      const recordedAt = daysAgo(day);
      const isRecent = day <= 7;
      const value = isRecent
        ? randomInRange(seeded.recentRange)
        : randomInRange(seeded.baselineRange);

      historyRows.push({
        kpiId: kpi.id,
        value: new Prisma.Decimal(value.toFixed(2)),
        recordedAt,
      });
    }
  }

  await db().kPIHistory.createMany({ data: historyRows });
}

async function seedGrants(organizationId: string, departmentIds: string[]) {
  const grantSeeds: GrantSeed[] = [
    {
      name: "Housing Stabilization Grant",
      amount: 850000,
      nextReportDue: daysAgo(12),
      milestones: [
        { name: "Quarterly Housing Assessment", dueDate: daysAgo(20), completed: false },
        { name: "Tenant Assistance Distribution", dueDate: daysAgo(3), completed: false },
        { name: "Program Launch", dueDate: daysAgo(45), completed: true },
      ],
    },
    {
      name: "Federal Infrastructure Grant",
      amount: 2750000,
      nextReportDue: daysAgo(5),
      milestones: [
        { name: "Roadway Condition Survey", dueDate: daysAgo(18), completed: false },
        { name: "Paving Contractor Mobilization", dueDate: daysAgo(1), completed: false },
        { name: "Engineering Review", dueDate: daysAgo(35), completed: true },
      ],
    },
    {
      name: "Community Revitalization Grant",
      amount: 1200000,
      nextReportDue: daysAgo(2),
      milestones: [
        { name: "Downtown Streetscape Design", dueDate: daysAgo(9), completed: false },
        { name: "Public Engagement Workshop", dueDate: daysAgo(4), completed: true },
      ],
    },
  ];

  for (let i = 0; i < grantSeeds.length; i += 1) {
    const seed = grantSeeds[i];
    const departmentId = departmentIds[i % departmentIds.length] ?? null;

    const grant = await db().grant.create({
      data: {
        name: seed.name,
        status: "AWARDED",
        amount: new Prisma.Decimal(seed.amount),
        organizationId,
        departmentId,
        nextReportDue: seed.nextReportDue,
        reportingFrequency: "QUARTERLY",
        complianceStatus: "AT_RISK",
      },
      select: { id: true },
    });

    await db().grantMilestone.createMany({
      data: seed.milestones.map((milestone) => ({
        grantId: grant.id,
        name: milestone.name,
        dueDate: milestone.dueDate,
        completed: milestone.completed,
      })),
    });
  }
}

async function seedIssues(organizationId: string, departmentIds: string[]) {
  const categories = ["pothole", "streetlight", "trash", "sidewalk", "graffiti"] as const;
  const issueRows: Array<{
    organizationId: string;
    departmentId: string | null;
    title: string;
    description: string;
    category: string;
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    latitude: number;
    longitude: number;
    createdAt: Date;
    updatedAt: Date;
    reporterName: string;
    reporterEmail: string;
  }> = [];

  for (let i = 0; i < 40; i += 1) {
    const category = categories[i % categories.length];
    const status: "OPEN" | "IN_PROGRESS" | "RESOLVED" =
      i % 6 === 0 ? "RESOLVED" : i % 4 === 0 ? "IN_PROGRESS" : "OPEN";
    const priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" =
      i % 7 === 0 ? "URGENT" : i % 3 === 0 ? "HIGH" : i % 2 === 0 ? "MEDIUM" : "LOW";

    const isClusterGroup = i < 14;
    const point = isClusterGroup
      ? addIssueOffset(WOODBURN_CENTER.latitude, WOODBURN_CENTER.longitude, 0.003)
      : addIssueOffset(WOODBURN_CENTER.latitude, WOODBURN_CENTER.longitude, 0.035);

    const createdAt = daysAgo(Math.floor(Math.random() * 6));

    issueRows.push({
      organizationId,
      departmentId: departmentIds[i % departmentIds.length] ?? null,
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} report #${i + 1}`,
      description: `Citizen reported ${category} concern requiring city response.`,
      category,
      status,
      priority,
      latitude: point.latitude,
      longitude: point.longitude,
      createdAt,
      updatedAt: createdAt,
      reporterName: `Resident ${i + 1}`,
      reporterEmail: `resident${i + 1}@woodburn.example`,
    });
  }

  await db().issueReport.createMany({ data: issueRows });

  return db().issueReport.findMany({
    where: { organizationId },
    select: { id: true, departmentId: true },
    orderBy: { createdAt: "desc" },
  });
}

async function seedWorkOrders(organizationId: string, issueIds: string[], departmentIds: string[]) {
  const statuses: Array<"OPEN" | "IN_PROGRESS" | "COMPLETED"> = [
    "OPEN",
    "IN_PROGRESS",
    "COMPLETED",
  ];

  const rows = Array.from({ length: 15 }).map((_, index) => {
    const status = statuses[index % statuses.length];
    return {
      organizationId,
      issueId: issueIds[index] ?? null,
      departmentId: departmentIds[index % departmentIds.length] ?? null,
      title: `Service Work Order ${index + 1}`,
      description: "Auto-generated demo maintenance and response work order.",
      status,
      priority:
        index % 5 === 0
          ? WorkOrderPriority.HIGH
          : index % 3 === 0
            ? WorkOrderPriority.MEDIUM
            : WorkOrderPriority.LOW,
      scheduledDate: status === "COMPLETED" ? daysAgo(2) : new Date(),
      completedAt: status === "COMPLETED" ? daysAgo(1) : null,
      createdAt: daysAgo(Math.floor(Math.random() * 10)),
      updatedAt: new Date(),
    };
  });

  await db().workOrder.createMany({ data: rows });
}

async function main() {
  const insightTableExists = await hasInsightTable();

  const organization = await db().organization.upsert({
    where: { slug: ORG_SLUG },
    update: { name: ORG_NAME },
    create: {
      name: ORG_NAME,
      slug: ORG_SLUG,
    },
    select: {
      id: true,
      name: true,
    },
  });

  await clearOrganizationData(organization.id);

  if (insightTableExists) {
    await db().insight.deleteMany({
      where: { organizationId: organization.id },
    });
  } else {
    console.warn("Insight table not found; skipping intelligence insight cleanup and generation.");
  }

  const seededDepartments = await seedDepartments(organization.id);
  const departmentIds = seededDepartments.map((department) => department.id);

  await seedKpis(organization.id);
  await seedGrants(organization.id, departmentIds);

  const issues = await seedIssues(organization.id, departmentIds);
  const issueIds = issues.map((issue) => issue.id);
  await seedWorkOrders(organization.id, issueIds, departmentIds);

  if (insightTableExists) {
    // Generate insight records from seeded conditions.
    await runSpatialClusterWorker();
    await runKpiTrendWorker();
    await runGrantRiskWorker();
  }

  const [issueCount, workOrderCount, grantCount, kpiCount] = await Promise.all([
    db().issueReport.count({ where: { organizationId: organization.id } }),
    db().workOrder.count({ where: { organizationId: organization.id } }),
    db().grant.count({ where: { organizationId: organization.id } }),
    db().kPI.count({ where: { organizationId: organization.id } }),
  ]);
  const insightCount = insightTableExists
    ? await db().insight.count({ where: { organizationId: organization.id, resolvedAt: null } })
    : 0;

  console.log(`Seeded ${organization.name}`);
  console.log(`Departments: ${seededDepartments.length}`);
  console.log(`KPIs: ${kpiCount}`);
  console.log(`Grants: ${grantCount}`);
  console.log(`Issue reports: ${issueCount}`);
  console.log(`Work orders: ${workOrderCount}`);
  if (insightTableExists) {
    console.log(`Active insights generated: ${insightCount}`);
  }
}

main()
  .catch((error) => {
    console.error("Demo city seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await db().$disconnect();
  });

import { apiError } from "@/lib/api/error-response";
import { apiSuccess } from "@/lib/api/success-response";
import { getInfrastructureHealth } from "@/lib/asset-health";
import { getCityHealthScore } from "@/lib/city-health";
import { getCivicInsights } from "@/lib/civic-insights";
import { getOrSetJsonCache } from "@/lib/cache";
import { getIssueHotspots } from "@/lib/issue-hotspots";
import { getOrganizationKpiTrendHealth } from "@/lib/kpi-trends";
import { db } from "@/lib/db";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, authorizeStaffOrApiScope } from "@/lib/security/authorization";
import { parsePaginationFromSearchParams } from "@/lib/validation/http";

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

async function handleGet(request: Request) {
  let organizationId: string;

  try {
    const context = await authorizeStaffOrApiScope(request, "city:read");
    organizationId = context.organizationId;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Authorization failed.", 500);
  }

  const url = new URL(request.url);
  const issuePaging = parsePaginationFromSearchParams(url.searchParams, "issuePage", "issuePageSize");
  const workOrderPaging = parsePaginationFromSearchParams(
    url.searchParams,
    "workOrderPage",
    "workOrderPageSize",
  );
  const issuePage = issuePaging.page;
  const issuePageSize = issuePaging.pageSize;
  const workOrderPage = workOrderPaging.page;
  const workOrderPageSize = workOrderPaging.pageSize;

  const cacheKey = [
    "api:city-operations",
    organizationId,
    issuePage,
    issuePageSize,
    workOrderPage,
    workOrderPageSize,
  ].join(":");

  const payload = await getOrSetJsonCache(cacheKey, 60, async () => {
    const [
      health,
      hotspots,
      issues,
      issuesTotal,
      departments,
      budgets,
      infrastructureHealth,
      workOrders,
      workOrdersTotal,
      maintenanceSchedules,
      civicInsights,
      grantMilestones,
      kpiTrendHealth,
      serviceZones,
      infrastructureLayerCount,
    ] = await Promise.all([
      getCityHealthScore(organizationId),
      getIssueHotspots(organizationId),
      db().issueReport.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        skip: (issuePage - 1) * issuePageSize,
        take: issuePageSize,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          latitude: true,
          longitude: true,
          address: true,
        },
      }),
      db().issueReport.count({
        where: { organizationId },
      }),
      db().department.findMany({
        where: { organizationId },
        include: {
          programs: {
            include: {
              kpis: {
                select: { status: true },
              },
              budgets: {
                select: { allocated: true, spent: true },
              },
            },
          },
          issueReports: {
            select: { status: true },
          },
        },
      }),
      db().budget.findMany({
        where: { OR: [{ organizationId }, { program: { organizationId } }] },
        select: {
          id: true,
          fiscalYear: true,
          category: true,
          allocated: true,
          spent: true,
          department: {
            select: { id: true, name: true },
          },
          program: {
            select: { id: true, name: true },
          },
        },
      }),
      getInfrastructureHealth(organizationId),
      db().workOrder.findMany({
        where: { organizationId },
        include: {
          asset: {
            select: { id: true, name: true, type: true },
          },
          department: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (workOrderPage - 1) * workOrderPageSize,
        take: workOrderPageSize,
      }),
      db().workOrder.count({
        where: { organizationId },
      }),
      db().maintenanceSchedule.findMany({
        where: { organizationId },
        include: {
          asset: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      getCivicInsights(organizationId),
      db().grantMilestone.findMany({
        where: {
          grant: {
            organizationId,
          },
        },
        include: {
          deliverables: {
            select: {
              id: true,
              completed: true,
            },
          },
        },
      }),
      getOrganizationKpiTrendHealth(organizationId, 6),
      db().serviceZone.findMany({
        where: { organizationId },
        select: { id: true },
      }),
      db().infrastructureLayer.count({
        where: { organizationId },
      }),
    ]);

    const departmentMetrics = departments.map((department) => {
      const kpis = department.programs.flatMap((program) => program.kpis);
      const onTrack = kpis.filter((kpi) => kpi.status === "ON_TRACK").length;
      const kpiScore = asPercent(onTrack, kpis.length);

      const openIssues = department.issueReports.filter((issue) => issue.status !== "RESOLVED").length;
      const issueScore = Math.max(0, 100 - Math.min(openIssues * 8, 100));

      const allocated = department.programs
        .flatMap((program) => program.budgets)
        .reduce((sum, budget) => sum + Number(budget.allocated), 0);
      const spent = department.programs
        .flatMap((program) => program.budgets)
        .reduce((sum, budget) => sum + Number(budget.spent), 0);
      const utilization = allocated > 0 ? (spent / allocated) * 100 : 0;
      const budgetScore = Math.max(0, 100 - Math.round(Math.abs(utilization - 75)));

      return {
        departmentId: department.id,
        department: department.name,
        performanceScore: Math.round(kpiScore * 0.45 + issueScore * 0.3 + budgetScore * 0.25),
        kpiScore,
        issueScore,
        budgetScore,
        openIssues,
        utilization: Math.round(utilization),
      };
    });

    const totalAllocated = budgets.reduce((sum, budget) => sum + Number(budget.allocated), 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
    const openWorkOrders = workOrders.filter((order) => order.status !== "COMPLETED").length;
    const completedWorkOrders = workOrders.filter((order) => order.status === "COMPLETED").length;
    const completedMilestones = grantMilestones.filter((milestone) => milestone.completed).length;
    const overdueMilestones = grantMilestones.filter(
      (milestone) => !milestone.completed && milestone.dueDate < new Date(),
    ).length;
    const totalDeliverables = grantMilestones.reduce(
      (sum, milestone) => sum + milestone.deliverables.length,
      0,
    );
    const completedDeliverables = grantMilestones.reduce(
      (sum, milestone) => sum + milestone.deliverables.filter((deliverable) => deliverable.completed).length,
      0,
    );
    const overdueMaintenance = maintenanceSchedules.filter((schedule) => {
      const baseDate = schedule.lastCompleted ?? schedule.createdAt;
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + schedule.frequencyDays);
      return dueDate < new Date();
    }).length;

    return {
      generatedAt: new Date().toISOString(),
      organizationId,
      health,
      issues,
      issuesPagination: {
        page: issuePage,
        pageSize: issuePageSize,
        total: issuesTotal,
        totalPages: Math.ceil(issuesTotal / issuePageSize),
      },
      hotspots,
      departmentMetrics,
      assets: infrastructureHealth.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        departmentId: asset.departmentId,
        status: asset.status,
        conditionScore: asset.computedConditionScore,
        latitude: asset.latitude,
        longitude: asset.longitude,
        address: asset.address,
      })),
      infrastructureHealth: {
        totalAssets: infrastructureHealth.totalAssets,
        assetsBelow50: infrastructureHealth.assetsBelow50,
        averageCondition: infrastructureHealth.averageCondition,
        topFailingTypes: infrastructureHealth.topFailingTypes,
      },
      workOrders: workOrders.map((order) => ({
        id: order.id,
        title: order.title,
        status: order.status,
        priority: order.priority,
        scheduledDate: order.scheduledDate,
        completedAt: order.completedAt,
        asset: order.asset,
        department: order.department,
      })),
      workOrdersPagination: {
        page: workOrderPage,
        pageSize: workOrderPageSize,
        total: workOrdersTotal,
        totalPages: Math.ceil(workOrdersTotal / workOrderPageSize),
      },
      maintenanceMetrics: {
        scheduleCount: maintenanceSchedules.length,
        overdueMaintenance,
        openWorkOrders,
        completionRatePercent: asPercent(completedWorkOrders, workOrders.length),
      },
      grantComplianceMetrics: {
        totalMilestones: grantMilestones.length,
        completedMilestones,
        milestoneCompletionRatePercent: asPercent(completedMilestones, grantMilestones.length),
        overdueMilestones,
        totalDeliverables,
        completedDeliverables,
        deliverableCompletionRatePercent: asPercent(completedDeliverables, totalDeliverables),
      },
      kpiTrendHealth: {
        score: kpiTrendHealth.score,
        warning: kpiTrendHealth.warning,
        downwardCount: kpiTrendHealth.downwardCount,
        total: kpiTrendHealth.total,
      },
      budgets: budgets.map((budget) => ({
        id: budget.id,
        fiscalYear: budget.fiscalYear,
        category: budget.category,
        allocated: Number(budget.allocated),
        spent: Number(budget.spent),
        department: budget.department,
        program: budget.program,
      })),
      civicInsights,
      budgetMetrics: {
        allocated: totalAllocated,
        spent: totalSpent,
        utilizationPercent: asPercent(totalSpent, totalAllocated),
      },
      mapMetrics: {
        issueClusters: hotspots.hotspotCount,
        serviceZoneCoverage: serviceZones.length,
        infrastructureLayerCount,
      },
    } as const;
  });

  return apiSuccess(payload);
}

export const GET = withApiObservability("/api/city/operations", "GET", handleGet);

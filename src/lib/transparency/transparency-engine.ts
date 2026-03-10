import { tenantDb } from "@/lib/tenantDb";

import {
  averageTransparencyComponents,
  buildComponentScore,
  calculateWeightedTransparencyScore,
  clampScore,
  toGrade,
  type TransparencyScore,
} from "@/lib/transparency/transparency-score";

type CoverageRow = {
  id: string;
  name: string;
};

type GrantRow = {
  id: string;
  isPublic: boolean;
  departmentId: string | null;
};

type KpiRow = {
  id: string;
  isPublic: boolean;
  departmentId: string | null;
};

type IssueRow = {
  id: string;
  status: string;
  departmentId: string | null;
  assignedDepartmentId: string | null;
};

type BudgetRow = {
  id: string;
  departmentId: string | null;
  program: {
    departmentId: string | null;
  } | null;
};

type AssetRow = {
  id: string;
  departmentId: string | null;
  conditionScore: number | null;
};

function ratioScore(numerator: number, denominator: number, emptyFallback: number) {
  if (denominator <= 0) {
    return emptyFallback;
  }

  return clampScore((numerator / denominator) * 100);
}

export async function calculateTransparencyScore(organizationId: string): Promise<TransparencyScore> {
  const [departments, grants, kpis, issues, budgets, assets] = await tenantDb(
    organizationId,
    async (tx) =>
      Promise.all([
        tx.department.findMany({
          where: { organizationId },
          select: { id: true, name: true },
        }),
        tx.grant.findMany({
          where: { organizationId },
          select: { id: true, isPublic: true, departmentId: true },
        }),
        tx.kPI.findMany({
          where: { organizationId },
          select: { id: true, isPublic: true, departmentId: true },
        }),
        tx.issueReport.findMany({
          where: { organizationId },
          select: {
            id: true,
            status: true,
            departmentId: true,
            assignedDepartmentId: true,
          },
        }),
        tx.budget.findMany({
          where: {
            OR: [
              { organizationId },
              { program: { organizationId } },
            ],
          },
          select: {
            id: true,
            departmentId: true,
            program: {
              select: {
                departmentId: true,
              },
            },
          },
        }),
        tx.asset.findMany({
          where: { organizationId },
          select: {
            id: true,
            departmentId: true,
            conditionScore: true,
          },
        }),
      ]) as Promise<[CoverageRow[], GrantRow[], KpiRow[], IssueRow[], BudgetRow[], AssetRow[]]>,
  );

  const publicGrants = grants.filter((grant) => grant.isPublic).length;
  const assetsWithCondition = assets.filter((asset) => asset.conditionScore != null).length;
  const publicKpis = kpis.filter((kpi) => kpi.isPublic).length;
  const openCivicIssues = issues.filter((issue) => issue.status !== "RESOLVED").length;
  const publicIssueReportingAvailable = true;

  const publicGrantDepartments = new Set(
    grants
      .filter((grant) => grant.isPublic && grant.departmentId)
      .map((grant) => grant.departmentId as string),
  );
  const publicKpiDepartments = new Set(
    kpis
      .filter((kpi) => kpi.isPublic && kpi.departmentId)
      .map((kpi) => kpi.departmentId as string),
  );
  const budgetDepartments = new Set(
    budgets.flatMap((budget) => {
      const departmentIds = [budget.departmentId, budget.program?.departmentId].filter(
        (value): value is string => Boolean(value),
      );
      return departmentIds;
    }),
  );
  const issueDepartments = new Set(
    issues.flatMap((issue) => {
      const departmentIds = [issue.departmentId, issue.assignedDepartmentId].filter(
        (value): value is string => Boolean(value),
      );
      return departmentIds;
    }),
  );
  const infrastructureDepartments = new Set(
    assets
      .filter((asset) => asset.conditionScore != null && asset.departmentId)
      .map((asset) => asset.departmentId as string),
  );

  const departmentsWithReporting = new Set<string>([
    ...publicGrantDepartments,
    ...publicKpiDepartments,
    ...budgetDepartments,
    ...issueDepartments,
    ...infrastructureDepartments,
  ]);

  const grantDisclosure = ratioScore(publicGrants, grants.length, 35);
  const infrastructureCondition = ratioScore(assetsWithCondition, assets.length, 30);
  const kpiPublication = ratioScore(publicKpis, kpis.length, 30);
  const budgetTransparency = departments.length > 0
    ? ratioScore(budgetDepartments.size, departments.length, budgets.length > 0 ? 50 : 35)
    : ratioScore(budgets.length, 1, 35);
  const departmentReporting = ratioScore(departmentsWithReporting.size, departments.length, 35);
  const publicIssueReporting = publicIssueReportingAvailable ? 100 : 0;

  const components = [
    buildComponentScore("grantDisclosure", grantDisclosure),
    buildComponentScore("infrastructureCondition", infrastructureCondition),
    buildComponentScore("kpiPublication", kpiPublication),
    buildComponentScore("publicIssueReporting", publicIssueReporting),
    buildComponentScore("budgetTransparency", budgetTransparency),
    buildComponentScore("departmentReporting", departmentReporting),
  ];

  const score = calculateWeightedTransparencyScore(components);
  const grade = toGrade(score);
  const reportingCompleteness = averageTransparencyComponents([
    components[0],
    components[1],
    components[2],
    components[4],
    components[5],
  ]);

  const availableDomains = [
    grants.length > 0,
    assets.length > 0,
    kpis.length > 0,
    budgets.length > 0,
    departments.length > 0,
    publicIssueReportingAvailable,
  ].filter(Boolean).length;
  const dataAvailability = ratioScore(availableDomains, 6, 0);

  const missingDataAreas: string[] = [];
  if (grants.length === 0 || publicGrants === 0) {
    missingDataAreas.push("Grant disclosure");
  }
  if (assets.length === 0 || assetsWithCondition === 0) {
    missingDataAreas.push("Infrastructure condition reporting");
  }
  if (kpis.length === 0 || publicKpis === 0) {
    missingDataAreas.push("KPI publication");
  }
  if (budgets.length === 0 || budgetDepartments.size === 0) {
    missingDataAreas.push("Budget transparency");
  }
  if (departments.length === 0 || departmentsWithReporting.size < departments.length) {
    missingDataAreas.push("Department reporting completeness");
  }

  const strengths = components
    .filter((component) => component.score >= 85)
    .map((component) => `${component.label} is strong at ${component.score}%.`);

  const gaps = components
    .filter((component) => component.score < 70)
    .map((component) => `${component.label} is under target at ${component.score}%.`);

  if (openCivicIssues > 0) {
    strengths.push(`${openCivicIssues} civic issues are visible to the public.`);
  }

  if (departments.length > 0 && departmentsWithReporting.size < departments.length) {
    const uncoveredDepartments = departments
      .filter((department: CoverageRow) => !departmentsWithReporting.has(department.id))
      .slice(0, 4)
      .map((department: CoverageRow) => department.name);

    gaps.push(
      uncoveredDepartments.length > 0
        ? `Departments missing public reporting coverage: ${uncoveredDepartments.join(", ")}.`
        : "Department reporting coverage is incomplete.",
    );
  }

  return {
    score,
    grade,
    missingDataAreas,
    strengths,
    gaps,
    components,
    reportingCompleteness,
    dataAvailability,
    openCivicIssues,
    publicIssueReportingAvailable,
    grantReportingCompleteness: grantDisclosure,
    infrastructureReportingCompleteness: infrastructureCondition,
    kpiAvailability: kpiPublication,
    budgetTransparency,
    departmentReportingCoverage: departmentReporting,
  };
}

export type TransparencyComponentKey =
  | "grantDisclosure"
  | "infrastructureCondition"
  | "kpiPublication"
  | "publicIssueReporting"
  | "budgetTransparency"
  | "departmentReporting";

export type TransparencyComponentScore = {
  key: TransparencyComponentKey;
  label: string;
  score: number;
  weight: number;
};

export type TransparencyScore = {
  score: number;
  grade: string;
  missingDataAreas: string[];
  strengths: string[];
  gaps: string[];
  components: TransparencyComponentScore[];
  reportingCompleteness: number;
  dataAvailability: number;
  openCivicIssues: number;
  publicIssueReportingAvailable: boolean;
  grantReportingCompleteness: number;
  infrastructureReportingCompleteness: number;
  kpiAvailability: number;
  budgetTransparency: number;
  departmentReportingCoverage: number;
};

const COMPONENT_LABELS: Record<TransparencyComponentKey, string> = {
  grantDisclosure: "Grant Disclosure",
  infrastructureCondition: "Infrastructure Condition Reporting",
  kpiPublication: "KPI Publication",
  publicIssueReporting: "Public Issue Reporting",
  budgetTransparency: "Budget Transparency",
  departmentReporting: "Department Reporting Coverage",
};

const COMPONENT_WEIGHTS: Record<TransparencyComponentKey, number> = {
  grantDisclosure: 18,
  infrastructureCondition: 18,
  kpiPublication: 18,
  publicIssueReporting: 14,
  budgetTransparency: 16,
  departmentReporting: 16,
};

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function toGrade(score: number) {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
}

export function buildComponentScore(
  key: TransparencyComponentKey,
  score: number,
): TransparencyComponentScore {
  return {
    key,
    label: COMPONENT_LABELS[key],
    score: clampScore(score),
    weight: COMPONENT_WEIGHTS[key],
  };
}

export function calculateWeightedTransparencyScore(components: TransparencyComponentScore[]) {
  const weightedTotal = components.reduce((sum, component) => {
    return sum + component.score * component.weight;
  }, 0);
  const weightTotal = components.reduce((sum, component) => sum + component.weight, 0);

  if (weightTotal === 0) {
    return 0;
  }

  return clampScore(weightedTotal / weightTotal);
}

export function averageTransparencyComponents(components: TransparencyComponentScore[]) {
  if (components.length === 0) {
    return 0;
  }

  return clampScore(
    components.reduce((sum, component) => sum + component.score, 0) / components.length,
  );
}

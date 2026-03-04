import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export default async function CouncilReportPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const [kpis, budgets, issues, goals, grants] = await Promise.all([
    db().kPI.findMany({
      where: { organizationId: user.organizationId },
      select: { status: true },
    }),
    db().budget.findMany({
      where: { program: { organizationId: user.organizationId } },
      select: { allocated: true, spent: true },
    }),
    db().issueReport.findMany({
      where: { organizationId: user.organizationId, status: { not: "RESOLVED" } },
      select: { id: true },
    }),
    db().strategicGoal.findMany({
      where: { organizationId: user.organizationId },
      include: {
        objectives: {
          select: { progressPercent: true },
        },
      },
    }),
    db().grant.findMany({
      where: { organizationId: user.organizationId },
      select: { complianceStatus: true, nextReportDue: true },
    }),
  ]);

  const onTrack = kpis.filter((kpi) => kpi.status === "ON_TRACK").length;
  const kpiHealth = asPercent(onTrack, kpis.length);
  const totalAllocated = budgets.reduce((sum, budget) => sum + Number(budget.allocated), 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
  const budgetUtilization = asPercent(totalSpent, totalAllocated);
  const openIssues = issues.length;

  const allObjectives = goals.flatMap((goal) => goal.objectives);
  const strategicGoalProgress = asPercent(
    allObjectives.reduce((sum, objective) => sum + objective.progressPercent, 0),
    allObjectives.length * 100,
  );

  const now = new Date();
  const compliantGrants = grants.filter((grant) => {
    if (grant.nextReportDue && grant.nextReportDue < now) {
      return false;
    }
    return (grant.complianceStatus ?? "COMPLIANT") === "COMPLIANT";
  }).length;
  const grantCompliance = asPercent(compliantGrants, grants.length);

  return (
    <div className="space-y-6">
      <Card title="City Council Performance Report">
        <div className="space-y-2 text-sm text-slate-700">
          <p>Programs On Track: {kpiHealth}%</p>
          <p>Open Issues: {openIssues}</p>
          <p>Budget Utilization: {budgetUtilization}%</p>
          <p>Strategic Goal Progress: {strategicGoalProgress}%</p>
          <p>Grant Compliance: {grantCompliance}%</p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card title="KPI Health">
          <p className="text-3xl font-semibold text-slate-900">{kpiHealth}%</p>
        </Card>
        <Card title="Budget Utilization">
          <p className="text-3xl font-semibold text-slate-900">{budgetUtilization}%</p>
        </Card>
        <Card title="Open Issues">
          <p className="text-3xl font-semibold text-slate-900">{openIssues}</p>
        </Card>
        <Card title="Strategic Progress">
          <p className="text-3xl font-semibold text-slate-900">{strategicGoalProgress}%</p>
        </Card>
        <Card title="Grant Compliance">
          <p className="text-3xl font-semibold text-slate-900">{grantCompliance}%</p>
        </Card>
      </div>
    </div>
  );
}

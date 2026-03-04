import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function toPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export default async function ExecutiveBriefingPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const [alerts, issues, budgets, kpis, programs] = await Promise.all([
    db().alert.findMany({
      where: { organizationId: user.organizationId, resolvedAt: null },
      select: { severity: true },
    }),
    db().issueReport.findMany({
      where: { organizationId: user.organizationId, status: { not: "RESOLVED" } },
      include: {
        department: { select: { name: true } },
      },
    }),
    db().budget.findMany({
      where: { program: { organizationId: user.organizationId } },
      select: { allocated: true, spent: true },
    }),
    db().kPI.findMany({
      where: { organizationId: user.organizationId },
      select: { status: true },
    }),
    db().program.findMany({
      where: { organizationId: user.organizationId },
      include: { kpis: { select: { status: true } }, department: { select: { name: true } } },
    }),
  ]);

  const criticalAlerts = alerts.filter((alert) => alert.severity === "CRITICAL").length;
  const openIssues = issues.length;
  const allocated = budgets.reduce((sum, budget) => sum + Number(budget.allocated), 0);
  const spent = budgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
  const budgetUtilization = toPercent(spent, allocated);
  const onTrackKpis = kpis.filter((kpi) => kpi.status === "ON_TRACK").length;
  const cityHealthScore = toPercent(onTrackKpis, kpis.length || 1);

  const offTrackPrograms = programs.filter((program) =>
    program.kpis.some((kpi) => kpi.status === "OFF_TRACK"),
  );
  const publicWorksOpen = issues.filter((issue) => issue.department?.name === "Public Works").length;

  return (
    <div className="space-y-6">
      <Card title="Executive Briefing">
        <p className="text-sm text-slate-600">
          Automated daily narrative briefing built from real-time operational metrics.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card title="City Health Score">
          <p className="text-3xl font-semibold text-slate-900">{cityHealthScore}%</p>
        </Card>
        <Card title="Open Issues">
          <p className="text-3xl font-semibold text-slate-900">{openIssues}</p>
        </Card>
        <Card title="Critical Alerts">
          <p className="text-3xl font-semibold text-slate-900">{criticalAlerts}</p>
        </Card>
        <Card title="Budget Utilization">
          <p className="text-3xl font-semibold text-slate-900">{budgetUtilization}%</p>
        </Card>
        <Card title="Programs Off Track">
          <p className="text-3xl font-semibold text-slate-900">{offTrackPrograms.length}</p>
        </Card>
      </div>

      <Card title="Today's CivicMetrix Briefing">
        <div className="space-y-2 text-sm text-slate-700">
          <p>City Health Score: {cityHealthScore}%</p>
          <p>
            {offTrackPrograms.length} program{offTrackPrograms.length === 1 ? " is" : "s are"} currently
            off-track.
          </p>
          <p>Public Works reports {publicWorksOpen} open issues.</p>
          <p>
            Budget utilization is {budgetUtilization}%,{" "}
            {budgetUtilization <= 85 ? "within target ranges." : "approaching threshold limits."}
          </p>
        </div>
      </Card>
    </div>
  );
}

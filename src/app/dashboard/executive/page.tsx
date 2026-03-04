import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getKpiHistoryPoints, summarizeTrend } from "@/lib/kpi-trends";
import { db } from "@/lib/db";

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

function getActiveProgramCount(programs: { startDate: Date | null; endDate: Date | null }[]) {
  const now = new Date();
  return programs.filter((program) => {
    const started = !program.startDate || program.startDate <= now;
    const notEnded = !program.endDate || program.endDate >= now;
    return started && notEnded;
  }).length;
}

export default async function ExecutivePage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const [departments, programs, alerts, budgets, kpis, issues] = await Promise.all([
    db().department.count({
      where: { organizationId: user.organizationId },
    }),
    db().program.findMany({
      where: { organizationId: user.organizationId },
      select: { startDate: true, endDate: true, id: true },
    }),
    db().alert.findMany({
      where: { organizationId: user.organizationId, resolvedAt: null },
      select: { id: true, severity: true },
    }),
    db().budget.findMany({
      where: { program: { organizationId: user.organizationId } },
      select: { allocated: true, spent: true },
    }),
    db().kPI.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, status: true },
    }),
    db().issueReport.findMany({
      where: { organizationId: user.organizationId },
      select: { status: true },
    }),
  ]);

  const activePrograms = getActiveProgramCount(programs);
  const openAlerts = alerts.length;
  const criticalAlerts = alerts.filter((alert) => alert.severity === "CRITICAL").length;
  const openIssues = issues.filter((issue) => issue.status !== "RESOLVED").length;
  const allocated = budgets.reduce((sum, budget) => sum + Number(budget.allocated), 0);
  const spent = budgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
  const budgetUsage = asPercent(spent, allocated);
  const onTrackKpis = kpis.filter((kpi) => kpi.status === "ON_TRACK").length;
  const kpiHealth = asPercent(onTrackKpis, kpis.length);
  const cityHealthScore = Math.round((kpiHealth + (100 - Math.min(criticalAlerts * 10, 100))) / 2);
  const kpiTrendRows = await Promise.all(
    kpis.map(async (kpi) => {
      const points = await getKpiHistoryPoints(kpi.id, 6);
      const summary = summarizeTrend(points.map((point) => point.value));
      return {
        id: kpi.id,
        name: kpi.name,
        ...summary,
      };
    }),
  );
  const topImproving = kpiTrendRows
    .filter((kpi) => kpi.direction === "UP")
    .sort((a, b) => b.deltaPercent - a.deltaPercent)
    .slice(0, 5);
  const topDeclining = kpiTrendRows
    .filter((kpi) => kpi.direction === "DOWN")
    .sort((a, b) => a.deltaPercent - b.deltaPercent)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card title="Mayor Executive Summary">
        <p className="text-sm text-slate-600">
          Consolidated operational overview across departments, programs, finances, and public issues.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card title="City Health Score">
          <p className="text-3xl font-semibold text-slate-900">{cityHealthScore}%</p>
          <p className="mt-1 text-xs text-slate-500">Composite from KPI health and critical alert pressure.</p>
        </Card>
        <Card title="Open Issues">
          <p className="text-3xl font-semibold text-slate-900">{openIssues}</p>
          <p className="mt-1 text-xs text-slate-500">OPEN or IN_PROGRESS issue reports.</p>
        </Card>
        <Card title="Critical Alerts">
          <p className="text-3xl font-semibold text-slate-900">{criticalAlerts}</p>
          <p className="mt-1 text-xs text-slate-500">{openAlerts} open alerts total.</p>
        </Card>
        <Card title="Budget Usage">
          <p className="text-3xl font-semibold text-slate-900">{budgetUsage}%</p>
          <p className="mt-1 text-xs text-slate-500">
            ${spent.toFixed(2)} of ${allocated.toFixed(2)} spent.
          </p>
        </Card>
        <Card title="Program Performance">
          <p className="text-3xl font-semibold text-slate-900">{activePrograms}</p>
          <p className="mt-1 text-xs text-slate-500">Active programs across {programs.length} total.</p>
        </Card>
        <Card title="KPI Health Score">
          <p className="text-3xl font-semibold text-slate-900">{kpiHealth}%</p>
          <p className="mt-1 text-xs text-slate-500">
            {onTrackKpis} ON_TRACK out of {kpis.length} KPIs.
          </p>
        </Card>
      </div>

      <Card title="Executive Totals">
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <p>Total Departments: {departments}</p>
          <p>Active Programs: {activePrograms}</p>
          <p>Open Alerts: {openAlerts}</p>
          <p>Critical Alerts: {criticalAlerts}</p>
          <p>Open Issues: {openIssues}</p>
          <p>Budget Utilization: {budgetUsage}%</p>
          <p>KPI Health Score: {kpiHealth}%</p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Top Improving KPIs">
          <div className="space-y-2 text-sm text-slate-700">
            {topImproving.length > 0 ? (
              topImproving.map((kpi) => (
                <p key={kpi.id}>
                  {kpi.name}: <span className="font-semibold text-emerald-700">{kpi.deltaPercent}%</span>
                </p>
              ))
            ) : (
              <p>No improving KPI trend identified over last 6 months.</p>
            )}
          </div>
        </Card>
        <Card title="Top Declining KPIs">
          <div className="space-y-2 text-sm text-slate-700">
            {topDeclining.length > 0 ? (
              topDeclining.map((kpi) => (
                <p key={kpi.id}>
                  {kpi.name}: <span className="font-semibold text-rose-700">{kpi.deltaPercent}%</span>
                </p>
              ))
            ) : (
              <p>No declining KPI trend identified over last 6 months.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

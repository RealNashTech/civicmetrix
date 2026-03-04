import { CivicIntelligencePanel } from "@/components/intelligence/civic-intelligence-panel";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardHomePage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId;

  const [kpiCount, grantCount] = organizationId
    ? await Promise.all([
        db().kPI.count({
          where: { organizationId },
        }),
        db().grant.count({
          where: { organizationId },
        }),
      ])
    : [0, 0];

  return (
    <div className="space-y-6">
      <CivicIntelligencePanel />
      <Card title="Organization Summary">
        <p className="text-sm text-slate-700">
          You are signed in as <span className="font-medium">{session?.user?.email}</span> for
          organization <span className="font-medium">{session?.user?.organizationSlug}</span>.
        </p>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Active KPIs">
          <p className="text-3xl font-semibold text-slate-900">{kpiCount}</p>
          <p className="mt-1 text-xs text-slate-500">Organization-scoped total</p>
        </Card>
        <Card title="Open Grants">
          <p className="text-3xl font-semibold text-slate-900">{grantCount}</p>
          <p className="mt-1 text-xs text-slate-500">Organization-scoped total</p>
        </Card>
        <Card title="Reporting Cycle">
          <p className="text-3xl font-semibold text-slate-900">Q1</p>
          <p className="mt-1 text-xs text-slate-500">Placeholder data</p>
        </Card>
      </div>
    </div>
  );
}

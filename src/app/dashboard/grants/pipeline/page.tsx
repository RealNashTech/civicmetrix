import Link from "next/link";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { db } from "@/lib/db";

export default async function GrantPipelinePage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }
  const organizationId = requireOrganization(session);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const pipelineSummary = await db().$queryRaw<
    { pipeline_count: number; submitted_count: number; awarded_total: number | null }[]
  >`
SELECT pipeline_count, submitted_count, awarded_total
FROM grant_pipeline_summary
WHERE "organizationId" = ${organizationId}
LIMIT 1
`

  const [potentialFundingResult, upcomingDeadlines] = await Promise.all([
    db().grant.aggregate({
      where: {
        organizationId,
        status: {
          in: ["PIPELINE", "SUBMITTED"],
        },
      },
      _sum: {
        amount: true,
      },
    }),
    db().grant.count({
      where: {
        organizationId,
        status: {
          in: ["PIPELINE", "DRAFT", "SUBMITTED"],
        },
        applicationDeadline: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
    }),
  ]);

  const summary = pipelineSummary[0] ?? {
    pipeline_count: 0,
    submitted_count: 0,
    awarded_total: 0,
  };
  const pipeline = summary.pipeline_count;
  const submitted = summary.submitted_count;
  const awardedTotal = Number(summary.awarded_total ?? 0);
  const potentialFunding = Number(potentialFundingResult._sum.amount ?? 0);

  return (
    <div className="space-y-6">
      <Card title="Grant Pipeline Dashboard">
        <div className="mb-4 text-sm">
          <Link href="/dashboard/grants" className="text-blue-600 hover:underline">
            ← Back to Grants
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Pipeline Count</p>
            <p className="text-3xl font-semibold text-slate-900">{pipeline}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Submitted Count</p>
            <p className="text-3xl font-semibold text-slate-900">{submitted}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Awarded Total $</p>
            <p className="text-3xl font-semibold text-slate-900">
              ${awardedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Potential Funding $</p>
            <p className="text-3xl font-semibold text-slate-900">
              ${potentialFunding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Upcoming Deadlines (next 30 days)</p>
            <p className="text-3xl font-semibold text-slate-900">{upcomingDeadlines}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

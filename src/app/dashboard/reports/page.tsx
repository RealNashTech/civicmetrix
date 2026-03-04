import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import { createCouncilReport } from "./actions";

type CouncilReportSummary = {
  kpiCount?: number;
  grantCount?: number;
  openIssues?: number;
  resolvedIssues?: number;
};

function formatSummary(summary: CouncilReportSummary) {
  return [
    `KPIs: ${summary.kpiCount ?? 0}`,
    `Grants: ${summary.grantCount ?? 0}`,
    `Open issues: ${summary.openIssues ?? 0}`,
    `Resolved issues: ${summary.resolvedIssues ?? 0}`,
  ].join(" • ");
}

export default async function ReportsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const reports = await db().councilReport.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <Card title="Council Report Generator">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-600">
            Generate automatic weekly council reports from organization KPIs, grants, and issues.
          </p>
          <form action={createCouncilReport}>
            <button
              type="submit"
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Generate Weekly Council Report
            </button>
          </form>
        </div>
      </Card>

      <Card title="Generated Reports">
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">No council reports generated yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Report Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Generated</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-4 py-3 text-slate-800">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(report.reportDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(report.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatSummary((report.summary ?? {}) as CouncilReportSummary)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

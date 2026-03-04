import Link from "next/link";

import { InsightSeverity, InsightType } from "@prisma/client";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import { resolveInsight } from "./actions";

type InsightsPageProps = {
  searchParams?: Promise<{ type?: string }> | { type?: string };
};

const typeFilters = ["ALL", "SERVICE_ANOMALY", "GRANT_RISK", "KPI_TREND_ALERT"] as const;
type TypeFilter = (typeof typeFilters)[number];

function badgeClasses(severity: InsightSeverity) {
  if (severity === "CRITICAL") {
    return "bg-rose-100 text-rose-800";
  }
  if (severity === "WARNING") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-100 text-slate-700";
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const role = user.role as AppRole;
  const canResolve = hasMinimumRole(role, "EDITOR");
  const resolvedSearch = await Promise.resolve(searchParams);
  const requestedType = resolvedSearch?.type ?? "ALL";
  const activeType: TypeFilter = typeFilters.includes(requestedType as TypeFilter)
    ? (requestedType as TypeFilter)
    : "ALL";

  const insights = await db().insight.findMany({
    where: {
      organizationId: user.organizationId,
      resolvedAt: null,
      type: activeType === "ALL" ? undefined : (activeType as InsightType),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <Card title="Operational Insights">
        <div className="mb-3 flex flex-wrap gap-2">
          {typeFilters.map((filter) => {
            const isActive = activeType === filter;
            const href = filter === "ALL" ? "/dashboard/insights" : `/dashboard/insights?type=${filter}`;
            return (
              <Link
                key={filter}
                href={href}
                className={`rounded-md border px-3 py-1 text-xs font-medium ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {filter}
              </Link>
            );
          })}
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Severity</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Created Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <tr key={insight.id}>
                    <td className="px-4 py-3 text-slate-700">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${badgeClasses(insight.severity)}`}
                      >
                        {insight.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{insight.type}</td>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="font-medium">{insight.title}</div>
                      <p className="text-xs text-slate-500">{insight.description}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(insight.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {canResolve ? (
                        <form action={resolveInsight}>
                          <input type="hidden" name="id" value={insight.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100"
                          >
                            Resolve
                          </button>
                        </form>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    No active insights found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

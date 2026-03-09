import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { requireAnyRole, RoleAccessError } from "@/lib/permissions";
import { tenantDb } from "@/lib/tenantDb";
import { notFound } from "next/navigation";

type OperationalInsightRow = {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  createdAt: Date;
};

function badgeClasses(severity: string) {
  const normalized = severity.toUpperCase();
  if (normalized === "CRITICAL") {
    return "bg-rose-100 text-rose-800";
  }
  if (normalized === "WARNING") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-100 text-slate-700";
}

function extractRelatedDepartment(description: string): string {
  const match = description.match(/Department:\s*([^;]+)/i);
  return match?.[1]?.trim() || "-";
}

function extractRelatedEntity(description: string): string {
  const match = description.match(/Related:\s*([^;]+)/i);
  return match?.[1]?.trim() || "-";
}

export default async function InsightsPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  try {
    await requireAnyRole(["SYSTEM_ADMIN", "CITY_ADMIN", "COUNCIL_MEMBER"], session.user);
  } catch (error) {
    if (error instanceof RoleAccessError) {
      notFound();
    }
    throw error;
  }

  const organizationId = requireOrganization(session);

  const insights = await tenantDb<OperationalInsightRow[]>(organizationId, async (tx) => {
    return tx.operationalInsight.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        severity: true,
        createdAt: true,
      },
    });
  });

  return (
    <div className="space-y-6">
      <Card title="Operational Insights">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Severity</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Related Entity</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <tr key={insight.id}>
                    <td className="px-4 py-3 text-slate-700">
                      <span className={`rounded px-2 py-1 text-xs font-medium ${badgeClasses(insight.severity)}`}>
                        {insight.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{insight.type}</td>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="font-medium">{insight.title}</div>
                      <p className="text-xs text-slate-500">{insight.description}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{extractRelatedDepartment(insight.description)}</td>
                    <td className="px-4 py-3 text-slate-700">{extractRelatedEntity(insight.description)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(insight.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    No operational insights found.
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

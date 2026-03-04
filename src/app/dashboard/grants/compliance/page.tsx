import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import { checkGrantComplianceAlerts } from "@/lib/alerts/checkGrantComplianceAlerts";

function complianceBadge(status: string | null) {
  if (status === "OVERDUE") {
    return "bg-rose-100 text-rose-800";
  }
  if (status === "AT_RISK") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "COMPLIANT") {
    return "bg-emerald-100 text-emerald-800";
  }
  return "bg-slate-100 text-slate-700";
}

export default async function GrantCompliancePage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const grants = await db().grant.findMany({
    where: { organizationId: user.organizationId },
    include: {
      department: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const grantsWithDerived = grants.map((grant) => {
    const derivedStatus =
      grant.nextReportDue && grant.nextReportDue < now
        ? "OVERDUE"
        : grant.complianceStatus || "COMPLIANT";
    return { ...grant, derivedStatus };
  });

  await Promise.all(
    grantsWithDerived
      .filter((grant) => grant.derivedStatus === "OVERDUE")
      .map((grant) =>
        checkGrantComplianceAlerts({
          grant: {
            id: grant.id,
            name: grant.name,
            organizationId: grant.organizationId,
            departmentId: grant.departmentId,
            programId: grant.programId,
            nextReportDue: grant.nextReportDue,
          },
        }),
      ),
  );

  return (
    <div className="space-y-6">
      <Card title="Grant Compliance Dashboard">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Grant Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Next Report Due</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {grantsWithDerived.length > 0 ? (
                grantsWithDerived.map((grant) => (
                  <tr key={grant.id}>
                    <td className="px-4 py-3 text-slate-800">{grant.name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {grant.nextReportDue
                        ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
                            grant.nextReportDue,
                          )
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${complianceBadge(grant.derivedStatus)}`}
                      >
                        {grant.derivedStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{grant.department?.name ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={4}>
                    No grants found.
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

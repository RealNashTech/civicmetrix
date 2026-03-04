import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import { resolveAlert } from "./actions";

function badgeClasses(severity: "INFO" | "WARNING" | "CRITICAL") {
  if (severity === "CRITICAL") {
    return "bg-rose-100 text-rose-800";
  }
  if (severity === "WARNING") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-100 text-slate-700";
}

export default async function AlertsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const role = user.role as AppRole;
  const canResolve = hasMinimumRole(role, "EDITOR");

  const alerts = await db().alert.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      department: { select: { name: true } },
      program: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <Card title="Alerts">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Severity</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Program</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Created Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Resolved Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="px-4 py-3 text-slate-700">
                      <span className={`rounded px-2 py-1 text-xs font-medium ${badgeClasses(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="font-medium">{alert.title}</div>
                      <p className="text-xs text-slate-500">{alert.message}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{alert.department?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{alert.program?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(alert.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {alert.resolvedAt
                        ? `Resolved ${new Intl.DateTimeFormat("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(alert.resolvedAt)}`
                        : "Open"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {canResolve && !alert.resolvedAt ? (
                        <form action={resolveAlert}>
                          <input type="hidden" name="id" value={alert.id} />
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
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>
                    No alerts found.
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

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { requireCitizenSession } from "@/lib/citizen-auth";
import { dbSystem } from "@/lib/db";

import { markCitizenNotificationsRead } from "./actions";

export default async function CitizenDashboardPage() {
  const citizen = await requireCitizenSession();

  const [issues, notifications] = await Promise.all([
    dbSystem().issueReport.findMany({
      where: {
        citizenId: citizen.citizenId,
        organizationId: citizen.organizationId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        department: {
          select: { name: true },
        },
        assignedDepartment: {
          select: { name: true },
        },
      },
    }),
    dbSystem().citizenNotification.findMany({
      where: { citizenId: citizen.citizenId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6">
      <Card title="My Issue Submissions">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Assigned Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {issues.length > 0 ? (
                issues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="px-4 py-3 text-slate-800">
                      <Link href={`/citizen/issues/${issue.id}`} className="font-medium text-blue-700 hover:underline">
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{issue.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {issue.assignedDepartment?.name ?? issue.department?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(issue.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {issue.resolvedAt
                        ? `Resolved ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(issue.resolvedAt)}`
                        : "Open"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    You have not submitted any issues yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Recent Notifications">
        <form action={markCitizenNotificationsRead} className="mb-2">
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Mark all as read
          </button>
        </form>
        <div className="space-y-2 text-sm">
          {notifications.length > 0 ? (
            notifications.map((note) => (
              <p key={note.id} className={`rounded border p-2 ${note.read ? "border-slate-200 text-slate-600" : "border-blue-200 bg-blue-50 text-slate-800"}`}>
                {note.message}
              </p>
            ))
          ) : (
            <p className="text-slate-500">No notifications yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import { addStaffIssueComment, createWorkOrderFromIssue, markInProgress, markResolved } from "./actions";
import { reassignDepartment, updatePriority } from "./assign-actions";

export default async function IssuesPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const role = user.role as AppRole;
  const canManage = hasMinimumRole(role, "EDITOR");

  const issues = await db().issueReport.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      department: {
        select: { name: true },
      },
      assignedDepartment: {
        select: { id: true, name: true },
      },
      asset: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  const departments = await db().department.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <Card title="Issue Queue">
        <div className="mb-3 flex gap-4">
          <Link href="/dashboard/issues/board" className="text-sm text-blue-600 hover:underline">
            View Workflow Board
          </Link>
          <Link href="/dashboard/issues/map" className="text-sm text-blue-600 hover:underline">
            View Issue Map
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Asset</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Assigned Dept</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Created Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Reporter</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {issues.length > 0 ? (
                issues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="px-4 py-3 text-slate-700">{issue.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {canManage ? (
                        <form action={updatePriority} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={issue.id} />
                          <select
                            name="priority"
                            defaultValue={issue.priority ?? ""}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="">Unset</option>
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="URGENT">URGENT</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100"
                          >
                            Save
                          </button>
                        </form>
                      ) : (
                        issue.priority ?? "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="font-medium">{issue.title}</div>
                      <p className="text-xs text-slate-500">{issue.description}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{issue.category}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {issue.asset ? `${issue.asset.name} (${issue.asset.type})` : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{issue.department?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {canManage ? (
                        <form action={reassignDepartment} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={issue.id} />
                          <select
                            name="assignedDepartmentId"
                            defaultValue={issue.assignedDepartmentId ?? ""}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="">Unassigned</option>
                            {departments.map((department) => (
                              <option key={department.id} value={department.id}>
                                {department.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100"
                          >
                            Save
                          </button>
                        </form>
                      ) : (
                        issue.assignedDepartment?.name ?? "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(issue.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{issue.reporterName ?? "-"}</div>
                      <div className="text-xs text-slate-500">{issue.reporterEmail ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {canManage ? (
                        <div className="flex gap-2">
                          <form action={createWorkOrderFromIssue}>
                            <input type="hidden" name="issueId" value={issue.id} />
                            <button
                              type="submit"
                              className="rounded-md border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                            >
                              Create Work Order
                            </button>
                          </form>
                          {issue.status === "OPEN" ? (
                            <form action={markInProgress}>
                              <input type="hidden" name="id" value={issue.id} />
                              <button
                                type="submit"
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100"
                              >
                                Mark In Progress
                              </button>
                            </form>
                          ) : null}
                          {issue.status !== "RESOLVED" ? (
                            <form action={markResolved}>
                              <input type="hidden" name="id" value={issue.id} />
                              <button
                                type="submit"
                                className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                              >
                                Mark Resolved
                              </button>
                            </form>
                          ) : (
                            "Resolved"
                          )}
                          <details>
                            <summary className="cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100">
                              Comment
                            </summary>
                            <form action={addStaffIssueComment} className="mt-2 min-w-60 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                              <input type="hidden" name="issueId" value={issue.id} />
                              <textarea
                                name="message"
                                required
                                placeholder="Add staff response"
                                className="min-h-20 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                              <button
                                type="submit"
                                className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                              >
                                Post
                              </button>
                            </form>
                          </details>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={10}>
                    No issues reported yet.
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

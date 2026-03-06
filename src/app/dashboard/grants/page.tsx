import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import { createGrant, deleteGrant, toggleGrantPublic, updateGrant } from "./actions";

export default async function GrantsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const role = user.role as AppRole;
  const canCreate = hasMinimumRole(role, "EDITOR");

  const grants = await db().grant.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      program: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const departments = await db().department.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  const programs = await db().program.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  const formatDate = (date: Date | null) =>
    date ? new Intl.DateTimeFormat("en-US").format(date) : "-";

  const getStatusClasses = (status: string) => {
    if (status === "SUBMITTED") {
      return "bg-blue-100 text-blue-800";
    }
    if (status === "AWARDED") {
      return "bg-emerald-100 text-emerald-800";
    }
    if (status === "REPORTING") {
      return "bg-amber-100 text-amber-800";
    }
    if (status === "CLOSED") {
      return "bg-slate-200 text-slate-800";
    }
    return "bg-slate-100 text-slate-700";
  };

  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return (
    <div className="space-y-6">
      {canCreate ? (
        <Card title="Create Grant">
          <div className="mb-3">
            <a href="/dashboard/grants/compliance" className="text-sm text-blue-600 hover:underline">
              View Grant Compliance Dashboard
            </a>
            <span className="mx-2 text-slate-400">|</span>
            <a href="/dashboard/grant-compliance" className="text-sm text-blue-600 hover:underline">
              View Milestones Tracker
            </a>
            <span className="mx-2 text-slate-400">|</span>
            <a href="/dashboard/grants/pipeline" className="text-sm text-blue-600 hover:underline">
              View Grant Pipeline
            </a>
          </div>
          <form action={createGrant} className="grid gap-3 md:grid-cols-7">
            <input
              name="name"
              required
              placeholder="Grant name"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              name="status"
              required
              defaultValue="PIPELINE"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="PIPELINE">PIPELINE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="AWARDED">AWARDED</option>
              <option value="REPORTING">REPORTING</option>
              <option value="CLOSED">CLOSED</option>
            </select>
            <input
              name="amount"
              required
              step="0.01"
              type="number"
              placeholder="Amount"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="startDate"
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="endDate"
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="reportingFrequency"
              placeholder="Reporting frequency"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="applicationDeadline"
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="awardAmount"
              type="number"
              step="0.01"
              placeholder="Award amount"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="reportDueDate"
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="nextReportDue"
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="lastReportSubmitted"
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              name="complianceStatus"
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Compliance status</option>
              <option value="COMPLIANT">COMPLIANT</option>
              <option value="AT_RISK">AT_RISK</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
            <select
              name="departmentId"
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <select
              name="programId"
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <div className="md:col-span-7">
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Create Grant
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Grant</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Amount</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Start</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">End</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Program</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Public</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {grants.length > 0 ? (
              grants.map((grant) => (
                <tr key={grant.id}>
                  <td className="px-4 py-3 text-slate-800">{grant.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-1 text-xs font-medium ${getStatusClasses(grant.status)}`}>
                        {grant.status}
                      </span>
                      {grant.applicationDeadline &&
                      grant.applicationDeadline >= now &&
                      grant.applicationDeadline <= sevenDaysFromNow ? (
                        <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                          ⚠ Deadline Soon
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">${grant.amount.toString()}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(grant.startDate)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(grant.endDate)}</td>
                  <td className="px-4 py-3 text-slate-700">{grant.department?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{grant.program?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex items-center gap-3">
                      <span>{grant.isPublic ? "Published" : "Private"}</span>
                      {canCreate ? (
                        <form
                          action={async () => {
                            "use server";
                            await toggleGrantPublic(grant.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            {grant.isPublic ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {canCreate ? (
                      <div className="flex items-center gap-2">
                        <details>
                          <summary className="cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100">
                            Edit
                          </summary>
                          <form action={updateGrant} className="mt-2 grid min-w-80 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                            <input type="hidden" name="id" value={grant.id} />
                            <input
                              name="name"
                              defaultValue={grant.name}
                              required
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <select
                              name="status"
                              defaultValue={grant.status}
                              required
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            >
                              <option value="PIPELINE">PIPELINE</option>
                              <option value="DRAFT">DRAFT</option>
                              <option value="SUBMITTED">SUBMITTED</option>
                              <option value="AWARDED">AWARDED</option>
                              <option value="REPORTING">REPORTING</option>
                              <option value="CLOSED">CLOSED</option>
                            </select>
                            <input
                              name="amount"
                              type="number"
                              step="0.01"
                              defaultValue={grant.amount.toString()}
                              required
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              name="startDate"
                              type="date"
                              defaultValue={grant.startDate ? grant.startDate.toISOString().slice(0, 10) : ""}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              name="endDate"
                              type="date"
                              defaultValue={grant.endDate ? grant.endDate.toISOString().slice(0, 10) : ""}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              name="reportingFrequency"
                              defaultValue={grant.reportingFrequency ?? ""}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              name="applicationDeadline"
                              type="date"
                              defaultValue={
                                grant.applicationDeadline
                                  ? grant.applicationDeadline.toISOString().slice(0, 10)
                                  : ""
                              }
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              name="awardAmount"
                              type="number"
                              step="0.01"
                              defaultValue={grant.awardAmount ? grant.awardAmount.toString() : ""}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              name="reportDueDate"
                              type="date"
                              defaultValue={grant.reportDueDate ? grant.reportDueDate.toISOString().slice(0, 10) : ""}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              name="nextReportDue"
                              type="date"
                              defaultValue={grant.nextReportDue ? grant.nextReportDue.toISOString().slice(0, 10) : ""}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              name="lastReportSubmitted"
                              type="date"
                              defaultValue={
                                grant.lastReportSubmitted
                                  ? grant.lastReportSubmitted.toISOString().slice(0, 10)
                                  : ""
                              }
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                            <select
                              name="complianceStatus"
                              defaultValue={grant.complianceStatus ?? ""}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            >
                              <option value="">Compliance status</option>
                              <option value="COMPLIANT">COMPLIANT</option>
                              <option value="AT_RISK">AT_RISK</option>
                              <option value="OVERDUE">OVERDUE</option>
                            </select>
                            <select
                              name="departmentId"
                              defaultValue={grant.departmentId ?? ""}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            >
                              <option value="">No department</option>
                              {departments.map((department) => (
                                <option key={department.id} value={department.id}>
                                  {department.name}
                                </option>
                              ))}
                            </select>
                            <select
                              name="programId"
                              defaultValue={grant.programId ?? ""}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            >
                              <option value="">No program</option>
                              {programs.map((program) => (
                                <option key={program.id} value={program.id}>
                                  {program.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                            >
                              Save
                            </button>
                          </form>
                        </details>

                        <details>
                          <summary className="cursor-pointer rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                            Delete
                          </summary>
                          <form action={deleteGrant} className="mt-2 rounded-md border border-red-200 bg-red-50 p-3">
                            <input type="hidden" name="id" value={grant.id} />
                            <p className="mb-2 text-xs text-red-700">
                              Confirm grant deletion. This cannot be undone.
                            </p>
                            <button
                              type="submit"
                              className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500"
                            >
                              Confirm Delete
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
                <td className="px-4 py-6 text-slate-500" colSpan={9}>
                  No grants found for this organization.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

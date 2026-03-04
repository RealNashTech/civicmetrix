import Link from "next/link";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import {
  createDeliverable,
  createMilestone,
  toggleDeliverableCompletion,
  toggleMilestoneCompletion,
} from "./actions";

function asPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export default async function GrantComplianceTrackerPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const canManage = hasMinimumRole(user.role as AppRole, "EDITOR");

  const grants = await db().grant.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    include: {
      milestones: {
        include: {
          deliverables: true,
          kpis: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  const milestones = grants.flatMap((grant) =>
    grant.milestones.map((milestone) => ({ ...milestone, grantName: grant.name })),
  );
  const deliverables = milestones.flatMap((milestone) => milestone.deliverables);

  const milestoneCompletion = asPercent(
    milestones.filter((milestone) => milestone.completed).length,
    milestones.length,
  );
  const deliverableCompletion = asPercent(
    deliverables.filter((deliverable) => deliverable.completed).length,
    deliverables.length,
  );

  return (
    <div className="space-y-6">
      <Card title="Grant Compliance & Outcomes">
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">
            Milestones Completion: {milestoneCompletion}%
          </span>
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">
            Deliverables Completion: {deliverableCompletion}%
          </span>
          <Link href="/dashboard/grants/compliance" className="text-blue-600 hover:underline">
            View legacy grant compliance overview
          </Link>
        </div>

        {canManage ? (
          <div className="grid gap-4 md:grid-cols-2">
            <form action={createMilestone} className="space-y-2 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Create Milestone</h3>
              <select
                name="grantId"
                required
                defaultValue=""
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Select grant
                </option>
                {grants.map((grant) => (
                  <option key={grant.id} value={grant.id}>
                    {grant.name}
                  </option>
                ))}
              </select>
              <input
                name="name"
                required
                placeholder="Milestone name"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                name="description"
                placeholder="Description"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                name="dueDate"
                type="date"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Add Milestone
              </button>
            </form>

            <form action={createDeliverable} className="space-y-2 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Create Deliverable</h3>
              <select
                name="milestoneId"
                required
                defaultValue=""
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Select milestone
                </option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.grantName} - {milestone.name}
                  </option>
                ))}
              </select>
              <input
                name="description"
                required
                placeholder="Deliverable description"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Add Deliverable
              </button>
            </form>
          </div>
        ) : null}
      </Card>

      <Card title="Milestones">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Grant</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Milestone</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Due Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Deliverables</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Linked KPIs</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Complete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {milestones.length > 0 ? (
                milestones.map((milestone) => (
                  <tr key={milestone.id}>
                    <td className="px-4 py-3 text-slate-800">{milestone.grantName}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <p className="font-medium">{milestone.name}</p>
                      <p className="text-xs text-slate-500">{milestone.description ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(milestone.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {
                        milestone.deliverables.filter((deliverable) => deliverable.completed).length
                      }
                      /{milestone.deliverables.length}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {milestone.kpis.length > 0
                        ? milestone.kpis.map((kpi) => `${kpi.name} (${kpi.status})`).join(", ")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {canManage ? (
                        <form action={toggleMilestoneCompletion}>
                          <input type="hidden" name="id" value={milestone.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100"
                          >
                            {milestone.completed ? "Mark Incomplete" : "Mark Complete"}
                          </button>
                        </form>
                      ) : (
                        <span>{milestone.completed ? "Yes" : "No"}</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    No milestones found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Deliverables">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Milestone</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Description</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {deliverables.length > 0 ? (
                milestones.flatMap((milestone) =>
                  milestone.deliverables.map((deliverable) => (
                    <tr key={deliverable.id}>
                      <td className="px-4 py-3 text-slate-700">{milestone.name}</td>
                      <td className="px-4 py-3 text-slate-800">{deliverable.description}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {canManage ? (
                          <form action={toggleDeliverableCompletion}>
                            <input type="hidden" name="id" value={deliverable.id} />
                            <button
                              type="submit"
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100"
                            >
                              {deliverable.completed ? "Mark Incomplete" : "Mark Complete"}
                            </button>
                          </form>
                        ) : (
                          <span>{deliverable.completed ? "Yes" : "No"}</span>
                        )}
                      </td>
                    </tr>
                  )),
                )
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={3}>
                    No deliverables found.
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

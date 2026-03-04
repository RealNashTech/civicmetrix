import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import { createMaintenanceSchedule, updateWorkOrderStatus } from "./actions";

export default async function WorkOrdersPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const role = user.role as AppRole;
  const canManage = hasMinimumRole(role, "EDITOR");

  const [workOrders, assets, maintenanceSchedules] = await Promise.all([
    db().workOrder.findMany({
      where: { organizationId: user.organizationId },
      include: {
        asset: { select: { name: true, type: true } },
        department: { select: { name: true } },
        issue: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db().asset.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    db().maintenanceSchedule.findMany({
      where: { organizationId: user.organizationId },
      include: {
        asset: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {canManage ? (
        <Card title="Create Maintenance Schedule">
          <form action={createMaintenanceSchedule} className="grid gap-3 md:grid-cols-4">
            <select
              name="assetId"
              required
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select asset
              </option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.type})
                </option>
              ))}
            </select>
            <input
              name="name"
              required
              placeholder="Schedule name"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="frequencyDays"
              type="number"
              min={1}
              required
              placeholder="Frequency days"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <div>
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Create Schedule
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Work Orders">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Asset</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Scheduled Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {workOrders.length > 0 ? (
                workOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="font-medium">{order.title}</div>
                      <p className="text-xs text-slate-500">{order.issue?.title ?? order.description ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {canManage ? (
                        <form action={updateWorkOrderStatus} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={order.id} />
                          <select
                            name="status"
                            defaultValue={order.status}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="BLOCKED">BLOCKED</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100"
                          >
                            Save
                          </button>
                        </form>
                      ) : (
                        order.status
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.asset ? `${order.asset.name} (${order.asset.type})` : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{order.department?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{order.priority ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.scheduledDate
                        ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(order.scheduledDate)
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    No work orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Maintenance Schedules">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Asset</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Frequency (days)</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Last Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {maintenanceSchedules.length > 0 ? (
                maintenanceSchedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td className="px-4 py-3 text-slate-800">{schedule.name}</td>
                    <td className="px-4 py-3 text-slate-700">{schedule.asset.name}</td>
                    <td className="px-4 py-3 text-slate-700">{schedule.frequencyDays}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {schedule.lastCompleted
                        ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(schedule.lastCompleted)
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={4}>
                    No maintenance schedules found.
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

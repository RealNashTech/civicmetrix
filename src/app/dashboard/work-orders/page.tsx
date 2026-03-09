import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { requireAnyRole, RoleAccessError } from "@/lib/permissions";
import { tenantDb } from "@/lib/tenantDb";

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "COMPLETE"] as const;
const PRIORITY_OPTIONS = ["LOW", "NORMAL", "MEDIUM", "HIGH", "URGENT"] as const;

type WorkOrderRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  createdAt: Date;
  department: { id: string; name: string } | null;
};

type DepartmentOption = {
  id: string;
  name: string;
};

type QueryParams = {
  status?: string;
  priority?: string;
  departmentId?: string;
  error?: string;
};

async function createWorkOrder(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) {
    notFound();
  }
  try {
    await requireAnyRole(
      ["SYSTEM_ADMIN", "CITY_ADMIN", "DEPARTMENT_ADMIN", "STAFF"],
      session.user,
    );
  } catch (error) {
    if (error instanceof RoleAccessError) {
      notFound();
    }
    throw error;
  }

  const organizationId = requireOrganization(session);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const departmentIdRaw = String(formData.get("departmentId") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "").trim();
  const assignedTo = String(formData.get("assignedTo") ?? "").trim();

  if (!title) {
    redirect("/dashboard/work-orders?error=Title%20is%20required");
  }

  const priority = PRIORITY_OPTIONS.includes(priorityRaw as (typeof PRIORITY_OPTIONS)[number])
    ? priorityRaw
    : "NORMAL";

  await tenantDb(organizationId, async (tx) => {
    let departmentId: string | null = null;

    if (departmentIdRaw) {
      const department = await tx.department.findFirst({
        where: {
          id: departmentIdRaw,
          organizationId,
        },
        select: { id: true },
      });
      departmentId = department?.id ?? null;
    }

    await tx.workOrder.create({
      data: {
        organizationId,
        title,
        description: description || null,
        departmentId,
        priority,
        assignedTo: assignedTo || null,
        status: "OPEN",
      },
    });
  });

  revalidatePath("/dashboard/work-orders");
  redirect("/dashboard/work-orders");
}

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<QueryParams>;
}) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }
  try {
    await requireAnyRole(
      ["SYSTEM_ADMIN", "CITY_ADMIN", "DEPARTMENT_ADMIN", "STAFF"],
      user,
    );
  } catch (error) {
    if (error instanceof RoleAccessError) {
      notFound();
    }
    throw error;
  }

  const organizationId = requireOrganization(session);
  const params = await searchParams;

  const status = STATUS_OPTIONS.includes(params.status as (typeof STATUS_OPTIONS)[number])
    ? params.status
    : "";
  const priority = PRIORITY_OPTIONS.includes(params.priority as (typeof PRIORITY_OPTIONS)[number])
    ? params.priority
    : "";
  const departmentId = params.departmentId?.trim() ?? "";

  const data = await tenantDb<{
    workOrders: WorkOrderRow[];
    departments: DepartmentOption[];
  }>(organizationId, async (tx) => {
    const where: Record<string, unknown> = { organizationId };

    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const [workOrders, departments] = await Promise.all([
      tx.workOrder.findMany({
        where,
        include: {
          department: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      tx.department.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return { workOrders, departments };
  });

  return (
    <div className="space-y-6">
      <Card title="5 Create Work Order Button">
        {params.error ? (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}
        <form action={createWorkOrder} className="grid gap-3 md:grid-cols-5">
          <input
            name="title"
            placeholder="Work order title"
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="description"
            placeholder="Description"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select name="priority" defaultValue="NORMAL" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {PRIORITY_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select name="departmentId" defaultValue="" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">No department</option>
            {data.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <input
            name="assignedTo"
            placeholder="Assigned to"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="md:col-span-5">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create Work Order
            </button>
          </div>
        </form>
      </Card>

      <Card title="2 Status Filter (OPEN / IN_PROGRESS / COMPLETE)">
        <form method="GET" className="grid gap-3 md:grid-cols-4">
          <select name="status" defaultValue={status} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select name="priority" defaultValue={priority} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select name="departmentId" defaultValue={departmentId} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All departments</option>
            {data.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Apply Filters
          </button>
        </form>
      </Card>

      <Card title="1 Work Order List">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Title</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Priority</th>
                <th className="py-2 pr-2">Department</th>
                <th className="py-2 pr-2">Assigned To</th>
                <th className="py-2">Created Date</th>
              </tr>
            </thead>
            <tbody>
              {data.workOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2">
                    <Link href={`/dashboard/work-orders/${order.id}`} className="text-blue-600 hover:underline">
                      {order.title}
                    </Link>
                  </td>
                  <td className="py-2 pr-2">{order.status}</td>
                  <td className="py-2 pr-2">{order.priority}</td>
                  <td className="py-2 pr-2">{order.department?.name ?? "-"}</td>
                  <td className="py-2 pr-2">{order.assignedTo ?? "-"}</td>
                  <td className="py-2">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {data.workOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-slate-500">
                    No work orders found for these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="3 Priority Filter">
        <p className="text-sm text-slate-600">Use the filter panel above to filter by priority.</p>
      </Card>

      <Card title="4 Department Filter">
        <p className="text-sm text-slate-600">Use the filter panel above to filter by department.</p>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { tenantDb } from "@/lib/tenantDb";

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "COMPLETE"] as const;
const PRIORITY_OPTIONS = ["LOW", "NORMAL", "MEDIUM", "HIGH", "URGENT"] as const;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

type WorkOrderDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  department: { id: string; name: string } | null;
  asset: { id: string; name: string; type: string } | null;
  issue: { id: string; title: string; category: string; status: string } | null;
};

function formatDate(value: Date | null | undefined): string {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleString();
}

export default async function WorkOrderDetailPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const organizationId = requireOrganization(session);
  const resolvedParams = await params;
  const query = await searchParams;

  const workOrder = await tenantDb<WorkOrderDetail | null>(organizationId, async (tx) => {
    return tx.workOrder.findFirst({
      where: {
        id: resolvedParams.id,
        organizationId,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
        asset: {
          select: { id: true, name: true, type: true },
        },
        issue: {
          select: { id: true, title: true, category: true, status: true },
        },
      },
    });
  });

  if (!workOrder) {
    notFound();
  }

  async function updateWorkOrder(formData: FormData) {
    "use server";

    const innerSession = await auth();
    if (!innerSession?.user) {
      notFound();
    }

    const innerOrganizationId = requireOrganization(innerSession);
    const id = String(formData.get("id") ?? "").trim();
    const statusRaw = String(formData.get("status") ?? "").trim();
    const priorityRaw = String(formData.get("priority") ?? "").trim();
    const assignedToRaw = String(formData.get("assignedTo") ?? "").trim();
    const estimatedCostRaw = String(formData.get("estimatedCost") ?? "").trim();
    const actualCostRaw = String(formData.get("actualCost") ?? "").trim();

    if (!id) {
      redirect(`/dashboard/work-orders/${resolvedParams.id}?error=Invalid%20work%20order`);
    }

    const status = STATUS_OPTIONS.includes(statusRaw as (typeof STATUS_OPTIONS)[number])
      ? statusRaw
      : "OPEN";
    const priority = PRIORITY_OPTIONS.includes(priorityRaw as (typeof PRIORITY_OPTIONS)[number])
      ? priorityRaw
      : "NORMAL";

    const estimatedCost = estimatedCostRaw ? Number(estimatedCostRaw) : null;
    const actualCost = actualCostRaw ? Number(actualCostRaw) : null;

    await tenantDb(innerOrganizationId, async (tx) => {
      const existing = await tx.workOrder.findFirst({
        where: {
          id,
          organizationId: innerOrganizationId,
        },
        select: { id: true, startedAt: true },
      });

      if (!existing) {
        throw new Error("Work order not found");
      }

      await tx.workOrder.update({
        where: { id: existing.id },
        data: {
          status,
          priority,
          assignedTo: assignedToRaw || null,
          estimatedCost,
          actualCost,
          startedAt: status === "IN_PROGRESS" ? existing.startedAt ?? new Date() : existing.startedAt,
          completedAt: status === "COMPLETE" ? new Date() : null,
        },
      });
    });

    revalidatePath(`/dashboard/work-orders/${resolvedParams.id}`);
    revalidatePath("/dashboard/work-orders");
    revalidatePath("/dashboard/operations");
    redirect(`/dashboard/work-orders/${resolvedParams.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/work-orders" className="text-sm text-blue-600 hover:underline">
          ← Back to Work Orders
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{workOrder.title}</h1>
      </div>

      {query.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {query.error}
        </div>
      ) : null}

      <Card title="Work Order Detail">
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <p>
            <span className="font-medium text-slate-900">title:</span> {workOrder.title}
          </p>
          <p>
            <span className="font-medium text-slate-900">description:</span> {workOrder.description ?? "-"}
          </p>
          <p>
            <span className="font-medium text-slate-900">status:</span> {workOrder.status}
          </p>
          <p>
            <span className="font-medium text-slate-900">priority:</span> {workOrder.priority}
          </p>
          <p>
            <span className="font-medium text-slate-900">department:</span> {workOrder.department?.name ?? "-"}
          </p>
          <p>
            <span className="font-medium text-slate-900">asset reference:</span>{" "}
            {workOrder.asset ? `${workOrder.asset.name} (${workOrder.asset.type})` : "-"}
          </p>
          <p>
            <span className="font-medium text-slate-900">linked issue:</span>{" "}
            {workOrder.issue ? `${workOrder.issue.title} [${workOrder.issue.status}]` : "-"}
          </p>
          <p>
            <span className="font-medium text-slate-900">assigned worker:</span> {workOrder.assignedTo ?? "-"}
          </p>
        </div>
      </Card>

      <Card title="timeline">
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <p>
            <span className="font-medium text-slate-900">Created:</span> {formatDate(workOrder.createdAt)}
          </p>
          <p>
            <span className="font-medium text-slate-900">Updated:</span> {formatDate(workOrder.updatedAt)}
          </p>
          <p>
            <span className="font-medium text-slate-900">Started:</span> {formatDate(workOrder.startedAt)}
          </p>
          <p>
            <span className="font-medium text-slate-900">Completed:</span> {formatDate(workOrder.completedAt)}
          </p>
        </div>
      </Card>

      <Card title="Update Work Order">
        <form action={updateWorkOrder} className="grid gap-3 md:grid-cols-3">
          <input type="hidden" name="id" value={workOrder.id} />

          <select name="status" defaultValue={workOrder.status} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            name="priority"
            defaultValue={workOrder.priority}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <input
            name="assignedTo"
            defaultValue={workOrder.assignedTo ?? ""}
            placeholder="Assigned worker"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <input
            name="estimatedCost"
            type="number"
            step="0.01"
            defaultValue={workOrder.estimatedCost ?? ""}
            placeholder="Estimated cost"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <input
            name="actualCost"
            type="number"
            step="0.01"
            defaultValue={workOrder.actualCost ?? ""}
            placeholder="Actual cost"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Save Updates
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

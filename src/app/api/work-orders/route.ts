import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { tenantDb } from "@/lib/tenantDb";

const ALLOWED_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETE"] as const;
const ALLOWED_PRIORITIES = ["LOW", "NORMAL", "MEDIUM", "HIGH", "URGENT"] as const;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const organizationId = requireOrganization(session);
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const departmentId = searchParams.get("departmentId") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));

  const where: Record<string, unknown> = { organizationId };
  if (status && ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
    where.status = status;
  }
  if (priority && ALLOWED_PRIORITIES.includes(priority as (typeof ALLOWED_PRIORITIES)[number])) {
    where.priority = priority;
  }
  if (departmentId) {
    where.departmentId = departmentId;
  }

  const result = await tenantDb(organizationId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.workOrder.findMany({
        where,
        include: {
          department: { select: { id: true, name: true } },
          asset: { select: { id: true, name: true, type: true } },
          issue: { select: { id: true, title: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      tx.workOrder.count({ where }),
    ]);

    return { items, total };
  });

  return NextResponse.json({
    data: result.items,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const organizationId = requireOrganization(session);
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    departmentId?: string;
    assetId?: string;
    issueId?: string;
    priority?: string;
    assignedTo?: string;
    estimatedCost?: number;
  };

  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const priority = ALLOWED_PRIORITIES.includes((body.priority ?? "") as (typeof ALLOWED_PRIORITIES)[number])
    ? String(body.priority)
    : "NORMAL";

  const created = await tenantDb(organizationId, async (tx) => {
    const departmentId = body.departmentId?.trim() || null;
    const assetId = body.assetId?.trim() || null;
    const issueId = body.issueId?.trim() || null;

    if (departmentId) {
      const validDepartment = await tx.department.findFirst({
        where: { id: departmentId, organizationId },
        select: { id: true },
      });
      if (!validDepartment) {
        throw new Error("Invalid department for organization");
      }
    }

    if (assetId) {
      const validAsset = await tx.asset.findFirst({
        where: { id: assetId, organizationId },
        select: { id: true },
      });
      if (!validAsset) {
        throw new Error("Invalid asset for organization");
      }
    }

    if (issueId) {
      const validIssue = await tx.issueReport.findFirst({
        where: { id: issueId, organizationId },
        select: { id: true },
      });
      if (!validIssue) {
        throw new Error("Invalid issue for organization");
      }
    }

    return tx.workOrder.create({
      data: {
        organizationId,
        title,
        description: body.description?.trim() || null,
        departmentId,
        assetId,
        issueId,
        priority,
        status: "OPEN",
        assignedTo: body.assignedTo?.trim() || null,
        estimatedCost: typeof body.estimatedCost === "number" ? body.estimatedCost : null,
      },
    });
  });

  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const organizationId = requireOrganization(session);
  const body = (await request.json()) as {
    id?: string;
    status?: string;
    assignedTo?: string | null;
    priority?: string;
    estimatedCost?: number | null;
    actualCost?: number | null;
  };

  const id = body.id?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.status && ALLOWED_STATUSES.includes(body.status as (typeof ALLOWED_STATUSES)[number])) {
    updates.status = body.status;
    updates.startedAt = body.status === "IN_PROGRESS" ? new Date() : undefined;
    updates.completedAt = body.status === "COMPLETE" ? new Date() : null;
  }

  if (body.priority && ALLOWED_PRIORITIES.includes(body.priority as (typeof ALLOWED_PRIORITIES)[number])) {
    updates.priority = body.priority;
  }

  if (body.assignedTo !== undefined) {
    updates.assignedTo = body.assignedTo ? body.assignedTo.trim() : null;
  }

  if (body.estimatedCost !== undefined) {
    updates.estimatedCost = typeof body.estimatedCost === "number" ? body.estimatedCost : null;
  }

  if (body.actualCost !== undefined) {
    updates.actualCost = typeof body.actualCost === "number" ? body.actualCost : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
  }

  const updated = await tenantDb(organizationId, async (tx) => {
    const existing = await tx.workOrder.findFirst({
      where: {
        id,
        organizationId,
      },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    return tx.workOrder.update({
      where: { id: existing.id },
      data: updates,
    });
  });

  if (!updated) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

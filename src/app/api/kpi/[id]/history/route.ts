import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requireApiScope } from "@/lib/auth/require-api-scope";
import { AuthError, requireStaff } from "@/lib/auth/require-staff";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Props) {
  let organizationId: string;

  try {
    const session = await auth();
    const user = session?.user;

    if (user) {
      const staff = await requireStaff();
      organizationId = staff.organizationId;
    } else {
      const token = await requireApiScope(request, "kpi:read");
      organizationId = token.organizationId;
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Authorization failed." }, { status: 500 });
  }

  const resolvedParams = await params;
  const from = new Date();
  from.setMonth(from.getMonth() - 24);

  const kpi = await db().kPI.findFirst({
    where: {
      id: resolvedParams.id,
      organizationId,
    },
    select: { id: true, name: true },
  });

  if (!kpi) {
    return NextResponse.json({ error: "KPI not found." }, { status: 404 });
  }

  const history = await db().kPIHistory.findMany({
    where: {
      kpiId: kpi.id,
      recordedAt: {
        gte: from,
      },
    },
    orderBy: { recordedAt: "asc" },
    select: {
      recordedAt: true,
      value: true,
    },
  });

  return NextResponse.json({
    kpiId: kpi.id,
    kpiName: kpi.name,
    points: history.map((entry) => ({
      date: entry.recordedAt.toISOString(),
      value: Number(entry.value),
    })),
  });
}

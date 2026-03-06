import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requireApiScope } from "@/lib/auth/require-api-scope";
import { db } from "@/lib/db";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError } from "@/lib/policies/base";
import { requireStaffUser } from "@/lib/security/authorization";
import { apiTokenTenantContext, runWithTenantContext } from "@/lib/tenant-context";

type Props = {
  params: Promise<{ id: string }>;
};

async function handleGet(request: Request, { params }: Props) {
  let organizationId: string;
  let apiTokenContext: ReturnType<typeof apiTokenTenantContext> | null = null;

  try {
    const session = await auth();
    const user = session?.user;

    if (user) {
      const staff = await requireStaffUser("VIEWER");
      organizationId = staff.organizationId;
    } else {
      const token = await requireApiScope(request, "kpi:read");
      organizationId = token.organizationId;
      apiTokenContext = apiTokenTenantContext(token);
    }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Authorization failed." }, { status: 500 });
  }

  const resolvedParams = await params;
  const from = new Date();
  from.setMonth(from.getMonth() - 24);

  const loadKpiHistory = async () => {
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
  };

  if (apiTokenContext) {
    return runWithTenantContext(apiTokenContext, loadKpiHistory);
  }

  return loadKpiHistory();
}

export const GET = withApiObservability("/api/kpi/[id]/history", "GET", handleGet);

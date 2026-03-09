import { z } from "zod";

import { apiError } from "@/lib/api/error-response";
import { getTenantDb } from "@/lib/db/tenantClient";
import { withApiObservability } from "@/lib/observability/http";
import { dataSourceSyncQueue } from "@/lib/queue";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

type Props = {
  params: Promise<{ id: string }>;
};

const dataSourceIdSchema = z.object({
  id: z.string().trim().min(1),
});

async function handlePost(_request: Request, { params }: Props) {
  try {
    const user = await requireStaffUser("VIEWER");
    const parsedParams = dataSourceIdSchema.safeParse(await params);
    if (!parsedParams.success) {
      return apiError("Invalid data source id.", 400);
    }

    if (!dataSourceSyncQueue) {
      return apiError("Data source sync queue is not configured.", 503);
    }

    const { id } = parsedParams.data;
    const source = await getTenantDb(user.organizationId, async (tx) =>
      tx.dataSource.findFirst({
        where: {
          id,
          organizationId: user.organizationId,
        },
        select: { id: true },
      }),
    );

    if (!source) {
      return apiError("Data source not found.", 404);
    }

    const job = await dataSourceSyncQueue.add("run-data-source-sync-worker", {
      dataSourceId: id,
    });

    return Response.json({
      success: true,
      jobId: String(job.id),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to trigger data source sync.", 500);
  }
}

export const POST = withApiObservability("/api/datasources/[id]/sync", "POST", handlePost);

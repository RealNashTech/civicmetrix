import { z } from "zod";

import { apiError } from "@/lib/api/error-response";
import { getTenantDb } from "@/lib/db/tenantClient";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

type Props = {
  params: Promise<{ id: string }>;
};

const dataSourceIdSchema = z.object({
  id: z.string().trim().min(1),
});

async function handleDelete(_request: Request, { params }: Props) {
  try {
    const user = await requireStaffUser("VIEWER");
    const parsedParams = dataSourceIdSchema.safeParse(await params);
    if (!parsedParams.success) {
      return apiError("Invalid data source id.", 400);
    }

    const { id } = parsedParams.data;
    const deleted = await getTenantDb(user.organizationId, async (tx) =>
      tx.dataSource.deleteMany({
        where: {
          id,
          organizationId: user.organizationId,
        },
      }),
    );

    if (deleted.count === 0) {
      return apiError("Data source not found.", 404);
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to delete data source.", 500);
  }
}

export const DELETE = withApiObservability("/api/datasources/[id]", "DELETE", handleDelete);

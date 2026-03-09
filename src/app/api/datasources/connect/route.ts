import { z } from "zod";

import { apiError } from "@/lib/api/error-response";
import { getTenantDb } from "@/lib/db/tenantClient";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

const connectDataSourceSchema = z.object({
  type: z.enum(["GOOGLE_SHEETS", "MICROSOFT_EXCEL"]),
  datasetType: z.string().min(1),
  name: z.string().trim().min(1),
  externalId: z.string().trim().min(1),
  sheetName: z.string().optional(),
  range: z.string().optional(),
  columnMapping: z.record(z.string()).optional(),
});

async function handlePost(request: Request) {
  try {
    const user = await requireStaffUser("VIEWER");
    const body = await request.json();
    const parsed = connectDataSourceSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid request body.", 400);
    }

    const created = await getTenantDb(user.organizationId, async (tx) =>
      tx.dataSource.create({
        data: {
          organizationId: user.organizationId,
          type: parsed.data.type,
          datasetType: parsed.data.datasetType,
          name: parsed.data.name,
          externalId: parsed.data.externalId,
          sheetName: parsed.data.sheetName,
          range: parsed.data.range,
          columnMapping: parsed.data.columnMapping,
        },
        select: {
          id: true,
          type: true,
          name: true,
        },
      }),
    );

    return Response.json({
      success: true,
      dataSource: created,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to connect data source.", 500);
  }
}

export const POST = withApiObservability("/api/datasources/connect", "POST", handlePost);

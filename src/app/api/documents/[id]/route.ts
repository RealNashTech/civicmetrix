import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { z } from "zod";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { apiError } from "@/lib/api/error-response";
import { withApiObservability } from "@/lib/observability/http";
import { assertDocumentTenantAccess, requireStaffDocumentAccess } from "@/lib/policies/documents";
import { AuthorizationError } from "@/lib/security/authorization";

type Props = {
  params: Promise<{ id: string }>;
};
const documentIdSchema = z.object({ id: z.string().min(1) });

async function handleGet(_request: Request, { params }: Props) {
  try {
    const user = await requireStaffDocumentAccess();
    const parsedParams = documentIdSchema.safeParse(await params);
    if (!parsedParams.success) {
      return apiError("Invalid document id.", 400);
    }
    const { id } = parsedParams.data;
    const document = await db().document.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        type: true,
        organizationId: true,
      },
    });

    if (!document) {
      return apiError("Document not found.", 404);
    }

    assertDocumentTenantAccess(user, document.organizationId);

    const safeFilePath = path.join(process.cwd(), "data", "uploads", document.fileUrl);
    try {
      await stat(safeFilePath);
    } catch {
      return apiError("Stored file not found.", 404);
    }

    const nodeStream = createReadStream(safeFilePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": document.type,
        "Content-Disposition": `inline; filename="${document.name.replace(/"/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Document access failed.", 500);
  }
}

export const GET = withApiObservability("/api/documents/[id]", "GET", handleGet);

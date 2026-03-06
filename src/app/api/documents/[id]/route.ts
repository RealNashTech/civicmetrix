import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { withApiObservability } from "@/lib/observability/http";
import { assertDocumentTenantAccess, requireStaffDocumentAccess } from "@/lib/policies/documents";
import { AuthorizationError } from "@/lib/security/authorization";

type Props = {
  params: Promise<{ id: string }>;
};

async function handleGet(_request: Request, { params }: Props) {
  try {
    const user = await requireStaffDocumentAccess();
    const { id } = await params;
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
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    assertDocumentTenantAccess(user, document.organizationId);

    const safeFilePath = path.join(process.cwd(), "data", "uploads", document.fileUrl);
    try {
      await stat(safeFilePath);
    } catch {
      return NextResponse.json({ error: "Stored file not found." }, { status: 404 });
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
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Document access failed." }, { status: 500 });
  }
}

export const GET = withApiObservability("/api/documents/[id]", "GET", handleGet);

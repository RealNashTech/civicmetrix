import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { withApiObservability } from "@/lib/observability/http";
import { requireStaffDocumentAccess } from "@/lib/policies/documents";
import { AuthorizationError } from "@/lib/security/authorization";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["application/pdf", ".pdf"],
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

async function handlePost(request: Request) {
  try {
    await enforceRateLimit("file upload", request);

    const user = await requireStaffDocumentAccess();

    const formData = await request.formData();
    const file = formData.get("file");
    const name = String(formData.get("name") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim();
    const entityType = String(formData.get("entityType") ?? "").trim();
    const entityId = String(formData.get("entityId") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required." }, { status: 400 });
    }

    const extension = ALLOWED_MIME_TYPES.get(file.type);
    if (!extension) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds 10MB size limit." }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "data", "uploads", user.organizationId);
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${randomUUID()}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    await pipeline(
      Readable.fromWeb(file.stream() as unknown as NodeReadableStream),
      createWriteStream(filePath, { flags: "wx" }),
    );

    const storageKey = `${user.organizationId}/${fileName}`;

    const created = await db().document.create({
      data: {
        organizationId: user.organizationId,
        name,
        fileUrl: storageKey,
        type,
        entityType: entityType || null,
        entityId: entityId || null,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json(
      {
        fileId: created.id,
        fileUrl: `/api/documents/${created.id}`,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}

export const POST = withApiObservability("/api/documents/upload", "POST", handlePost);

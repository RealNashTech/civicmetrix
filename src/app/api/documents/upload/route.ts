import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { z } from "zod";

import { db } from "@/lib/db";
import { apiError } from "@/lib/api/error-response";
import { apiSuccess } from "@/lib/api/success-response";
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
const uploadInputSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

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
      return apiError("Missing file.", 400);
    }
    const parsedInput = uploadInputSchema.safeParse({
      name,
      type,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
    });
    if (!parsedInput.success) {
      return apiError("Name and type are required.", 400);
    }

    const extension = ALLOWED_MIME_TYPES.get(file.type);
    if (!extension) {
      return apiError("Unsupported file type.", 400);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return apiError("File exceeds 10MB size limit.", 400);
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

    return apiSuccess(
      {
        fileId: created.id,
        fileUrl: `/api/documents/${created.id}`,
      },
      201,
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Upload failed.", 500);
  }
}

export const POST = withApiObservability("/api/documents/upload", "POST", handlePost);

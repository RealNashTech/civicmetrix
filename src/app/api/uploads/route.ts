import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { mkdir, unlink } from "fs/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

import { apiError } from "@/lib/api/error-response";
import prisma from "@/lib/prisma";
import { withApiObservability } from "@/lib/observability/http";
import { logger } from "@/lib/observability/logger";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";
import { autoMapColumns } from "@/lib/uploads/autoMapColumns";
import { detectUploadFileType, parseUploadFile } from "@/lib/uploads/parser";
import { suggestTemplates } from "@/lib/uploads/templates";
import { UploadValidationError, validateUpload } from "@/lib/uploads/validateUpload";

const UPLOAD_DIR = "/tmp/uploads";
const ALLOWED_EXTENSIONS = new Set([".xlsx", ".csv", ".ods"]);

async function handlePost(request: Request) {
  let tempFilePath: string | null = null;

  try {
    const user = await requireStaffUser("VIEWER");

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return apiError("Content-Type must be multipart/form-data.", 400);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiError("Missing file.", 400);
    }
    const requestedDatasetType = String(
      formData.get("datasetType") ?? formData.get("entityType") ?? "InfrastructureAsset",
    ).trim();
    const datasetType = requestedDatasetType || "InfrastructureAsset";

    const detectedType = detectUploadFileType(file.name, file.type);
    const extension = path.extname(file.name).toLowerCase();
    if (!detectedType || !ALLOWED_EXTENSIONS.has(extension)) {
      return apiError("Unsupported file type. Allowed: .xlsx, .csv, .ods.", 400);
    }

    const fileName = `${randomUUID()}${extension}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    tempFilePath = path.join(UPLOAD_DIR, fileName);

    await pipeline(
      Readable.fromWeb(file.stream() as unknown as NodeReadableStream),
      createWriteStream(tempFilePath, { flags: "wx" }),
    );

    const parsed = await parseUploadFile(tempFilePath, detectedType);
    const previewRows = parsed.rows.slice(0, 20);
    const autoMappings = autoMapColumns(datasetType, parsed.columns);
    const templates = await prisma.uploadMappingTemplate.findMany({
      where: {
        organizationId: user.organizationId,
        datasetType,
      },
      select: {
        id: true,
        templateName: true,
        entityType: true,
        datasetType: true,
        mappingJSON: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const suggestedTemplates = suggestTemplates(parsed.columns, templates);
    validateUpload({
      fileSizeBytes: file.size,
      rowCount: parsed.rows.length,
    });

    logger.info("upload_parsed", {
      component: "upload-api",
      organizationId: user.organizationId,
      fileType: detectedType,
      rowCount: parsed.rows.length,
    });

    return Response.json({
      success: true,
      detectedColumns: parsed.columns,
      previewRows,
      rowCount: parsed.rows.length,
      datasetType,
      suggestedTemplates,
      autoMappings,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    if (error instanceof UploadValidationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Upload processing failed.", 500);
  } finally {
    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => undefined);
    }
  }
}

export const POST = withApiObservability("/api/uploads", "POST", handlePost);

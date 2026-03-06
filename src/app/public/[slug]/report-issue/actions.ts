"use server";

import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { createAuditLog } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { createEvent } from "@/lib/events";
import { db } from "@/lib/db";
import { AuthorizationError } from "@/lib/policies/base";
import { rateLimit } from "@/middleware/rate-limit";

type CreateIssueReportInput = {
  slug: string;
  formData: FormData;
};

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["application/pdf", ".pdf"],
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function createIssueReport({ slug, formData }: CreateIssueReportInput) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const requestIp = forwardedFor?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "unknown";

  try {
    await rateLimit(requestIp);
  } catch (error) {
    if (
      (error instanceof AuthorizationError && error.status === 429) ||
      (error instanceof Error && error.message === "Rate limit exceeded")
    ) {
      throw new Error("Too many issue submissions. Please try again shortly.");
    }
    throw error;
  }

  const session = await auth();
  const signedInUser = session?.user;

  const organization = await db().organization.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!organization) {
    notFound();
  }

  const reporterName = String(formData.get("reporterName") ?? "").trim();
  const reporterEmail = String(formData.get("reporterEmail") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const rawDepartmentId = String(formData.get("departmentId") ?? "").trim();
  const rawAssetId = String(formData.get("assetId") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const rawLatitude = String(formData.get("latitude") ?? "").trim();
  const rawLongitude = String(formData.get("longitude") ?? "").trim();
  const photo = formData.get("photo");
  const latitude = rawLatitude ? Number.parseFloat(rawLatitude) : null;
  const longitude = rawLongitude ? Number.parseFloat(rawLongitude) : null;

  if ((latitude !== null && Number.isNaN(latitude)) || (longitude !== null && Number.isNaN(longitude))) {
    throw new Error("Invalid coordinates.");
  }

  if (!title || !description || !category) {
    throw new Error("Missing required issue fields.");
  }

  let departmentId: string | null = null;
  if (rawDepartmentId) {
    const department = await db().department.findFirst({
      where: {
        id: rawDepartmentId,
        organizationId: organization.id,
      },
      select: { id: true },
    });

    if (!department) {
      throw new Error("Invalid department.");
    }

    departmentId = department.id;
  }

  let assetId: string | null = null;
  if (rawAssetId) {
    const asset = await db().asset.findFirst({
      where: {
        id: rawAssetId,
        organizationId: organization.id,
      },
      select: { id: true },
    });

    if (!asset) {
      throw new Error("Invalid asset.");
    }

    assetId = asset.id;
  }

  let photoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const extension = ALLOWED_MIME_TYPES.get(photo.type);
    if (!extension) {
      throw new Error("Unsupported photo type.");
    }
    if (photo.size > MAX_FILE_SIZE_BYTES) {
      throw new Error("Photo exceeds 10MB size limit.");
    }

    const uploadDir = path.join(process.cwd(), "data", "uploads", organization.id);
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${randomUUID()}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    await pipeline(
      Readable.fromWeb(photo.stream() as unknown as NodeReadableStream),
      createWriteStream(filePath, { flags: "wx" }),
    );

    const document = await db().document.create({
      data: {
        organizationId: organization.id,
        name: photo.name,
        fileUrl: `${organization.id}/${fileName}`,
        type: photo.type,
        entityType: "IssueReport",
        uploadedBy: signedInUser?.id ?? "public",
      },
      select: {
        id: true,
      },
    });

    photoUrl = `/api/documents/${document.id}`;
  }

  let citizenId: string | null = null;
  if (
    signedInUser?.userType === "citizen" &&
    signedInUser.citizenId &&
    signedInUser.organizationId === organization.id
  ) {
    citizenId = signedInUser.citizenId;
  }

  const issue = await db().$transaction(async (tx) => {
    const created = await tx.issueReport.create({
      data: {
        organizationId: organization.id,
        departmentId,
        citizenId,
        title,
        description,
        category,
        reporterEmail: reporterEmail || signedInUser?.email || null,
        reporterName: reporterName || signedInUser?.name || null,
        assetId,
        address: address || null,
        latitude,
        longitude,
        photoUrl,
      },
    });

    if (latitude !== null && longitude !== null) {
      await tx.$executeRaw`
        UPDATE "IssueReport"
        SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
        WHERE "id" = ${created.id}
      `;
    }

    return created;
  });

  await createEvent({
    organizationId: organization.id,
    type: "ISSUE_REPORT_CREATE",
    entityType: "ISSUE_REPORT",
    entityId: issue.id,
    payload: {
      category: issue.category,
      priority: issue.priority,
      departmentId: issue.departmentId,
      assetId: issue.assetId,
    },
  });

  await db().alert.create({
    data: {
      organizationId: organization.id,
      departmentId,
      title: `Issue reported: ${title}`,
      message: `Category: ${category}`,
      severity: "INFO",
    },
  });

  await createAuditLog({
    action: "ISSUE_REPORTED",
    entityType: "IssueReport",
    entityId: issue.id,
    userId: "public",
    organizationId: organization.id,
  });

  revalidatePath(`/public/${slug}`);
  revalidatePath(`/public/${slug}/programs`);
  revalidatePath("/dashboard/issues");
  revalidatePath("/dashboard/command-center");
  revalidatePath("/dashboard/executive");
  revalidatePath("/dashboard/alerts");
}

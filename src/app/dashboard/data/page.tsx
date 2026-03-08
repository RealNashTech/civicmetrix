import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { tenantDb } from "@/lib/tenantDb";

const DATASET_TYPES = [
  "Infrastructure Assets",
  "Grant Records",
  "Civic Issues",
  "KPI Metrics",
  "GIS Layers",
] as const;

const FILE_FORMATS = ["CSV", "Excel", "GeoJSON", "Shapefile"] as const;

type ImportHistoryRow = {
  id: string;
  type: string;
  createdAt: Date;
  processed: boolean;
  processedAt: Date | null;
  payload: unknown;
};

type ValidationErrorRow = {
  id: string;
  createdAt: Date;
  payload: unknown;
};

type ImportData = {
  organizationName: string;
  history: ImportHistoryRow[];
  validationEvents: ValidationErrorRow[];
};

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatDate(date: Date | null | undefined): string {
  if (!date) {
    return "N/A";
  }
  return new Date(date).toLocaleString();
}

function payloadField(payload: unknown, key: string): string {
  if (!isJsonRecord(payload)) {
    return "N/A";
  }
  const value = payload[key];
  if (typeof value !== "string") {
    return "N/A";
  }
  return value;
}

function payloadErrors(payload: unknown): Array<{ row: string; field: string; message: string }> {
  if (!isJsonRecord(payload)) {
    return [];
  }

  const rawErrors = payload.errors;
  if (!Array.isArray(rawErrors)) {
    return [];
  }

  return rawErrors
    .map((entry) => {
      if (!isJsonRecord(entry)) {
        return null;
      }
      const row = typeof entry.row === "number" ? String(entry.row) : "N/A";
      const field = typeof entry.field === "string" ? entry.field : "N/A";
      const message = typeof entry.message === "string" ? entry.message : "Unknown validation error";
      return { row, field, message };
    })
    .filter((entry): entry is { row: string; field: string; message: string } => Boolean(entry));
}

async function createImportRequest(formData: FormData) {
  "use server";

  const session = await auth();
  const user = session?.user;
  if (!user) {
    notFound();
  }
  if (user.role !== "ADMIN") {
    notFound();
  }

  const organizationId = requireOrganization(session);
  const formOrganizationId = String(formData.get("organizationId") ?? "");
  if (formOrganizationId !== organizationId) {
    redirect("/dashboard/data?error=Invalid%20organization%20context");
  }

  const datasetType = String(formData.get("datasetType") ?? "");
  const fileFormat = String(formData.get("fileFormat") ?? "");
  const uploadedFile = formData.get("datasetFile");

  if (!DATASET_TYPES.includes(datasetType as (typeof DATASET_TYPES)[number])) {
    redirect("/dashboard/data?error=Invalid%20dataset%20type");
  }

  if (!FILE_FORMATS.includes(fileFormat as (typeof FILE_FORMATS)[number])) {
    redirect("/dashboard/data?error=Invalid%20file%20format");
  }

  if (!(uploadedFile instanceof File) || uploadedFile.size === 0) {
    redirect("/dashboard/data?error=Dataset%20file%20is%20required");
  }

  const importId = randomUUID();
  const safeFileName = uploadedFile.name.replace(/\s+/g, "_");
  const fileUrl = `/imports/${organizationId}/${importId}/${safeFileName}`;

  await tenantDb(organizationId, async (tx) => {
    const document = await tx.document.create({
      data: {
        organizationId,
        name: uploadedFile.name,
        fileUrl,
        type: fileFormat,
        entityType: "DATA_IMPORT",
        uploadedBy: user.email ?? user.id,
      },
      select: {
        id: true,
      },
    });

    await tx.event.create({
      data: {
        organizationId,
        type: "DATA_IMPORT_REQUESTED",
        entityType: "DATA_IMPORT",
        entityId: importId,
        processed: false,
        payload: {
          importId,
          datasetType,
          fileFormat,
          fileName: uploadedFile.name,
          documentId: document.id,
          status: "QUEUED",
          validationErrors: [],
        },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId: user.id,
        action: "DATA_IMPORT_REQUESTED",
        entityType: "DATA_IMPORT",
        entityId: importId,
      },
    });
  });

  revalidatePath("/dashboard/data");
  redirect("/dashboard/data?success=Dataset%20upload%20queued");
}

export default async function DataUploadCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    return null;
  }
  if (user.role !== "ADMIN") {
    notFound();
  }

  const organizationId = requireOrganization(session);
  const query = await searchParams;

  const data = await tenantDb<ImportData>(organizationId, async (tx) => {
    const [organization, history, validationEvents] = await Promise.all([
      tx.organization.findFirst({
        where: { id: organizationId },
        select: {
          name: true,
        },
      }),
      tx.event.findMany({
        where: {
          organizationId,
          type: {
            startsWith: "DATA_IMPORT",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 25,
        select: {
          id: true,
          type: true,
          createdAt: true,
          processed: true,
          processedAt: true,
          payload: true,
        },
      }),
      tx.event.findMany({
        where: {
          organizationId,
          type: "DATA_IMPORT_VALIDATION_FAILED",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 25,
        select: {
          id: true,
          createdAt: true,
          payload: true,
        },
      }),
    ]);

    return {
      organizationName: organization?.name ?? "Organization",
      history,
      validationEvents,
    };
  });

  const queuedCount = data.history.filter(
    (event) => payloadField(event.payload, "status") === "QUEUED",
  ).length;
  const runningCount = data.history.filter(
    (event) => payloadField(event.payload, "status") === "RUNNING",
  ).length;
  const completedCount = data.history.filter(
    (event) => payloadField(event.payload, "status") === "COMPLETED",
  ).length;
  const failedCount = data.history.filter(
    (event) =>
      payloadField(event.payload, "status") === "FAILED" ||
      payloadField(event.payload, "status") === "VALIDATION_FAILED",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">CivicMetrix Data Upload Center</h1>
        <p className="text-sm text-slate-600">
          Tenant-safe ingestion for municipal datasets in {data.organizationName}.
        </p>
      </div>

      {query.success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {query.success}
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {query.error}
        </div>
      ) : null}

      <Card title="1 Upload Dataset">
        <form action={createImportRequest} className="space-y-4">
          <input type="hidden" name="organizationId" value={organizationId} />

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">2 Dataset Type Selector</h3>
            <select
              name="datasetType"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              required
            >
              <option value="">Select dataset type</option>
              {DATASET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">Supported File Formats</h3>
            <select
              name="fileFormat"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              required
            >
              <option value="">Select file format</option>
              {FILE_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900">3 File Upload Input</h3>
            <input
              type="file"
              name="datasetFile"
              accept=".csv,.xlsx,.geojson,.json,.zip"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
              required
            />
            <p className="text-xs text-slate-500">CSV, Excel, GeoJSON, and Shapefile (.zip) are supported.</p>
          </div>

          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Queue Import
          </button>
        </form>
      </Card>

      <Card title="4 Import History Table">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Import ID</th>
                <th className="py-2 pr-2">Dataset Type</th>
                <th className="py-2 pr-2">File Name</th>
                <th className="py-2 pr-2">Format</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((event) => (
                <tr key={event.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 font-mono text-xs">
                    {payloadField(event.payload, "importId")}
                  </td>
                  <td className="py-2 pr-2">{payloadField(event.payload, "datasetType")}</td>
                  <td className="py-2 pr-2">{payloadField(event.payload, "fileName")}</td>
                  <td className="py-2 pr-2">{payloadField(event.payload, "fileFormat")}</td>
                  <td className="py-2 pr-2">{payloadField(event.payload, "status")}</td>
                  <td className="py-2">{formatDate(event.createdAt)}</td>
                </tr>
              ))}
              {data.history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-slate-500">
                    No import history found for this organization.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="5 Import Status">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Queued</p>
            <p className="text-2xl font-semibold text-slate-900">{queuedCount}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Running</p>
            <p className="text-2xl font-semibold text-slate-900">{runningCount}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Completed</p>
            <p className="text-2xl font-semibold text-slate-900">{completedCount}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Failed</p>
            <p className="text-2xl font-semibold text-slate-900">{failedCount}</p>
          </div>
        </div>
      </Card>

      <Card title="6 Validation Errors">
        <div className="space-y-4">
          {data.validationEvents.map((event) => {
            const errors = payloadErrors(event.payload);
            return (
              <div key={event.id} className="rounded-md border border-red-200 bg-red-50 p-4">
                <p className="text-xs text-red-700">
                  Import {payloadField(event.payload, "importId")} at {formatDate(event.createdAt)}
                </p>
                {errors.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-red-900">
                    {errors.map((error, index) => (
                      <li key={`${event.id}-${index}`}>
                        Row {error.row} | {error.field} | {error.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-red-900">
                    Validation failed, but no row-level details were attached.
                  </p>
                )}
              </div>
            );
          })}
          {data.validationEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No validation errors found.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

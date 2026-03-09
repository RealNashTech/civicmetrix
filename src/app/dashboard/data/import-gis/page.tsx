import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { hasAnyRole } from "@/lib/permissions";
import { importGisDataset, type GisFieldMapping, type GisTargetEntity } from "@/services/gis-import-service";

import { GisImportClient } from "./gis-import-client";

const ALLOWED_TARGETS: GisTargetEntity[] = [
  "ASSET",
  "ISSUE_REPORT",
  "DEPARTMENT_BOUNDARIES",
  "PROGRAM_SERVICE_AREAS",
];

async function importGisAction(formData: FormData) {
  "use server";

  const session = await auth();
  const user = session?.user;

  if (!user || !hasAnyRole(user, ["SYSTEM_ADMIN", "CITY_ADMIN", "DEPARTMENT_ADMIN"])) {
    notFound();
  }

  const organizationId = requireOrganization(session);

  const file = formData.get("gisFile");
  const targetRaw = String(formData.get("target") ?? "ASSET").trim().toUpperCase();
  const target: GisTargetEntity = ALLOWED_TARGETS.includes(targetRaw as GisTargetEntity)
    ? (targetRaw as GisTargetEntity)
    : "ASSET";

  if (!(file instanceof File) || file.size === 0) {
    redirect("/dashboard/data/import-gis?error=GIS%20file%20is%20required");
  }

  const mapping: GisFieldMapping = {
    nameField: String(formData.get("nameField") ?? "").trim() || undefined,
    descriptionField: String(formData.get("descriptionField") ?? "").trim() || undefined,
    categoryField: String(formData.get("categoryField") ?? "").trim() || undefined,
    statusField: String(formData.get("statusField") ?? "").trim() || undefined,
    latitudeField: String(formData.get("latitudeField") ?? "").trim() || undefined,
    longitudeField: String(formData.get("longitudeField") ?? "").trim() || undefined,
    conditionField: String(formData.get("conditionField") ?? "").trim() || undefined,
    departmentField: String(formData.get("departmentField") ?? "").trim() || undefined,
    programField: String(formData.get("programField") ?? "").trim() || undefined,
  };

  try {
    const result = await importGisDataset(organizationId, file, target, mapping);

    revalidatePath("/dashboard/data/import-gis");
    revalidatePath("/dashboard/data");
    revalidatePath("/dashboard/command-center");
    redirect(
      `/dashboard/data/import-gis?success=Imported%20${result.createdCount}%20records%20(${result.skippedCount}%20skipped)%20into%20${result.target}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "GIS import failed";
    redirect(`/dashboard/data/import-gis?error=${encodeURIComponent(message)}`);
  }
}

export default async function ImportGisPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  if (!hasAnyRole(user, ["SYSTEM_ADMIN", "CITY_ADMIN", "DEPARTMENT_ADMIN"])) {
    notFound();
  }

  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Municipal GIS Data Connector</h1>
        <p className="text-sm text-slate-600">
          Import tenant GIS datasets (GeoJSON, Shapefile ZIP, CSV lat/lng) and map features to CivicMetrix entities.
        </p>
      </div>

      {params.success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {params.success}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {params.error}
        </div>
      ) : null}

      <Card title="GIS Import">
        <GisImportClient action={importGisAction} />
      </Card>
    </div>
  );
}

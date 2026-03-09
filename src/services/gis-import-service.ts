import { tenantDb } from "@/lib/tenantDb";

export type GisFormat = "GEOJSON" | "SHAPEFILE_ZIP" | "CSV";

export type GisTargetEntity =
  | "ASSET"
  | "ISSUE_REPORT"
  | "DEPARTMENT_BOUNDARIES"
  | "PROGRAM_SERVICE_AREAS";

export type GisFieldMapping = {
  nameField?: string;
  descriptionField?: string;
  categoryField?: string;
  statusField?: string;
  latitudeField?: string;
  longitudeField?: string;
  conditionField?: string;
  departmentField?: string;
  programField?: string;
};

type ParsedFeature = {
  properties: Record<string, string | number | boolean | null>;
  geometry: unknown | null;
  latitude: number | null;
  longitude: number | null;
};

export type GisPreviewResult = {
  format: GisFormat;
  fields: string[];
  preview: Array<Record<string, string | number | boolean | null>>;
  featureCount: number;
};

export type GisImportResult = {
  format: GisFormat;
  target: GisTargetEntity;
  createdCount: number;
  skippedCount: number;
};

function normalizeCoordinates(latitudeRaw: unknown, longitudeRaw: unknown) {
  const parsedLatitude = Number(latitudeRaw);
  const parsedLongitude = Number(longitudeRaw);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return { latitude: null, longitude: null };
  }

  let latitude = parsedLatitude;
  let longitude = parsedLongitude;

  // Handle likely swapped coordinates.
  if (Math.abs(latitude) > 90 && Math.abs(longitude) <= 90) {
    const nextLatitude = longitude;
    const nextLongitude = latitude;
    latitude = nextLatitude;
    longitude = nextLongitude;
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return { latitude: null, longitude: null };
  }

  return { latitude, longitude };
}

function detectGisFormat(fileName: string, mimeType?: string | null): GisFormat {
  const lowerName = fileName.toLowerCase();
  const lowerMime = (mimeType ?? "").toLowerCase();

  if (lowerName.endsWith(".geojson") || lowerName.endsWith(".json") || lowerMime.includes("geo+json")) {
    return "GEOJSON";
  }

  if (lowerName.endsWith(".zip") || lowerMime.includes("zip")) {
    return "SHAPEFILE_ZIP";
  }

  if (lowerName.endsWith(".csv") || lowerMime.includes("csv") || lowerMime.includes("text/plain")) {
    return "CSV";
  }

  throw new Error("Unsupported GIS file format. Use GeoJSON, Shapefile ZIP, or CSV.");
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text: string): ParsedFeature[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const features: ParsedFeature[] = [];

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const rowValues = parseCsvLine(lines[rowIndex]);
    const properties: Record<string, string | number | boolean | null> = {};

    for (let i = 0; i < headers.length; i += 1) {
      const key = headers[i];
      const rawValue = rowValues[i] ?? "";
      properties[key] = rawValue;
    }

    const latRaw =
      properties.latitude ??
      properties.lat ??
      properties.Latitude ??
      properties.LATITUDE ??
      null;
    const lonRaw =
      properties.longitude ??
      properties.lng ??
      properties.lon ??
      properties.Longitude ??
      properties.LONGITUDE ??
      null;

    const normalized = normalizeCoordinates(latRaw, lonRaw);

    features.push({
      properties,
      geometry: null,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
    });
  }

  return features;
}

function getPointFromGeometry(geometry: unknown): { latitude: number | null; longitude: number | null } {
  if (!geometry || typeof geometry !== "object" || Array.isArray(geometry)) {
    return { latitude: null, longitude: null };
  }

  const record = geometry as Record<string, unknown>;
  const type = String(record.type ?? "");
  const coordinates = record.coordinates;

  if (type === "Point" && Array.isArray(coordinates) && coordinates.length >= 2) {
    const [longitude, latitude] = coordinates;
    return normalizeCoordinates(latitude, longitude);
  }

  const flattened: number[][] = [];

  function collectCoordinates(value: unknown) {
    if (!Array.isArray(value)) {
      return;
    }

    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      flattened.push([Number(value[0]), Number(value[1])]);
      return;
    }

    for (const nested of value) {
      collectCoordinates(nested);
    }
  }

  collectCoordinates(coordinates);

  if (flattened.length === 0) {
    return { latitude: null, longitude: null };
  }

  const longitudeAvg = flattened.reduce((sum, pair) => sum + pair[0], 0) / flattened.length;
  const latitudeAvg = flattened.reduce((sum, pair) => sum + pair[1], 0) / flattened.length;

  return normalizeCoordinates(latitudeAvg, longitudeAvg);
}

function parseGeoJson(text: string): ParsedFeature[] {
  const parsed = JSON.parse(text) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid GeoJSON payload.");
  }

  const root = parsed as Record<string, unknown>;
  const featuresRaw = Array.isArray(root.features) ? root.features : [];

  const features: ParsedFeature[] = [];

  for (const feature of featuresRaw) {
    if (!feature || typeof feature !== "object" || Array.isArray(feature)) {
      continue;
    }

    const item = feature as Record<string, unknown>;
    const propertiesRaw = item.properties;
    const properties: Record<string, string | number | boolean | null> = {};

    if (propertiesRaw && typeof propertiesRaw === "object" && !Array.isArray(propertiesRaw)) {
      for (const [key, value] of Object.entries(propertiesRaw as Record<string, unknown>)) {
        if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          properties[key] = value ?? null;
        } else {
          properties[key] = JSON.stringify(value);
        }
      }
    }

    const geometry = item.geometry ?? null;
    const point = getPointFromGeometry(geometry);

    features.push({
      properties,
      geometry,
      latitude: point.latitude,
      longitude: point.longitude,
    });
  }

  return features;
}

async function parseFeatures(file: File, format: GisFormat): Promise<ParsedFeature[]> {
  if (format === "SHAPEFILE_ZIP") {
    throw new Error(
      "Shapefile ZIP parsing is not available in this runtime. Convert to GeoJSON or CSV and retry.",
    );
  }

  const text = await file.text();

  if (format === "CSV") {
    return parseCsv(text);
  }

  return parseGeoJson(text);
}

function collectFields(features: ParsedFeature[]): string[] {
  const fieldSet = new Set<string>();

  for (const feature of features) {
    for (const key of Object.keys(feature.properties)) {
      fieldSet.add(key);
    }
  }

  return Array.from(fieldSet).sort((a, b) => a.localeCompare(b));
}

function getMappedValue(
  properties: Record<string, string | number | boolean | null>,
  key: string | undefined,
): string | null {
  if (!key) {
    return null;
  }

  const raw = properties[key];
  if (raw == null) {
    return null;
  }

  const normalized = String(raw).trim();
  return normalized.length > 0 ? normalized : null;
}

export async function previewGisDataset(file: File): Promise<GisPreviewResult> {
  const format = detectGisFormat(file.name, file.type);
  const features = await parseFeatures(file, format);
  const fields = collectFields(features);

  const preview = features.slice(0, 10).map((feature) => ({
    ...feature.properties,
    __latitude: feature.latitude,
    __longitude: feature.longitude,
  }));

  return {
    format,
    fields,
    preview,
    featureCount: features.length,
  };
}

export async function importGisDataset(
  organizationId: string,
  file: File,
  target: GisTargetEntity,
  mapping: GisFieldMapping,
): Promise<GisImportResult> {
  const format = detectGisFormat(file.name, file.type);
  const features = await parseFeatures(file, format);

  return tenantDb<GisImportResult>(organizationId, async (tx) => {
    const departments = await tx.department.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });
    const programs = await tx.program.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });

    const departmentByName = new Map(
      (departments as Array<{ id: string; name: string }>).map((item) => [item.name.toLowerCase(), item.id]),
    );
    const programByName = new Map(
      (programs as Array<{ id: string; name: string }>).map((item) => [item.name.toLowerCase(), item.id]),
    );

    let createdCount = 0;
    let skippedCount = 0;

    for (const feature of features) {
      const name = getMappedValue(feature.properties, mapping.nameField) ?? "Imported GIS Record";
      const description = getMappedValue(feature.properties, mapping.descriptionField);
      const category = getMappedValue(feature.properties, mapping.categoryField);
      const status = getMappedValue(feature.properties, mapping.statusField);

      const mappedLatitude = getMappedValue(feature.properties, mapping.latitudeField);
      const mappedLongitude = getMappedValue(feature.properties, mapping.longitudeField);

      const normalized = normalizeCoordinates(
        mappedLatitude ?? feature.latitude,
        mappedLongitude ?? feature.longitude,
      );

      const departmentName = getMappedValue(feature.properties, mapping.departmentField)?.toLowerCase() ?? "";
      const programName = getMappedValue(feature.properties, mapping.programField)?.toLowerCase() ?? "";

      const departmentId = departmentByName.get(departmentName) ?? null;
      const programId = programByName.get(programName) ?? null;
      const conditionRaw = getMappedValue(feature.properties, mapping.conditionField);
      const conditionParsed = Number(conditionRaw);
      const conditionScore = Number.isFinite(conditionParsed)
        ? Math.max(0, Math.min(100, Math.round(conditionParsed)))
        : null;

      try {
        if (target === "ASSET") {
          await tx.asset.create({
            data: {
              organizationId,
              departmentId,
              name,
              type: category ?? "INFRASTRUCTURE",
              address: description,
              status: status ?? "ACTIVE",
              conditionScore,
              latitude: normalized.latitude,
              longitude: normalized.longitude,
            },
          });
          createdCount += 1;
          continue;
        }

        if (target === "ISSUE_REPORT") {
          await tx.issueReport.create({
            data: {
              organizationId,
              departmentId,
              title: name,
              description: description ?? "Imported from GIS dataset",
              category: category ?? "General",
              status: status === "RESOLVED" || status === "IN_PROGRESS" ? status : "OPEN",
              latitude: normalized.latitude,
              longitude: normalized.longitude,
            },
          });
          createdCount += 1;
          continue;
        }

        if (target === "DEPARTMENT_BOUNDARIES") {
          if (!feature.geometry) {
            skippedCount += 1;
            continue;
          }

          await tx.serviceZone.create({
            data: {
              organizationId,
              name,
              type: "DEPARTMENT_BOUNDARY",
              geoJson: feature.geometry,
            },
          });
          createdCount += 1;
          continue;
        }

        if (!feature.geometry) {
          skippedCount += 1;
          continue;
        }

        await tx.serviceZone.create({
          data: {
            organizationId,
            name: programId ? `${name} (${programName})` : name,
            type: "PROGRAM_SERVICE_AREA",
            geoJson: feature.geometry,
          },
        });
        createdCount += 1;
      } catch {
        skippedCount += 1;
      }
    }

    await tx.event.create({
      data: {
        organizationId,
        type: "GIS_IMPORT_COMPLETED",
        entityType: "GIS_IMPORT",
        processed: true,
        processedAt: new Date(),
        payload: {
          format,
          target,
          createdCount,
          skippedCount,
          fileName: file.name,
        },
      },
    });

    return {
      format,
      target,
      createdCount,
      skippedCount,
    };
  });
}

export function detectGisFileFormat(fileName: string, mimeType?: string | null) {
  return detectGisFormat(fileName, mimeType);
}

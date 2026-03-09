"use client";

import { useMemo, useState, type ChangeEvent } from "react";

type GisImportClientProps = {
  action: (formData: FormData) => Promise<void>;
};

type PreviewRow = Record<string, string | number | boolean | null>;

type MappingKey =
  | "nameField"
  | "descriptionField"
  | "categoryField"
  | "statusField"
  | "latitudeField"
  | "longitudeField"
  | "conditionField"
  | "departmentField"
  | "programField";

const MAPPING_LABELS: Record<MappingKey, string> = {
  nameField: "Name field",
  descriptionField: "Description field",
  categoryField: "Category field",
  statusField: "Status field",
  latitudeField: "Latitude field",
  longitudeField: "Longitude field",
  conditionField: "Condition field",
  departmentField: "Department field",
  programField: "Program field",
};

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

function detectFormat(fileName: string): "GEOJSON" | "SHAPEFILE_ZIP" | "CSV" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".geojson") || lower.endsWith(".json")) {
    return "GEOJSON";
  }
  if (lower.endsWith(".zip")) {
    return "SHAPEFILE_ZIP";
  }
  return "CSV";
}

function suggestField(fields: string[], candidates: string[]): string {
  const lower = fields.map((field) => field.toLowerCase());
  for (const candidate of candidates) {
    const index = lower.indexOf(candidate.toLowerCase());
    if (index >= 0) {
      return fields[index];
    }
  }
  return "";
}

export function GisImportClient({ action }: GisImportClientProps) {
  const [format, setFormat] = useState<"GEOJSON" | "SHAPEFILE_ZIP" | "CSV" | null>(null);
  const [fields, setFields] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [mapping, setMapping] = useState<Record<MappingKey, string>>({
    nameField: "",
    descriptionField: "",
    categoryField: "",
    statusField: "",
    latitudeField: "",
    longitudeField: "",
    conditionField: "",
    departmentField: "",
    programField: "",
  });

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setParseError(null);
    setFields([]);
    setPreviewRows([]);

    if (!file) {
      setFormat(null);
      return;
    }

    const detected = detectFormat(file.name);
    setFormat(detected);

    if (detected === "SHAPEFILE_ZIP") {
      setParseError("Shapefile ZIP preview is unavailable in-browser. You can still submit for server import.");
      return;
    }

    try {
      const text = await file.text();

      if (detected === "CSV") {
        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length === 0) {
          setParseError("CSV file is empty.");
          return;
        }

        const headers = parseCsvLine(lines[0]);
        const rows: PreviewRow[] = [];

        for (let i = 1; i < Math.min(lines.length, 11); i += 1) {
          const values = parseCsvLine(lines[i]);
          const row: PreviewRow = {};
          for (let h = 0; h < headers.length; h += 1) {
            row[headers[h]] = values[h] ?? "";
          }
          rows.push(row);
        }

        setFields(headers);
        setPreviewRows(rows);
        setMapping((prev) => ({
          ...prev,
          nameField: suggestField(headers, ["name", "title", "asset_name"]),
          descriptionField: suggestField(headers, ["description", "details", "address"]),
          categoryField: suggestField(headers, ["category", "type"]),
          statusField: suggestField(headers, ["status"]),
          latitudeField: suggestField(headers, ["latitude", "lat", "y"]),
          longitudeField: suggestField(headers, ["longitude", "lng", "lon", "x"]),
          conditionField: suggestField(headers, ["condition", "conditionScore"]),
          departmentField: suggestField(headers, ["department", "departmentName"]),
          programField: suggestField(headers, ["program", "programName"]),
        }));
        return;
      }

      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setParseError("Invalid GeoJSON payload.");
        return;
      }

      const root = parsed as Record<string, unknown>;
      const featuresRaw = Array.isArray(root.features) ? root.features : [];
      const rows: PreviewRow[] = [];
      const fieldSet = new Set<string>();

      for (const feature of featuresRaw.slice(0, 10)) {
        if (!feature || typeof feature !== "object" || Array.isArray(feature)) {
          continue;
        }
        const item = feature as Record<string, unknown>;
        const properties =
          item.properties && typeof item.properties === "object" && !Array.isArray(item.properties)
            ? (item.properties as Record<string, unknown>)
            : {};

        const row: PreviewRow = {};
        for (const [key, value] of Object.entries(properties)) {
          fieldSet.add(key);
          if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            row[key] = value ?? null;
          } else {
            row[key] = JSON.stringify(value);
          }
        }
        rows.push(row);
      }

      const sortedFields = Array.from(fieldSet).sort((a, b) => a.localeCompare(b));
      setFields(sortedFields);
      setPreviewRows(rows);
      setMapping((prev) => ({
        ...prev,
        nameField: suggestField(sortedFields, ["name", "title"]),
        descriptionField: suggestField(sortedFields, ["description", "address"]),
        categoryField: suggestField(sortedFields, ["category", "type"]),
        statusField: suggestField(sortedFields, ["status"]),
        latitudeField: suggestField(sortedFields, ["latitude", "lat"]),
        longitudeField: suggestField(sortedFields, ["longitude", "lng", "lon"]),
        conditionField: suggestField(sortedFields, ["condition", "conditionScore"]),
        departmentField: suggestField(sortedFields, ["department", "departmentName"]),
        programField: suggestField(sortedFields, ["program", "programName"]),
      }));
    } catch {
      setParseError("Could not parse file preview.");
    }
  }

  const previewColumns = useMemo(() => {
    if (fields.length > 0) {
      return fields;
    }
    const keys = new Set<string>();
    for (const row of previewRows) {
      for (const key of Object.keys(row)) {
        keys.add(key);
      }
    }
    return Array.from(keys);
  }, [fields, previewRows]);

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-900">Target dataset mapping</label>
          <select
            name="target"
            defaultValue="ASSET"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            required
          >
            <option value="ASSET">Asset</option>
            <option value="ISSUE_REPORT">IssueReport</option>
            <option value="DEPARTMENT_BOUNDARIES">Department boundaries</option>
            <option value="PROGRAM_SERVICE_AREAS">Program service areas</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-900">GIS file</label>
          <input
            type="file"
            name="gisFile"
            accept=".geojson,.json,.csv,.zip"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
            required
            onChange={handleFileChange}
          />
          <p className="mt-1 text-xs text-slate-500">Supported: GeoJSON, Shapefile ZIP, CSV(lat/lng).</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Field mapping</h3>
        <p className="mb-3 text-xs text-slate-500">Map source fields into platform entities before import.</p>
        <div className="grid gap-3 md:grid-cols-3">
          {(Object.keys(MAPPING_LABELS) as MappingKey[]).map((key) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-slate-700">{MAPPING_LABELS[key]}</label>
              <select
                name={key}
                value={mapping[key]}
                onChange={(event) => {
                  const value = event.target.value;
                  setMapping((prev) => ({ ...prev, [key]: value }));
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-xs"
              >
                <option value="">Unmapped</option>
                {fields.map((field) => (
                  <option key={`${key}-${field}`} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Dataset preview</h3>
        {format ? (
          <p className="mb-2 text-xs text-slate-600">Detected format: {format}</p>
        ) : null}
        {parseError ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{parseError}</p>
        ) : null}

        {previewRows.length > 0 ? (
          <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  {previewColumns.map((column) => (
                    <th key={column} className="px-2 py-2 font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`preview-${index}`} className="border-t">
                    {previewColumns.map((column) => (
                      <td key={`${index}-${column}`} className="px-2 py-2 text-slate-700">
                        {String(row[column] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Upload a file to preview sample records.</p>
        )}
      </div>

      <button
        type="submit"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Import GIS Dataset
      </button>
    </form>
  );
}

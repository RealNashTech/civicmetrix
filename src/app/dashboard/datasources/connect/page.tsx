"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";

type SourceType = "GOOGLE_SHEETS" | "MICROSOFT_EXCEL";
type Spreadsheet = {
  id: string;
  name: string;
};

type PreviewResponse = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
};

const DATASET_FIELD_OPTIONS: Record<string, string[]> = {
  InfrastructureAsset: ["name", "department", "conditionScore"],
  Grant: ["name", "amount", "status", "department"],
  CivicIssue: ["title", "category", "status", "description"],
  AssistanceRecord: [
    "organizationName",
    "programName",
    "category",
    "householdsServed",
    "reportDate",
    "latitude",
    "longitude",
    "city",
    "zipcode",
  ],
};

function suggestField(column: string, options: string[]): string {
  const normalized = column.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (normalized.includes("condition") || normalized.includes("score")) {
    return options.includes("conditionScore") ? "conditionScore" : "ignore";
  }
  if (normalized.includes("dept") || normalized.includes("department")) {
    return options.includes("department") ? "department" : "ignore";
  }
  if (normalized.includes("street") || normalized === "name" || normalized.includes("asset")) {
    return options.includes("name") ? "name" : "ignore";
  }
  if (normalized.includes("amount")) {
    return options.includes("amount") ? "amount" : "ignore";
  }
  if (normalized.includes("title")) {
    return options.includes("title") ? "title" : "ignore";
  }

  return "ignore";
}

export default function ConnectDataSourcePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [type, setType] = useState<SourceType>("GOOGLE_SHEETS");
  const [datasetType, setDatasetType] = useState("InfrastructureAsset");
  const [externalId, setExternalId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [range, setRange] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const idLabel = type === "GOOGLE_SHEETS" ? "Spreadsheet ID" : "Workbook ID";
  const googleConnected = searchParams.get("google") === "connected";
  const mappingOptions = useMemo(
    () => DATASET_FIELD_OPTIONS[datasetType] ?? ["name", "department", "conditionScore"],
    [datasetType],
  );

  async function loadGoogleSheets() {
    setErrorMessage(null);
    setLoadingSheets(true);

    try {
      const response = await fetch("/api/google/sheets", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to load spreadsheets. Connect your Google account first.");
      }

      const json = (await response.json()) as { spreadsheets?: Spreadsheet[] };
      setSpreadsheets(Array.isArray(json.spreadsheets) ? json.spreadsheets : []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load spreadsheets.");
    } finally {
      setLoadingSheets(false);
    }
  }

  async function previewSheet() {
    if (!externalId.trim() || !sheetName.trim()) {
      setErrorMessage("Spreadsheet ID and Sheet Name are required for preview.");
      return;
    }

    setErrorMessage(null);
    setPreviewLoading(true);

    try {
      const response = await fetch("/api/google/sheets/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheetId: externalId,
          sheetName,
          range: range || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to preview sheet.");
      }

      const json = (await response.json()) as PreviewResponse;
      setPreview(json);

      const nextMapping: Record<string, string> = {};
      for (const column of json.columns ?? []) {
        nextMapping[column] = suggestField(column, mappingOptions);
      }
      setColumnMapping(nextMapping);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to preview sheet.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const resolvedMapping = Object.fromEntries(
        Object.entries(columnMapping).filter(([, target]) => target && target !== "ignore"),
      );

      const response = await fetch("/api/datasources/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          datasetType,
          name,
          externalId,
          sheetName: sheetName || undefined,
          range: range || undefined,
          columnMapping: Object.keys(resolvedMapping).length > 0 ? resolvedMapping : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect data source.");
      }

      router.push("/dashboard/datasources");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to connect data source.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Connect Data Source</h1>
          <p className="text-sm text-slate-600">Create a spreadsheet connector for recurring imports.</p>
        </div>
        <Link
          href="/dashboard/datasources"
          className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Back to Data Sources
        </Link>
      </div>

      <Card title="Connector Details">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {errorMessage ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Name</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Type</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as SourceType)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              >
                <option value="GOOGLE_SHEETS">Google Sheets</option>
                <option value="MICROSOFT_EXCEL">Microsoft Excel</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Dataset Type</span>
              <input
                required
                value={datasetType}
                onChange={(event) => setDatasetType(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>{idLabel}</span>
              <input
                required
                value={externalId}
                onChange={(event) => setExternalId(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </label>
          </div>

          {type === "GOOGLE_SHEETS" ? (
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/api/google/oauth/start"
                  className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Connect Google Account
                </a>
                <button
                  type="button"
                  onClick={loadGoogleSheets}
                  disabled={loadingSheets}
                  className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingSheets ? "Loading..." : "Load Spreadsheets"}
                </button>
                <button
                  type="button"
                  onClick={previewSheet}
                  disabled={previewLoading}
                  className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {previewLoading ? "Previewing..." : "Preview Sheet"}
                </button>
              </div>
              {googleConnected ? (
                <p className="text-xs text-emerald-700">Google account connected. Load spreadsheets to choose one.</p>
              ) : null}
              <label className="space-y-1 text-sm text-slate-700">
                <span>Select Spreadsheet</span>
                <select
                  value={externalId}
                  onChange={(event) => {
                    const selectedId = event.target.value;
                    setExternalId(selectedId);
                    const selected = spreadsheets.find((item) => item.id === selectedId);
                    if (selected && !name.trim()) {
                      setName(selected.name);
                    }
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                >
                  <option value="">Select a spreadsheet</option>
                  {spreadsheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Sheet Name</span>
              <input
                required
                value={sheetName}
                onChange={(event) => setSheetName(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Range (optional)</span>
              <input
                value={range}
                onChange={(event) => setRange(event.target.value)}
                placeholder="A1:Z100"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
              />
            </label>
          </div>

          {preview ? (
            <div className="space-y-3 rounded-md border border-slate-200 p-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Detected Columns</h3>
                <p className="text-xs text-slate-500">Previewing up to 20 rows from the selected sheet.</p>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {preview.columns.map((column) => (
                  <label key={column} className="space-y-1 text-sm text-slate-700">
                    <span>{column}</span>
                    <select
                      value={columnMapping[column] ?? "ignore"}
                      onChange={(event) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [column]: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                    >
                      {mappingOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                      <option value="ignore">ignore</option>
                    </select>
                  </label>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-slate-500">
                    <tr className="border-b">
                      {preview.columns.map((column) => (
                        <th key={column} className="py-2 pr-2">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, index) => (
                      <tr key={`row-${index}`} className="border-b last:border-b-0">
                        {preview.columns.map((column) => (
                          <td key={`${index}-${column}`} className="py-2 pr-2 text-slate-700">
                            {String(row[column] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Connecting..." : "Connect Data Source"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DataSourceTable } from "@/components/datasources/DataSourceTable";
import { Card } from "@/components/ui/card";

type DataSource = {
  id: string;
  name: string;
  type: "GOOGLE_SHEETS" | "MICROSOFT_EXCEL";
  datasetType: string;
  refreshMinutes: number;
  lastSyncAt: string | null;
  createdAt: string;
};

export default function DataSourcesDashboardPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDataSources = useCallback(async () => {
    setErrorMessage(null);
    const response = await fetch("/api/datasources", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Failed to fetch data sources.");
    }

    const json = (await response.json()) as { dataSources?: DataSource[] };
    setDataSources(Array.isArray(json.dataSources) ? json.dataSources : []);
  }, []);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        await loadDataSources();
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to fetch data sources.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [loadDataSources]);

  async function refreshDataSources() {
    try {
      await loadDataSources();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh data sources.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Data Sources</h1>
          <p className="text-sm text-slate-600">
            Connect and manage spreadsheet connectors for ingestion.
          </p>
        </div>
        <Link
          href="/dashboard/datasources/connect"
          className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Connect Data Source
        </Link>
      </div>

      <Card title="Connected Data Sources">
        {errorMessage ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
        {loading ? (
          <p className="text-sm text-slate-500">Loading data sources...</p>
        ) : (
          <DataSourceTable dataSources={dataSources} onRefresh={refreshDataSources} />
        )}
      </Card>
    </div>
  );
}

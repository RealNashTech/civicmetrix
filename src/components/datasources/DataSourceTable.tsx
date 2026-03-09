"use client";

import { useMemo, useState } from "react";

type DataSource = {
  id: string;
  name: string;
  type: "GOOGLE_SHEETS" | "MICROSOFT_EXCEL";
  datasetType: string;
  refreshMinutes: number;
  lastSyncAt: string | null;
  createdAt: string;
};

type DataSourceTableProps = {
  dataSources: DataSource[];
  onRefresh: () => Promise<void>;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "Never";
  }
  return new Date(value).toLocaleString();
}

function formatType(value: DataSource["type"]): string {
  if (value === "GOOGLE_SHEETS") {
    return "Google Sheets";
  }
  return "Microsoft Excel";
}

export function DataSourceTable({ dataSources, onRefresh }: DataSourceTableProps) {
  const [syncingIds, setSyncingIds] = useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusyById = useMemo(() => {
    const merged: Record<string, boolean> = {};
    for (const id of Object.keys(syncingIds)) {
      merged[id] = syncingIds[id];
    }
    for (const id of Object.keys(deletingIds)) {
      merged[id] = merged[id] || deletingIds[id];
    }
    return merged;
  }, [syncingIds, deletingIds]);

  async function handleSync(id: string) {
    setErrorMessage(null);
    setSyncingIds((prev) => ({ ...prev, [id]: true }));

    try {
      const response = await fetch(`/api/datasources/${id}/sync`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to trigger sync.");
      }

      await onRefresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to trigger sync.");
    } finally {
      setSyncingIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this data source?");
    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setDeletingIds((prev) => ({ ...prev, [id]: true }));

    try {
      const response = await fetch(`/api/datasources/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete data source.");
      }

      await onRefresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete data source.");
    } finally {
      setDeletingIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  return (
    <div className="space-y-3">
      {errorMessage ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr className="border-b">
              <th className="py-2 pr-2">Name</th>
              <th className="py-2 pr-2">Type</th>
              <th className="py-2 pr-2">Dataset</th>
              <th className="py-2 pr-2">Refresh Interval</th>
              <th className="py-2 pr-2">Last Sync</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dataSources.map((source) => (
              <tr key={source.id} className="border-b last:border-b-0">
                <td className="py-2 pr-2 text-slate-900">{source.name}</td>
                <td className="py-2 pr-2">{formatType(source.type)}</td>
                <td className="py-2 pr-2">{source.datasetType}</td>
                <td className="py-2 pr-2">{source.refreshMinutes} min</td>
                <td className="py-2 pr-2">{formatDate(source.lastSyncAt)}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSync(source.id)}
                      disabled={Boolean(isBusyById[source.id])}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {syncingIds[source.id] ? "Syncing..." : "Sync"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(source.id)}
                      disabled={Boolean(isBusyById[source.id])}
                      className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingIds[source.id] ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {dataSources.length === 0 ? (
              <tr>
                <td className="py-3 text-slate-500" colSpan={6}>
                  No data sources connected yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

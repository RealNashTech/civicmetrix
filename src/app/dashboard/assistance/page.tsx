"use client";

import { useEffect, useState } from "react";

import { AssistanceCategoryChart } from "@/components/assistance/AssistanceCategoryChart";
import { AssistanceProgramChart } from "@/components/assistance/AssistanceProgramChart";
import { Card } from "@/components/ui/card";

type AssistanceSummary = {
  totalHouseholdsServed: number;
  recordsLast30Days: number;
  categoryBreakdown: Array<{
    category: string;
    householdsServed: number;
  }>;
  programBreakdown: Array<{
    programName: string;
    organizationName: string;
    householdsServed: number;
  }>;
};

export default function AssistanceDashboardPage() {
  const [summary, setSummary] = useState<AssistanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/assistance/summary", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load assistance summary.");
        }
        const json = (await response.json()) as AssistanceSummary;
        if (active) {
          setSummary(json);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load assistance summary.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Assistance Dashboard</h1>
        <p className="text-sm text-slate-600">Program support outcomes from AssistanceRecord data.</p>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {loading || !summary ? (
        <Card title="Loading">
          <p className="text-sm text-slate-500">Loading assistance metrics...</p>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <Card title="Total Households Served">
              <p className="text-3xl font-semibold text-slate-900">
                {summary.totalHouseholdsServed.toLocaleString()}
              </p>
            </Card>
            <Card title="Records in Last 30 Days">
              <p className="text-3xl font-semibold text-slate-900">
                {summary.recordsLast30Days.toLocaleString()}
              </p>
            </Card>
          </section>

          <Card title="Category Breakdown">
            {summary.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No assistance records found.</p>
            ) : (
              <AssistanceCategoryChart data={summary.categoryBreakdown} />
            )}
          </Card>

          <Card title="Top Assistance Programs">
            {summary.programBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No assistance program data found.</p>
            ) : (
              <AssistanceProgramChart
                data={summary.programBreakdown.map((row) => ({
                  programName: row.programName,
                  householdsServed: row.householdsServed,
                }))}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}

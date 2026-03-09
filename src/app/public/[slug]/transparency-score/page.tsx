import Link from "next/link";

import { getTransparencyInsights } from "@/lib/intelligence/transparency-insights";
import { getTransparencyReportBySlug } from "@/lib/transparency/transparency-report";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

function badgeClasses(score: number) {
  if (score >= 85) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (score >= 70) {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-rose-100 text-rose-800";
}

export default async function PublicTransparencyScorePage({ params }: Props) {
  const { slug } = await params;
  const report = await getTransparencyReportBySlug(slug);

  if (!report) {
    notFound();
  }

  const insights = await getTransparencyInsights(report.organization.id, report.score);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href={`/public/${slug}/transparency`} className="text-sm text-blue-600 hover:underline">
            ← Back to Transparency Portal
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {report.organization.name} Transparency Score
          </h1>
          <p className="text-sm text-slate-600">
            A public-facing accountability score showing how completely the city publishes operational data.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Transparency Score</p>
          <p className="mt-2 text-5xl font-semibold text-slate-900">{report.score.score}</p>
          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-medium ${badgeClasses(report.score.score)}`}>
            Grade {report.score.grade}
          </span>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Infrastructure Reporting</p>
          <p className="text-2xl font-semibold text-slate-900">
            {report.score.infrastructureReportingCompleteness}%
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Grant Reporting</p>
          <p className="text-2xl font-semibold text-slate-900">{report.score.grantReportingCompleteness}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">KPI Availability</p>
          <p className="text-2xl font-semibold text-slate-900">{report.score.kpiAvailability}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Budget Transparency</p>
          <p className="text-2xl font-semibold text-slate-900">{report.score.budgetTransparency}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Department Coverage</p>
          <p className="text-2xl font-semibold text-slate-900">
            {report.score.departmentReportingCoverage}%
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Open Civic Issues</p>
          <p className="text-2xl font-semibold text-slate-900">{report.score.openCivicIssues}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Reporting Breakdown</h2>
          <div className="mt-4 space-y-4">
            {report.score.components.map((component) => (
              <div key={component.key}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                  <span>{component.label}</span>
                  <span>{component.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-900"
                    style={{ width: `${component.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Transparency Insights</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {insights.map((insight) => (
                <li key={insight} className="rounded-md bg-slate-50 px-3 py-2">
                  {insight}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Strengths</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {report.score.strengths.length > 0 ? report.score.strengths.map((strength) => (
                <li key={strength} className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-900">
                  {strength}
                </li>
              )) : (
                <li className="rounded-md bg-slate-50 px-3 py-2">No standout strengths yet.</li>
              )}
            </ul>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Gaps</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {report.score.gaps.length > 0 ? report.score.gaps.map((gap) => (
                <li key={gap} className="rounded-md bg-rose-50 px-3 py-2 text-rose-900">
                  {gap}
                </li>
              )) : (
                <li className="rounded-md bg-slate-50 px-3 py-2">No major reporting gaps detected.</li>
              )}
            </ul>
          </section>
        </div>
      </section>
    </div>
  );
}

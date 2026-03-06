export default async function CouncilReport() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/reports/council`,
    { cache: "no-store" }
  )

  const report = await res.json()

  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-semibold">
        Weekly City Council Report
      </h1>

      <p className="text-slate-500 mt-2">
        Generated {new Date(report.generatedAt).toLocaleDateString()}
      </p>

      <div className="grid grid-cols-2 gap-6 mt-8">
        <div className="border rounded p-4">
          KPIs
          <div className="text-2xl font-semibold">
            {report.summary.kpis}
          </div>
        </div>

        <div className="border rounded p-4">
          Active Grants
          <div className="text-2xl font-semibold">
            {report.summary.grants}
          </div>
        </div>

        <div className="border rounded p-4">
          Service Issues
          <div className="text-2xl font-semibold">
            {report.summary.issues}
          </div>
        </div>

        <div className="border rounded p-4">
          Infrastructure Assets
          <div className="text-2xl font-semibold">
            {report.summary.assets}
          </div>
        </div>
      </div>
    </div>
  )
}

import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Live Demo</p>
        <h1 className="mt-4 text-4xl font-semibold">Live CivicMetrix Demo</h1>
        <p className="mt-6 text-slate-600">
          Explore a fully functioning city powered by CivicMetrix.
        </p>

        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-8">
          <h2 className="text-xl font-semibold">The demo includes:</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>KPI performance tracking</li>
            <li>Grant funding dashboards</li>
            <li>Public transparency portal</li>
            <li>Audit logging</li>
            <li>Operations management</li>
          </ul>
          <div className="mt-8">
            <Link
              href="/public/city-of-woodburn"
              className="inline-flex rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open Demo City
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

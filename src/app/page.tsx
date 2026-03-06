import Link from "next/link";

const modules = [
  {
    title: "Grants",
    description: "Track funding, compliance, deadlines, and reporting across every grant.",
  },
  {
    title: "Performance KPIs",
    description: "Measure city performance in real time with trend and target visibility.",
  },
  {
    title: "Operations",
    description: "Manage issues, work orders, and service requests in one operational layer.",
  },
  {
    title: "Public Transparency",
    description: "Publish public dashboards automatically without duplicate reporting workflows.",
  },
  {
    title: "Audit Logging",
    description: "Track administrative actions and governance events with complete history.",
  },
  {
    title: "Civic Intelligence",
    description: "Identify risks, trends, and anomalies before service performance degrades.",
  },
];

const pricing = [
  { population: "0-10k population", price: "$199 / month" },
  { population: "10k-50k population", price: "$499 / month" },
  { population: "50k-200k population", price: "$1499 / month" },
  { population: "200k+", price: "$3999 / month" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">CivicMetrix</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-5xl">
            The Operating System for Modern Local Government
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-slate-600">
            Track grants, manage operations, measure city performance, and publish real-time public
            transparency dashboards.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/public/city-of-woodburn"
              className="inline-flex items-center rounded-md bg-slate-900 px-5 py-3 text-white hover:bg-slate-800"
            >
              View Live City Demo
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-semibold">Platform Overview</h2>
        <p className="mt-4 max-w-3xl text-slate-600">
          CivicMetrix unifies grants, operational response, KPI management, and public accountability
          into one multi-tenant platform built for local government teams.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-semibold">Explore a Live CivicMetrix City</h3>
          <p className="mt-3 text-slate-600">
            See how CivicMetrix powers a modern city dashboard.
          </p>
          <div className="mt-6 rounded-lg bg-slate-50 p-5">
            <p className="text-lg font-medium">City of Woodburn Demo</p>
            <p className="mt-1 text-sm text-slate-600">Population: 26,000</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/public/city-of-woodburn"
              className="rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open Public Dashboard
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Login as Staff
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-3xl font-semibold">Feature Modules</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <article key={module.title} className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold">{module.title}</h3>
              <p className="mt-3 text-sm text-slate-600">{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-3xl font-semibold">Pricing</h2>
        <p className="mt-4 max-w-3xl text-slate-600">
          Predictable city pricing with all modules included.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pricing.map((plan) => (
            <article key={plan.population} className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-slate-600">{plan.population}</p>
              <p className="mt-3 text-2xl font-semibold">{plan.price}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-600">
                <li>Unlimited users</li>
                <li>All modules included</li>
                <li>No implementation fees</li>
                <li>Live in one day</li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-semibold">Bring Transparency to Your City</h2>
          <p className="mt-4 max-w-3xl text-slate-600">
            CivicMetrix replaces fragmented government software with one modern platform for operations
            and accountability.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/public/city-of-woodburn"
              className="rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Explore Live Demo
            </Link>
            <Link
              href="mailto:sales@civicmetrix.com?subject=Request%20a%20CivicMetrix%20Demo"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

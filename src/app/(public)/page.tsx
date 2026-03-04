import Link from "next/link";

export default function PublicPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <section className="mx-auto flex max-w-5xl flex-col px-6 py-20">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">CivicMetrix</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-slate-900">
          Operational intelligence for local governments.
        </h1>
        <p className="mt-6 max-w-2xl text-slate-600">
          Track performance, monitor grants, manage service delivery, and surface operational risks before they become failures.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/auth/login"
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Register Organization
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">CivicMetrix</h1>
        <p className="text-slate-600">
          Civic Accountability Infrastructure
        </p>

        <a
          href="/dashboard"
          className="inline-block rounded bg-slate-900 px-6 py-3 text-white"
        >
          Open Dashboard
        </a>
      </div>
    </main>
  )
}

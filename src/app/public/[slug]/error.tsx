"use client"

export default function ErrorPage({ error }: { error: Error }) {
  console.error(error)

  return (
    <div className="p-10">
      <h1 className="text-xl font-semibold">
        Demo temporarily unavailable
      </h1>

      <p className="text-slate-500 mt-2">
        The demo dashboard encountered an error.
      </p>
    </div>
  )
}

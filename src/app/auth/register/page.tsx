"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Registration failed.");
        return;
      }

      router.push("/auth/login");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16">
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Register Organization</h1>
        <p className="mt-2 text-sm text-slate-600">Create your organization and initial admin account.</p>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="organizationName">
              Organization Name
            </label>
            <input
              id="organizationName"
              name="organizationName"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
              placeholder="City of Riverton"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="organizationSlug">
              Organization Slug
            </label>
            <input
              id="organizationSlug"
              name="organizationSlug"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
              placeholder="city-of-riverton"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="name">
              Admin Name
            </label>
            <input
              id="name"
              name="name"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
              placeholder="Jordan Lee"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              Admin Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
              placeholder="admin@city.gov"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {pending ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/auth/login" className="font-medium text-slate-800 underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

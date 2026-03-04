"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const organizationSlug = String(formData.get("organizationSlug") ?? "");

    const result = await signIn("staff-credentials", {
      email,
      password,
      organizationSlug,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (!result?.ok) {
      setError("Sign-in failed. Check your credentials and organization slug.");
      setPending(false);
      return;
    }

    router.push(result.url ?? "/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16">
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Sign in to CivicMetrix</h1>
        <p className="mt-2 text-sm text-slate-600">Use your organization slug and account credentials.</p>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              Email
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
            {pending ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Need an organization account?{" "}
          <Link href="/auth/register" className="font-medium text-slate-800 underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}

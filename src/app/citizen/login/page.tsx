"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function CitizenLoginPage() {
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

    const result = await signIn("citizen-credentials", {
      email,
      password,
      organizationSlug,
      redirect: false,
      callbackUrl: "/citizen/dashboard",
    });

    if (!result?.ok) {
      setError("Sign-in failed. Check your credentials and organization slug.");
      setPending(false);
      return;
    }

    router.push(result.url ?? "/citizen/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16">
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Citizen Issue Portal Login</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to track and comment on your submitted issues.</p>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            name="organizationSlug"
            required
            placeholder="Organization slug"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="Password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {pending ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Need an account?{" "}
          <Link href="/citizen/register" className="font-medium text-slate-800 underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}

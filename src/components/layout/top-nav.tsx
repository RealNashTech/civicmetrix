import Link from "next/link";

import { auth } from "@/lib/auth";

import { LogoutButton } from "./logout-button";

export async function TopNav() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          CivicMetrix
        </Link>

        {!user ? (
          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Home
            </Link>
            <Link
              href="/#platform"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Platform
            </Link>
            <Link
              href="/#pricing"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Pricing
            </Link>
            <Link
              href="/demo"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Demo
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Login
            </Link>
          </nav>
        ) : (
          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Home
            </Link>
            <Link
              href="/demo"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Demo
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Dashboard
            </Link>
            <Link
              href={`/public/${user.organizationSlug}`}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Public View
            </Link>
            <LogoutButton />
          </nav>
        )}
      </div>
    </header>
  );
}

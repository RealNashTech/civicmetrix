import Link from "next/link";

import { requireCitizenSession } from "@/lib/citizen-auth";

export default async function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const citizen = await requireCitizenSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Citizen Portal</p>
            <h1 className="text-lg font-semibold text-slate-900">{citizen.organizationSlug}</h1>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/citizen/dashboard" className="text-slate-700 hover:underline">
              Dashboard
            </Link>
            <Link href="/api/auth/signout" className="text-slate-700 hover:underline">
              Sign out
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}

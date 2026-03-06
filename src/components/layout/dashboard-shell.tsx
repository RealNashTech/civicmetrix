import Link from "next/link";
import { ReactNode } from "react";

import { AppRole } from "@/types/roles";

type DashboardShellProps = {
  children: ReactNode;
  role: AppRole;
  organizationName: string;
};

export function DashboardShell({
  children,
  role,
  organizationName,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">CivicMetrix</p>
            <h1 className="text-lg font-semibold text-slate-900">{organizationName}</h1>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {role}
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <nav className="space-y-2 text-sm">
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard">
              Dashboard
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/executive">
              Executive Summary
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/executive/briefing">
              Executive Briefing
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/command-center">
              Command Center
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/city-operations">
              City Operations
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/map">
              GIS Map
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/alerts">
              Alerts
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/insights">
              Insights
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/issues">
              Issues
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/work-orders">
              Work Orders
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/goals">
              Strategic Goals
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/grants/compliance">
              Grant Compliance
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/grant-compliance">
              Grant Milestones
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/reports">
              Council Reports
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/departments">
              Departments
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/programs">
              Programs
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/budgets">
              Budgets
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/kpi">
              KPI
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/grants">
              Grants
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/grants/pipeline">
              Grant Pipeline
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/assets">
              Assets
            </Link>
            <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/documents">
              Documents
            </Link>
            {role === "ADMIN" ? (
              <Link className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100" href="/dashboard/audit">
                Audit Logs
              </Link>
            ) : null}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

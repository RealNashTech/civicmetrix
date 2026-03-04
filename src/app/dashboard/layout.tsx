import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  if (session.user.userType === "citizen") {
    redirect("/citizen/dashboard");
  }

  return (
    <DashboardShell
      role={session.user.role}
      organizationName={session.user.organizationSlug}
    >
      {children}
    </DashboardShell>
  );
}

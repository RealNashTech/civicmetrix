import Link from "next/link";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const boardStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;

export default async function IssueBoardPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const issues = await db().issueReport.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      department: { select: { name: true } },
      assignedDepartment: { select: { name: true } },
    },
  });

  const grouped = {
    OPEN: issues.filter((issue) => issue.status === "OPEN"),
    IN_PROGRESS: issues.filter((issue) => issue.status === "IN_PROGRESS"),
    RESOLVED: issues.filter((issue) => issue.status === "RESOLVED"),
  };

  return (
    <div className="space-y-6">
      <Card title="Issue Workflow Board">
        <div className="mb-3">
          <Link href="/dashboard/issues" className="text-sm text-blue-600 hover:underline">
            ← Back to Issue Queue
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {boardStatuses.map((status) => (
            <section key={status} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                {status.replace("_", " ")} ({grouped[status].length})
              </h2>
              <div className="space-y-3">
                {grouped[status].length > 0 ? (
                  grouped[status].map((issue) => (
                    <article key={issue.id} className="rounded-md border border-slate-200 bg-white p-3">
                      <p className="text-sm font-medium text-slate-900">{issue.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{issue.category}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Priority: {issue.priority ?? "Unset"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Assigned: {issue.assignedDepartment?.name ?? "Unassigned"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Created: {new Intl.DateTimeFormat("en-US").format(issue.createdAt)}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No issues in this state.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      </Card>
    </div>
  );
}

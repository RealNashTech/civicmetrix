import Link from "next/link";

import { Card } from "@/components/ui/card";
import IssueMap from "@/components/maps/issue-map";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function IssuesMapPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const issues = await db().issueReport.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      latitude: true,
      longitude: true,
      address: true,
    },
  });

  const geocodedIssues = issues
    .filter((issue) => issue.latitude != null && issue.longitude != null)
    .map((issue) => ({
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      latitude: issue.latitude as number,
      longitude: issue.longitude as number,
    }));

  return (
    <div className="space-y-6">
      <Card title="Issue Map Intelligence">
        <div className="mb-3 flex items-center justify-between">
          <Link href="/dashboard/issues" className="text-sm text-blue-600 hover:underline">
            ← Back to Issue Queue
          </Link>
          <span className="text-xs text-slate-500">
            {geocodedIssues.length} of {issues.length} issues geocoded
          </span>
        </div>
        {geocodedIssues.length > 0 ? (
          <IssueMap issues={geocodedIssues} />
        ) : (
          <p className="text-sm text-slate-500">No issues with coordinates yet.</p>
        )}
      </Card>
    </div>
  );
}

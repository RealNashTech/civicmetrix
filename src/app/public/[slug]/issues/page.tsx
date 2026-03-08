import Link from "next/link";

import IssueMap from "@/components/maps/issue-map";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { dbSystem } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export default async function PublicIssuesPage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);
  const publicPrograms = await dbSystem().program.findMany({
    where: { organizationId: organization.id, isPublic: true },
    select: { departmentId: true },
  });
  const publicDepartmentIds = [...new Set(publicPrograms.map((program) => program.departmentId))];

  const issues = await dbSystem().issueReport.findMany({
    where: {
      organizationId: organization.id,
      departmentId: { in: publicDepartmentIds },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      createdAt: true,
      latitude: true,
      longitude: true,
      address: true,
    },
  });

  const openIssues = issues.filter((issue) => issue.status !== "RESOLVED");
  const resolvedIssues = issues.filter((issue) => issue.status === "RESOLVED");
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
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <Link href={`/public/${resolvedParams.slug}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Public Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{organization.name} Issue Status</h1>
        <p className="text-sm text-slate-600">Open and resolved service requests with map visibility.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Open Issues</h2>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{openIssues.length}</p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Resolved Issues</h2>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{resolvedIssues.length}</p>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Issue Map</h2>
        {geocodedIssues.length > 0 ? (
          <IssueMap issues={geocodedIssues} />
        ) : (
          <p className="text-sm text-slate-500">No geocoded issues available.</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Latest Issues</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Address</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {issues.length > 0 ? (
                issues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="px-4 py-3 text-slate-800">{issue.title}</td>
                    <td className="px-4 py-3 text-slate-700">{issue.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-700">{issue.priority ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{issue.address ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(issue.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    No issues reported yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string; departmentId: string }>;
};

export default async function PublicDepartmentDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);

  const department = await db().department.findUnique({
    where: { id: resolvedParams.departmentId },
    include: {
      kpis: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
      },
      grants: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const isPublicDepartment = Boolean(
    department &&
      (department.kpis.length > 0 ||
        department.grants.length > 0 ||
        (await db().program.count({
          where: {
            organizationId: organization.id,
            departmentId: resolvedParams.departmentId,
            isPublic: true,
          },
        })) > 0),
  );

  if (!department || department.organizationId !== organization.id || !isPublicDepartment) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div>
        <Link
          href={`/public/${resolvedParams.slug}/departments`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Departments
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{department.name}</h1>
        <p className="text-muted-foreground">{organization.name} public department view.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Public KPIs</h2>
        {department.kpis.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public KPIs assigned to this department.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Value</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Unit</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {department.kpis.map((kpi) => (
                  <tr key={kpi.id}>
                    <td className="px-4 py-3 text-slate-800">{kpi.name}</td>
                    <td className="px-4 py-3 text-slate-700">{kpi.value}</td>
                    <td className="px-4 py-3 text-slate-700">{kpi.unit ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{kpi.periodLabel ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Public Grants</h2>
        {department.grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public grants assigned to this department.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {department.grants.map((grant) => (
                  <tr key={grant.id}>
                    <td className="px-4 py-3 text-slate-800">{grant.name}</td>
                    <td className="px-4 py-3 text-slate-700">{grant.status}</td>
                    <td className="px-4 py-3 text-slate-700">${grant.amount.toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

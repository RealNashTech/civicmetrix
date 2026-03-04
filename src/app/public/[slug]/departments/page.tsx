import Link from "next/link";

import { db } from "@/lib/db";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicDepartmentsPage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);
  const publicPrograms = await db().program.findMany({
    where: { organizationId: organization.id, isPublic: true },
    select: { departmentId: true },
  });
  const publicDepartmentIds = [...new Set(publicPrograms.map((program) => program.departmentId))];

  const departments = await db().department.findMany({
    where: { organizationId: organization.id, id: { in: publicDepartmentIds } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">{organization.name} Departments</h1>
        <p className="text-muted-foreground">Department accountability and public outcomes.</p>
      </div>

      {departments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No departments found for this organization.</p>
      ) : (
        <div className="grid gap-4">
          {departments.map((department) => (
            <Link
              key={department.id}
              href={`/public/${resolvedParams.slug}/departments/${department.id}`}
              className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{department.name}</h2>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

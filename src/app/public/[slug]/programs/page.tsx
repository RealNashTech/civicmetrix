import Link from "next/link";

import { dbSystem } from "@/lib/db";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

function getActiveStatus(startDate: Date | null, endDate: Date | null) {
  const now = new Date();
  const started = !startDate || startDate <= now;
  const notEnded = !endDate || endDate >= now;
  return started && notEnded ? "Active" : "Inactive";
}

export default async function PublicProgramsPage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);

  const programs = await dbSystem().program.findMany({
    where: {
      organizationId: organization.id,
      isPublic: true,
    },
    orderBy: { createdAt: "desc" },
    include: {
      department: {
        select: { name: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">{organization.name} Programs</h1>
        <p className="text-muted-foreground">Public program accountability and delivery status.</p>
      </div>

      {programs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public programs available.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Program</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {programs.map((program) => (
                <tr key={program.id}>
                  <td className="px-4 py-3 text-slate-800">
                    <Link
                      href={`/public/${resolvedParams.slug}/programs/${program.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {program.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{program.department.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {getActiveStatus(program.startDate, program.endDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { BudgetUtilizationChart } from "@/components/charts/budget-utilization-chart";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export default async function PublicBudgetExplorerPage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);
  const publicPrograms = await db().program.findMany({
    where: { organizationId: organization.id, isPublic: true },
    select: { id: true, departmentId: true },
  });
  const publicProgramIds = publicPrograms.map((program) => program.id);
  const publicDepartmentIds = [...new Set(publicPrograms.map((program) => program.departmentId))];

  const departments = await db().department.findMany({
    where: {
      organizationId: organization.id,
      id: { in: publicDepartmentIds },
    },
    include: {
      programs: {
        where: { id: { in: publicProgramIds } },
        include: {
          budgets: {
            where: {
              OR: [
                { programId: { in: publicProgramIds } },
                { organizationId: organization.id, departmentId: { in: publicDepartmentIds } },
              ],
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const chartData = departments.flatMap((department) =>
    department.programs.map((program) => ({
      name: `${department.name} - ${program.name}`,
      allocated: program.budgets.reduce((sum, budget) => sum + Number(budget.allocated), 0),
      spent: program.budgets.reduce((sum, budget) => sum + Number(budget.spent), 0),
    })),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">{organization.name} Budget Transparency Explorer</h1>
        <p className="text-sm text-slate-600">
          Public budget allocations and spending by department and program.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Budget Utilization Chart</h2>
        {chartData.length > 0 ? (
          <BudgetUtilizationChart data={chartData} />
        ) : (
          <p className="text-sm text-slate-500">No budget data available.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Program</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Budget Allocated</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Budget Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {departments.flatMap((department) =>
              department.programs.map((program) => {
                const allocated = program.budgets.reduce(
                  (sum, budget) => sum + Number(budget.allocated),
                  0,
                );
                const spent = program.budgets.reduce((sum, budget) => sum + Number(budget.spent), 0);
                return (
                  <tr key={`${department.id}-${program.id}`}>
                    <td className="px-4 py-3 text-slate-800">{department.name}</td>
                    <td className="px-4 py-3 text-slate-700">{program.name}</td>
                    <td className="px-4 py-3 text-slate-700">${allocated.toFixed(2)} allocated</td>
                    <td className="px-4 py-3 text-slate-700">${spent.toFixed(2)} spent</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

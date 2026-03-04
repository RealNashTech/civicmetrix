import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export default async function PublicGoalsPage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);

  const goals = await db().strategicGoal.findMany({
    where: { organizationId: organization.id },
    include: {
      objectives: {
        include: {
          program: {
            select: {
              id: true,
              name: true,
              isPublic: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">{organization.name} Strategic Goals</h1>
        <p className="text-sm text-slate-600">
          Public transparency for city strategic plans and progress.
        </p>
      </div>

      {goals.length > 0 ? (
        goals.map((goal) => (
          <section key={goal.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-slate-900">{goal.title}</h2>
            <p className="text-sm text-slate-600">
              Target Year: {goal.targetYear ?? "-"}
            </p>
            <p className="mt-1 text-sm text-slate-700">{goal.description ?? "-"}</p>

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Objective</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Progress</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Contributing Program
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {goal.objectives.length > 0 ? (
                    goal.objectives.map((objective) => (
                      <tr key={objective.id}>
                        <td className="px-4 py-3 text-slate-800">
                          <div className="font-medium">{objective.title}</div>
                          <p className="text-xs text-slate-500">{objective.description ?? "-"}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{objective.progressPercent}%</td>
                        <td className="px-4 py-3 text-slate-700">
                          {objective.program?.isPublic ? objective.program.name : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={3}>
                        No objectives for this goal yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))
      ) : (
        <p className="text-sm text-slate-500">No strategic goals published yet.</p>
      )}
    </div>
  );
}

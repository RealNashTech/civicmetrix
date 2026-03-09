import Link from "next/link";

import { AssistanceCategoryChart } from "@/components/assistance/AssistanceCategoryChart";
import { getSystemDb } from "@/lib/db/systemClient";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";

type Props = {
  params: Promise<{ slug: string }>;
};

type AssistancePublicSummary = {
  programsDelivered: number;
  householdsServed: number;
  categoryBreakdown: Array<{
    category: string;
    householdsServed: number;
  }>;
  programBreakdown: Array<{
    programName: string;
    organizationName: string;
    householdsServed: number;
  }>;
};

export const revalidate = 300;

export default async function PublicAssistancePage({ params }: Props) {
  const { slug } = await params;
  const organization = await getOrganizationBySlug(slug);

  const systemDb = getSystemDb();
  const summary = await (async (): Promise<AssistancePublicSummary> => {
    const [programsRaw, aggregate, categoryBreakdownRaw, programBreakdownRaw] = await Promise.all([
      systemDb.assistanceRecord.findMany({
        where: { organizationId: organization.id },
        select: { programName: true },
        distinct: ["programName"],
      }),
      systemDb.assistanceRecord.aggregate({
        where: { organizationId: organization.id },
        _sum: { householdsServed: true },
      }),
      systemDb.assistanceRecord.groupBy({
        by: ["category"],
        where: { organizationId: organization.id },
        _sum: { householdsServed: true },
        orderBy: {
          _sum: {
            householdsServed: "desc",
          },
        },
      }),
      systemDb.assistanceRecord.groupBy({
        by: ["programName", "organizationName"],
        where: { organizationId: organization.id },
        _sum: { householdsServed: true },
        orderBy: {
          _sum: {
            householdsServed: "desc",
          },
        },
      }),
    ]);

    return {
      programsDelivered: programsRaw.length,
      householdsServed: Number(aggregate._sum.householdsServed ?? 0),
      categoryBreakdown: categoryBreakdownRaw.map((row) => ({
        category: row.category,
        householdsServed: Number(row._sum.householdsServed ?? 0),
      })),
      programBreakdown: programBreakdownRaw.map((row) => ({
        programName: row.programName,
        organizationName: row.organizationName,
        householdsServed: Number(row._sum.householdsServed ?? 0),
      })),
    };
  })();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <div>
        <Link href={`/public/${slug}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Public Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{organization.name} Assistance</h1>
        <p className="text-sm text-slate-600">Public transparency summary for assistance delivery programs.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Programs Delivered</p>
          <p className="text-2xl font-semibold text-slate-900">{summary.programsDelivered.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Households Served</p>
          <p className="text-2xl font-semibold text-slate-900">{summary.householdsServed.toLocaleString()}</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Category Breakdown</h2>
        {summary.categoryBreakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No assistance records available.</p>
        ) : (
          <AssistanceCategoryChart data={summary.categoryBreakdown} />
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Program Breakdown</h2>
        {summary.programBreakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No assistance program data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr className="border-b">
                  <th className="py-2 pr-2">Program</th>
                  <th className="py-2 pr-2">Organization</th>
                  <th className="py-2">Households Served</th>
                </tr>
              </thead>
              <tbody>
                {summary.programBreakdown.map((row) => (
                  <tr key={`${row.programName}:${row.organizationName}`} className="border-b last:border-b-0">
                    <td className="py-2 pr-2 text-slate-900">{row.programName}</td>
                    <td className="py-2 pr-2">{row.organizationName}</td>
                    <td className="py-2">{row.householdsServed.toLocaleString()}</td>
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
